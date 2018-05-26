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
import * as winston from 'winston';

import * as Util from './AppUtil';
import AuthRouter from './auth/AuthRouter';
import DatabaseRouter from './database/DatabaseRouter';
import ETLRouter from './etl/ETLRouter';
import EventRouter from './events/EventRouter';
import IntegrationRouter from './integrations/IntegrationRouter';
import ExportRouter from './io/ExportRouter';
import ImportRouter from './io/ImportRouter';
import ItemRouter from './items/ItemRouter';
import JobRouter from './jobs/JobRouter';
import QueryRouter from './query/QueryRouter';
import ResultsConfigRouter from './resultsConfig/ResultsConfigRouter';
import SchedulerRouter from './scheduler/SchedulerRouter';
import SchemaRouter from './schema/SchemaRouter';
import SchemaMetadataRouter from './schemaMetadata/SchemaMetadataRouter';
import StatusRouter from './status/StatusRouter';
import UserRouter from './users/UserRouter';
import VersionRouter from './versions/VersionRouter';

const AppRouter = new KoaRouter();

AppRouter.use('/auth', AuthRouter.routes(), AuthRouter.allowedMethods());
AppRouter.use('/events', EventRouter.routes(), EventRouter.allowedMethods());
AppRouter.use('/users', UserRouter.routes(), UserRouter.allowedMethods());
AppRouter.use('/items', ItemRouter.routes(), ItemRouter.allowedMethods());
AppRouter.use('/versions', VersionRouter.routes(), VersionRouter.allowedMethods());
AppRouter.use('/database', DatabaseRouter.routes(), DatabaseRouter.allowedMethods());
AppRouter.use('/scheduler', SchedulerRouter.routes(), SchedulerRouter.allowedMethods());
AppRouter.use('/jobs', JobRouter.routes(), JobRouter.allowedMethods());
AppRouter.use('/schema', SchemaRouter.routes(), SchemaRouter.allowedMethods());
AppRouter.use('/status', StatusRouter.routes(), StatusRouter.allowedMethods());
AppRouter.use('/query', QueryRouter.routes(), QueryRouter.allowedMethods());
AppRouter.use('/import', ImportRouter.routes(), ImportRouter.allowedMethods());
AppRouter.use('/export', ExportRouter.routes(), ExportRouter.allowedMethods());
AppRouter.use('/integrations', IntegrationRouter.routes(), IntegrationRouter.allowedMethods());
AppRouter.use('/etl', ETLRouter.routes(), ETLRouter.allowedMethods());
AppRouter.use('/schemametadata', SchemaMetadataRouter.routes(), SchemaMetadataRouter.allowedMethods());
AppRouter.use('/resultsconfig', ResultsConfigRouter.routes(), ResultsConfigRouter.allowedMethods());
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

// MidwayRouter.get('/', async (ctx, next) =>
// {
//   await send(ctx, '/src/app/index.html');
// });

interface AllowedFileOptions
{
  requiresAuth?: boolean;
}

// Allow these specific filenames
const allowedFiles: { [name: string]: AllowedFileOptions } = {
  'index.html': { },
  'login.js': { },
  'login.css': { },
  'login-bg.png': { },
  
  'bundle.js': {
    requiresAuth: true,
  },
  'vendor.bundle.js': {
    requiresAuth: true,
  }
};

  // Allow any files matching these extensions
  const allowedExtensions: string[] = [
    '.woff',
  ];

MidwayRouter.get('/assets/:asset', async (ctx, next) =>
{
    winston.info("************* free");
  let rejectRequest: boolean = false;
  const allowedFileOptions = allowedFiles[ctx.params['asset']];
  
  if (allowedFileOptions === undefined)
  {
    rejectRequest = true;
    winston.info("************* failed 1");
    allowedExtensions.forEach((ext) =>
    {
      if (ctx.params['asset'].endsWith(ext))
      {
        rejectRequest = false;
      }
    });
  }
  else if(allowedFileOptions.requiresAuth)
  {
    let authenticated = true;
    
    // TODO authenticate
    
    if (!authenticated)
    {
      winston.info("************* failed 2");
      rejectRequest = true;
    }
  }

  if (rejectRequest === true)
  {
    winston.info("************* failed 33");
    return;
  }

  if (process.env.NODE_ENV === 'production')
  {
    await send(ctx, `/midway/src/assets/${ctx.params['asset']}`);
  }
  else
  {
    ctx.body = await Util.doRequest(`http://localhost:8080/midway/v1/assets/${ctx.params['asset']}`);
  }
});

export default MidwayRouter;
