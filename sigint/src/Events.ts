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

import * as Elastic from 'elasticsearch';

import { Config } from './Config';
import { logger } from './Logging';

export interface EventConfig
{
  eventname: string;
  algorithmid: number | string;
  visitorid: number | string;
  source: {
    ip: string;
    host: string;
    useragent: string;
    referer?: string;
  };
  timestamp: Date;
  intervalBucketSeconds: number;
  intervalBucketMinutes: number;
  intervalBucketHours: number;
  intervalBucketDays: number;
  meta?: any;
  hash: string;
}

export let indexName: string = '';
export const typeName: string = 'data';

export class Events
{
  private client: Elastic.Client;
  private config: Config;

  constructor(config: Config)
  {
    this.config = config;
    this.client = new Elastic.Client({
      host: config.db,
    });
    indexName = `${config.instanceId}.terrain-analytics`;
  }

  public async initialize()
  {
    try
    {
      await this.client.ping({
        requestTimeout: 500,
      });
    }
    catch (err)
    {
      if (err !== null && err !== undefined)
      {
        throw new Error('creating ES client for host: ' + String(this.config.db) + ': ' + String(err));
      }
    }

    try
    {
      const indexExists = await this.client.indices.exists({
        index: indexName,
      });

      if (!indexExists)
      {
        logger.info('Index ' + indexName + ' does not exist. Creating it...');
        await this.client.indices.create({
          index: indexName,
          timeout: '5s',
        });
      }
    }
    catch (err)
    {
      if (err !== null && err !== undefined)
      {
        throw new Error('creating index: ' + indexName + ': ' + String(err));
      }
    }
  }

  public async store(event: EventConfig): Promise<void>
  {
    return this.client.index({
      index: indexName,
      type: typeName,
      body: event,
    });
  }

  public async storeBulk(events: EventConfig[]): Promise<void>
  {
    const command = {
      index: {
        _index: indexName,
        _type: typeName,
      },
    };

    const body: any[] = [];
    for (const event of events)
    {
      body.push(command);
      body.push(event);
    }

    return this.client.bulk({
      body,
    });
  }
}
