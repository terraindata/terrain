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

import clarinet = require('clarinet');
import * as ElasticsearchScrollStream from 'elasticsearch-scroll-stream';
import * as _ from 'lodash';
import { Readable } from 'stream';
import * as winston from 'winston';

import * as Elastic from 'elasticsearch';

import ESParameterFiller from '../../../../../shared/database/elastic/parser/EQLParameterFiller';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import MidwayErrorItem from '../../../../../shared/error/MidwayErrorItem';
import QueryRequest from '../../../../../src/database/types/QueryRequest';
import QueryResponse from '../../../../../src/database/types/QueryResponse';
import QueryHandler from '../../../app/query/QueryHandler';
import { QueryError } from '../../../error/QueryError';
import { makePromiseCallback } from '../../../tasty/Utils';
import ElasticClient from '../client/ElasticClient';
import ElasticController from '../ElasticController';

/**
 * Implements the QueryHandler interface for ElasticSearch
 */
export default class ElasticQueryHandler extends QueryHandler
{
  private controller: ElasticController;

  constructor(controller: ElasticController)
  {
    super();
    this.controller = controller;
  }

  public async handleQuery(request: QueryRequest): Promise<QueryResponse | Readable>
  {
    const type = request.type;

    /* if the body is a string, parse it as JSON
     * NB: this is normally used to detect JSON errors, but could be used generally,
     * although it is less efficient than just sending the JSON.
     */
    if (typeof request.body === 'string')
    {
      try
      {
        request.body = this.getQueryBody(request.body);
      }
      catch (errors)
      {
        return new QueryResponse({}, errors);
      }
    }

    const client: ElasticClient = this.controller.getClient();
    switch (type)
    {
      case 'search':
        if (request.streaming === true)
        {
          return new ElasticsearchScrollStream(client.getDelegate(), request.body);
        }

        if (request.body['groupJoin'] !== undefined)
        {
          return this.handleGroupJoin(request);
        }

        return new Promise<QueryResponse>((resolve, reject) =>
        {
          client.search(request.body as Elastic.SearchParams, this.makeQueryCallback(resolve, reject));
        });

      case 'groupJoin':
        if (request.body['groupJoin'] === undefined)
        {
          request.type = 'search';
          return this.handleQuery(request);
        }
        return this.handleGroupJoin(request);

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

  public async handleGroupJoin(request: QueryRequest): Promise<QueryResponse | Readable>
  {
    const parentQuery: Elastic.SearchParams = request.body as Elastic.SearchParams;
    const childQuery = parentQuery['groupJoin'];
    parentQuery['groupJoin'] = undefined;

    const client: ElasticClient = this.controller.getClient();
    const parentResults = await new Promise<QueryResponse>((resolve, reject) =>
    {
      client.search(parentQuery, this.makeQueryCallback(resolve, reject));
    });

    const body: any[] = [];

    // todo: optimization to avoid repeating index and type if they're the same
    // const index = (childQuery.index !== undefined) ? childQuery.index : undefined;
    // const type = (childQuery.type !== undefined) ? childQuery.type : undefined;

    const parser = new ESJSONParser(childQuery.query, true);
    const valueInfo = parser.getValueInfo();

    if (parser.hasError())
    {
      const errors = parser.getErrors();
      throw errors;
    }

    for (const r of parentResults.result.hits)
    {
      const header = {};
      body.push(header);

      const queryStr = ESParameterFiller.generate(valueInfo, { parent: r });
      body.push({ query: this.getQueryBody(queryStr) });
    }

    return new Promise<QueryResponse>((resolve, reject) =>
    {
      client.msearch(
        {
          body,
        },
        this.makeQueryCallback(resolve, reject));
    });
  }

  private getQueryBody(bodyStr: string): object
  {
    let body: object = {};
    try
    {
      body = JSON.parse(bodyStr);
      return body;
    }
    catch (_e)
    {
      // absorb the error and retry using clarinet so we can get a good error message
      const parser = clarinet.parser();
      const errors: MidwayErrorItem[] = [];

      parser.onerror =
        (e) =>
        {
          const title: string = String(parser.line) + ':' + String(parser.column)
            + ':' + String(parser.position) + ' ' + String(e.message);
          errors.push({ status: -1, title, detail: '', source: {} });
        };

      try
      {
        parser.write(bodyStr).close();
      }
      catch (e)
      {
        // absorb
      }

      if (errors.length === 0)
      {
        errors.push({ status: -1, title: '0:0:0 Syntax Error', detail: '', source: {} });
      }

      throw errors;
    }
  }

  private makeQueryCallback(resolve: (any) => void, reject: (Error) => void)
  {
    return (error: Error, response: any) =>
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
        else
        {
          reject(error); // this will be handled by RouteError.RouteErrorHandler
        }
      }
      else
      {
        if (typeof response !== 'object')
        {
          winston.error('The response from the Elastic Search is not an object, ' + JSON.stringify(response));
          response = { response };
        }
        const res: QueryResponse = new QueryResponse(response);
        resolve(res);
      }
    };
  }
}
