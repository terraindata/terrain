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
import * as winston from 'winston';

import { Readable } from 'stream';
import Query from '../../app/query/Query';
import DatabaseController from '../../database/DatabaseController';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Util from '../Util';
import { QueryHandler } from './QueryHandler';
import QueryResponse from './QueryResponse';

const QueryRouter = new KoaRouter();

// QueryRouter.post(
//   '/',
//   passport.authenticate('access-token-local'),
//   async (ctx, next) =>
//   {
//     const query: Query = ctx.request.body.body as Query;
//
//     winston.info(JSON.stringify(query, null, 1));
//     Util.verifyParameters(query, ['database', 'type', 'body']);
QueryRouter.post(
  '/',
  passport.authenticate('access-token-local'),
  async (ctx, next) =>
  {
    winston.info(JSON.stringify(ctx.request, null, 1));
    let query: Query;
    if (ctx.request.type === 'application/json')
    {
      query = ctx.request.body.body as Query;
    } else if (ctx.request.type === 'application/x-www-form-urlencoded')
    {
      query = JSON.parse(ctx.request.body.data).body as Query;
    } else
    {
      throw new Error('Unknown Request Type ' + ctx.request.body.toString());
    }

    winston.info(JSON.stringify(ctx.request.body, null, 1));
    Util.verifyParameters(query, ['database', 'type', 'body']);

    winston.info('query database: ' + query.database.toString() + ' type "' + query.type + '"');
    winston.debug('query database debug: ' + query.database.toString() + ' type "' + query.type + '"' +
      'body: ' + JSON.stringify(query.body));

    if (query.streaming === true)
    {
      winston.info('Streaming query result to ' + ctx.request.body.filename.toString());
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
    } else
    {
      const qh: QueryHandler = database.getQueryHandler();
      const result: QueryResponse = await qh.handleQuery(query) as QueryResponse;
      ctx.body = result;
      ctx.status = 200;
    }
  });

export default QueryRouter;
