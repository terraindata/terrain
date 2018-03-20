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
import { Readable } from 'stream';
import * as winston from 'winston';

import ESConverter from '../../../../../shared/database/elastic/formatter/ESConverter';
import ESParameterFiller from '../../../../../shared/database/elastic/parser/EQLParameterFiller';
import ESParser from '../../../../../shared/database/elastic/parser/ESParser';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import QueryRequest from '../../../../../shared/database/types/QueryRequest';
import QueryResponse from '../../../../../shared/database/types/QueryResponse';
import BufferTransform from '../../../app/io/streams/BufferTransform';
import GroupJoinTransform from '../../../app/io/streams/GroupJoinTransform';
import QueryHandler from '../../../app/query/QueryHandler';
import { getParsedQuery } from '../../../app/Util';
import { QueryError } from '../../../error/QueryError';
import ElasticClient from '../client/ElasticClient';
import ElasticController from '../ElasticController';

import MergeJoinTransform from '../../../app/io/streams/MergeJoinTransform';
import ElasticStream from './ElasticStream';

/**
 * Implements the QueryHandler interface for ElasticSearch
 */
export class ElasticQueryHandler extends QueryHandler
{
  public static makeQueryCallback(resolve: (any) => void, reject: (Error) => void)
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

  private controller: ElasticController;

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
          parser = getParsedQuery(request.body);
        }
        catch (errors)
        {
          return new QueryResponse({}, errors);
        }

        const query = parser.getValue();
        // TODO: remove this restriction
        if (query['groupJoin'] !== undefined && query['mergeJoin'] !== undefined)
        {
          throw new Error('Specifying multiple join types is not supported at the moment.');
        }

        let stream: Readable;
        if (query['groupJoin'] !== undefined)
        {
          stream = new GroupJoinTransform(client, request.body);
        }
        else if (query['mergeJoin'] !== undefined)
        {
          stream = new MergeJoinTransform(client, request.body);
        }
        else
        {
          stream = new ElasticStream(client, query, request.streaming);
        }

        if (request.streaming === true)
        {
          return stream;
        }
        else
        {
          return new Promise<QueryResponse>((resolve, reject) =>
          {
            const bufferTransform = new BufferTransform(stream,
              (err, res) =>
              {
                ElasticQueryHandler.makeQueryCallback(resolve, reject)(err, res[0]);
              });
          });
        }

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
          handler.call(client, request.body, ElasticQueryHandler.makeQueryCallback(resolve, reject));
        });

      default:
        break;
    }

    throw new Error('Query type "' + type + '" is not currently supported.');
  }
}

export default ElasticQueryHandler;
