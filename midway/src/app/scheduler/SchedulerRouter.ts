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

import Credentials from '../credentials/Credentials';
import { Permissions } from '../permissions/Permissions';
import UserConfig from '../users/UserConfig';
import * as Util from '../Util';
import Scheduler from './Scheduler';
import SchedulerConfig from './SchedulerConfig';

const Router = new KoaRouter();
const perm: Permissions = new Permissions();

export const credentials: Credentials = new Credentials();
export const scheduler: Scheduler = new Scheduler();

// Get connections from credentials table, requires type=<one of allowedTypes>
Router.get('/connections', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.CredentialPermissions.verifyPermission(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await credentials.getNames(ctx.query.type);
});

// Get job by search parameter, or all if none provided
Router.get('/:id?', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  let getArchived: boolean = false;
  if (ctx.query['archived'] !== undefined && (ctx.query.archived === 'true' || ctx.query.archived === true))
  {
    getArchived = true;
  }
  ctx.body = await scheduler.get(ctx.params.id, getArchived);
});

// update scheduled job's status: set active to 1
Router.post('/active/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  ctx.body = await scheduler.changeActiveStatus(ctx.state.user, ctx.params.id, 1);
});

// Post new scheduled job
Router.post('/create', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const schedule: SchedulerConfig = ctx.request.body.body;
  Util.verifyParameters(schedule, ['jobType', 'name', 'paramsJob', 'schedule', 'sort', 'transport']);
  ctx.body = await scheduler.createCustomSchedule(ctx.state.user, schedule);
});

// run a job on demand
Router.post('/run/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  ctx.body = await scheduler.runOnDemand(ctx.state.user, ctx.params.id);
});

// Delete scheduled jobs by parameter
Router.post('/delete/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  ctx.body = await scheduler.archive(ctx.state.user, ctx.params.id);
});

// update scheduled job's status: set active to 0
Router.post('/inactive/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  ctx.body = await scheduler.changeActiveStatus(ctx.state.user, ctx.params.id, 0);
});

// Update job
Router.post('/update/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const schedule: SchedulerConfig = ctx.request.body.body;
  schedule.id = ctx.params.id;
  Util.verifyParameters(schedule, ['id', 'jobId', 'schedule']);
  ctx.body = await scheduler.upsert(ctx.state.user, schedule);
});

export default Router;
