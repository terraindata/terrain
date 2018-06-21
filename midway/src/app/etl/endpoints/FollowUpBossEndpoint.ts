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

import * as _ from 'lodash';
import * as request from 'request';
import * as stream from 'stream';
import * as winston from 'winston';

import { SinkConfig, SourceConfig } from 'shared/etl/types/EndpointTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import AEndpointStream from './AEndpointStream';

/* tslint:disable:max-classes-per-file */

export default class FollowUpBossEndpoint extends AEndpointStream
{
  constructor()
  {
    super();
  }

  public async getSource(source: SourceConfig): Promise<stream.Readable>
  {
    throw new Error('FollowUpBoss source not implemented');
  }

  public async getSink(sink: SinkConfig, engine?: TransformationEngine): Promise<stream.Writable>
  {
    const config = await this.getIntegrationConfig(sink.integrationId);
    return new FollowUpBossStream(config);
  }
}

class FollowUpBossStream extends stream.Writable
{
  private config: any;

  constructor(config)
  {
    super({
      objectMode: true,
      highWaterMark: 1024 * 128,
    });

    this.config = config;
  }

  public _write(chunk: any, encoding: string, callback: (err?: Error) => void): void
  {
    winston.debug(JSON.stringify(this.config));
    winston.debug('CHUNK');
    winston.debug(JSON.stringify(chunk));

    if (chunk['tags'].indexOf('terrain') === -1)
    {
      chunk['tags'].push('terrain');
    }

    if (!isNaN(chunk['FollowUpBossId']))
    {
      // Has valid FollowUpBossId, so do PUT (update)

      const formattedChunk = _.omit(chunk, 'FollowUpBossId');
      if (formattedChunk['tags'] && formattedChunk['tags'].indexOf('terrain') === -1)
      {
        formattedChunk['tags'].push('terrain');
      }
      else if (!formattedChunk['tags'])
      {
        formattedChunk['tags'] = ['terrain'];
      }

      request({
        url: `https://api.followupboss.com/v1/people/${chunk['FollowUpBossId']}`,
        method: 'PUT',
        json: formattedChunk,
        headers: {
          'Authorization': `Basic ${new Buffer((this.config['apiKey'] as string) + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
      },
        (error, response) =>
        {
          if (error)
          {
            winston.debug('got put error: ' + JSON.stringify(error));
            callback(error);
          }
          else
          {
            winston.debug('got put response: ' + JSON.stringify(response));
          }
        });
    } else
    {
      // No existing ID, so do POST (create)
      const r = {
        url: 'https://api.followupboss.com/v1/people',
        method: 'POST',
        json: chunk,
        qs: {
          deduplicate: true,
        },
        headers: {
          'Authorization': `Basic ${new Buffer((this.config['apiKey'] as string) + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
      };
      request(r,
        (error, response) =>
        {
          if (error)
          {
            winston.debug('got post error: ' + JSON.stringify(error));
            callback(error);
          }
          else
          {
            winston.debug('got post response: ' + JSON.stringify(response));
          }
        });
    }

    callback();
  }

  public _final(callback: any)
  {
    callback();
  }
}
