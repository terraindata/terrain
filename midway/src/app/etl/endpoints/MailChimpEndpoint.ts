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
import * as stream from 'stream';


import * as request from 'request';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { Readable, Writable } from 'stream';
import AEndpointStream from './AEndpointStream';
import { MidwayLogger } from '../../log/MidwayLogger';

import { SinkConfig, SourceConfig } from 'shared/etl/types/EndpointTypes';

/* tslint:disable:max-classes-per-file */

export default class MailChimpEndpoint extends AEndpointStream
{
  constructor()
  {
    super();
  }
  public async getSource(source: SourceConfig): Promise<Readable>
  {
    throw new Error('not implemented');
  }

  public async getSink(sink: SinkConfig, engine?: TransformationEngine): Promise<Writable>
  {
    const config = await this.getIntegrationConfig(sink.integrationId);
    config['listID'] = sink['options']['listId'];
    return new MailChimpStream(config);
  }
}

class MailChimpStream extends stream.Writable
{

  private config: any;
  private batches: any[];
  private currentBatch: number;
  private batchSize: number;
  constructor(config)
  {
    super({
      objectMode: true,
      highWaterMark: 1024 * 128,
    });
    this.config = config;
    this.batches = [];
    this.currentBatch = 0;
    this.batchSize = 4;
  }

  public _write(chunk: any, encoding: string, callback: (err?: Error) => void): void
  {
    if (this.batches.length === this.currentBatch)
    {
      this.batches.push([]);
    }
    this.batches[this.currentBatch].push(chunk);
    if (this.batches[this.currentBatch].length >= this.batchSize)
    {
      // do the post request
      this.sendToMailChimp(this.batches[this.currentBatch], this.currentBatch);
    }
    callback();
  }
  public _final(callback: any)
  {
    this.sendToMailChimp(this.batches[this.currentBatch], this.currentBatch);
    callback();
  }

  private sendToMailChimp(batch: any[], batchId: number)
  {
    this.currentBatch++;
    try
    {
      const batchBody: object = { operations: [] };
      batch.forEach((row: any) =>
      {
        batchBody['operations'].push({
          method: 'PUT',
          path: 'lists/' + (this.config.listID as string) + '/members/'
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
          password: this.config.apiKey,
        },
        url: (this.config.host as string) + 'batches',
        json: batchBody,
      }, (error, response, body) =>
        {
          MidwayLogger.debug('Mailchimp response: ' + JSON.stringify(response));
          const batchid: string = response['body']['id'];
          setTimeout(() =>
          {
            request.get({
              url: (this.config.host as string) + 'batches/' + batchid,
              auth: {
                user: 'any',
                password: this.config.apiKey,
              },
            }, (e2, r2, b2) =>
              {
                MidwayLogger.debug('Mailchimp response 2: ' + JSON.stringify(r2));
              });
          }, 60000);
          this.batches[batchId] = [];
        });
    }
    catch (e)
    {
      MidwayLogger.error('MailChimp endpoint error: ');
      MidwayLogger.error(e);
    }

  }
}
