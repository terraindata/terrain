/*
University of Illinois/NCSA Open Source License 

Copyright (c) 2018 Terrain Data, Inc. and the authors. All rights reserved.

Developed by: Terrain Data, Inc. and
              the individuals who committed the code in this file.
              https://github.com/terraindata/terrain
                  
Permission is hereby granted, free of charge, to any person 
obtaining a copy of this software and associated documentation files 
(the "Software"), to deal with the Software without restriction, 
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, 
and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

* Redistributions of source code must retain the above copyright notice, 
  this list of conditions and the following disclaimers.

* Redistributions in binary form must reproduce the above copyright 
  notice, this list of conditions and the following disclaimers in the 
  documentation and/or other materials provided with the distribution.

* Neither the names of Terrain Data, Inc., Terrain, nor the names of its 
  contributors may be used to endorse or promote products derived from
  this Software without specific prior written permission.

This license supersedes any copyright notice, license, or related statement
following this comment block.  All files in this repository are provided
under the same license, regardless of whether a corresponding comment block
appears in them.  This license also applies retroactively to any previous
state of the repository, including different branches and commits, which
were made public on or after December 8th, 2018.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
CONTRIBUTORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS WITH
THE SOFTWARE.
*/

// Copyright 2017 Terrain Data, Inc.

import { Readable } from 'stream';

import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import ElasticClient from '../../../database/elastic/client/ElasticClient';
import BufferedElasticReader from '../../../database/elastic/streams/BufferedElasticReader';

/**
 * Types of merge joins
 */
export enum MergeJoinType
{
  LEFT_OUTER_JOIN,
  INNER_JOIN,
}

export enum StreamType
{
  Left,
  Right,
}

/**
 * Applies a group join to an output stream
 */
export default class MergeJoinTransform extends Readable
{
  private client: ElasticClient;
  private type: MergeJoinType;

  private leftSource: BufferedElasticReader;
  private leftBuffer: object | null;
  private leftPosition: number;
  private rightSource: BufferedElasticReader;
  private rightBuffer: object | null;
  private rightPosition: number;

  private mergeJoinName: string;
  private joinKey: string;

  constructor(client: ElasticClient, queryStr: string, type: MergeJoinType = MergeJoinType.LEFT_OUTER_JOIN)
  {
    super({
      objectMode: true,
    });

    this.client = client;
    this.type = type;

    const parser = new ESJSONParser(queryStr, true);
    if (parser.hasError())
    {
      throw parser.getErrors();
    }

    const query = parser.getValue();
    const mergeJoinQuery = query['mergeJoin'];
    delete query['mergeJoin'];

    // read merge join options from the query
    if (mergeJoinQuery['joinKey'] !== undefined)
    {
      this.joinKey = mergeJoinQuery['joinKey'];
      delete mergeJoinQuery['joinKey'];
    }

    const innerQueries = Object.keys(mergeJoinQuery);
    if (innerQueries.length > 1)
    {
      throw Error('Only one inner query currently supported for merge joins.');
    }
    this.mergeJoinName = innerQueries[0];

    // set up the left source
    const leftQuery = this.setSortClause(query);
    this.leftBuffer = null;
    this.leftSource = new BufferedElasticReader(client, leftQuery,
      ((buffer: object[]) => this.accumulateBuffer(buffer, StreamType.Left)).bind(this));
    this.leftPosition = 0;

    // set up the right source
    delete mergeJoinQuery[this.mergeJoinName]['size'];
    const rightQuery = this.setSortClause(mergeJoinQuery[this.mergeJoinName]);
    this.rightBuffer = null;
    this.rightSource = new BufferedElasticReader(client, rightQuery,
      ((buffer: object[]) => this.accumulateBuffer(buffer, StreamType.Right)).bind(this));
    this.rightPosition = 0;
  }

  public _read(size: number = 1024)
  {
    this.leftSource._read();
    this.rightSource._read();
  }

  public _destroy(error, callback)
  {
    this.leftSource._destroy(error, callback);
    this.rightSource._destroy(error, callback);
  }

  private accumulateBuffer(buffer: object[], type: StreamType): void
  {
    if (buffer.length !== 0)
    {
      if (buffer[0]['hits'].hits === undefined)
      {
        buffer[0]['hits'].hits = [];
      }

      for (let i = 1; i < buffer.length; ++i)
      {
        buffer[0]['hits'].hits = buffer[0]['hits'].hits.concat(buffer[i]['hits'].hits);
      }
    }

    if (type === StreamType.Left)
    {
      this.leftBuffer = buffer[0];
    }
    else if (type === StreamType.Right)
    {
      this.rightBuffer = buffer[0];
    }
    else
    {
      this.emit('error', new Error('Unknown stream type ' + String(type)));
      return;
    }

    this.mergeJoin();
  }

  private mergeJoin(): void
  {
    if (this.leftBuffer === null || this.rightBuffer === null)
    {
      return;
    }

    const left = this.leftBuffer['hits'].hits;
    const right = this.rightBuffer['hits'].hits;

    if (left.length === 0 || right.length === 0)
    {
      return;
    }

    // advance left and right streams
    while (this.leftPosition < left.length
      && this.rightPosition < right.length)
    {
      let l = left[this.leftPosition]['_source'][this.joinKey];
      let r = right[this.rightPosition]['_source'][this.joinKey];

      while (l !== r)
      {
        if (l < r)
        {
          this.leftPosition++;
          l = left[this.leftPosition]['_source'][this.joinKey];

          if (l < r)
          {
            if (this.type === MergeJoinType.LEFT_OUTER_JOIN)
            {
              this.leftBuffer['hits'].hits[this.leftPosition][this.mergeJoinName] = [];
            }
            else if (this.type === MergeJoinType.INNER_JOIN)
            {
              delete this.leftBuffer['hits'].hits[this.leftPosition];
            }
          }
        }
        else if (r < l)
        {
          this.rightPosition++;
          r = right[this.rightPosition]['_source'][this.joinKey];
        }

        // if either of the streams went dry, request more
        if (this.leftPosition === left.length)
        {
          this.push(this.leftBuffer);
          this.leftBuffer = [];
          this.leftPosition = 0;
          return;
        }

        if (this.rightPosition === right.length)
        {
          this.rightBuffer = [];
          this.rightPosition = 0;
          return;
        }
      }

      // start merging
      left[this.leftPosition][this.mergeJoinName] = [];
      let j = this.rightPosition;
      while (l === r && j < right.length)
      {
        left[this.leftPosition][this.mergeJoinName].push(right[j]);
        j++;
        r = right[j]['_source'][this.joinKey];
      }

      if (j === right.length)
      {
        this.rightBuffer = [];
        return;
      }

      this.rightPosition++;
      this.leftPosition++;
    }

    // push the merged result out to the stream
    this.push(this.leftBuffer);
    this.leftBuffer = [];

    // check if we are done
    if (this.leftSource.isEmpty())
    {
      this.push(null);
    }
  }

  private setSortClause(query: object)
  {
    const joinClause = { [this.joinKey]: 'asc' };
    if (query['sort'] === undefined)
    {
      query['sort'] = joinClause;
    }
    else if (Array.isArray(query['sort'] === 'array'))
    {
      query['sort'].unshift(joinClause);
    }
    else
    {
      query['sort'] = [
        joinClause,
        query['sort'],
      ];
    }
    return query;
  }
}
