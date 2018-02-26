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

import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ESParameterFiller from '../../../../../shared/database/elastic/parser/EQLParameterFiller';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import ElasticClient from '../../../database/elastic/client/ElasticClient';
import { setTimeout } from 'timers';

/**
 * Applies a group join to an output stream
 */
export default class GroupJoinTransform extends Readable
{
  private client: ElasticClient;

  private source: Readable;
  
  private query: object;

  private blockSize = 512;
  private maxPendingQueries: number = 8;

  private pendingQueries: Deque<Promise<any>>;

  private maxBufferedOutputs: number;
  private bufferedOutputs: Deque<object>;

  private sourceIsEmpty: boolean = false;
  private sourceIsReadable: boolean = false;

  private dropIfLessThan: number = 0;
  private parentAlias: string = 'parent';

  private subqueryValueInfos: { [key: string]: ESValueInfo | null };

  constructor(client: ElasticClient, source: Readable, query: object)
  {
    super({
      objectMode: true
    });

    this.client = client;
    this.source = source;

    // determine other groupJoin settings from the query
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

    const parser = new ESJSONParser(JSON.stringify(query), true);
    if (parser.hasError())
    {
      throw parser.getErrors();
    }

    this.query = query;
    // for (const k of Object.keys(query))
    // {
    //   this.subqueryValueInfos[k] = parser.getValueInfo().objectChildren[k].propertyValue;
    // }

    this.pendingQueries = new Deque<Promise<any>>(this.maxPendingQueries);
    this.maxBufferedOutputs = this.blockSize * this.maxPendingQueries;
    this.bufferedOutputs = new Deque<object>(this.maxBufferedOutputs);
  }

  public _read(size: number = 1024)
  {
    if (!this.sourceIsEmpty
      && this.bufferedOutputs.length < this.maxBufferedOutputs
      && this.pendingQueries.length < this.maxPendingQueries)
    {
      this.dispatchSubqueryBlock();
    }
  }

  private waitForSourceToBeReadable(): void
  {
    if (this.sourceIsReadable)
    {
      return;
    }

    setTimeout(this.waitForSourceToBeReadable, 1);
  }

  private dispatchSubqueryBlock(): void
  {
    const query = this.query;
    const inputs: object[] = [];

    this.waitForSourceToBeReadable();
    console.log(this.sourceIsReadable);

    while (inputs.length < this.blockSize && !this.sourceIsEmpty)
    {
      const obj = this.source.read();
      if (obj === null)
      {
        this.sourceIsEmpty = true;
      }
      else
      {
        inputs.push(obj);
      }
    }

    for (const subQuery of Object.keys(query))
    {
      // const body: any[] = [];
      // for (const input of inputs)
      // {
      //   const vi = this.subqueryValueInfos[subQuery];
      //   if (vi !== null)
      //   {
      //     // winston.debug('parentObject ' + JSON.stringify(hits[j]._source, null, 2));
      //     const header = {};
      //     body.push(header);
    
      //     const queryStr = ESParameterFiller.generate(
      //       vi,
      //       {
      //         [this.parentAlias]: input['_source'] 
      //       });
      //     body.push(queryStr);
      //   }
      // }  

      // this.pendingQueries.push(new Promise((resolve, reject) =>
      // {
      //   this.client.msearch(
      //     {
      //       body,
      //     },
      //     (error: Error | null, response: any) =>
      //     {
      //       if (error !== null && error !== undefined)
      //       {
      //         return reject(error);
      //       }

      //       for (let j = 0; j < inputs.length; ++j)
      //       {
      //         if (response.error !== undefined)
      //         {
      //           return reject(response.error);
      //         }

      //         if (response.responses[j].hits !== undefined)
      //         {
      //           inputs[j][subQuery] = response.responses[j].hits.hits;
      //         }
      //       }
      //       resolve();
      //     });
      // }));
    }

    console.log(this.sourceIsEmpty);
    console.log(inputs);
    const numInputs = inputs.length;
    for (let i = 0; i < numInputs; i++)
    {
      const obj = inputs.shift();
      if (obj !== undefined)
      {
        this.push(obj);
      }
    }

    if (this.sourceIsEmpty)
    {
      this.push(null);
    }
  }
}
