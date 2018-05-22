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

import RecordBlock from '../../../app/io/iterator/RecordBlock';
import ElasticClient from '../client/ElasticClient';
import ElasticRecordSource from './AElasticRecordSource';
import BufferedElasticRecordSource from './BufferedElasticRecordSource';
import ElasticSourceInfo from './ElasticSourceInfo';
import ScrollElasticRecordSource from './ScrollElasticRecordSource';

export default class ElasticQueryDispatcher
{
  private client: ElasticClient;

  private maxResultsPerBlock: number;
  private maxQueriesPerBlock: number;
  private defaultQuerySize: number;

  private scrollThreshold: number;
  private scrollBlockSize: number; // should be <= scrollThreshold
  private scrollTimeout: string = '5m';

  // private averageResultsPerQuery: number = 1000;
  // private learningRate: number = .2;

  private maxBufferedResultSetSize: number = 0;
  private bufferedInfos: ElasticSourceInfo[] = [];

  constructor(client: ElasticClient,
    maxResultsPerBlock: number = 16 * 1024,
    maxQueriesPerBlock: number = 32,
    scrollThreshold: number = 10000,
    scrollBlockSize: number = 5000)
  {
    this.client = client;
    this.maxResultsPerBlock = maxResultsPerBlock;
    this.maxQueriesPerBlock = maxQueriesPerBlock;
    this.scrollThreshold = scrollThreshold;
    this.scrollBlockSize = scrollBlockSize;
  }

  /**
   * Pushes the given query, and then calls flush() to make sure it's been sent to the server.
   */
  public send(query: object): ElasticRecordSource
  {
    const result: ElasticRecordSource = this.push(query);
    this.flush();
    return result;
  }

  /**
   * Buffers the given query for dispatch, periodically flushing buffered queries.
   * To make sure a query is actually flushed, call flush() after pushing the query.
   */
  public push(query: object): ElasticRecordSource
  {
    // get & set size (no size => default size)
    query.size = (typeof query.size === 'number') ? query.size : this.defaultQuerySize;
    const requestSize: number = query.size as number;

    // prepare a promise and capture it's resolve function
    let resolve: any = (rb: RecordBlock) => { };
    const promise: Promise<RecordBlock> = new Promise(
      (res, reject) =>
      {
        resolve = res; // The Promise executor is called immediately, so this works.
      });

    if (query.size > this.scrollThreshold)
    {
      // large requests scroll
      this.flush();
      delete query.size;

      const scrolledSource: ScrollElasticRecordSource =
        new ScrollElasticRecordSource(this, query, requestSize, promise);

      this.client.search(
        {
          body: scrolledSource.query,
          scroll: this.scrollTimeout,
          size: this.scrollBlockSize,
        },
        (error, response): void =>
        {
          resolve(this.recieveScrollResponse(scrolledSource, error, response));
        });
      return scrolledSource;
    }

    // small requests buffer
    const bufferedSource: BufferedElasticRecordSource =
      new BufferedElasticRecordSource(query, promise);

    if (this.maxBufferedResultSetSize + requestSize > this.maxResultsPerBlock)
    {
      this.flush();
    }

    const info: ElasticSourceInfo =
      { query: bufferedSource.query, resolve } as ElasticSourceInfo;
    this.bufferedInfos.push(info);
    this.maxBufferedResultSetSize += requestSize;

    if (this.maxBufferedResultSetSize >= this.maxResultsPerBlock
      || this.bufferedInfos.length >= this.maxQueriesPerBlock)
    {
      this.flush();
    }

    return bufferedSource;
  }

