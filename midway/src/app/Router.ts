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
import * as send from 'koa-send';

import AuthRouter from './auth/AuthRouter';
import CredentialRouter from './credentials/CredentialRouter';
import DatabaseRouter from './database/DatabaseRouter';
import TemplateRouter from './etl/TemplateRouter';
import EventRouter from './events/EventRouter';
import ExportRouter from './io/ExportRouter';
import ImportRouter from './io/ImportRouter';
import ItemRouter from './items/ItemRouter';
import QueryRouter from './query/QueryRouter';
import SchedulerRouter from './scheduler/SchedulerRouter';
import SchemaRouter from './schema/SchemaRouter';
import StatusRouter from './status/StatusRouter';
import UserRouter from './users/UserRouter';
import * as Util from './Util';
import VersionRouter from './versions/VersionRouter';

const AppRouter = new KoaRouter();

AppRouter.use('/auth', AuthRouter.routes(), AuthRouter.allowedMethods());
AppRouter.use('/events', EventRouter.routes(), EventRouter.allowedMethods());
AppRouter.use('/users', UserRouter.routes(), UserRouter.allowedMethods());
AppRouter.use('/items', ItemRouter.routes(), ItemRouter.allowedMethods());
AppRouter.use('/versions', VersionRouter.routes(), VersionRouter.allowedMethods());
AppRouter.use('/database', DatabaseRouter.routes(), DatabaseRouter.allowedMethods());
AppRouter.use('/scheduler', SchedulerRouter.routes(), SchedulerRouter.allowedMethods());
AppRouter.use('/schema', SchemaRouter.routes(), SchemaRouter.allowedMethods());
AppRouter.use('/status', StatusRouter.routes(), StatusRouter.allowedMethods());
AppRouter.use('/query', QueryRouter.routes(), QueryRouter.allowedMethods());
AppRouter.use('/import', ImportRouter.routes(), ImportRouter.allowedMethods());
AppRouter.use('/export', ExportRouter.routes(), ExportRouter.allowedMethods());
AppRouter.use('/credentials', CredentialRouter.routes(), CredentialRouter.allowedMethods());
AppRouter.use('/templates', TemplateRouter.routes(), TemplateRouter.allowedMethods());
// Add future routes here.

AppRouter.get('/time', (ctx, next) =>
{
  ctx.body = { serverTime: new Date().toJSON() };
});

// Prefix all routes with /midway
//  This is so that we can allow the front-end to use all other routes.
//  Any route not prefixed with /midway will just serve the front-end.

AppRouter.get('/', async (ctx, next) =>
{
  if (ctx.state.user !== undefined && ctx.state.user[0] !== undefined)
  {
    ctx.body = 'authenticated as ' + (ctx.state.user[0].email as string);
  }
  else
  {
    ctx.body = 'not authenticated';
  }
});

AppRouter.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  ctx.body = 'authenticated as ' + (ctx.state.user[0].email as string);
});

const MidwayRouter = new KoaRouter();
MidwayRouter.use('/midway/v1', AppRouter.routes(), AppRouter.allowedMethods());

MidwayRouter.get('/favicon.ico', async (ctx, next) =>
{
  await send(ctx, '/midway/src/assets/favicon.ico');
});

MidwayRouter.get('/', async (ctx, next) =>
{
  await send(ctx, '/src/app/index.html');
});

MidwayRouter.get('/assets/bundle.js', async (ctx, next) =>
{
  if (process.env.NODE_ENV === 'production')
  {
    await send(ctx, '/midway/src/assets/bundle.js');
  }
  else
  {
    ctx.body = await Util.doRequest('http://localhost:8080/assets/bundle.js');
  }
});

MidwayRouter.get('/assets/vendor.bundle.js', async (ctx, next) =>
{
  if (process.env.NODE_ENV === 'production')
  {
    await send(ctx, '/midway/src/assets/vendor.bundle.js');
  }
  else
  {
    ctx.body = await Util.doRequest('http://localhost:8080/assets/vendor.bundle.js');
  }
});

export default MidwayRouter;
