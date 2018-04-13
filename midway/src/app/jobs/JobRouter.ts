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

import JobConfig from 'shared/types/jobs/JobConfig';
import * as AppUtil from '../AppUtil';
import Credentials from '../credentials/Credentials';
import { Permissions } from '../permissions/Permissions';
import UserConfig from '../users/UserConfig';
import JobQueue from './JobQueue';

const Router = new KoaRouter();
const perm: Permissions = new Permissions();

export const credentials: Credentials = new Credentials();
export const jobQueue: JobQueue = new JobQueue();

// Get job by search parameter, or all if none provided
Router.get('/:id?', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.JobQueuePermissions.verifyGetRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await jobQueue.get(ctx.params.id);
});

Router.post('/cancel/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.JobQueuePermissions.verifyCancelRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = jobQueue.cancel(ctx.params.id);
});

// Delete job by id
Router.post('/delete/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.JobQueuePermissions.verifyDeleteRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await jobQueue.delete(ctx.params.id);
});

// Duplicate job by id; creates an identical job with '- Copy' appended to name
Router.post('/duplicate/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.JobQueuePermissions.verifyDuplicateRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await jobQueue.duplicate(ctx.params.id);
});

// Retrieve job log by id
Router.get('/log/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.JobQueuePermissions.verifyGetLogRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await jobQueue.getLog(ctx.params.id);
});

// pause job by id
Router.post('/pause/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.JobQueuePermissions.verifyPauseRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = jobQueue.pause(ctx.params.id);
});

// unpause paused job by id
Router.post('/unpause/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.JobQueuePermissions.verifyUnpauseRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await jobQueue.unpause(ctx.params.id);
});

// Create job
Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const job: JobConfig = ctx.request.body.body;
  if (job.id !== undefined)
  {
    delete job.id;
  }
  await perm.JobQueuePermissions.verifyCreateRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await jobQueue.upsert(job);
});

// Update job
Router.post('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const job: JobConfig = ctx.request.body.body;
  job.id = ctx.params.id;
  AppUtil.verifyParameters(job, ['id', 'interval', 'name', 'priority', 'tasks']);
  await perm.JobQueuePermissions.verifyUpdateRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await jobQueue.upsert(job);
});

export default Router;