  /**
   * Sends any buffered queries so that they will be processed.
   */
  public flush(): void
  {
    if (this.bufferedInfos.length <= 0)
    {
      return; // nothing to dispatch
    }

    const infos: ElasticSourceInfo[] = this.bufferedInfos;
    this.bufferedInfos = [];
    this.maxBufferedResultSetSize = 0;

    if (infos.length === 1)
    {
      // dispatch a single query
      const info: ElasticSourceInfo = infos[0];
      this.client.search(
        { body: info.query },
        (error: any, response: any): object[] =>
        {
          info.resolve(this.recieveBufferedResponse(info.query, error, response));
        });
      return;
    }

    // dispatch a msearch batch of sources
    const body: object[] = [];
    for (let i: number = 0; i < infos.length; ++i)
    {
      const info: ElasticSourceInfo = infos[i];

      body.push({}); // empty header between sources
      body.push({ body: info.query });
    }

    this.client.msearch(
      { body },
      (error: any, msearchResponse: any) =>
      {
        const responses: object[] =
          (typeof msearchResponse === 'object'
            && Array.isArray(msearchResponse.responses)) ?
            msearchResponse.responses : [];

        // resolve each query's promise
        for (let i: number = 0; i < infos.length; ++i)
        {
          const info: ElasticSourceInfo = infos[i];
          const response: object = i < responses.length ? responses[i] : [];
          const recordBlock: RecordBlock =
            this.recieveBufferedResponse(info.query, error, response);
          info.resolve(recordBlock); // resolve query promise
        }
      });
  }

  public continueScrolling(source: ScrollElasticRecordSource): Promise<RecordBlock>
  {
    // prepare a promise and capture it's resolve function
    let resolve: any = (rb: RecordBlock) => { };
    const promise: Promise<RecordBlock> = new Promise(
      (res, reject) =>
      {
        resolve = res; // The Promise executor is called immediately, so this works.
      });

    this.client.scroll({
      scrollId: source.scrollID,
      scroll: this.scrollTimeout,
    } as Elastic.ScrollParams,
      (error, response) =>
      {
        resolve(this.recieveScrollResponse(source, error, response));
      });

    return promise;
  }

  public clearScroll(source: ScrollElasticRecordSource)
  {
    // stop scrolling
    if (source.scrollID !== undefined)
    {
      this.client.clearScroll({
        scrollId: source.scrollID,
      }, (_err, _resp) =>
        {
          // do nothing
        });

      source.scrollID = undefined;
    }
  }

  private recieveScrollResponse(source: ScrollElasticRecordSource,
    error: any,
    response: any): RecordBlock
  {
    const recordBlock: RecordBlock =
      this.makeRecordBlockFromResponse(error, response);

    // save scroll id
    if (typeof response === 'object' && typeof response._scroll_id === 'string')
    {
      source.scrollID = response._scroll_id;
    }

    // check for result set end
    recordBlock.end = recordBlock.end
      || recordBlock.records.length < this.scrollBlockSize
      || recordBlock.errors.length > 0;

    // limit number of results to requested size
    if (source.numRemaining <= recordBlock.records.length)
    {
      recordBlock.records = recordBlock.records.slice(0, source.numRemaining);
      recordBlock.end = true;
    }

    source.numRemaining -= recordBlock.records.length;

    // clear the scroll when we've reached the end of the result set
    if (recordBlock.end)
    {
      this.clearScroll(source);
    }

    return recordBlock;
  }

  private recieveBufferedResponse(query: object, error: any, response: any): RecordBlock
  {
    const recordBlock: RecordBlock =
      this.makeRecordBlockFromResponse(error, response);

    recordBlock.end = true; // buffered queries are always a single block
    return recordBlock;
  }

  private makeRecordBlockFromResponse(error: any, response: any): RecordBlock
  {
    const recordBlock: RecordBlock = new RecordBlock();

    if (error !== undefined)
    {
      // TODO: when possible, associate errors with a particular result
      recordBlock.errors[0] = [error];
    }

    if (typeof response === 'object' && typeof response.hits === 'object')
    {
      const hits: object = response.hits as object;
      if (Array.isArray(hits.hits))
      {
        recordBlock.records = hits.hits as object[];
        recordBlock.end = false;
      }

      // capture estimated total num results
      if (typeof hits.total === 'number')
      {
        recordBlock.extra.total = hits.total;
      }

      // capture aggregations result
      if (typeof hits.aggregations === 'object')
      {
        recordBlock.extra.aggregations = hits.aggregations;
      }

      // capture suggest result
      if (typeof hits.suggest === 'object')
      {
        recordBlock.extra.suggest = hits.suggest;
      }
    }

    return recordBlock;
  }
}
