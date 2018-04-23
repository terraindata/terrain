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

import * as AppUtil from '../AppUtil';
import Credentials from '../credentials/Credentials';
import { Permissions } from '../permissions/Permissions';
import UserConfig from '../users/UserConfig';
import Scheduler from './Scheduler';
import SchedulerConfig from './SchedulerConfig';

const Router = new KoaRouter();
const perm: Permissions = new Permissions();

export const credentials: Credentials = new Credentials();
export const scheduler: Scheduler = new Scheduler();

// Get schedule by search parameter, or all if none provided
Router.get('/:id?', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.SchedulerPermissions.verifyGetRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await scheduler.get(ctx.params.id);
});

Router.post('/cancel/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.SchedulerPermissions.verifyCancelRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = scheduler.cancel(ctx.params.id);
});

// Delete schedules by id
Router.post('/delete/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.SchedulerPermissions.verifyDeleteRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await scheduler.delete(ctx.params.id);
});

// Duplicate schedule by id; creates an identical schedule with '- Copy' appended to name
Router.post('/duplicate/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.SchedulerPermissions.verifyDuplicateRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await scheduler.duplicate(ctx.params.id);
});

// Retrieve schedule log by id
Router.get('/log/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.SchedulerPermissions.verifyGetLogRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await scheduler.getLog(ctx.params.id);
});

// pause schedule by id
Router.post('/pause/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.SchedulerPermissions.verifyPauseRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = scheduler.pause(ctx.params.id);
});

// run schedule immediately by id
Router.post('/run/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.SchedulerPermissions.verifyRunRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await scheduler.runSchedule(ctx.params.id);
});

// unpause paused schedule by id
Router.post('/unpause/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.SchedulerPermissions.verifyUnpauseRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await scheduler.unpause(ctx.params.id);
});

// set status of schedule by id: whether it should run next time or not
Router.post('/status/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.SchedulerPermissions.verifyStatusRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await scheduler.setStatus(ctx.params.id, ctx.request.body.body.status);
});

// Create schedule
Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const schedule: SchedulerConfig = ctx.request.body.body;
  if (schedule.id !== undefined)
  {
    delete schedule.id;
  }
  await perm.SchedulerPermissions.verifyCreateRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await scheduler.upsert(schedule);
});

// Update schedule
Router.post('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const schedule: SchedulerConfig = ctx.request.body.body;
  schedule['id'] = parseInt(ctx.params.id, 10) as number;
  AppUtil.verifyParameters(schedule, ['id']);
  await perm.SchedulerPermissions.verifyUpdateRoute(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await scheduler.upsert(schedule);
});

export default Router;
