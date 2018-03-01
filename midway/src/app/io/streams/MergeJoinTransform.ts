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

interface Source
{
  query: object;
  stream: Readable;

  maxBufferSize: number;
  buffer: object[];

  _continue: boolean;
  _empty: boolean;

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

  private joinKey: string;

  constructor(client: ElasticClient, queryStr: string)
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

    const leftQuery = this.setSortClause(query);
    this.leftSource = {
      query: leftQuery,
      stream: new ElasticStream(this.client, leftQuery),

      maxBufferSize: 512,
      buffer: [],

      _continue: true,
      _empty: false,

      _onRead: this.readFromStream.bind(this, this.leftSource),
      _onEnd: this._final.bind(this, this.leftSource),
    };

    const rightQuery = this.setSortClause(mergeJoinQuery[innerQueries[0]]);
    this.rightSource = {
      query: rightQuery,
      stream: new ElasticStream(this.client, rightQuery),

      maxBufferSize: 512,
      buffer: [],

      _continue: true,
      _empty: false,

      _onRead: this.readFromStream.bind(this, this.rightSource),
      _onEnd: this._final.bind(this, this.rightSource),
    };

    // prepare stream event handlers
    this.leftSource.stream.on('readable', this.leftSource._onRead);
    this.leftSource.stream.on('end', this.leftSource._onEnd);
    this.rightSource.stream.on('readable', this.rightSource._onRead);
    this.rightSource.stream.on('end', this.rightSource._onEnd);
  }

  public _read(size: number = 1024)
  {
    if (!this.leftSourceIsEmpty
      && this.leftBufferedInputs.length < this.maxBufferedInputs)
    {
      this.continueLeft = true;
    }

    if (!this.rightSourceIsEmpty
      && this.rightBufferedInputs.length < this.maxBufferedInputs)
    {
      this.continueRight = true;
    }
  }

  public _destroy(error, callback)
  {
    this._final(callback);
  }

  public _final(callback)
  {
    this.leftSource.removeListener('readable', this._onReadLeft);
    this.leftSource.removeListener('end', this._onEndLeft);

    this.rightSource.removeListener('readable', this._onReadRight);
    this.rightSource.removeListener('end', this._onEndRight);

    this.continueLeft = false;
    this.continueRight = false;
    this.leftSourceIsEmpty = true;
    this.rightSourceIsEmpty = true;
    if (callback !== undefined)
    {
      callback();
    }
  }

  private readFromStream(): void
  {
    // should we keep reading from the source streams?
    if (!_continue)
    {
      return;
    }

    // if yes, keep buffering inputs from the source stream

    const obj = source.read();
    if (obj === null)
    {
      _empty = true;
    }
    else
    {
      this.leftBufferedInputs.push(obj);
    }

    // if we have data buffered up to blockSize, swap the input buffer list out
    // and dispatch a subquery block
    if (this.bufferedInputs.length >= this.blockSize ||
      this.sourceIsEmpty && this.bufferedInputs.length > 0)
    {
      const inputs = this.bufferedInputs;
      this.bufferedInputs = [];
      this.dispatchSubqueryBlock(inputs);
    }
  }

  private dispatchSubqueryBlock(inputs: object[]): void
  {
    const numInputs = inputs.length;
    const numQueries = Object.keys(this.mergeJoinQuery).length;

    // issue a ticket to track the progress of this query; count indicates the number of subqueries
    // associated with this query
    const ticket: Ticket = {
      count: numQueries,
      results: inputs,
    };
    this.bufferedOutputs.push(ticket);

    for (const subQuery of Object.keys(this.mergeJoinQuery))
    {
      const query = this.setSortClause(this.mergeJoinQuery[subQuery]);
      delete query['size'];

      this.client.search(
        {
          body: query,
        },
        (error: Error | null, response: any) =>
        {
          if (error !== null && error !== undefined)
          {
            throw error;
          }

          for (let i = 0, j = 0; i < numInputs; ++i)
          {
            if (ticket.results[i][subQuery] === undefined)
            {
              ticket.results[i][subQuery] = [];
            }

            while (j < response.hits.hits.length &&
              (ticket.results[i]['_source'][this.joinKey] !== response.hits.hits[j]._source[this.joinKey]))
            {
              j++;
            }

            if (j === response.hits.hits.length)
            {
              continue;
            }

            let k = j;
            while (k < response.hits.hits.length &&
              (ticket.results[i]['_source'][this.joinKey] === response.hits.hits[k]._source[this.joinKey]))
            {
              ticket.results[i][subQuery].push(response.hits.hits[k]);
              k++;
            }
          }

          ticket.count--;

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
        });
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
