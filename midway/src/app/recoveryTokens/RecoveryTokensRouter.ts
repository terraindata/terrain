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
import * as winston from 'winston';
import * as App from '../App';
import * as Util from '../AppUtil';
import * as rand from 'random-key';
import * as srs from 'secure-random-string';
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
Router.post('/', async (ctx, next) =>
{
   let hostNameValid: boolean = false;
   const hostName: string = ctx.request.body['url'];
   // check that hostname is either .terraindata.com or localhost
   if (hostName.indexOf('terraindata.com') !== -1 || hostName.indexOf('localhost') !== -1)
   {
     hostNameValid = true;
   }
   // check that user exists in db
   const userIds: UserConfig[] = await users.select(['id'], {}) as UserConfig[];
   let email: string;
   let userId: number;
   let userExists: boolean = false;
   for (let index: number = 0; index < userIds.length; index++)
   {
     const usr: UserConfig[] = await users.get(userIds[index]['id']);
     if (usr !== undefined)
     {
       if (usr[0]['email'] === ctx.request.body['email'])
       {
         userExists = true;
         email = ctx.request.body['email'];
         userId = usr[0]['id'];
       }
     }
   }

   if (userExists && hostNameValid)
   {
     email = ctx.request.body['email'];
     // generate token
     //const userToken: string = rand.generate();
     const userToken: string = srs();
     // generate timestamp
     const currDateTime: Date = new Date(Date.now());

     // put timestamp and token into DB with user
     // check if user already exists in recovery tokens table and update token + timestamp
     recoveryTokens.initialize();
     const checkRecoveryTokens: RecoveryTokenConfig[] = await recoveryTokens.get(userId) as RecoveryTokenConfig[];
     const newEntry = {
         id: userId,
         token: userToken,
         createdAt: currDateTime,
       };
     if (checkRecoveryTokens[0] !== undefined)
     {
       const updatedEntry: RecoveryTokenConfig = await recoveryTokens.update(newEntry) as RecoveryTokenConfig;
     }
     else
     {
       const createdEntry: RecoveryTokenConfig = await recoveryTokens.create(newEntry) as RecoveryTokenConfig;
     }

     // construct URL
     const route: string = hostName + '/resetPassword.html?=' + userToken;
     // send email with reset url
     integrations.initialize();
     const emailIntegrations: IntegrationConfig[] = await integrations.get(null, undefined, 'Email', true) as IntegrationConfig[];
     const subject: string = 'Password reset link from notifications@terraindata.com';
     const body: string = 'Please click on the link below to reset your password. \n \n' + route;
     const emailSendStatus: boolean = await App.EMAIL.send(email, emailIntegrations[0].id, subject, body);
     winston.info(`email ${emailSendStatus === true ? 'sent successfully' : 'failed'}`);
     ctx.body = 'Password reset email sent to ' + email + '.';
     ctx.status = 200;

   }

   else
   {
     if (!userExists)
     {
       ctx.body = 'User does not exist.';
       ctx.status = 404;
     }
     if (!hostNameValid)
     {
       ctx.body = 'Host name invalid.';
       ctx.status = 404;
     }
   }

});

export default Router;
