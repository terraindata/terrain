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
import soap = require('strong-soap');

import * as _ from 'lodash';
import * as winston from 'winston';

import { Credentials } from '../../credentials/Credentials';
import { ExportSourceConfig } from './Sources';

export const credentials: Credentials = new Credentials();

export interface MagentoJSONConfig
{
  data: object[];
}

export interface MagentoSourceConfig
{
  credentialId: number;
  data: object[];
  mappedParams: object;
  options?: object;
  updateParams: object;
  url: string;
}

export class Magento
{

  public async getJSONStreamAsMagentoSourceConfig(exportSourceConfig: ExportSourceConfig): Promise<MagentoSourceConfig>
  {
    return new Promise<MagentoSourceConfig>(async (resolve, reject) =>
    {
      // TODO: parse JSON stream as JSON objects
      let results: object[] = [];
      const jsonParser = jsonStream.parse();
      exportSourceConfig.stream.pipe(jsonParser);
      jsonParser.on('data', (data) =>
      {
        results = data;
        const magentoSourceConfig: MagentoSourceConfig =
          {
            credentialId: exportSourceConfig.params['credentialId'],
            data: results,
            mappedParams: exportSourceConfig.params['mappedParams'],
            options: exportSourceConfig.params['options'],
            updateParams: exportSourceConfig.params['updateParams'],
            url: exportSourceConfig.params['url'],
          };
        resolve(magentoSourceConfig);
      });
    });
  }

  public async runQuery(magentoSourceConfig: MagentoSourceConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      try
      {
        const soapCreds: object = {};
        const creds: string[] = await credentials.getAsStrings(magentoSourceConfig.credentialId, 'magento');
        if (creds.length === 0)
        {
          winston.info('No credentials found for that credential ID.');
        }
        else
        {
          const cred: object = JSON.parse(creds[0]);
          soapCreds['username'] = cred['apiUser'];
          soapCreds['apiKey'] = cred['apiKey'];
          soapCreds['baseUrl'] = cred['baseUrl'];
        }
        const options = magentoSourceConfig.options !== undefined ? magentoSourceConfig.options : {};
        _.extend(options, soapCreds);
        delete options['baseUrl'];
        const resultArr: Array<Promise<object>> = [];
        soap.soap.createClient(soapCreds['baseUrl'], options, async (err, client) =>
        {
          if (err)
          {
            winston.info(err);
          }
          let sessionId: string = '';
          winston.info('creating SOAP client.');
          client['login']({ username: soapCreds['username'], apiKey: soapCreds['apiKey'] },
            async (errLogin, resultLogin, envLogin, soapHeaderLogin) =>
            {
              if (!errLogin && resultLogin['loginReturn'] !== undefined && resultLogin['loginReturn']['$value'] !== undefined)
              {
                sessionId = resultLogin['loginReturn']['$value'];
                let method: any = client;
                const routeSplit: string[] = magentoSourceConfig.url.split('/');
                routeSplit.forEach((routeIndiv) =>
                {
                  method = method[routeIndiv];
                });
                magentoSourceConfig.data.forEach(async (row) =>
                {
                  try
                  {
                    const requestArgs: object = {};
                    Object.keys(magentoSourceConfig.updateParams).forEach((key) =>
                    {
                      requestArgs[key] = magentoSourceConfig.updateParams[key];
                    });
                    Object.keys(magentoSourceConfig.mappedParams).forEach((key) =>
                    {
                      requestArgs[key] = row[magentoSourceConfig.mappedParams[key]];
                    });
                    const sanitizedRequestArgs = _.cloneDeep(requestArgs);
                    requestArgs['sessionId'] = sessionId;
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
                    }));
                  }
                  catch (e)
                  {
                    resolve((e as any).toString());
                  }
                });
              }
              const resultAsString: string = JSON.stringify(await Promise.all(resultArr));
              winston.info('Result of Magento request: ' + resultAsString);
              resolve(resultAsString);
            });
        });
      }
      catch (e)
      {
        resolve((e as any).toString());
      }
    });
  }
}

export default Magento;
