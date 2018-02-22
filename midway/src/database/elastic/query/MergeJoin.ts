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

import { Readable } from 'stream';
import * as winston from 'winston';

import * as Elastic from 'elasticsearch';

import ESParameterFiller from '../../../../../shared/database/elastic/parser/EQLParameterFiller';
import ESParser from '../../../../../shared/database/elastic/parser/ESParser';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import QueryRequest from '../../../../../src/database/types/QueryRequest';
import QueryResponse from '../../../../../src/database/types/QueryResponse';
import QueryHandler from '../../../app/query/QueryHandler';
import { getParsedQuery } from '../../../app/Util';
import { QueryError } from '../../../error/QueryError';
import ElasticClient from '../client/ElasticClient';
import ElasticController from '../ElasticController';
import { ElasticQueryHandler } from './ElasticQueryHandler';
import ElasticStream from './ElasticStream';

export async function handleMergeJoin(client: ElasticClient, request: QueryRequest,
  parser: ESParser, query: object): Promise<QueryResponse | Readable>
{
  const childQuery = query['mergeJoin'];
  delete query['mergeJoin'];

  if (childQuery['joinKey'] === undefined)
  {
    throw new Error('joinKey must be specified for a merge join');
  }

  const joinKey = childQuery['joinKey'];
  delete childQuery['joinKey'];

  const parentQuery: Elastic.SearchParams | undefined = query;
  if (parentQuery === undefined)
  {
    throw new Error('Expecting body parameter in the mergeJoin query');
  }

  const doChildQueriesLackSort: boolean = Object.keys(childQuery).reduce((prev, curr) => prev && (childQuery[curr]['sort'] !== undefined), true);
  if (parentQuery['sort'] !== undefined && !doChildQueriesLackSort)
  {
    throw new Error('Sort clause(s) not allowed in a mergeJoin query');
  }

  parentQuery.sort = { [joinKey]: 'asc' } as any;
  const handleSubQueries = async (error, response) =>
  {
    try
    {
      await handleMergeJoinSubQueries(client, childQuery, response, joinKey);
    }
    catch (e)
    {
      throw e;
    }
    return response;
  };

  // TODO: request.streaming
  return new Promise<QueryResponse>((resolve, reject) =>
  {
    client.search({ body: parentQuery } as Elastic.SearchParams,
      async (error, response) =>
      {
        const r = await handleSubQueries(null, response);
        ElasticQueryHandler.makeQueryCallback(resolve, reject)(error, r);
      });
  });
}

async function handleMergeJoinSubQueries(client: ElasticClient, query: object,
  results: object, joinKey: string)
{
  const promises: Array<Promise<any>> = [];
  for (const subQuery of Object.keys(query))
  {
    promises.push(handleMergeJoinSubQuery(client, query, subQuery, results, joinKey));
  }
  return Promise.all(promises);
}

async function handleMergeJoinSubQuery(client: ElasticClient, query: object, subQuery: string,
  parentResults: any, joinKey: string)
{
  return new Promise<QueryResponse>((resolve, reject) =>
  {
    query[subQuery]['sort'] = { [joinKey]: 'asc' };
    const q = {
      body: query[subQuery]
    } as Elastic.SearchParams;
    client.search(
      q,
      async (error: Error | null, response: any) =>
      {
        if (error !== null && error !== undefined)
        {
          return reject(error);
        }

        if (response.error !== undefined)
        {
          return reject(response.error);
        }

        const hits = parentResults.hits.hits;
        for (let i = 0, j = 0; i < hits.length && j < response.hits.hits.length; j++)
        {
          if (response.hits !== undefined)
          {
            if (hits[i]._source[joinKey] === response.hits.hits[j]._source[joinKey])
            {
              hits[i][subQuery] = response.hits.hits[j];
              i++;
            }
          }
        }
        resolve();
      });
  });
}
