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

// Copyright 2018 Terrain Data, Inc.

import * as Deque from 'double-ended-queue';
import { Readable } from 'stream';

import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ElasticClient from '../../../database/elastic/client/ElasticClient';
import ElasticReader from '../../../database/elastic/streams/ElasticReader';

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

  private leftSource: ElasticReader;
  private leftBuffer: Deque<object> = new Deque();
  private leftEnded: boolean = false;

  private rightSource: ElasticReader;
  private rightBuffer: Deque<object> = new Deque();
  private rightEnded: boolean = false;

  private mergeJoinName: string;
  private leftJoinKey: string;
  private rightJoinKey: string;

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
    if (mergeJoinQuery['leftJoinKey'] !== undefined)
    {
      this.leftJoinKey = mergeJoinQuery['leftJoinKey'];
      delete mergeJoinQuery['leftJoinKey'];
    }

    if (mergeJoinQuery['rightJoinKey'] !== undefined)
    {
      this.rightJoinKey = mergeJoinQuery['rightJoinKey'];
      delete mergeJoinQuery['rightJoinKey'];
    }
    else
    {
      if (this.leftJoinKey !== undefined)
      {
        this.rightJoinKey = this.leftJoinKey;
      }
    }
    if (mergeJoinQuery['leftJoinKey'] === undefined && this.rightJoinKey !== undefined)
    {
      this.leftJoinKey = this.rightJoinKey;
    }

    const innerQueries = Object.keys(mergeJoinQuery);
    if (innerQueries.length > 1)
    {
      throw Error('Only one inner query currently supported for merge joins.');
    }
    this.mergeJoinName = innerQueries[0];
    // set up the left source
    const leftQuery = this.setSortClause(query, this.leftJoinKey);

    // the left join key could be a string, in which case it is either of type keyword and we can sort
    // on it directly, or it has a nested subfield of type keyword. in the latter case, the actual field
    // in the document does not have a ".keyword" suffix and hence we strip out the suffix.
    this.leftJoinKey = this.leftJoinKey.replace('.keyword', '');

    this.leftSource = new ElasticReader(client, leftQuery, true);
    this.leftSource.on('data', (buffer) =>
    {
      this.accumulateBuffer(buffer, StreamType.Left);
    });
    this.leftSource.on('error', (e) => this.emit('error', e));
    this.leftSource.on('end', () => { this.leftEnded = true; this.mergeJoin(); });

    // set up the right source
    if (mergeJoinQuery[this.mergeJoinName]['size'] === undefined)
    {
      mergeJoinQuery[this.mergeJoinName]['size'] = 2147483647;
    }
    const rightQuery = this.setSortClause(mergeJoinQuery[this.mergeJoinName], this.rightJoinKey);

    // the right join key could be a string, in which case it is either of type keyword and we can sort
    // on it directly, or it has a nested subfield of type keyword. in the latter case, the actual field
    // in the document does not have a ".keyword" suffix and hence we strip out the suffix.
    this.rightJoinKey = this.rightJoinKey.replace('.keyword', '');

    this.rightSource = new ElasticReader(client, rightQuery, true);
    this.rightSource.on('data', (buffer) =>
    {
      this.accumulateBuffer(buffer, StreamType.Right);
    });
    this.rightSource.on('error', (e) => this.emit('error', e));
    this.rightSource.on('end', () => { this.rightEnded = true; this.mergeJoin(); });
  }

  public _read(size: number = 1024)
  {
    this.leftSource._read();
    this.rightSource._read();
  }

  public _destroy(error, callback)
  {
    this.rightSource._destroy(error, () => this.leftSource._destroy(error, callback));
  }

  private accumulateBuffer(buffer: object | null, type: StreamType): void
  {
    if (buffer === null)
    {
      return;
    }

    if (type === StreamType.Left)
    {
      this.leftBuffer.push(...buffer['hits'].hits);
    }
    else if (type === StreamType.Right)
    {
      this.rightBuffer.push(...buffer['hits'].hits);
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
    if (this.leftBuffer.isEmpty())
    {
      if (this.leftEnded)
      {
        this.push(null);
      }
      return;
    }

    if (this.rightBuffer.isEmpty())
    {
      if (this.rightEnded && !this.leftEnded)
      {
        this.push(null);
      }
      return;
    }

    const left = this.leftBuffer;
    const right = this.rightBuffer;

    if (left.length === 0)
    {
      this.leftBuffer.clear();
      return;
    }

    if (right.length === 0)
    {
      this.rightBuffer.clear();
      return;
    }

    const LB = [];
    // advance left and right streams
    while (!left.isEmpty() && !right.isEmpty())
    {
      let l = left.peekFront()['_source'][this.leftJoinKey];
      let r = right.peekFront()['_source'][this.rightJoinKey];

      while (l !== r
        && !left.isEmpty()
        && !right.isEmpty())
      {
        l = left.peekFront()['_source'][this.leftJoinKey];
        r = right.peekFront()['_source'][this.rightJoinKey];

        left.peekFront()[this.mergeJoinName] = [];
        if (l < r)
        {
          if (this.type === MergeJoinType.INNER_JOIN)
          {
            left.shift();
          }
          else
          {
            LB.push(left.shift());
          }
        }
        else if (r < l)
        {
          right.shift();
        }
      }

      // start merging
      left.peekFront()[this.mergeJoinName] = [];
      const right2 = new Deque(right.toArray());
      while (!right2.isEmpty() && l === right2.peekFront()['_source'][this.rightJoinKey])
      {
        left.peekFront()[this.mergeJoinName].push(right2.shift()['_source']);
      }

      LB.push(left.shift());
    }

    this.push({ hits: { hits: LB } });
  }

  private setSortClause(query: object, joinKey: string)
  {
    const joinClause = { [joinKey]: 'asc' };
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
