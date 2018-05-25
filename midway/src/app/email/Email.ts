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

import * as nodemailer from 'nodemailer';
import * as winston from 'winston';

import * as App from '../App';
import IntegrationConfig from '../integrations/IntegrationConfig';
import Integrations from '../integrations/Integrations';

const integrations: Integrations = new Integrations();

// currently a root level member of App: App.EMAIL
export class Email
{
  private transports: Map<number, any>;

  constructor()
  {
    this.transports = new Map<number, any>(); // transports for nodemailer
  }

  /*
   * Creates and sends an email.
   * PARAMS: integration ID, subject, body (number, string, string ==> Promise<boolean>)
   */
  public async send(integrationId: number, subject: string, body: string): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const integrationConfigs: IntegrationConfig[] = await integrations.get(null, integrationId, 'Email', true);
      if (integrationConfigs.length !== 0)
      {
        const connectionConfig = integrationConfigs[0].connectionConfig;
        const authConfig = integrationConfigs[0].authConfig;
        const fullConfig: object = Object.assign(connectionConfig, authConfig);

        // if this integration hasn't been loaded into memory yet as a nodemailer transport
        if (!this.transports.has(integrationId))
        {
          const transportOptions =
            {
              host: fullConfig['smtp'],
              port: fullConfig['port'],
              auth:
                {
                  user: fullConfig['email'],
                  pass: fullConfig['password'],
                },
            };
          this.transports.set(integrationId, nodemailer.createTransport(transportOptions));
        }
        const currTransport = this.transports.get(integrationId);

        // set email parameters
        const emailContents: object =
          {
            from: fullConfig['email'],
            to: fullConfig['recipient'],
            subject,
            text: body,
          };

        // send the email
        currTransport.sendMail(emailContents, (err, info) =>
        {
          if (err)
          {
            winston.warn('Email send status: ' + JSON.stringify(err, null, 2));
            resolve(false);
          }
          else
          {
            winston.info('Email send status: ' + JSON.stringify(info, null, 2));
            resolve(true);
          }
        });
      }
    });
  }
}

export default Email;
