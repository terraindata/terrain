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

import ElasticConfig from '../ElasticConfig';
import PrefixedElasticController from '../PrefixedElasticController';
import ElasticClient from './ElasticClient';
import PrefixedElasticCluster from './PrefixedElasticCluster';
import PrefixedElasticIndices from './PrefixedElasticIndices';

class PrefixedElasticClient extends ElasticClient<PrefixedElasticController>
{
  constructor(controller: PrefixedElasticController, config: ElasticConfig)
  {
    super(controller, config, PrefixedElasticCluster, PrefixedElasticIndices);
  }

  public bulk(params: Elastic.BulkIndexDocumentsParams): Promise<any>;
  public bulk(params: Elastic.BulkIndexDocumentsParams, callback: (error: any, response: any) => void): void;
  public bulk(params: Elastic.BulkIndexDocumentsParams, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    // hack
    const bulk = () => super.bulk(params);
    return this.controller.voidOrPromise(callback, async () =>
    {
      const body: object[] = params.body;
      for (let i = 0; i < body.length;)
      {
        const obj = body[i];
        const keys = Object.keys(obj);
        if (keys.length !== 1)
        {
          throw new Error('Bad bulk params');
        }
        switch (keys[0])
        {
          case 'index':
          case 'create':
          case 'update':
            i += 2;
            break;
          case 'delete':
            i++;
            break;
          default:
            throw new Error('Bad bulk params');
        }
        this.controller.prependIndexTerm(obj[keys[0]]);
      }
      const res = await bulk();
      const items: any[] = res.items;
      items.forEach((item) =>
      {
        if (Object.keys(item).length !== 1)
        {
          throw new Error('Bad response');
        }
        const doc = item[Object.keys(item)[0]];
        this.controller.removeDocIndexPrefix(doc);
      });
      return res;
    });
  }

  public delete(params: Elastic.DeleteDocumentParams): Promise<Elastic.DeleteDocumentResponse>;
  public delete(params: Elastic.DeleteDocumentParams, callback: (error: any, response: Elastic.DeleteDocumentResponse) => void): void;
  public delete(params: Elastic.DeleteDocumentParams,
    callback?: (error: any, response: Elastic.DeleteDocumentResponse) => void): void | Promise<Elastic.DeleteDocumentResponse>
  {
    // hack
    const del = () => super.delete(params);
    return this.controller.voidOrPromise(callback, async () =>
    {
      this.controller.prependIndexParam(params);
      const res = await del();
      this.controller.removeDocIndexPrefix(res);
      return res;
    });
  }

  public index<T>(params: Elastic.IndexDocumentParams<T>): Promise<any>;
  public index<T>(params: Elastic.IndexDocumentParams<T>, callback: (error: any, response: any) => void): void;
  public index<T>(params: Elastic.IndexDocumentParams<T>, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    // hack
    const index = () => super.index(params);
    return this.controller.voidOrPromise(callback, async () =>
    {
      this.controller.prependIndexParam(params);
      const res = await index();
      this.controller.removeDocIndexPrefix(res);
      return res;
    });
  }

  public update(params: Elastic.UpdateDocumentParams): Promise<any>;
  public update(params: Elastic.UpdateDocumentParams, callback: (error: any, response: any) => void): void;
  public update(params: Elastic.UpdateDocumentParams, callback?: (error: any, response: any) => void): void | Promise<any>
  {
    // hack
    const update = () => super.update(params);
    return this.controller.voidOrPromise(callback, async () =>
    {
      this.controller.prependIndexParam(params);
      const res = await update();
      this.controller.removeDocIndexPrefix(res);
      return res;
    });
  }

  public scroll<T>(params: Elastic.ScrollParams): Promise<Elastic.SearchResponse<T>>;
  public scroll<T>(params: Elastic.ScrollParams, callback: (error: any, response: Elastic.SearchResponse<T>) => void): void;
  public scroll<T>(params: Elastic.ScrollParams,
    callback?: (error: any, response: Elastic.SearchResponse<T>) => void): void | Promise<Elastic.SearchResponse<T>>
  {
    // hack
    const scroll = () => super.scroll(params);
    return this.controller.voidOrPromise(callback, async () =>
    {
      const res = await scroll();
      res.hits.hits.forEach((o) => this.controller.removeDocIndexPrefix(o));
      return res;
    });
  }

  public search<T>(params: Elastic.SearchParams): Promise<Elastic.SearchResponse<T>>;
  public search<T>(params: Elastic.SearchParams, callback: (error: any, response: Elastic.SearchResponse<T>) => void): void;
  public search<T>(params: Elastic.SearchParams,
    callback?: (error: any, response: Elastic.SearchResponse<T>) => void): void | Promise<Elastic.SearchResponse<T>>
  {
    this.addIndexToSearchParams(params);
    // hack
    const search = () => super.search(params);
    return this.controller.voidOrPromise(callback, async () =>
    {
      this.controller.prependIndexParam(params);
      this.modifySearchQuery(params.body);
      const res = await search();
      res.hits.hits.forEach((o) => this.controller.removeDocIndexPrefix(o));
      return res;
    });
  }

  public msearch<T>(params: Elastic.MSearchParams): Promise<Elastic.MSearchResponse<T>>;
  public msearch<T>(params: Elastic.MSearchParams, callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void;
  public msearch<T>(params: Elastic.MSearchParams,
    callback?: (error: any, response: Elastic.MSearchResponse<T>) => void): void | Promise<Elastic.MSearchResponse<T>>
  {
    this.addIndexToMSearchParams(params);
    // hack
    const msearch = () => super.msearch(params);
    return this.controller.voidOrPromise(callback, async () =>
    {
      const searches: any[] = params.body;
      for (let i = 0; i < searches.length; i += 2)
      {
        const searchHeader = searches[i];
        const searchBody = searches[i + 1];
        this.controller.prependIndexParam(searchHeader);
        this.modifySearchQuery(searchBody);
      }
      const res = await msearch();
      res.responses.forEach((res2) =>
      {
        res2.hits.hits.forEach((o) => this.controller.removeDocIndexPrefix(o));
      });
      return res;
    });
  }

  public msearchTemplate<T>(params: Elastic.MSearchTemplateParams): Promise<Elastic.MSearchResponse<T>>;
  public msearchTemplate<T>(params: Elastic.MSearchTemplateParams,
    callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void;
  public msearchTemplate<T>(params: Elastic.MSearchTemplateParams,
    callback?: (error: any, response: Elastic.MSearchResponse<T>) => void): void | Promise<Elastic.MSearchResponse<T>>
  {
    throw new Error();
  }

  private modifySearchQuery(body)
  {
    if (body.query && body.query.bool && body.query.bool.filter)
    {
      if (body.query.bool.filter.constructor === Array)
      {
        if (body.query.bool.filter.length > 0 && body.query.bool.filter[0].term && body.query.bool.filter[0].term._index)
        {
          this.controller.prependIndexTerm(body.query.bool.filter[0].term);
        }
      }
      else
      {
        if (body.query.bool.filter.term && body.query.bool.filter.term._index)
        {
          this.controller.prependIndexTerm(body.query.bool.filter.term);
        }
      }
    }
  }
}

export default PrefixedElasticClient;
