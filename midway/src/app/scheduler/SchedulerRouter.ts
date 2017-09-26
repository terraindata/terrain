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

import { UserConfig, Users } from '../users/Users';
import * as Util from '../Util';
import { Scheduler, SchedulerConfig } from './Scheduler';

const users = new Users();

export const scheduler: Scheduler = new Scheduler();

const Router = new KoaRouter();

// Get job by search parameter, or all if none provided
Router.get('/:id?', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  ctx.body = await scheduler.get(ctx.params.id);
});

// Post new scheduled job
Router.post('/create', async (ctx, next) =>
{
  const user: UserConfig | null = await Util.authenticateNormal(ctx.request.body);
  let authStream: object = {};
  if (user !== null)
  {
    const schedule: SchedulerConfig = ctx.request.body.body;
    Util.verifyParameters(schedule, ['jobId', 'schedule']);
    ctx.body = await scheduler.createStandardSchedule(schedule);
  }
  else
  {
    authStream = await Util.authenticatePersistentAccessToken(ctx.request.body);
    if (authStream['template'] === null)
    {
      ctx.status = 400;
      return;
    }
    const schedule: SchedulerConfig = ctx.request.body.body;
    Util.verifyParameters(schedule, ['jobId', 'jobType', 'params', 'schedule', 'sort', 'transport']);
    ctx.body = await scheduler.createCustomSchedule(schedule);
  }
});

// Delete scheduled jobs by parameter
Router.post('/delete/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  ctx.body = await scheduler.delete(ctx.params.id);
});

// Update job
Router.post('/update/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const schedule: SchedulerConfig = ctx.request.body.body;
  schedule.id = ctx.params.id;
  Util.verifyParameters(schedule, ['id', 'jobId', 'schedule']);
  ctx.body = await scheduler.upsert(schedule);
});

export default Router;
