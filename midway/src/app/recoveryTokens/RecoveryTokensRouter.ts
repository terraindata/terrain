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

import * as fs from 'fs';
import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';
import * as srs from 'secure-random-string';
import * as App from '../App';
import * as Util from '../AppUtil';
import { MidwayLogger } from '../log/MidwayLogger';
import RecoveryTokenConfig from '../recoveryTokens/RecoveryTokenConfig';
import RecoveryTokens from '../recoveryTokens/RecoveryTokens';
import UserConfig from '../users/UserConfig';
import Users from '../users/Users';
const users: Users = new Users();
export const initialize = () => users.initialize();
const Router = new KoaRouter();
const recoveryTokens: RecoveryTokens = new RecoveryTokens();
import IntegrationConfig from '../integrations/IntegrationConfig';
import Integrations from '../integrations/Integrations';
const integrations: Integrations = new Integrations();
import EmailTemplate from '../EmailTemplate';
Router.post('/', async (ctx, next) =>
{
  let hostNameValid: boolean = false;
  const hostName: string = ctx.request.body['url'];
  if (/https*:\/\/[a-z\-]*\.terraindata\.com$/.test(hostName) || /https*:\/\/localhost[:0-9]*$/.test(hostName))
  {
    hostNameValid = true;
  }
  let userId: number;
  let userExists: boolean = false;
  let email: string;
  const user: UserConfig[] = await users.select(['id'], { email: ctx.request.body['email'] }) as UserConfig[];
  if (user.length === 1)
  {
    userId = user[0].id;
    userExists = (userId !== undefined && userId !== null);
  }
  else
  {
    MidwayLogger.error("user doesn't exist: " + JSON.stringify(ctx.request.body['email']));
  }
  if (userExists && hostNameValid)
  {
    email = ctx.request.body['email'];

    const userToken: string = srs();

    const currDateTime: Date = new Date(Date.now());

    recoveryTokens.initialize();
    const checkRecoveryTokens: RecoveryTokenConfig[] = await recoveryTokens.get(userId) as RecoveryTokenConfig[];
    const newEntry = {
      id: userId,
      token: userToken,
      createdAt: currDateTime,
    };
    try
    {
      const entry = await recoveryTokens.upsert(newEntry) as RecoveryTokenConfig;
    }
    catch
    {
      MidwayLogger.error('unable to upsert user into recovery tokens table.');
    }
    const route: string = hostName + '/resetPassword.html?token=' + userToken;
    integrations.initialize();
    const emailIntegrations: IntegrationConfig[] = await integrations.get(null, undefined, 'Email', true) as IntegrationConfig[];
    const subject: string = 'Password reset link from notifications@terraindata.com';
    const body: string = '';
    // const path: string = process.cwd() + '/midway/src/app/recoveryTokens/EmailTemplate.html';
    // let html: string = fs.readFileSync(path, 'utf8');
    const emailHtml: string = EmailTemplate.makeEmailContent('Reset your password.',
      "You're receiving this email because someone requested a password reset for your user account at Terrain.*",
      "*If you didn’t request this email or don't know why you received it, please contact leslie@terraindata.com immediately.",
      route, 'RESET PASSWORD');
    const attachment: object = [
    {
      filename: 'bg-blue-gradient.png',
      path: process.cwd() + '/src/images/bg-blue-gradient.png',
      cid: 'terrainbackground',
    },
    {
      filename: 'logo-terrain-light.png',
      path: process.cwd() + '/src/images/logo-terrain-light.png',
      cid: 'terrainlogo',
    },
    {
      filename: 'twitter@2x.png',
      path: process.cwd() + '/src/images/twitter@2x.png',
      cid: 'twitterlogo',
    },
    {
      filename: 'linkedin@2x.png',
      path: process.cwd() + '/src/images/linkedin@2x.png',
      cid: 'linkedinlogo',
    }];
    const emailSendStatus: boolean = await App.EMAIL.send(emailIntegrations[0].id, subject, body, attachment, email, emailHtml);
    MidwayLogger.info(`email ${emailSendStatus === true ? 'sent successfully' : 'failed'}`);
  }

  ctx.body = "Password reset email sent. If you don't receive an email in 30 minutes, please contact Terrain support.";
  ctx.status = 200;
});

export default Router;
