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

import { ElasticQueryHit } from '../../../../../shared/database/elastic/ElasticQueryResponse';
import ESParameterFiller from '../../../../../shared/database/elastic/parser/EQLParameterFiller';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import ElasticClient from '../../../database/elastic/client/ElasticClient';
import ElasticReader from '../../../database/elastic/streams/ElasticReader';
import SafeReadable from './SafeReadable';

interface Ticket
{
  count: number;
  response: object;
}

/**
 * Applies a group join to an output stream
 */
export default class GroupJoinTransform extends SafeReadable
{
  private client: ElasticClient;
  private source: ElasticReader;
  private query: object;

  private maxPendingQueries: number = 2;
  private maxBufferedOutputs: number;
  private bufferedOutputs: Deque<Ticket>;

  private dropIfLessThan: number = 0;
  private parentAlias: string = 'parent';

  private subqueryValueInfos: { [key: string]: ESValueInfo | null } = {};

  constructor(client: ElasticClient, queryStr: string, streaming: boolean = false)
  {
    super({
      objectMode: true,
    });

    this.client = client;

    try
    {
      const parser = new ESJSONParser(queryStr, true);
      if (parser.hasError())
      {
        throw parser.getErrors();
      }

      const query = parser.getValue();
      const groupJoinQuery = query['groupJoin'];
      delete query['groupJoin'];

      // read groupJoin options from the query
      if (groupJoinQuery['dropIfLessThan'] !== undefined)
      {
        this.dropIfLessThan = groupJoinQuery['dropIfLessThan'];
        delete groupJoinQuery['dropIfLessThan'];
      }

      if (groupJoinQuery['parentAlias'] !== undefined)
      {
        this.parentAlias = groupJoinQuery['parentAlias'];
        delete groupJoinQuery['parentAlias'];
      }

      this.query = groupJoinQuery;
      for (const k of Object.keys(groupJoinQuery))
      {
        const valueInfo = parser.getValueInfo().objectChildren['groupJoin'].propertyValue;
        if (valueInfo !== null)
        {
          this.subqueryValueInfos[k] = valueInfo.objectChildren[k].propertyValue;
        }
      }
      this.maxBufferedOutputs = this.maxPendingQueries;
      this.bufferedOutputs = new Deque<Ticket>(this.maxBufferedOutputs);

      this.source = new ElasticReader(client, query, streaming);
      this.source.on('readable', () =>
      {
        let response = this.source.read();
        while (response !== null)
        {
          this.dispatchSubqueryBlock(response);
          response = this.source.read();
        }
      });
      this.source.on('error', (e) => this.emit('error', e));

    }
    catch (e)
    {
      throw e;
    }
  }

  public _read(size: number = 1024)
  {
    if (this.bufferedOutputs.length < this.maxBufferedOutputs)
    {
      this.source._read();
    }
  }

  public _destroy(error, callback)
  {
    this.source._destroy(error, callback);
  }

  private dispatchSubqueryBlock(response: object): void
  {
    const query = this.query;
    const inputs = response['hits'].hits;
    const numInputs = inputs.length;
    const numQueries = Object.keys(query).length;

    // issue a ticket to track the progress of this query; count indicates the number of subqueries
    // associated with this query
    const ticket: Ticket = {
      count: numQueries,
      response,
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

      this.client.msearch(
        {
          body,
        },
        this.makeSafe((error: Error | null | undefined, resp: any) =>
        {
          if (error !== null && error !== undefined)
          {
            this.emit('error', error);
            return;
          }

          if (resp.error !== undefined)
          {
            this.emit('error', resp.error);
            return;
          }

          for (let j = 0; j < numInputs; ++j)
          {
            if (resp.responses[j] !== undefined && resp.responses[j].hits !== undefined)
            {
              ticket.response['hits'].hits[j][subQuery] = resp.responses[j].hits.hits;
            }
            else
            {
              ticket.response['hits'].hits[j][subQuery] = [];
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
              front.response['hits'].hits = front.response['hits'].hits.filter(
                (obj) =>
                {
                  return Object.keys(query).reduce((acc, q) =>
                  {
                    return acc && (obj[q] !== undefined && obj[q].length >= this.dropIfLessThan);
                  }, true);
                },
              );
              this.push(front.response);
              this.bufferedOutputs.shift();
            }
            else
            {
              done = true;
            }
          }

          if (this.source.isEmpty()
            && this.bufferedOutputs.length === 0)
          {
            this.push(null);
          }
        }));
    }
  }
}
