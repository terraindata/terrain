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

import * as ElasticsearchScrollStream from 'elasticsearch-scroll-stream';
import { Readable } from 'stream';
import * as winston from 'winston';

import * as Elastic from 'elasticsearch';

import ESParameterFiller from '../../../../../shared/database/elastic/parser/EQLParameterFiller';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ESParser from '../../../../../shared/database/elastic/parser/ESParser';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import MidwayErrorItem from '../../../../../shared/error/MidwayErrorItem';
import QueryRequest from '../../../../../src/database/types/QueryRequest';
import QueryResponse from '../../../../../src/database/types/QueryResponse';
import QueryHandler from '../../../app/query/QueryHandler';
import { QueryError } from '../../../error/QueryError';
import ElasticClient from '../client/ElasticClient';
import ElasticController from '../ElasticController';

/**
 * Implements the QueryHandler interface for ElasticSearch
 */
export default class ElasticQueryHandler extends QueryHandler
{
  private controller: ElasticController;

  private GROUPJOIN_SEARCH_MAX_SIZE = 10000;
  private GROUPJOIN_MSEARCH_BATCH_SIZE = 1000;
  private GROUPJOIN_MSEARCH_MAX_PENDING_BATCHES = 1;
  private GROUPJOIN_DEFAULT_SIZE = 10;
  private GROUPJOIN_SCROLL_TIMEOUT = '1m';

  constructor(controller: ElasticController)
  {
    super();
    this.controller = controller;
  }

  public async handleQuery(request: QueryRequest): Promise<QueryResponse | Readable>
  {
    winston.debug('handleQuery ' + JSON.stringify(request, null, 2));
    const type = request.type;
    const client: ElasticClient = this.controller.getClient();
    switch (type)
    {
      case 'search':
        if (typeof request.body !== 'string')
        {
          throw new Error('Request body must be a string.');
        }

        let parser: any;
        try
        {
          parser = this.getParsedQuery(request.body);
        }
        catch (errors)
        {
          return new QueryResponse({}, errors);
        }

        const query = parser.getValue();
        if (query['groupJoin'] !== undefined)
        {
          return this.handleGroupJoin(parser, query);
        }

        if (request.streaming === true)
        {
          return new ElasticsearchScrollStream(client.getDelegate(), { body: query });
        }

        return new Promise<QueryResponse>((resolve, reject) =>
        {
          client.search({ body: query } as Elastic.SearchParams, this.makeQueryCallback(resolve, reject));
        });

      case 'deleteTemplate':
      case 'getTemplate':
      case 'putTemplate':
        const handler: any = client[type];
        if (typeof handler !== 'function')
        {
          break;
        }

        return new Promise<QueryResponse>((resolve, reject) =>
        {
          handler.call(client, request.body, this.makeQueryCallback(resolve, reject));
        });

      default:
        break;
    }

    throw new Error('Query type "' + type + '" is not currently supported.');
  }

  private async handleGroupJoin(parser: ESParser, query: object): Promise<QueryResponse>
  {
    const childQuery = query['groupJoin'];
    query['groupJoin'] = undefined;
    const parentQuery: Elastic.SearchParams | undefined = query;
    if (parentQuery === undefined)
    {
      throw new Error('Expecting body parameter in the groupJoin query');
    }

    const valueInfo = parser.getValueInfo().objectChildren['groupJoin'].propertyValue;
    if (valueInfo === null)
    {
      throw new Error('Error finding groupJoin clause in the query');
    }

    return new Promise<QueryResponse>(async (resolve, reject) =>
    {
      const client: ElasticClient = this.controller.getClient();
      const parentResults = await new Promise<QueryResponse>((res, rej) =>
      {
        let allResponse: any | null = null;
        let rowsProcessed: number = 0;
        const originalSize: number = (parentQuery['size'] !== undefined) ? parentQuery['size'] as number : this.GROUPJOIN_DEFAULT_SIZE;
        const originalScroll = (parentQuery['scroll'] !== undefined) ? parentQuery['scroll'] : this.GROUPJOIN_SCROLL_TIMEOUT;
        let size;
        let scroll;

        if (originalSize > this.GROUPJOIN_SEARCH_MAX_SIZE)
        {
          size = this.GROUPJOIN_SEARCH_MAX_SIZE;
          scroll = originalScroll;
        }

        const getMoreUntilDone = async (error: any, response: any) =>
        {
          if (error !== null && error !== undefined)
          {
            return this.makeQueryCallback(res, rej)(error, allResponse);
          }

          // winston.debug('parentResults for handleGroupJoin: ' + JSON.stringify(response, null, 2));
          try
          {
            await this.handleGroupJoinSubQueries(valueInfo, childQuery, response);
          }
          catch (e)
          {
            return this.makeQueryCallback(res, rej)(e, allResponse);
          }

          if (allResponse === null)
          {
            allResponse = response;
          }
          else
          {
            allResponse.hits.hits = allResponse.hits.hits.concat(response.hits.hits);
          }

          rowsProcessed += response.hits.hits.length;
          if (response.hits.hits.length > 0 && Math.min(response.hits.total, originalSize) > rowsProcessed)
          {
            scroll = originalScroll;
            client.scroll({
              scrollId: response._scroll_id,
              scroll,
            } as Elastic.ScrollParams, getMoreUntilDone);
          }
          else
          {
            client.clearScroll({
              scrollId: response._scroll_id,
            }, (_err, _resp) => { return; });
            return this.makeQueryCallback(res, rej)(error, allResponse);
          }
        };

        client.search({
          body: parentQuery,
          scroll,
          size,
        }, getMoreUntilDone);
      });

      if (parentResults.hasError())
      {
        return reject(parentResults);
      }

      // winston.debug('parentResults (annotated with subQueryResults): ' + JSON.stringify(parentResults.result, null, 2));
      resolve(parentResults);
    });
  }

