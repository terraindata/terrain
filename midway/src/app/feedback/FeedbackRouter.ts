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
import IntegrationConfig from '../integrations/IntegrationConfig';
import Integrations from '../integrations/Integrations';
import { MidwayLogger } from '../log/MidwayLogger';

const Router = new KoaRouter();
const integrations: Integrations = new Integrations();
export const initialize = () => integrations.initialize();

Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const fullBody = ctx.request.body['body'];
  const description = JSON.stringify(fullBody.description);
  const user = JSON.stringify(fullBody.user);
  const browserInfo = JSON.stringify(fullBody.browserInfo);
  let subject: string = '';
  let body: string;
  ctx.status = 200;
  const emailIntegrations: IntegrationConfig[] = await integrations.get(null, undefined, 'Email', true) as IntegrationConfig[];
  MidwayLogger.info('email integrations: ' + JSON.stringify(emailIntegrations));
  if (emailIntegrations.length !== 1)
  {
    MidwayLogger.warn(`Invalid number of email integrations, found ${emailIntegrations.length}`);
  }
  else if (emailIntegrations.length === 1 && emailIntegrations[0].name !== 'Default Failure Email')
  {
    MidwayLogger.warn('Invalid Email found.');
  }
  else
  {
    let attachment: object;
    if (fullBody.bug)
    {
      subject = 'Bug report from ' + user;
      body = 'A user has submitted a bug report detailed below. \n \n' + description + '\n \n Browser/OS information: ' + browserInfo;
    }
    else
    {
      subject = 'Feedback report from ' + user;
      body = 'A user has submitted a feedback report detailed below. \n \n' + description + '\n \n Browser/OS information: ' + browserInfo;
    }
    if (fullBody.screenshot)
    {
      attachment = [{
        path: fullBody.screenshot,
      }];
    }
    // MidwayLogger.info("id: " + emailIntegrations[0].id);
    const emailSendStatus: boolean = await App.EMAIL.send(emailIntegrations[0].id, subject, body, attachment);
    MidwayLogger.info(`Feedback email ${emailSendStatus === true ? 'sent successfully' : 'failed'}`);
  }
});

export default Router;
