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
import * as winston from 'winston';

import { Config } from './Config';

export interface EventConfig
{
  eventid: number | string;
  variantid: number | string;
  visitorid: number | string;
  source: {
    ip: string;
    host: string;
    useragent: string;
    referer?: string;
  };
  meta?: any;
}

export const indexName = 'terrain-analytics';
export const typeName = 'events';

export function makePromiseCallback<T>(resolve: (T) => void, reject: (Error) => void)
{
  return (error: Error, response: T) =>
  {
    if (error !== null && error !== undefined)
    {
      reject(error);
    }
    else
    {
      resolve(response);
    }
  };
}

export class Events
{
  private client: Elastic.Client;

  constructor(config: Config)
  {
    this.client = new Elastic.Client({
      host: config.db,
    });

    this.client.ping({
      requestTimeout: 100,
    }, (err) =>
      {
        if (err !== null && err !== undefined)
        {
          throw new Error('creating ES client for host: ' + String(config.db) + ': ' + String(err));
        }
      });

    this.client.indices.exists({
      index: indexName,
    }, (err, indexExists) =>
      {
        if (err !== null && err !== undefined)
        {
          throw new Error('creating index: ' + indexName + ': ' + String(err));
        }

        if (!indexExists)
        {
          winston.info('Index ' + indexName + ' does not exist. Creating it...');
          this.client.indices.create({
            index: indexName,
            timeout: '5s',
          }, (err2) =>
            {
              if (err2 !== null && err2 !== undefined)
              {
                throw new Error('creating index: ' + indexName + ': ' + String(err));
              }
            });
        }
      });
  }

  public async store(event: EventConfig): Promise<void>
  {
    return new Promise<void>((resolve, reject) =>
    {
      this.client.index({
        index: indexName,
        type: typeName,
        body: event,
      },
        makePromiseCallback(resolve, reject));
    });
  }
}
