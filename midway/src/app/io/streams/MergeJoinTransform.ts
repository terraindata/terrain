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

import ESParameterFiller from '../../../../../shared/database/elastic/parser/EQLParameterFiller';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import ElasticClient from '../../../database/elastic/client/ElasticClient';
import { ElasticStream } from '../../../database/elastic/query/ElasticStream';

/**
 * Types of merge joins
 */
enum MergeJoinType {
  LEFT_OUTER_JOIN,
  FULL_OUTER_JOIN,
  INNER_JOIN,
}

/**
 * Merge join source
 */
interface Source
{
  query: object;
  stream: Readable;

  maxBufferSize: number;
  position: number;
  buffer: object[];

  shouldContinue: boolean;
  isEmpty: boolean;

  _onRead: () => void;
  _onEnd: () => void;
}

/**
 * Applies a group join to an output stream
 */
export default class MergeJoinTransform extends Readable
{
  private client: ElasticClient;

  private leftSource: Source;
  private rightSource: Source;

  private mergeJoinName: string;
  private joinKey: string;

  constructor(client: ElasticClient, queryStr: string, type: MergeJoinType = MergeJoinType.INNER_JOIN)
  {
    super({
      objectMode: true,
    });

    this.client = client;

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
    this.leftSource = {
      query: leftQuery,
      stream: new ElasticStream(this.client, leftQuery),

      maxBufferSize: 512,
      position: 0,
      buffer: [],

      shouldContinue: true,
      isEmpty: false,

      _onRead: this.readFromStream.bind(this, this.leftSource),
      _onEnd: this._final.bind(this, this.leftSource),
    };

    // set up the right source
    delete mergeJoinQuery[this.mergeJoinName]['size'];
    const rightQuery = this.setSortClause(mergeJoinQuery[this.mergeJoinName]);
    this.rightSource = {
      query: rightQuery,
      stream: new ElasticStream(this.client, rightQuery),

      maxBufferSize: 512,
      position: 0,
      buffer: [],

      shouldContinue: true,
      isEmpty: false,

      _onRead: this.readFromStream.bind(this, this.rightSource),
      _onEnd: this._final.bind(this, this.rightSource),
    };

    // prepare stream event handlers for both sources
    this.leftSource.stream.on('readable', this.leftSource._onRead);
    this.leftSource.stream.on('end', this.leftSource._onEnd);
    this.rightSource.stream.on('readable', this.rightSource._onRead);
    this.rightSource.stream.on('end', this.rightSource._onEnd);
  }

  public _read(size: number = 1024)
  {
    if (!this.leftSource.isEmpty
      && this.leftSource.buffer.length < this.leftSource.maxBufferSize)
    {
      this.leftSource.shouldContinue = true;
    }

    if (!this.rightSource.isEmpty
      && this.rightSource.buffer.length < this.rightSource.maxBufferSize)
    {
      this.rightSource.shouldContinue = true;
    }
  }

  public _destroy(error, callback)
  {
    this._final(callback);
  }

  public _final(callback)
  {
    this.leftSource.stream.removeListener('readable', this.leftSource._onRead);
    this.leftSource.stream.removeListener('end', this.leftSource._onEnd);

    this.rightSource.stream.removeListener('readable', this.rightSource._onRead);
    this.rightSource.stream.removeListener('end', this.rightSource._onEnd);

    this.leftSource.shouldContinue = false;
    this.rightSource.shouldContinue = false;
    this.leftSource.isEmpty = true;
    this.rightSource.isEmpty = true;

    if (callback !== undefined)
    {
      callback();
    }
  }

  private readFromStream(source: Source): void
  {
    // should we keep reading from the source streams?
    if (!source.shouldContinue)
    {
      return;
    }

    // if yes, keep buffering inputs from the source stream

    const obj = source.stream.read();
    if (obj === null)
    {
      source.isEmpty = true;
    }
    else
    {
      source.buffer.push(obj);
    }

    // if we have data buffered up to blockSize, swap the input buffer list out
    // and dispatch a subquery block
    if (source.buffer.length >= source.maxBufferSize ||
      source.isEmpty && source.buffer.length > 0)
    {
      const inputs = source.buffer;
      source.buffer = [];
      this.mergeJoin();
    }
  }

  private mergeJoin(): void
  {
    const left = this.leftSource.buffer;
    const right = this.rightSource.buffer;

    const numLeft = left.length;
    const numRight = right.length;

    let l = left[this.leftSource.position]['_source'][this.joinKey];
    let r = right[this.rightSource.position]['_source'][this.joinKey];

    while (l < r && this.leftSource.position < numLeft)
    {
      this.leftSource.position++;
      l = left[this.leftSource.position]['_source'][this.joinKey];
    }

    if (this.leftSource.position === numLeft)
    {
      this.leftSource.shouldContinue = true;
      return;
    }

    while (r < l && this.rightSource.position < numRight)
    {
      this.rightSource.position++;
      r = right[this.rightSource.position]['_source'][this.joinKey];
    }

    if (this.rightSource.position === numRight)
    {
      this.rightSource.shouldContinue = true;
      return;
    }

    while (r === l)
    {

      j++;
      r = right[i]['_source'][this.joinKey];
    }


    for (let i = 0, j = 0; i < numInputs; ++i)
    {


      let k = j;
      while (k < response.hits.hits.length &&
        (ticket.results[i]['_source'][this.joinKey] === response.hits.hits[k]._source[this.joinKey]))
      {
        ticket.results[i][subQuery].push(response.hits.hits[k]);
        k++;
      }


    // check if we have anything to push to the output stream
    let done = false;
    while (!done && this.bufferedOutputs.length > 0)
    {
      const front = this.bufferedOutputs.peekFront();
      if (front !== undefined && front.count === 0)
      {
        while (front.results.length > 0)
        {
          const obj = front.results.shift();
          if (obj !== undefined)
          {
            this.push(obj);
          }
        }
        this.bufferedOutputs.shift();
      }
      else
      {
        done = true;
      }
    }

    if (this.sourceIsEmpty
      && this.bufferedOutputs.length === 0
      && this.bufferedInputs.length === 0)
    {
      this.push(null);
    }

    this.continueReading = false;
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
