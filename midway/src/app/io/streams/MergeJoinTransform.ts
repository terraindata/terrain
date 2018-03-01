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
import BufferedElasticStream from './BufferedElasticStream';

/**
 * Types of merge joins
 */
export enum MergeJoinType {
  LEFT_OUTER_JOIN,
  INNER_JOIN,
}

/**
 * Applies a group join to an output stream
 */
export default class MergeJoinTransform extends Readable
{
  private client: ElasticClient;
  private type: MergeJoinType;

  private leftSource: BufferedElasticStream;
  private rightSource: BufferedElasticStream;

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
    this.leftSource = new BufferedElasticStream(client, leftQuery, this.mergeJoin.bind(this));

    // set up the right source
    delete mergeJoinQuery[this.mergeJoinName]['size'];
    const rightQuery = this.setSortClause(mergeJoinQuery[this.mergeJoinName]);
    this.rightSource = new BufferedElasticStream(client, rightQuery, this.mergeJoin.bind(this));
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

  private mergeJoin(): void
  {
    const left = this.leftSource.buffer;
    const right = this.rightSource.buffer;

    if (left.length === 0 || right.length === 0)
    {
      return;
    }

    let l = left[this.leftSource.position][this.joinKey];
    let r = right[this.rightSource.position][this.joinKey];

    console.log(l);
    console.log(r);

    // advance left and right streams
    while (this.leftSource.position < left.length
      && this.rightSource.position < right.length)
    {
      while (l !== r)
      {
        if (l < r)
        {
          console.log('advancing left...');
          this.leftSource.position++;
          l = left[this.leftSource.position][this.joinKey];

          if (this.type === MergeJoinType.LEFT_OUTER_JOIN)
          {
            left[this.leftSource.position][this.mergeJoinName] = [];
            this.push(left[this.leftSource.position]);
          }
        }
        else if (r < l)
        {
          console.log('advancing right...');
          this.rightSource.position++;
          r = right[this.rightSource.position][this.joinKey];
        }

        console.log('must be equal...!!!??');
        // if either of the streams went dry, request more
        if (this.leftSource.position === left.length)
        {
          this.leftSource.resetBuffer();
          return;
        }

        if (this.rightSource.position === right.length)
        {
          this.rightSource.resetBuffer();
          return;
        }
      }

      // start merging
      left[this.leftSource.position][this.mergeJoinName] = [];
      let j = this.rightSource.position;
      while (l === r && j < right.length - 1)
      {
        left[this.leftSource.position][this.mergeJoinName].push(right[j]);
        j++;
        r = right[j][this.joinKey];
      }

      if (j === right.length)
      {
        this.rightSource.resetBuffer();
        return;
      }

      // push the merged result out to the stream
      this.push(left[this.leftSource.position]);
      this.leftSource.position++;
    }

    this.leftSource.resetBuffer();

    // check if we are done
    if (this.leftSource.isEmpty() && this.rightSource.isEmpty())
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
