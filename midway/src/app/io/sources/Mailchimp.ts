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

import jsonStream = require('JSONStream');

import * as _ from 'lodash';
import * as stream from 'stream';
import * as winston from 'winston';

import { CredentialConfig } from '../../credentials/CredentialConfig';
import { Credentials } from '../../credentials/Credentials';
import { ExportSourceConfig } from './Sources';

export const credentials: Credentials = new Credentials();

export interface MailchimpJSONConfig
{
  data: object[];
}

export interface MailchimpSourceConfig
{
  data: object[];
  key: string;
  host: string;
}

export class Mailchimp
{

  public async getJSONStreamAsMailchimpSourceConfig(exportSourceConfig: ExportSourceConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      try {
        // TODO: parse JSON stream as JSON objects
        let results: object[] = [];
        const jsonParser = jsonStream.parse();
        exportSourceConfig.stream.pipe(jsonParser);
        jsonParser.on('data', (data) => {
            console.log(data.length);
          results = data;
          const mailchimpSourceConfig: MailchimpSourceConfig =
            {
              data: results,
              key: exportSourceConfig.params['key'],
              host: exportSourceConfig.params['host'],
            };
          console.log('mailchimpSourceConfig = ');
          //console.log(JSON.stringify(mailchimpSourceConfig));
          console.log('happy');
          resolve("done herere");
        });
        resolve('roroijgor');
      } catch (e) {
        console.log('esagegg');
        console.log(e);
      }
    });
  }

  public async runQuery(mailchimpSourceConfig: MailchimpSourceConfig): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        const resultArr: Array<Promise<object>> = [];

        console.log('here5555');

        mailchimpSourceConfig.data.forEach(async (row) => {
          try {
            console.log('processing row =');
            console.log(row);
            //thisResolve({ args: {}, status: 'true' });
            /*const requestArgs: object = {};
            Object.keys(mailchimpSourceConfig.updateParams).forEach((key) =>
            {
              requestArgs[key] = mailchimpSourceConfig.updateParams[key];
            });
            Object.keys(mailchimpSourceConfig.mappedParams).forEach((key) =>
            {
              requestArgs[key] = row[mailchimpSourceConfig.mappedParams[key]];
            });
            const sanitizedRequestArgs = _.cloneDeep(requestArgs);
            resultArr.push(new Promise<object>((thisResolve, thisReject) =>
            {
              method(requestArgs, (error, result, envelope, soapHeader) =>
              {
                if (error)
                {
                  thisResolve({
                    args: sanitizedRequestArgs, status: 'false',
                    error: _.get(error, 'root.Envelope.Body.Fault.faultstring'),
                  });
                }
                else
                {
                  if (result && result['result'] !== undefined)
                  {
                    thisResolve({ args: sanitizedRequestArgs, status: result['result']['$value'] });
                  }
                  else
                  {
                    thisResolve({ args: sanitizedRequestArgs, status: 'true' });
                  }
                }
              });
            }));*/
          }
          catch (e) {
            resolve((e as any).toString());
          }
        });
        const resultAsString: string = JSON.stringify(await Promise.all(resultArr));
        winston.info('Result of Mailchimp request: ' + resultAsString);
        resolve(resultAsString);
      }
      catch (e) {
        resolve((e as any).toString());
      }
    });
  }
}

export default Mailchimp;
