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

import crypto = require('crypto');
import jsonStream = require('JSONStream');

import * as winston from 'winston';

import * as request from 'request';
import { Credentials } from '../../credentials/Credentials';
import { ExportSourceConfig } from './Sources';

export const credentials: Credentials = new Credentials();

export interface MailchimpSourceConfig
{
  data: object[];
  key: string;
  host: string;
  listID: string;
}

export class Mailchimp
{

  public async getJSONStreamAsMailchimpSourceConfig(exportSourceConfig: ExportSourceConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      try
      {
        let results: object[] = [];
        const jsonParser = jsonStream.parse();
        exportSourceConfig.stream.pipe(jsonParser);
        jsonParser.on('data', (data) =>
        {
          winston.debug(`Mailchimp got data (onData) with ${data.length} objects`);
          results = data;
          const mailchimpSourceConfig: MailchimpSourceConfig =
            {
              data: results,
              key: exportSourceConfig.params['key'],
              host: exportSourceConfig.params['host'],
              listID: exportSourceConfig.params['listID'],
            };
          this.runQuery(mailchimpSourceConfig).then(() =>
          {
            resolve('Finished getJSONStreamAsMailchimpSourceConfig.onData');
          }).catch((e) =>
          {
            reject(`Mailchimp export failed in runQuery: ${e}`);
          });
          resolve('Finished getJSONStreamAsMailchimpSourceConfig');
        });
      } catch (e)
      {
        reject(`Mailchimp export failed in getJSONStreamAsMailchimpSourceConfig: ${e}`);
      }
    });
  }

  public async runQuery(mailchimpSourceConfig: MailchimpSourceConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      try
      {
        const resultArr: Array<Promise<object>> = [];

        const batchSize: number = 1000;
        const batches: object[][] = [[]];

        let currBatch: number = 0;
        for (let i: number = 1; i <= mailchimpSourceConfig.data.length; i++)
        {
          batches[currBatch][(i - 1) % batchSize] = mailchimpSourceConfig.data[i - 1];

          if (i % batchSize === 0)
          {
            currBatch++;
            batches[currBatch] = [];
          }
        }

        // console.log('STATS: ' + mailchimpSourceConfig.data.length
        //   + ' ' + batches.length + ' ' + batches[0].length);// + ' ' + batches[1].length + ' ' + batches[2].length);

        batches.forEach((batch: object[]) =>
        {
          const batchBody: object = { operations: [] };
          batch.forEach((row: object) =>
          {
            batchBody['operations'].push({
              method: 'PUT',
              path: 'lists/' + mailchimpSourceConfig.listID + '/members/'
                + crypto.createHash('md5').update(row['EMAIL']).digest('hex').toString(),
              body: JSON.stringify({
                email_address: row['EMAIL'],
                status_if_new: 'subscribed',
                merge_fields: row,
              }),
            });
          });

          request.post({
            headers: {
              'content-type': 'application/json',
            },
            auth: {
              user: 'any',
              password: mailchimpSourceConfig.key,
            },
            url: mailchimpSourceConfig.host + 'batches',
            json: batchBody,
          }, (error, response, body) =>
            {
              winston.debug('Mailchimp response: ' + JSON.stringify(response));
              const batchid: string = response['body']['id'];
              setTimeout(() =>
              {
                request.get({
                  url: mailchimpSourceConfig.host + 'batches/' + batchid,
                  auth: {
                    user: 'any',
                    password: mailchimpSourceConfig.key,
                  },
                }, (e2, r2, b2) =>
                  {
                    winston.debug('Mailchimp response 2: ' + JSON.stringify(r2));
                  });
              }, 60000);
            });
        });

        const resultAsString: string = JSON.stringify(await Promise.all(resultArr));
        winston.info('Result of Mailchimp request: ' + resultAsString);
        resolve(resultAsString);
      }
      catch (e)
      {
        reject((e as any).toString());
      }
    });
  }
}

export default Mailchimp;
