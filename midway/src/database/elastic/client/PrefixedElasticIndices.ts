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
import PrefixedElasticController from '../PrefixedElasticController';
import ElasticIndices from './ElasticIndices';

class PrefixedElasticIndices extends ElasticIndices<PrefixedElasticController>
{
  constructor(controller: PrefixedElasticController, delegate: Elastic.Client)
  {
    super(controller, delegate);
  }

  public getMapping(params: Elastic.IndicesGetMappingParams): Promise<any>;
  public getMapping(params: Elastic.IndicesGetMappingParams, callback: (error: any, response: any, status: any) => void): void;
  public getMapping(params: Elastic.IndicesGetMappingParams,
    callback?: (error: any, response: any, status: any) => void): void | Promise<any>
  {
    const getMapping = () => super.getMapping(params);
    return this.controller.voidOrPromise(callback, async () =>
    {
      this.controller.prependIndexParam(params);
      params.ignore = 404;
      const res = await getMapping();
      if (res.status === 404)
      {
        return {};
      }
      const newRes = {};
      try
      {
        Object.keys(res).forEach((key) =>
        {
          newRes[this.controller.removeIndexPrefix(key)] = res[key];
        });
      }
      catch (e)
      {
        this.log('error', e);
        throw e;
      }
      return newRes;
    });
  }
  public create(params: Elastic.IndicesCreateParams): Promise<any>;
  public create(params: Elastic.IndicesCreateParams, callback: (error: any, response: any, status: any) => void): void;
  public create(params: Elastic.IndicesCreateParams, callback?: (error: any, response: any, status: any) => void): void | Promise<any>
  {
    const create = () => super.create(params);
    return this.controller.voidOrPromise(callback, async () =>
    {
      this.controller.prependIndexParam(params);
      const res = await create();
      res.index = this.controller.removeIndexPrefix(res.index);
      return res;
    });
  }

  public delete(params: Elastic.IndicesDeleteParams): Promise<any>;
  public delete(params: Elastic.IndicesDeleteParams, callback: (error: any, response: any, status: any) => void): void;
  public delete(params: Elastic.IndicesDeleteParams, callback?: (error: any, response: any, status: any) => void): void | Promise<any>
  {
    this.controller.prependIndexParam(params);
    return super.delete(params, callback);
  }

  public putMapping(params: Elastic.IndicesPutMappingParams): Promise<any>;
  public putMapping(params: Elastic.IndicesPutMappingParams, callback: (err: any, response: any, status: any) => void): void;
  public putMapping(params: Elastic.IndicesPutMappingParams, callback?: (err: any, response: any, status: any) => void): void | Promise<any>
  {
    this.controller.prependIndexParam(params);
    return super.putMapping(params, callback);
  }

  public refresh(params: Elastic.IndicesRefreshParams): Promise<any>;
  public refresh(params: Elastic.IndicesRefreshParams, callback: (err: any, response: any) => void): void;
  public refresh(params: Elastic.IndicesRefreshParams, callback?: (err: any, response: any) => void): void | Promise<any>
  {
    this.controller.prependIndexParam(params);
    return super.refresh(params, callback);
  }
}

export default PrefixedElasticIndices;
