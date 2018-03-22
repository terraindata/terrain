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

import * as Deque from 'double-ended-queue';
import { Readable } from 'stream';

import ESParameterFiller from '../../../../../shared/database/elastic/parser/EQLParameterFiller';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import ElasticClient from '../../../database/elastic/client/ElasticClient';

interface Ticket
{
  count: number;
  results: object[];
}

/**
 * Applies a group join to an output stream
 */
export default class GroupJoinTransform extends Readable
{
  private client: ElasticClient;
  private source: Readable;
  private query: string;

  private blockSize: number = 256;
  private maxPendingQueries: number = 4;

  private maxBufferedInputs: number;
  private bufferedInputs: object[];
  private maxBufferedOutputs: number;
  private bufferedOutputs: Deque<Ticket>;

  private sourceIsEmpty: boolean = false;
  private continueReading: boolean = false;

  private dropIfLessThan: number = 0;
  private parentAlias: string = 'parent';

  private subqueryValueInfos: { [key: string]: ESValueInfo | null } = {};

  private _onRead: () => void;
  private _onError: () => void;
  private _onEnd: () => void;

  constructor(client: ElasticClient, source: Readable, queryStr: string)
  {
    super({
      objectMode: true,
    });

    this.client = client;
    this.source = source;

    const parser = new ESJSONParser(queryStr, true);
    if (parser.hasError())
    {
      throw parser.getErrors();
    }

    const query = parser.getValue();
    // read groupJoin options from the query
    if (query['dropIfLessThan'] !== undefined)
    {
      this.dropIfLessThan = query['dropIfLessThan'];
      delete query['dropIfLessThan'];
    }

    if (query['parentAlias'] !== undefined)
    {
      this.parentAlias = query['parentAlias'];
      delete query['parentAlias'];
    }

    this.query = query;
    for (const k of Object.keys(query))
    {
      this.subqueryValueInfos[k] = parser.getValueInfo().objectChildren[k].propertyValue;
    }

    this.maxBufferedInputs = this.blockSize;
    this.bufferedInputs = [];
    this.maxBufferedOutputs = this.maxPendingQueries;
    this.bufferedOutputs = new Deque<Ticket>(this.maxBufferedOutputs);

    this._onRead = this.readFromStream.bind(this);
    this._onError = ((e) => this.emit('error', e)).bind(this);
    this._onEnd = this._final.bind(this);

    this.source.on('readable', this._onRead);
    this.source.on('error', this._onError);
    this.source.on('end', this._onEnd);
  }

  public _read(size: number = 1024)
  {
    if (!this.sourceIsEmpty
      && this.bufferedInputs.length < this.maxBufferedInputs
      && this.bufferedOutputs.length < this.maxBufferedOutputs)
    {
      this.continueReading = true;
    }
  }

  public _destroy(error, callback)
  {
    this._final(callback);
  }

  public _final(callback)
  {
    this.source.removeListener('readable', this._onRead);
    this.source.removeListener('error', this._onError);
    this.source.removeListener('end', this._onEnd);

    this.continueReading = false;
    this.sourceIsEmpty = true;
    if (callback !== undefined)
    {
      callback();
    }
  }

  private readFromStream(): void
  {
    // should we keep reading from the source stream?
    if (!this.continueReading)
    {
      return;
    }

    // if yes, keep buffering inputs from the source stream
    const obj = this.source.read();
    if (obj === null)
    {
      this.sourceIsEmpty = true;
    }
    else
    {
      this.bufferedInputs.push(obj);
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
    const query = this.query;
    const numInputs = inputs.length;
    const numQueries = Object.keys(query).length;

    // issue a ticket to track the progress of this query; count indicates the number of subqueries
    // associated with this query
    const ticket: Ticket = {
      count: numQueries,
      results: inputs,
    };
    this.bufferedOutputs.push(ticket);
    for (const subQuery of Object.keys(query))
    {
      const body: any[] = [];
      for (let i = 0; i < numInputs; ++i)
      {
        const vi = this.subqueryValueInfos[subQuery];
        if (vi !== null)
        {
          // winston.debug('parentObject ' + JSON.stringify(hits[j]._source, null, 2));
          const header = {};
          body.push(header);

          try
          {
            const queryStr = ESParameterFiller.generate(
              vi,
              {
                [this.parentAlias]: inputs[i]['_source'],
              });
            body.push(queryStr);
          }
          catch (e)
          {
            this.emit('error', e);
            return;
          }
        }
      }

      if (body.length === 0)
      {
        ticket.count--;
        continue;
      }

      try
      {
        this.client.msearch(
          {
            body,
          },
          (error: Error | null, response: any) =>
          {
            if (error !== null && error !== undefined)
            {
              this.emit('error', error);
              return;
            }
            if (response.error !== undefined)
            {
              this.emit('error', response.error);
              return;
            }

            for (let j = 0; j < numInputs; ++j)
            {
              if (response.responses[j] !== undefined && response.responses[j].hits !== undefined)
              {
                ticket.results[j][subQuery] = response.responses[j].hits.hits;
              }
              else
              {
                ticket.results[j][subQuery] = [];
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
                    const shouldPass = Object.keys(query).reduce((acc, q) =>
                    {
                      return acc && (obj[q] !== undefined && obj[q].length >= this.dropIfLessThan);
                    }, true);

                    if (shouldPass)
                    {
                      this.push(obj);
                    }
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
      catch (e)
      {
        this.emit('error', e);
        return;
      }
    }
  }
}
