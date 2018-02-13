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

import ElasticClient from '../client/ElasticClient';

export type StreamTransformer = (error, response) => Promise<typeof response>;

export class ElasticStream extends Stream.Readable
{
  private client: ElasticClient;
  private query: any;

  private isReading: boolean;
  private forceClose: boolean;
  private rowsProcessed: number;
  private scroll: string;
  private size: number;
  private transform: StreamTransformer;

  private MAX_SEARCH_SIZE = 10000;
  private DEFAULT_SEARCH_SIZE = 10;
  private DEFAULT_SCROLL_TIMEOUT = '1m';

  constructor(client: ElasticClient, query: any, opts?: Stream.ReadableOptions, transform?: StreamTransformer)
  {
    super(opts);
    this.client = client;
    this.query = query;
    this.isReading = false;
    this.forceClose = false;
    this.rowsProcessed = 0;

    if (transform !== undefined)
    {
      this.transform = transform;
    }

    this.size = (query['size'] !== undefined) ? query['size'] as number : this.DEFAULT_SEARCH_SIZE;
    this.scroll = (query['scroll'] !== undefined) ? query['scroll'] : this.DEFAULT_SCROLL_TIMEOUT;
  }

  public close()
  {
    this.forceClose = true;
  }

  private async _read()
  {
    if (this.isReading)
    {
      return false;
    }

    this.isReading = true;

    let size = this.size;
    if (size > this.MAX_SEARCH_SIZE)
    {
      size = this.MAX_SEARCH_SIZE;
    }

    try
    {
      this.client.search({
        body: this.query,
        scroll: this.scroll,
        size,
      }, this.getMoreUntilDone.bind(this));
    }
    catch (e)
    {
      return this.emit('error', e);
    }
  }

  private async getMoreUntilDone(error, response)
  {
    if (error !== null && error !== undefined)
    {
      throw error;
    }

    let hits = response.hits.hits;
    let length: number = response.hits.hits.length;
    if (this.rowsProcessed + length > this.size)
    {
      length = this.size - this.rowsProcessed;
      hits = response.hits.hits.slice(0, length);
    }

    this.rowsProcessed += length;

    if (this.transform !== undefined)
    {
      response = await this.transform(error, response);
    }

    this.push(hits);

    if (
      (length > 0) &&
      (this.forceClose !== true) &&
      (Math.min(response.hits.total, this.size) > this.rowsProcessed)
    )
    {
      this.client.scroll({
        scrollId: response._scroll_id,
        scroll: this.scroll,
      } as Elastic.ScrollParams, this.getMoreUntilDone.bind(this));
    }
    else
    {
      this.client.clearScroll({
        scrollId: response._scroll_id,
      }, (_err, _resp) =>
        {
          this.isReading = false;
          this.rowsProcessed = 0;
          this.forceClose = false;
          this.push(null);
        });
    }
  }
}

export default ElasticStream;
