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

import ElasticConfig from '../ElasticConfig';
import ElasticController from '../ElasticController';
import ElasticCluster from './ElasticCluster';
import ElasticIndices from './ElasticIndices';

/**
 * An client which acts as a selective isomorphic wrapper around
 * the elastic.js API.
 */
class ElasticClient
{
  public cluster: ElasticCluster;
  public indices: ElasticIndices;

  private controller: ElasticController;
  private config: ElasticConfig;
  private delegate: Elastic.Client;

  constructor(controller: ElasticController, config: ElasticConfig)
  {
    this.controller = controller;

    // Do not reuse objects to configure the elasticsearch Client class:
    // https://github.com/elasticsearch/elasticsearch-js/issues/33
    this.config = JSON.parse(JSON.stringify(config));
    this.delegate = new Elastic.Client(this.config);

    this.cluster = new ElasticCluster(controller, this.delegate);
    this.indices = new ElasticIndices(controller, this.delegate);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-ping
   */
  public ping(params: Elastic.PingParams, callback: (error: any, response: any) => void): void
  {
    // this.log('ping', params);
    this.delegate.ping(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-bulk
   */
  public bulk(params: Elastic.BulkIndexDocumentsParams, callback: (error: any, response: any) => void): void
  {
    // this.log('bulk', params);
    this.delegate.bulk(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-delete
   */
  public delete(params: Elastic.DeleteDocumentParams,
    callback: (error: any, response: Elastic.DeleteDocumentResponse) => void): void
  {
    this.log('delete', params);
    this.delegate.delete(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-deletetemplate
   */
  public deleteTemplate(params: Elastic.DeleteTemplateParams, callback: (error: any, response: any) => void): void
  {
    this.log('deleteTemplate', params);
    this.delegate.deleteTemplate(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-gettemplate
   */
  public getTemplate(params: Elastic.GetTemplateParams, callback: (error: any, response: any) => void): void
  {
    this.log('getTemplate', params);
    this.delegate.getTemplate(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-getscript
   */
  public getScript<T>(params: Elastic.GetScriptParams,
    callback: (error: any, response: Elastic.SearchResponse<T>) => void): void
  {
    this.log('get script', params);
    this.delegate.getScript(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-index
   */
  public index<T>(params: Elastic.IndexDocumentParams<T>, callback: (error: any, response: any) => void): void
  {
    this.log('index', params);
    this.delegate.index(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-update
   */
  public update<T>(params: Elastic.UpdateDocumentParams, callback: (error: any, response: any) => void): void
  {
    this.log('update', params);
    this.delegate.update(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-putscript
   */
  public putScript(params: Elastic.PutScriptParams, callback: (err: any, response: any, status: any) => void): void
  {
    this.log('putScript', params);
    this.delegate.putScript(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-puttemplate
   */
  public putTemplate(params: Elastic.PutTemplateParams, callback: (err: any, response: any, status: any) => void): void
  {
    this.log('putTemplate', params);
    this.delegate.putTemplate(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-scroll
   */
  public scroll<T>(params: Elastic.ScrollParams,
    callback: (error: any, response: Elastic.SearchResponse<T>) => void): void
  {
    this.log('scroll', params);
    this.delegate.scroll(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search
   */
  public search<T>(params: Elastic.SearchParams,
    callback: (error: any, response: Elastic.SearchResponse<T>) => void): void
  {
    this.log('search', params);
    this.delegate.search(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-msearch
   */
  public msearch<T>(params: Elastic.MSearchParams,
    callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void
  {
    this.log('msearch', params);
    this.delegate.msearch(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-rendersearchtemplate
   */
  public renderSearchTemplate<T>(params: Elastic.RenderSearchTemplateParams,
    callback: (error: any, response: Elastic.SearchResponse<T>) => void): void
  {
    this.log('renderSearchTemplate', params);
    this.delegate.renderSearchTemplate(params, callback);
  }

  public searchTemplate<T>(params: Elastic.SearchTemplateParams,
    callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void
  {
    this.log('searchTemplate', params);
    this.delegate.searchTemplate(params, callback);
  }

  public getDelegate(): Elastic.Client
  {
    return this.delegate;
  }

  private log(methodName: string, info: any)
  {
    this.controller.log('ElasticClient.' + methodName, info);
  }

}

export default ElasticClient;
