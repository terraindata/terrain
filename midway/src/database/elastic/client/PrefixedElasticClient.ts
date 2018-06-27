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
import ElasticController from '../ElasticController';
import ElasticClient from './ElasticClient';
import PrefixedElasticCluster from './PrefixedElasticCluster';
import PrefixedElasticIndices from './PrefixedElasticIndices';

class PrefixedElasticClient extends ElasticClient
{
  constructor(controller: ElasticController, config: ElasticConfig)
  {
    super(controller, config, PrefixedElasticCluster, PrefixedElasticIndices);
  }

  public bulk(params: Elastic.BulkIndexDocumentsParams, callback: (error: any, response: any) => void): void
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
    super.bulk(params, this.wrapCallback(callback, (res) =>
    {
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
    }));
  }

  public delete(params: Elastic.DeleteDocumentParams,
    callback: (error: any, response: Elastic.DeleteDocumentResponse) => void): void
  {
    this.controller.prependIndexParam(params);
    super.delete(params, this.wrapCallback(callback, (o) => this.controller.removeDocIndexPrefix(o)));
  }

  public index<T>(params: Elastic.IndexDocumentParams<T>, callback: (error: any, response: any) => void): void
  {
    this.controller.prependIndexParam(params);
    super.index(params, this.wrapCallback(callback, (o) => this.controller.removeDocIndexPrefix(o)));
  }

  public update(params: Elastic.UpdateDocumentParams, callback: (error: any, response: any) => void): void
  {
    this.controller.prependIndexParam(params);
    super.update(params, this.wrapCallback(callback, (o) => this.controller.removeDocIndexPrefix(o)));
  }

  public scroll<T>(params: Elastic.ScrollParams,
    callback: (error: any, response: Elastic.SearchResponse<T>) => void): void
  {
    super.scroll(params, this.wrapCallback(callback, (res: Elastic.SearchResponse<T>) =>
    {
      res.hits.hits.forEach((o) => this.controller.removeDocIndexPrefix(o));
    }));
  }

  public search<T>(params: Elastic.SearchParams,
    callback: (error: any, response: Elastic.SearchResponse<T>) => void): void
  {
    this.controller.prependIndexParam(params);
    this.modifySearchQuery(params.body);
    super.search(params, this.wrapCallback(callback, (res: Elastic.SearchResponse<T>) =>
    {
      res.hits.hits.forEach((o) => this.controller.removeDocIndexPrefix(o));
    }));
  }

  public msearch<T>(params: Elastic.MSearchParams,
    callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void
  {
    const searches: any[] = params.body;
    for (let i = 0; i < searches.length; i += 2)
    {
      const searchHeader = searches[i];
      const searchBody = searches[i + 1];
      this.controller.prependIndexParam(searchHeader);
      this.modifySearchQuery(searchBody);
    }
    super.msearch(params, this.wrapCallback(callback, (res: Elastic.MSearchResponse<T>) =>
    {
      res.responses.forEach((res2) =>
      {
        res2.hits.hits.forEach((o) => this.controller.removeDocIndexPrefix(o));
      });
    }));
  }

  public msearchTemplate<T>(params: Elastic.MSearchTemplateParams,
    callback: (error: any, response: Elastic.MSearchResponse<T>) => void): void
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

  private wrapCallback(cb: (err, res) => void, f: (res) => void)
  {
    return (err, res) =>
    {
      if (err)
      {
        cb(err, undefined);
      }
      else
      {
        try
        {
          f(res);
        }
        catch (e)
        {
          this.log('error', e);
          return cb(e, undefined);
        }
        cb(err, res);
      }
    };
  }
}

export default PrefixedElasticClient;
