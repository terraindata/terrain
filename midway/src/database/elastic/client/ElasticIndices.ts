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
import ElasticController from '../ElasticController';
import { IElasticClient } from './ElasticClient';

// tslint:disable-next-line:interface-name
export interface IElasticIndices
{
  getMapping(params: Elastic.IndicesGetMappingParams): Promise<any>;
  getMapping(params: Elastic.IndicesGetMappingParams, callback: (error: any, response: any, status: any) => void): void;
  create(params: Elastic.IndicesCreateParams): Promise<any>;
  create(params: Elastic.IndicesCreateParams, callback: (error: any, response: any, status: any) => void): void;
  delete(params: Elastic.IndicesDeleteParams): Promise<any>;
  delete(params: Elastic.IndicesDeleteParams, callback: (error: any, response: any, status: any) => void): void;
  putMapping(params: Elastic.IndicesPutMappingParams): Promise<any>;
  putMapping(params: Elastic.IndicesPutMappingParams, callback: (err: any, response: any, status: any) => void): void;
  refresh(params: Elastic.IndicesRefreshParams): Promise<any>;
  refresh(params: Elastic.IndicesRefreshParams, callback: (err: any, response: any) => void): void;
}

/**
 * An client which acts as a selective isomorphic wrapper around
 * the elastic.js indices API.
 */
class ElasticIndices<TController extends ElasticController = ElasticController> implements IElasticIndices
{
  protected controller: TController;
  private delegate: IElasticClient;

  constructor(controller: TController, delegate: IElasticClient)
  {
    this.controller = controller;
    this.delegate = delegate;
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-getmapping
   * @param params
   * @param callback
   */
  public getMapping(params: Elastic.IndicesGetMappingParams): Promise<any>;
  public getMapping(params: Elastic.IndicesGetMappingParams, callback: (error: any, response: any, status: any) => void): void;
  public getMapping(params: Elastic.IndicesGetMappingParams,
    callback?: (error: any, response: any, status: any) => void): void | Promise<any>
  {
    this.log('getMapping', params);
    return this.delegate.indices.getMapping(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-create
   * @param params
   * @param callback
   */
  public create(params: Elastic.IndicesCreateParams): Promise<any>;
  public create(params: Elastic.IndicesCreateParams, callback: (error: any, response: any, status: any) => void): void;
  public create(params: Elastic.IndicesCreateParams, callback?: (error: any, response: any, status: any) => void): void | Promise<any>
  {
    return this.delegate.indices.create(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-delete
   * @param params
   * @param callback
   */
  public delete(params: Elastic.IndicesDeleteParams): Promise<any>;
  public delete(params: Elastic.IndicesDeleteParams, callback: (error: any, response: any, status: any) => void): void;
  public delete(params: Elastic.IndicesDeleteParams, callback?: (error: any, response: any, status: any) => void): void | Promise<any>
  {
    return this.delegate.indices.delete(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-putmapping
   * @param params
   * @param callback
   */
  public putMapping(params: Elastic.IndicesPutMappingParams): Promise<any>;
  public putMapping(params: Elastic.IndicesPutMappingParams, callback: (err: any, response: any, status: any) => void): void;
  public putMapping(params: Elastic.IndicesPutMappingParams, callback?: (err: any, response: any, status: any) => void): void | Promise<any>
  {
    this.log('putMapping', params);
    return this.delegate.indices.putMapping(params, callback);
  }

  /**
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-refresh
   * @param params
   * @param callback
   */
  public refresh(params: Elastic.IndicesRefreshParams): Promise<any>;
  public refresh(params: Elastic.IndicesRefreshParams, callback: (err: any, response: any) => void): void;
  public refresh(params: Elastic.IndicesRefreshParams, callback?: (err: any, response: any) => void): void | Promise<any>
  {
    this.log('refresh', params);
    return this.delegate.indices.refresh(params, callback);
  }

  protected log(methodName: string, info: any)
  {
    this.controller.log('ElasticIndices.' + methodName, info);
  }
}

export default ElasticIndices;
