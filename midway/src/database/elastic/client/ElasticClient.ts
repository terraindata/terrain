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

import * as Elastic from 'elasticsearch';
import * as _ from 'lodash';
import * as request from 'request';

import { MidwayLogger } from '../../../app/log/MidwayLogger';
import { DatabaseControllerStatus } from '../../DatabaseControllerStatus';
import ElasticConfig from '../ElasticConfig';
import ElasticController from '../ElasticController';
import ElasticCluster, { IElasticCluster } from './ElasticCluster';
import ElasticIndices, { IElasticIndices } from './ElasticIndices';

// tslint:disable-next-line:interface-name
export interface IElasticClient
{
  cluster: IElasticCluster;
  indices: IElasticIndices;
  ping(params: Elastic.PingParams): Promise<any>;
  ping(params: Elastic.PingParams, callback: (error: any, response: any) => void): void;
  bulk(params: Elastic.BulkIndexDocumentsParams): Promise<any>;
  bulk(params: Elastic.BulkIndexDocumentsParams, callback: (error: any, response: any) => void): void;
  delete(params: Elastic.DeleteDocumentParams): Promise<Elastic.DeleteDocumentResponse>;
  delete(params: Elastic.DeleteDocumentParams, callback: (error: any, response: Elastic.DeleteDocumentResponse) => void): void;
  deleteTemplate(params: Elastic.DeleteTemplateParams): Promise<any>;
  deleteTemplate(params: Elastic.DeleteTemplateParams, callback: (error: any, response: any) => void): void;
  deleteScript(params: Elastic.DeleteScriptParams): Promise<any>;
  deleteScript(params: Elastic.DeleteScriptParams, callback: (error: any, response: any) => void): void;
  getTemplate(params: Elastic.GetTemplateParams): Promise<any>;
  getTemplate(params: Elastic.GetTemplateParams, callback: (error: any, response: any) => void): void;
  getScript(params: Elastic.GetScriptParams): Promise<any>;
  getScript(params: Elastic.GetScriptParams, callback: (error: any, response: any) => void): void;
  index<T>(params: Elastic.IndexDocumentParams<T>): Promise<any>;
  index<T>(params: Elastic.IndexDocumentParams<T>, callback: (error: any, response: any) => void): void;
  update(params: Elastic.UpdateDocumentParams): Promise<any>;
  update(params: Elastic.UpdateDocumentParams, callback: (error: any, response: any) => void): void;
  putScript(params: Elastic.PutScriptParams): Promise<any>;
  putScript(params: Elastic.PutScriptParams, callback: (err: any, response: any, status: any) => void): void;
  putTemplate(params: Elastic.PutTemplateParams): Promise<any>;
  putTemplate(params: Elastic.PutTemplateParams, callback: (err: any, response: any, status: any) => void): void;
  scroll<T>(params: Elastic.ScrollParams): Promise<Elastic.SearchResponse<T>>;
  scroll<T>(params: Elastic.ScrollParams, callback: (error: any, response: Elastic.SearchResponse<T>) => void): void;
  clearScroll(params: Elastic.ClearScrollParams): Promise<any>;
  clearScroll(params: Elastic.ClearScrollParams, callback: (error: any, response: any) => void): void;
  search<T>(params: Elastic.SearchParams): Promise<Elastic.SearchResponse<T>>;
  search<T>(params: Elastic.SearchParams, callback: (error: any, response: Elastic.SearchResponse<T>) => void): void;
  msearch<T>(params: Elastic.MSearchParams): Promise<Elastic.MSearchResponse<T>>;
  msearch<T>(params: Elastic.MSearchParams, callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void;
  msearchTemplate<T>(params: Elastic.MSearchTemplateParams): Promise<Elastic.MSearchResponse<T>>;
  msearchTemplate<T>(params: Elastic.MSearchTemplateParams, callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void;
}

/**
 * An client which acts as a selective isomorphic wrapper around
 * the elastic.js API.
 */
class ElasticClient<TController extends ElasticController = ElasticController> implements IElasticClient
{
  public cluster: IElasticCluster;
  public indices: IElasticIndices;

  protected controller: TController;
  private config: ElasticConfig;
  private delegate: IElasticClient;

  constructor(controller: TController, config: ElasticConfig,
    Cluster: { new(controller: TController, delegate: IElasticClient): IElasticCluster } = ElasticCluster,
    Indices: { new(controller: TController, delegate: IElasticClient): IElasticIndices } = ElasticIndices)
  {
    this.controller = controller;

    // Do not reuse objects to configure the elasticsearch Client class:
    // https://github.com/elasticsearch/elasticsearch-js/issues/33
    this.config = JSON.parse(JSON.stringify(config));
    this.controller.setStatus(DatabaseControllerStatus.CONNECTING);
    this.delegate = new Elastic.Client(_.extend(this.config));

    this.cluster = new Cluster(controller, this.delegate);
    this.indices = new Indices(controller, this.delegate);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-ping
   */
  public ping(params: Elastic.PingParams): Promise<any>;
  public ping(params: Elastic.PingParams, callback: (error: any, response: any) => void): any;
  public ping(params: Elastic.PingParams, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    this.log('ping', params);
    return this.delegate.ping(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-bulk
   */
  public bulk(params: Elastic.BulkIndexDocumentsParams): Promise<any>;
  public bulk(params: Elastic.BulkIndexDocumentsParams, callback: (error: any, response: any) => void): void;
  public bulk(params: Elastic.BulkIndexDocumentsParams, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    this.log('bulk', params);
    return this.delegate.bulk(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-delete
   */
  public delete(params: Elastic.DeleteDocumentParams): Promise<Elastic.DeleteDocumentResponse>;
  public delete(params: Elastic.DeleteDocumentParams, callback: (error: any, response: Elastic.DeleteDocumentResponse) => void): void;
  public delete(params: Elastic.DeleteDocumentParams,
    callback?: (error: any, response: Elastic.DeleteDocumentResponse) => void): void | Promise<Elastic.DeleteDocumentResponse>
  {
    this.log('delete', params);
    return this.delegate.delete(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-deletetemplate
   */
  public deleteTemplate(params: Elastic.DeleteTemplateParams): Promise<any>;
  public deleteTemplate(params: Elastic.DeleteTemplateParams, callback: (error: any, response: any) => void): void;
  public deleteTemplate(params: Elastic.DeleteTemplateParams, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    this.log('deleteTemplate', params);
    const scriptParams: Elastic.DeleteScriptParams =
    {
      id: params.id,
      lang: 'mustache',
    };
    return this.deleteScript(scriptParams, callback);
  }

  /**
   */
  public deleteScript(params: Elastic.DeleteScriptParams): Promise<any>;
  public deleteScript(params: Elastic.DeleteScriptParams, callback: (error: any, response: any) => void): void;
  public deleteScript(params: Elastic.DeleteScriptParams, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    return this.controller.voidOrPromise(callback, () =>
    {
      return new Promise((res, rej) =>
      {
        this.log('deleteScript', params);
        const host = this.getHostFromConfig();
        request({
          method: 'DELETE',
          url: String(host) + '/_scripts/' + params.id,
        }, (err, resp, body) => err == null ? res(JSON.parse(body)) : rej(err));
      });
    });

    // FIXME: Uncomment when putScript in elasticsearch.js is fixed to use the changed stored script body format in 6.1
    // https://www.elastic.co/guide/en/elasticsearch/reference/6.1/modules-scripting-using.html
    // this.delegate.deleteScript(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-gettemplate
   */
  public getTemplate(params: Elastic.GetTemplateParams): Promise<any>;
  public getTemplate(params: Elastic.GetTemplateParams, callback: (error: any, response: any) => void): void;
  public getTemplate(params: Elastic.GetTemplateParams, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    return this.controller.voidOrPromise(callback, () =>
    {
      this.log('getTemplate', params);
      const scriptParams: Elastic.GetScriptParams =
      {
        id: params.id,
        lang: 'mustache',
      };
      return this.getScript(scriptParams);
    });
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-getscript
   */
  public getScript(params: Elastic.GetScriptParams): Promise<any>;
  public getScript(params: Elastic.GetScriptParams, callback: (error: any, response: any) => void): void;
  public getScript(params: Elastic.GetScriptParams,
    callback?: (error: any, response: any) => void): void | Promise<any>
  {
    return this.controller.voidOrPromise(callback, () =>
    {
      return new Promise((res, rej) =>
      {
        this.log('get script', params);
        const host = this.getHostFromConfig();
        request({
          method: 'GET',
          json: true,
          url: String(host) + '/_scripts/' + params.id,
        }, (err, resp, body) => err == null ? res(body) : rej(err));
      });
    });

    // FIXME: Uncomment when putScript in elasticsearch.js is fixed to use the changed stored script body format in 6.1
    // https://www.elastic.co/guide/en/elasticsearch/reference/6.1/modules-scripting-using.html
    // this.delegate.getScript(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-index
   */
  public index<T>(params: Elastic.IndexDocumentParams<T>): Promise<any>;
  public index<T>(params: Elastic.IndexDocumentParams<T>, callback: (error: any, response: any) => void): void;
  public index<T>(params: Elastic.IndexDocumentParams<T>, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    this.log('index', params);
    return this.delegate.index(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-update
   */
  public update(params: Elastic.UpdateDocumentParams): Promise<any>;
  public update(params: Elastic.UpdateDocumentParams, callback: (error: any, response: any) => void): void;
  public update(params: Elastic.UpdateDocumentParams, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    this.log('update', params);
    return this.delegate.update(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-putscript
   */
  public putScript(params: Elastic.PutScriptParams): Promise<any>;
  public putScript(params: Elastic.PutScriptParams, callback: (err: any, response: any, status: any) => void): void;
  public putScript(params: Elastic.PutScriptParams, callback?: (err: any, response: any, status: any) => void): void | Promise<any>
  {
    return this.controller.voidOrPromise(callback, () =>
    {
      return new Promise((res, rej) =>
      {
        this.log('putScript', params);
        const host = this.getHostFromConfig();
        request({
          method: 'POST',
          url: String(host) + '/_scripts/' + params.id,
          json: true,
          body: {
            script: {
              lang: params.lang,
              source: params.body,
            },
          },
        }, (err, resp, body) => err == null ? res(body) : rej(err));
      });
    });

    // FIXME: Uncomment when putScript in elasticsearch.js is fixed to use the changed stored script body format in 6.1
    // https://www.elastic.co/guide/en/elasticsearch/reference/6.1/modules-scripting-using.html
    // this.delegate.putScript(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-puttemplate
   */
  public putTemplate(params: Elastic.PutTemplateParams): Promise<any>;
  public putTemplate(params: Elastic.PutTemplateParams, callback: (err: any, response: any, status: any) => void): void;
  public putTemplate(params: Elastic.PutTemplateParams, callback?: (err: any, response: any, status: any) => void): void | Promise<any>
  {
    return this.controller.voidOrPromise(callback, () =>
    {
      this.log('putTemplate', params);
      const scriptParams: Elastic.PutScriptParams =
      {
        id: params.id,
        lang: 'mustache',
        body: params.body,
      };
      return this.putScript(scriptParams);
    });
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-scroll
   */
  public scroll<T>(params: Elastic.ScrollParams): Promise<Elastic.SearchResponse<T>>;
  public scroll<T>(params: Elastic.ScrollParams, callback: (error: any, response: Elastic.SearchResponse<T>) => void): void;
  public scroll<T>(params: Elastic.ScrollParams,
    callback?: (error: any, response: Elastic.SearchResponse<T>) => void): void | Promise<Elastic.SearchResponse<T>>
  {
    this.log('scroll', params);
    return this.delegate.scroll(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-clearscroll
   */
  public clearScroll(params: Elastic.ClearScrollParams): Promise<any>;
  public clearScroll(params: Elastic.ClearScrollParams, callback: (error: any, response: any) => void): void;
  public clearScroll(params: Elastic.ClearScrollParams, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    this.log('clearScroll', params);
    return this.delegate.clearScroll(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search
   */
  public search<T>(params: Elastic.SearchParams): Promise<Elastic.SearchResponse<T>>;
  public search<T>(params: Elastic.SearchParams, callback: (error: any, response: Elastic.SearchResponse<T>) => void): void;
  public search<T>(params: Elastic.SearchParams,
    callback?: (error: any, response: Elastic.SearchResponse<T>) => void): void | Promise<Elastic.SearchResponse<T>>
  {
    this.log('search', params);
    this.addIndexToSearchParams(params);
    return this.delegate.search(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-msearch
   */
  public msearch<T>(params: Elastic.MSearchParams): Promise<Elastic.MSearchResponse<T>>;
  public msearch<T>(params: Elastic.MSearchParams, callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void;
  public msearch<T>(params: Elastic.MSearchParams,
    callback?: (error: any, response: Elastic.MSearchResponse<T>) => void): void | Promise<Elastic.MSearchResponse<T>>
  {
    this.log('msearch', params);
    this.addIndexToMSearchParams(params);
    return this.delegate.msearch(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-msearchtemplate
   */
  public msearchTemplate<T>(params: Elastic.MSearchTemplateParams): Promise<Elastic.MSearchResponse<T>>;
  public msearchTemplate<T>(params: Elastic.MSearchTemplateParams,
    callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void;
  public msearchTemplate<T>(params: Elastic.MSearchTemplateParams,
    callback?: (error: any, response: Elastic.MSearchResponse<T>) => void): void | Promise<Elastic.MSearchResponse<T>>
  {
    this.log('msearchTemplate', params);
    return this.delegate.msearchTemplate(params, callback);
  }

  public getDelegate(): IElasticClient
  {
    return this.delegate;
  }

  public getConfig(): ElasticConfig
  {
    return this.config;
  }

  public async isConnected(): Promise<boolean>
  {
    return new Promise<boolean>((resolve, reject) =>
    {
      this.controller.setStatus(DatabaseControllerStatus.CONNECTING);
      this.ping({}, (err: any, response) =>
      {
        if (err !== null && err !== undefined)
        {
          this.controller.setStatus(DatabaseControllerStatus.CONN_TIMEOUT);
          return resolve(false);
        }

        this.controller.setStatus(DatabaseControllerStatus.CONNECTED);
        resolve(true);
      });
    });
  }

  protected log(methodName: string, info: any)
  {
    this.controller.log('ElasticClient.' + methodName, info);
  }

  protected addIndexToSearchParams(params)
  {
    if (params.index == null)
    {
      const index = this.getIndex(params.body);
      if (index == null)
      {
        MidwayLogger.warn('search query does not specify an index');
      } else
      {
        params.index = index;
      }
    }
  }

  protected addIndexToMSearchParams(params)
  {
    for (let i = 0; i < params.body.length; i += 2)
    {
      if (params.body[i].index == null)
      {
        const index = this.getIndex(params.body[i + 1]);
        if (index == null)
        {
          MidwayLogger.warn(`msearch query #${i / 2} does not specify an index`);
        } else
        {
          params.body[i].index = index;
        }
      }
    }
  }

  private getHostFromConfig(): string
  {
    let host: string = this.getConfig().host;
    if (host === undefined)
    {
      if (this.getConfig().hosts !== undefined && this.getConfig().hosts.length > 0)
      {
        host = this.getConfig().hosts[0];
      }
    }

    if (host === undefined)
    {
      throw new Error('Unknown host');
    }

    if (host.substr(0, 4) !== 'http')
    {
      host = 'http://' + String(host);
    }

    return host;
  }

  private getIndex(body): string | undefined
  {
    if (body.query && body.query.bool && body.query.bool.filter)
    {
      if (body.query.bool.filter.constructor === Array)
      {
        if (body.query.bool.filter.length > 0 && body.query.bool.filter[0].term)
        {
          return body.query.bool.filter[0].term._index;
        }
      } else
      {
        if (body.query.bool.filter.term)
        {
          return body.query.bool.filter.term._index;
        }
      }
    }

    if (body.query && body.query.function_score)
    {
      return this.getIndex(body.query.function_score);
    }

    return undefined;
  }
}

export default ElasticClient;
