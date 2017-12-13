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

import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';
import * as _ from 'lodash';
import * as winston from 'winston';
import * as Util from '../Util';

import { Readable } from 'stream';

import QueryRequest from '../../../../src/database/types/QueryRequest';
import QueryResponse from '../../../../src/database/types/QueryResponse';
import { QueryHandler } from './QueryHandler';

import DatabaseController from '../../database/DatabaseController';
import ElasticClient from '../../database/elastic/client/ElasticClient';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';

const QueryRouter = new KoaRouter();

QueryRouter.post(
  '/',
  passport.authenticate('access-token-local'),
  async (ctx, next) =>
  {
    winston.info(JSON.stringify(ctx.request, null, 1));
    let query: QueryRequest;
    if (ctx.request.type === 'application/json')
    {
      query = ctx.request.body.body as QueryRequest;
    }
    else if (ctx.request.type === 'application/x-www-form-urlencoded')
    {
      query = JSON.parse(ctx.request.body.data).body as QueryRequest;
    }
    else
    {
      throw new Error('Unknown Request Type ' + String(ctx.request.body));
    }

    winston.info(JSON.stringify(ctx.request.body, null, 1));
    winston.info('db ' + JSON.stringify(query));
    Util.verifyParameters(query, ['database', 'type', 'body']);

    winston.info('query database: ' + query.database.toString() + ' type "' + query.type + '"');
    winston.debug('query database debug: ' + query.database.toString() + ' type "' + query.type + '"' +
      'body: ' + JSON.stringify(query.body));

    if (query.streaming === true)
    {
      winston.info('Streaming query result to ' + String(ctx.request.body.filename));
    }

    const database: DatabaseController | undefined = DatabaseRegistry.get(query.database);
    if (database === undefined)
    {
      throw new Error('Database "' + query.database.toString() + '" not found.');
    }

    if (query.streaming === true)
    {
      const qh: QueryHandler = database.getQueryHandler();
      const queryStream: Readable = await qh.handleQuery(query) as Readable;
      ctx.type = 'text/plain';
      ctx.attachment(ctx.request.body.filename);
      ctx.body = queryStream;
    }
    else
    {
      const qh: QueryHandler = database.getQueryHandler();
      const result: QueryResponse = await qh.handleQuery(query) as QueryResponse;
      result.setQueryRequest(query);
      ctx.body = result;
      ctx.status = 200;
    }
  });

QueryRouter.post('/template', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  // parse ctx.request.body.body as an Array
  const reqArr: object[] = ctx.request.body.body as object[];
  const bodyArr: object[] = [];
  const indexSet: Set<string> = new Set();
  const typeSet: Set<string> = new Set();
  let dbid: number = -1;
  reqArr.forEach((elem) =>
  {
    // get index and types, if any and add them to the Set
    if (elem['index'] !== undefined)
    {
      indexSet.add(elem['index']);
    }
    if (elem['type'] !== undefined)
    {
      typeSet.add(elem['type']);
    }
    if (elem['dbid'] !== undefined && typeof elem['dbid'] === 'number')
    {
      dbid = elem['dbid'];
    }
    const bodyObj: object = {};
    const headerObj: object = {};
    if (elem['id'] !== undefined && typeof elem['id'] === 'string' && elem['params'] !== undefined && typeof elem['params'] === 'object'
      && elem['explain'] !== undefined && typeof elem['explain'] === 'boolean')
    {
      bodyObj['id'] = elem['id'];
      bodyObj['params'] = elem['params'];
      headerObj['index'] = elem['index'];
      headerObj['type'] = elem['type'];
      bodyArr.push(headerObj);
      bodyArr.push(bodyObj);
    }

  });
  const database: DatabaseController | undefined = DatabaseRegistry.get(dbid);
  const elasticClient: ElasticClient = (database as DatabaseController).getClient() as ElasticClient;
  const params: any =
    {
      index: [...indexSet],
      type: [...typeSet],
      body: bodyArr,
    };
  ctx.body = await new Promise<any>(async (resolve, reject) =>
  {
    elasticClient.msearchTemplate(params, Util.makePromiseCallback(resolve, reject));
  });
});

export default QueryRouter;