  private async handleGroupJoinSubQueries(parentValueInfo: ESValueInfo, query: object, results: object)
  {
    const ignoreEmpty = (query['ignoreEmpty'] !== undefined) ? query['ignoreEmpty'] : false;
    delete query['ignoreEmpty'];

    const promises: Array<Promise<any>> = [];
    for (const subQuery of Object.keys(query))
    {
      const vi = parentValueInfo.objectChildren[subQuery].propertyValue;
      if (vi === null)
      {
        throw new Error('Error finding subquery property');
      }

      promises.push(this.handleGroupJoinSubQuery(vi, subQuery, results, ignoreEmpty));
    }
    return Promise.all(promises);
  }

  private async handleGroupJoinSubQuery(valueInfo: ESValueInfo, subQuery: string, parentResults: any, ignoreEmpty: boolean)
  {
    const hits = parentResults.hits.hits;
    const promises: Array<Promise<any>> = [];
    for (let i = 0, batchSize = this.GROUPJOIN_MSEARCH_BATCH_SIZE; i < hits.length; i += batchSize)
    {
      if (i + batchSize > hits.length)
      {
        batchSize = hits.length - i;
      }

      // todo: optimization to avoid repeating index and type if they're the same
      // const index = (childQuery.index !== undefined) ? childQuery.index : undefined;
      // const type = (childQuery.type !== undefined) ? childQuery.type : undefined;

      promises.push(new Promise((resolve, reject) =>
      {
        const body: any[] = [];
        for (let j = i; j < i + batchSize; ++j)
        {
          // winston.debug('parentObject ' + JSON.stringify(hits[j]._source, null, 2));
          const header = {};
          body.push(header);

          const queryStr = ESParameterFiller.generate(valueInfo, { parent: hits[j]._source });
          body.push(queryStr);
        }

        const client: ElasticClient = this.controller.getClient();
        client.msearch(
          {
            body,
          },
          (error: Error | null, response: any) =>
          {
            if (error !== null && error !== undefined)
            {
              return reject(error);
            }

            for (let j = 0; j < batchSize; ++j)
            {
              if (response.error !== undefined)
              {
                return reject(response.error);
              }

              if (response.responses[j].hits !== undefined)
              {
                if (!ignoreEmpty || response.responses[j].hits.hits.length > 0)
                {
                  hits[i + j][subQuery] = response.responses[j].hits.hits;
                }
              }
            }
            resolve();
          });
      }));

      if (promises.length >= this.GROUPJOIN_MSEARCH_MAX_PENDING_BATCHES)
      {
        await Promise.all(promises);
      }
    }
    return Promise.all(promises);
  }

  private getParsedQuery(bodyStr: string): ESParser
  {
    const parser = new ESJSONParser(bodyStr, true);
    const valueInfo = parser.getValueInfo();

    if (parser.hasError())
    {
      const es = parser.getErrors();
      const errors: MidwayErrorItem[] = [];

      es.forEach((e) =>
      {
        const row = (e.token !== null) ? e.token.row : 0;
        const col = (e.token !== null) ? e.token.col : 0;
        const pos = (e.token !== null) ? e.token.charNumber : 0;
        const title: string = String(row) + ':' + String(col) + ':' + String(pos) + ' ' + String(e.message);
        errors.push({ status: -1, title, detail: '', source: {} });
      });

      if (errors.length === 0)
      {
        errors.push({ status: -1, title: '0:0:0 Syntax Error', detail: '', source: {} });
      }

      throw errors;
    }

    return parser;
  }

  private makeQueryCallback(resolve: (any) => void, reject: (Error) => void)
  {
    return (error: Error | null, response: any) =>
    {
      if (error !== null && error !== undefined)
      {
        if (QueryError.isElasticQueryError(error))
        {
          const res: QueryResponse =
            new QueryResponse(
              {},
              QueryError.fromElasticQueryError(error).getMidwayErrors());
          resolve(res);
        }
        else if (QueryError.isESParserError(error))
        {
          const res: QueryResponse =
            new QueryResponse(
              {},
              QueryError.fromESParserError(error).getMidwayErrors());
          resolve(res);
        }
        else
        {
          reject(error); // this will be handled by RouteError.RouteErrorHandler
        }
      }
      else
      {
        if (typeof response !== 'object')
        {
          winston.error('The response from Elasticsearch is not an object, ' + JSON.stringify(response));
          response = { response };
        }
        const res: QueryResponse = new QueryResponse(response);
        resolve(res);
      }
    };
  }
}
