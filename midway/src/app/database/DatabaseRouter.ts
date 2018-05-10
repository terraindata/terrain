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

import * as Util from '../AppUtil';
import DatabaseConfig from './DatabaseConfig';
import Databases from './Databases';

export const Router = new KoaRouter();
export const databases = new Databases();

Router.get('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting all databases');
  ctx.body = await databases.select(['id', 'name', 'type', 'host', 'isAnalytics', 'analyticsIndex', 'analyticsType']);
});

Router.get('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting database ID ' + String(ctx.params.id));
  ctx.body = await databases.get(Number(ctx.params.id), ['id', 'name', 'type', 'host']);
});

Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('add new database');
  const db: DatabaseConfig = ctx.request.body.body;
  Util.verifyParameters(db, ['name', 'dsn', 'host', 'isAnalytics']);
  if (db.id !== undefined)
  {
    throw new Error('Invalid parameter database ID');
  }

  if (db.isAnalytics)
  {
    if (db.analyticsIndex === undefined || db.analyticsType === undefined)
    {
      throw new Error('Missing analytics index or type parameter');
    }
  }

  ctx.body = await databases.upsert(ctx.state.user, db);
  await databases.connect(ctx.state.user, db.id);
});

Router.post('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('update existing database');
  const db: DatabaseConfig = ctx.request.body.body;
  if (db.id === undefined)
  {
    db.id = Number(ctx.params.id);
  }
  else
  {
    if (db.id !== Number(ctx.params.id))
    {
      throw Error('Database ID does not match the supplied id in the URL');
    }
  }

  ctx.body = await databases.upsert(ctx.state.user, db);
  await databases.connect(ctx.state.user, db.id);
});

Router.post('/:id/connect', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('connect to database');
  ctx.body = await databases.connect(ctx.state.user, Number(ctx.params.id));
});

Router.post('/:id/disconnect', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('disconnect from database');
  ctx.body = await databases.disconnect(ctx.state.user, Number(ctx.params.id));
});

Router.post('/:id/delete', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('delete a database entry');
  ctx.body = await databases.delete(ctx.state.user, Number(ctx.params.id));
});

Router.get('/:id/schema', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('get database schema');
  ctx.body = await databases.schema(Number(ctx.params.id));
});

export default Router;
