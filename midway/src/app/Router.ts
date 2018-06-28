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

import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';
import * as send from 'koa-send';

import * as Util from './AppUtil';
import * as AuthRouter from './auth/AuthRouter';
import * as DatabaseRouter from './database/DatabaseRouter';
import * as ETLRouter from './etl/ETLRouter';
import * as EventRouter from './events/EventRouter';
import * as FeedbackRouter from './feedback/FeedbackRouter';
import * as IntegrationRouter from './integrations/IntegrationRouter';
import * as ItemRouter from './items/ItemRouter';
import * as JobRouter from './jobs/JobRouter';
import * as QueryRouter from './query/QueryRouter';
import * as ResultsConfigRouter from './resultsConfig/ResultsConfigRouter';
import * as SchedulerRouter from './scheduler/SchedulerRouter';
import * as SchemaRouter from './schema/SchemaRouter';
import * as SchemaMetadataRouter from './schemaMetadata/SchemaMetadataRouter';
import * as StatusRouter from './status/StatusRouter';
import * as UserRouter from './users/UserRouter';
import * as VersionRouter from './versions/VersionRouter';
// /feedback

export function getRouter()
{
  const AppRouter = new KoaRouter();

  AuthRouter.initialize();
  EventRouter.initialize();
  UserRouter.initialize();
  ItemRouter.initialize();
  VersionRouter.initialize();
  DatabaseRouter.initialize();
  SchedulerRouter.initialize();
  JobRouter.initialize();
  SchemaRouter.initialize();
  StatusRouter.initialize();
  QueryRouter.initialize();
  IntegrationRouter.initialize();
  ETLRouter.initialize();
  SchemaMetadataRouter.initialize();
  ResultsConfigRouter.initialize();
  FeedbackRouter.initialize();
  AppRouter.use('/auth', AuthRouter.default.routes(), AuthRouter.default.allowedMethods());
  AppRouter.use('/events', EventRouter.default.routes(), EventRouter.default.allowedMethods());
  AppRouter.use('/users', UserRouter.default.routes(), UserRouter.default.allowedMethods());
  AppRouter.use('/items', ItemRouter.default.routes(), ItemRouter.default.allowedMethods());
  AppRouter.use('/versions', VersionRouter.default.routes(), VersionRouter.default.allowedMethods());
  AppRouter.use('/database', DatabaseRouter.default.routes(), DatabaseRouter.default.allowedMethods());
  AppRouter.use('/scheduler', SchedulerRouter.default.routes(), SchedulerRouter.default.allowedMethods());
  AppRouter.use('/jobs', JobRouter.default.routes(), JobRouter.default.allowedMethods());
  AppRouter.use('/schema', SchemaRouter.default.routes(), SchemaRouter.default.allowedMethods());
  AppRouter.use('/status', StatusRouter.default.routes(), StatusRouter.default.allowedMethods());
  AppRouter.use('/query', QueryRouter.default.routes(), QueryRouter.default.allowedMethods());
  AppRouter.use('/integrations', IntegrationRouter.default.routes(), IntegrationRouter.default.allowedMethods());
  AppRouter.use('/etl', ETLRouter.default.routes(), ETLRouter.default.allowedMethods());
  AppRouter.use('/schemametadata', SchemaMetadataRouter.default.routes(), SchemaMetadataRouter.default.allowedMethods());
  AppRouter.use('/resultsconfig', ResultsConfigRouter.default.routes(), ResultsConfigRouter.default.allowedMethods());
  AppRouter.use('/feedback', FeedbackRouter.default.routes(), FeedbackRouter.default.allowedMethods());
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

  MidwayRouter.get('/', async (ctx, next) =>
  {
    await send(ctx, '/src/app/index.html');
  });

  MidwayRouter.get('/assets/:asset', async (ctx, next) =>
  {
    // Allow these specific filenames
    const allowedNames: string[] = [
      'bundle.js',
      'vendor.bundle.js',
    ];

    // Allow any files matching these extensions
    const allowedExtensions: string[] = [
      '.woff',
    ];

    let rejectRequest: boolean = false;
    if (!allowedNames.includes(ctx.params['asset']))
    {
      rejectRequest = true;
      allowedExtensions.forEach((ext) =>
      {
        if (ctx.params['asset'].endsWith(ext))
        {
          rejectRequest = false;
        }
      });
    }

    if (rejectRequest === true)
    {
      return;
    }

    if (process.env.NODE_ENV === 'production')
    {
      await send(ctx, `/midway/src/assets/${ctx.params['asset']}`);
    }
    else
    {
      ctx.body = await Util.doRequest(`http://localhost:8080/assets/${ctx.params['asset']}`);
    }
  });

  MidwayRouter.get('/robots.txt', async (ctx, next) =>
  {
    await send(ctx, '/src/app/robots.txt');
  });

  return MidwayRouter;
}

export default getRouter;
