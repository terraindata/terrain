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

import * as request from 'request';
import { PassThrough, Readable, Writable } from 'stream';

import { SinkConfig, SourceConfig } from '../../../../../shared/etl/types/EndpointTypes';
import { TransformationEngine } from '../../../../../shared/transformations/TransformationEngine';
import IntegrationConfig from '../../integrations/IntegrationConfig';
import { integrations } from '../../integrations/IntegrationRouter';
import AEndpointStream from './AEndpointStream';

export default class HTTPEndpoint extends AEndpointStream
{
  constructor()
  {
    super();
  }

  public async getSource(source: SourceConfig): Promise<Readable>
  {
    return this.getRequestStreamByIntegrationId(source.integrationId) as Promise<Readable>;
  }

  public async getSink(sink: SinkConfig, engine?: TransformationEngine): Promise<Writable>
  {
    return this.getRequestStreamByIntegrationId(sink.integrationId) as Promise<Writable>;
  }

  private async getRequestStreamByIntegrationId(integrationId: number): Promise<Readable | Writable>
  {
    const integration: IntegrationConfig[] = await integrations.get(null, integrationId);
    if (integration.length === 0)
    {
      throw new Error('Invalid HTTP Integration ID');
    }
    let httpConfig: any = {};
    try
    {
      const connectionconfig = JSON.parse(integration[0].connectionConfig);
      const authConfig = JSON.parse(integration[0].authConfig);
      httpConfig = Object.assign(connectionconfig, authConfig);
    }
    catch (e)
    {
      throw new Error('Retrieveing integration ID ' + String(integrationId));
    }

    return new Promise<Readable | Writable>((resolve, reject) =>
    {
      request(httpConfig.url)
        .on('error', (err) =>
        {
          if (err !== null && err !== undefined)
          {
            const e = Error(`Error reading from HTTP endpoint ${httpConfig.url} ${err.toString()}`);
            return reject(e);
          }
        })
        .on('response', (res) =>
        {
          if (res.statusCode !== 200)
          {
            const e = new Error(`Error reading from source HTTP endpoint: ${res.statusCode} ${res.statusMessage}`);
            return reject(e);
          }

          const passThrough = new PassThrough({ highWaterMark: 128 * 1024 });
          resolve(res.pipe(passThrough));
        });
    });
  }
}
