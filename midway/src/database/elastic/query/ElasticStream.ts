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

import * as Elastic from 'elasticsearch';
import * as Stream from 'stream';
import * as winston from 'winston';

import { ElasticQueryHit } from '../../../../../shared/database/elastic/ElasticQueryResponse';
import ElasticClient from '../client/ElasticClient';

export class ElasticStream extends Stream.Readable
{
  private client: ElasticClient;
  private query: any;

  private querying: boolean = false;
  private doneReading: boolean = false;
  private rowsProcessed: number = 0;
  private scroll: string;
  private size: number;

  private scrollID: string | undefined = undefined;

  private MAX_SEARCH_SIZE: number = 10 * 1000;
  private DEFAULT_SEARCH_SIZE: number = 8 * 1024;
  private DEFAULT_SCROLL_TIMEOUT: string = '5m';

  private numRequested: number = 0;

  constructor(client: ElasticClient, query: any)
  {
    super({ objectMode: true, highWaterMark: 1024 * 128 });

    this.client = client;
    this.query = query;

    this.size = (query['size'] !== undefined) ? query['size'] as number : this.DEFAULT_SEARCH_SIZE;
    this.scroll = (query['scroll'] !== undefined) ? query['scroll'] : this.DEFAULT_SCROLL_TIMEOUT;

    try
    {
      this.querying = true;
      this.client.search({
        body: this.query,
        scroll: this.scroll,
        size: Math.min(this.size, this.MAX_SEARCH_SIZE),
      },
        (error, response): void =>
        {
          this.scrollCallback(error, response);
        });
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public _read(size: number = 1024)
  {
    this.numRequested = size;
    this.continueScrolling();
  }

  public _destroy(error, callback)
  {
    this._final(callback);
  }

  public _final(callback)
  {
    this.doneReading = true;
    this.continueScrolling();
    if (callback !== undefined)
    {
      callback();
    }
  }

  private scrollCallback(error, response): void
  {
    if (typeof response._scroll_id === 'string')
    {
      this.scrollID = response._scroll_id;
    }

    if (error !== null && error !== undefined)
    {
      this.emit('error', error);
    }

    let hits: ElasticQueryHit[] = response.hits.hits;
    let length: number = hits.length;

    // trim off excess results
    if (this.rowsProcessed + length > this.size)
    {
      length = this.size - this.rowsProcessed;
      hits = hits.slice(0, length);
    }

    this.rowsProcessed += length;
    this.numRequested = Math.max(0, this.numRequested - length);

    for (let i = 0; i < hits.length; ++i)
    {
      this.push(hits[i]);
    }

    this.querying = false;
    this.doneReading = this.doneReading
      || length <= 0
      || this.rowsProcessed >= this.size;

    this.continueScrolling();
  }

  private continueScrolling()
  {
    if (this.querying)
    {
      return;
    }

    if (this.doneReading)
    {
      // stop scrolling
      if (this.scrollID !== undefined)
      {
        this.client.clearScroll({
          scrollId: this.scrollID,
        }, (_err, _resp) =>
          {
            this.push(null);
          });

        this.scrollID = undefined;
      }

      return;
    }

    if (this.numRequested > 0)
    {
      // continue scrolling
      this.querying = true;
      this.client.scroll({
        scrollId: this.scrollID,
        scroll: this.scroll,
      } as Elastic.ScrollParams,
        (error, response) =>
        {
          this.scrollCallback(error, response);
        });
    }
  }
}

export default ElasticStream;