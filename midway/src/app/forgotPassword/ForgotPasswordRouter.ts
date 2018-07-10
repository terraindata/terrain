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
import * as App from '../App';
import * as Util from '../AppUtil';
import { MidwayLogger } from '../log/MidwayLogger';
import RecoveryTokenConfig from '../recoveryTokens/RecoveryTokenConfig';
import RecoveryTokens from '../recoveryTokens/RecoveryTokens';
import UserConfig from '../users/UserConfig';
import Users from '../users/Users';
const users: Users = new Users();
const recoveryTokens: RecoveryTokens = new RecoveryTokens();
const Router = new KoaRouter();
export const initialize = () => users.initialize();

Router.post('/', async (ctx, next) =>
{
  ctx.status = 401;
  ctx.body = 'Error changing password.';
  const token: string = ctx.request.body['recoveryToken'];
  const newPassword: string = ctx.request.body['newPassword'];
  recoveryTokens.initialize();
  const recoveryTokenEntry = await recoveryTokens.select([], {token: ctx.request.body['recoveryToken']}) as RecoveryTokenConfig[];
  if (recoveryTokenEntry.length === 1) 
  {
    const timestamp: Date = recoveryTokenEntry[0]['createdAt'];
    const validWindow: Date = new Date(timestamp);
    validWindow.setDate(timestamp.getDate() + 1);
    const currDateTime: Date = new Date(Date.now());

    if (currDateTime.getTime() <= validWindow.getTime())
    {
      const userIdToChange: number = recoveryTokenEntry[0]['id'];
      const user = await users.get(userIdToChange);
      const userToUpdate = user[0];
      userToUpdate['password'] = newPassword;
      const updatedUser: UserConfig = await users.update(userToUpdate, true) as UserConfig;
      const newEntry = {
        id: recoveryTokenEntry[0]['id'],
        token: null,
        createdAt: currDateTime,
      };
      const updatedEntry: RecoveryTokenConfig = await recoveryTokens.update(newEntry) as RecoveryTokenConfig;
      ctx.body = 'Password successfully changed.';
      ctx.status = 200;
    }
    else
    {
      ctx.body = 'Invalid reset url - token expired.';
    }
  }
});

Router.get('/:token', async (ctx, next) =>
{
  const token: string = ctx.params.token;
  let tokenFound: boolean = false;
  recoveryTokens.initialize();
  const allRecoveryTokens: RecoveryTokenConfig[] = await recoveryTokens.select([], {}) as RecoveryTokenConfig[];
  const recoveryTokenEntry = await recoveryTokens.select([], {token: ctx.params.token}) as RecoveryTokenConfig[];
  if (recoveryTokenEntry.length === 1)
  {
    ctx.status = 200;
  }
  else 
  {
    ctx.status = 401;
    MidwayLogger.error("Token not found.");
  }
});

export default Router;
