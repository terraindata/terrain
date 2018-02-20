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
import ESParser from '../../../../../shared/database/elastic/parser/ESParser';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import QueryRequest from '../../../../../src/database/types/QueryRequest';
import QueryResponse from '../../../../../src/database/types/QueryResponse';
import QueryHandler from '../../../app/query/QueryHandler';
import { getParsedQuery } from '../../../app/Util';
import { QueryError } from '../../../error/QueryError';
import ElasticClient from '../client/ElasticClient';
import ElasticController from '../ElasticController';
import ElasticStream from './ElasticStream';

const GROUPJOIN_MSEARCH_BATCH_SIZE = 100;
const GROUPJOIN_MSEARCH_MAX_PENDING_BATCHES = 1;
const GROUPJOIN_DEFAULT_SIZE = 10;

export async function handleGroupJoin(client: ElasticClient, request: QueryRequest, parser: ESParser, query: object): Promise<QueryResponse | Readable>
{
  // get the child (groupJoin) query
  const childQuery = query['groupJoin'];
  query['groupJoin'] = undefined;

  // determine other groupJoin settings from the query
  const dropIfLessThan = (childQuery['dropIfLessThan'] !== undefined) ? childQuery['dropIfLessThan'] : 0;
  delete childQuery['dropIfLessThan'];

  const parentAlias = (childQuery['parentAlias'] !== undefined) ? childQuery['parentAlias'] : 'parent';
  delete childQuery['parentAlias'];

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

  const handleSubQueries = async (error, response) =>
  {
    try
    {
      await handleGroupJoinSubQueries(client, valueInfo, childQuery, response, parentAlias);
    }
    catch (e)
    {
      throw e;
    }

    if (dropIfLessThan > 0)
    {
      const subQueries = Object.keys(childQuery);
      response.hits.hits = response.hits.hits.filter((r) =>
      {
        return (subQueries.reduce((count, subQuery) =>
        {
          if (r[subQuery] !== undefined && Array.isArray(r[subQuery]))
          {
            count += r[subQuery].length;
          }
          return count;
        }, 0) >= dropIfLessThan);
      });
    }
    return response;
  };

  if (request.streaming === true)
  {
    return new ElasticStream(client, parentQuery, { objectMode: true }, handleSubQueries);
  }
  else
  {
    return new Promise<QueryResponse>((resolve, reject) =>
    {
      client.search({ body: parentQuery } as Elastic.SearchParams,
        async (error, response) =>
        {
          const r = await handleSubQueries(null, response);
          this.makeQueryCallback(resolve, reject)(error, r);
        });
    });
  }
}

async function handleGroupJoinSubQueries(client: ElasticClient, parentValueInfo: ESValueInfo, query: object, results: object, parentAlias: string)
{
  const promises: Array<Promise<any>> = [];
  for (const subQuery of Object.keys(query))
  {
    const vi = parentValueInfo.objectChildren[subQuery].propertyValue;
    if (vi === null)
    {
      throw new Error('Error finding subquery property');
    }

    promises.push(handleGroupJoinSubQuery(client, vi, subQuery, results, parentAlias));
  }
  return Promise.all(promises);
}

async function handleGroupJoinSubQuery(client: ElasticClient, valueInfo: ESValueInfo, subQuery: string, parentResults: any, parentAlias: string)
{
  const hits = parentResults.hits.hits;
  const promises: Array<Promise<any>> = [];
  for (let i = 0, batchSize = GROUPJOIN_MSEARCH_BATCH_SIZE; i < hits.length; i += batchSize)
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

        const queryStr = ESParameterFiller.generate(valueInfo, { [parentAlias]: hits[j]._source });
        body.push(queryStr);
      }

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
              hits[i + j][subQuery] = response.responses[j].hits.hits;
            }
          }
          resolve();
        });
    }));

    if (promises.length >= GROUPJOIN_MSEARCH_MAX_PENDING_BATCHES)
    {
      await Promise.all(promises);
    }
  }
  return Promise.all(promises);
}
