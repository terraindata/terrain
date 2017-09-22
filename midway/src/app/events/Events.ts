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

import bodybuilder = require('bodybuilder');
import * as Elastic from 'elasticsearch';
import * as srs from 'secure-random-string';
import * as sha1 from 'sha1';
import * as winston from 'winston';

import ElasticConfig from '../../database/elastic/ElasticConfig';
import ElasticController from '../../database/elastic/ElasticController';
import * as DBUtil from '../../database/Util';
import * as Tasty from '../../tasty/Tasty';
import { items } from '../items/ItemRouter';
import * as Util from '../Util';
import * as EventEncryption from './Encryption';

const timeInterval: number = 5; // minutes before refreshing
const timePeriods: number = 2; // number of past intervals to check, minimum 1
const timeSalt: string = srs({ length: 256 }); // time salt

export interface EventTemplateConfig
{
  id: string;
  ip: string;
  url?: string;
  variantId?: string;
}

export interface EventConfig extends EventTemplateConfig
{
  eventType?: string;
  date?: string;
  message?: string;
  name?: string;
  payload?: any;
  type: string;
}

export interface PayloadConfig
{
  id: string;
  meta: any;
  payload: any;
}

export class Events
{
  private eventTable: Tasty.Table;
  private payloadTable: Tasty.Table;
  private elasticController: ElasticController;

  constructor()
  {
    const elasticConfig: ElasticConfig = DBUtil.DSNToConfig('elastic', 'http://127.0.0.1:9200') as ElasticConfig;
    this.elasticController = new ElasticController(elasticConfig, 0, 'Analytics');
    this.eventTable = new Tasty.Table(
      'events',
      ['id'],
      [
        'date',
        'ip',
        'payload',
        'type',
      ],
      'terrain-analytics',
    );

    this.payloadTable = new Tasty.Table(
      'payload',
      ['id'],
      [
        'meta',
        'payload',
      ],
      'terrain-analytics',
    );
  }

  /*
   * Decode message from /events/update route
   *
   */
  public async decodeMessage(event: EventConfig): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const checkTime = this.getClosestTime();
      const message = event['message'] as string;
      const emptyPayloadHash: string = Util.buildDesiredHash(event.payload);
      for (let tp = 0; tp < timePeriods; ++tp)
      {
        const newTime: number = checkTime - tp * timeInterval * 60;
        const privateKey: string = await this.getUniqueId(event.ip as string, event.id, newTime);
        const decodedMsg: string = await EventEncryption.decrypt(message, privateKey);
        if (Util.isJSON(decodedMsg) && emptyPayloadHash === Util.buildDesiredHash(JSON.parse(decodedMsg)))
        {

          await this.storeEvent(event);
          return resolve(true);
        }
      }
      return resolve(false);
    });
  }

  /*
   * Prep an empty payload with the encoded message
   *
   */
  public async encodeMessage(eventReq: EventConfig): Promise<EventConfig>
  {
    return new Promise<EventConfig>(async (resolve, reject) =>
    {
      eventReq.payload = await this.getPayload(eventReq.id);
      const privateKey: string = await this.getUniqueId(eventReq.ip, eventReq.id);
      eventReq.message = await EventEncryption.encrypt(JSON.stringify(eventReq.payload), privateKey);
      delete eventReq['ip'];
      resolve(eventReq);
    });
  }

  /*
   * Return the number of seconds since epoch time rounded to nearest timeInterval
   *
   */
  public getClosestTime(): number
  {
    let currSeconds: any = new Date();
    currSeconds = Math.floor(currSeconds / 1000);
    return currSeconds - (currSeconds % (timeInterval * 60));
  }

  /*
   * Get payload from datastore given the id
   *
   */
  public async getPayload(id: string): Promise<PayloadConfig>
  {
    return new Promise<PayloadConfig>(async (resolve, reject) =>
    {
      const payloads: PayloadConfig[] = await this.elasticController.getTasty().select(
        this.payloadTable, [], { id }) as PayloadConfig[];
      if (payloads.length === 0)
      {
        return resolve({} as PayloadConfig);
      }
      resolve(payloads[0] as PayloadConfig);
    });
  }

  /*
   * Generate a random string that will be used as a private key for encryption/decryption
   *
   */
  public async getUniqueId(IPSource: string, uniqueId?: string, currTime?: number): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      currTime = currTime !== undefined ? currTime : this.getClosestTime();
      uniqueId = uniqueId !== undefined ? uniqueId : '';
      resolve(sha1(currTime.toString() + IPSource + uniqueId + timeSalt).substring(0, 16));
    });
  }

  /*
   * Parse incoming event request event
   *
   */
  public async JSONHandler(IPSource: string, req: object[]): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (req === undefined || (Object.keys(req).length === 0 && req.constructor === Object) || req.length === 0)
      {
        return resolve('');
      }
      const JSONArr: object[] = req;
      const encodedEventArr: EventTemplateConfig[] = [];
      for (const jsonObj of JSONArr)
      {
        const payload: PayloadConfig = await this.getPayload(jsonObj['id']);
        const meta: object = payload.meta;
        delete payload.meta;
        const fullPayload: object = Object.assign(payload, meta);
        if (jsonObj['id'] === undefined || !(Object.keys(payload).length === 0))
        {
          continue;
        }
        const eventRequest: EventConfig =
          {
            id: fullPayload['id'],
            eventType: fullPayload['eventType'],
            ip: IPSource,
            name: fullPayload['name'],
            payload: fullPayload['payload'],
            type: fullPayload['type'],
            url: jsonObj['url'] !== undefined ? jsonObj['url'] : fullPayload['url'],
            variantId: jsonObj['variantId'] !== undefined ? jsonObj['variantId'] : fullPayload['variantId'],
          };
        encodedEventArr.push(await this.encodeMessage(eventRequest));
      }
      if (encodedEventArr.length === 0)
      {
        return resolve('');
      }
      resolve(JSON.stringify(encodedEventArr));
    });
  }

  public async getVariantEvents(variantid: number, request: object): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const client = this.elasticController.getClient();

      let body = bodybuilder();
      body = body.filter('term', 'variantid', variantid);
      body = body.filter('term', 'eventid', request['eventid']);
      body = body.filter('range', '@timestamp', {
        gte: request['start'],
        lte: request['end'],
      });

      if (request['agg'] === 'none' || request['agg'] === undefined)
      {
        if (request['field'] !== undefined)
        {
          try
          {
            const fields = request['field'].split(',');
            body = body.rawOption('_source', request['field']);
          }
          catch (e)
          {
            winston.info('Ignoring malformed field value');
          }
        }

        const response = await new Promise((resolveI, rejectI) =>
        {
          const query: Elastic.SearchParams = {
            index: 'terrain-analytics',
            type: 'events',
            body: body.build(),
          };
          client.search(query, Util.makePromiseCallback(resolveI, rejectI));
        });

        return resolve({
          variantid,
          data: response['hits'].hits.map((e) => e['_source']),
        });
      }
      else
      {
        if (request['interval'] === undefined)
        {
          reject('Required parameter \"interval\" is missing');
        }

        if (request['field'] === undefined)
        {
          reject('Required parameter \"field\" is missing');
        }

        body = body.aggregation(
          request['agg'],
          request['field'],
          request['agg'],
          {
            interval: request['interval'],
          },
        );

        const response = await new Promise((resolveI, rejectI) =>
        {
          const query: Elastic.SearchParams = {
            index: 'terrain-analytics',
            type: 'events',
            body: body.build(),
          };
          client.search(query, Util.makePromiseCallback(resolveI, rejectI));
        });
        return resolve({
          variantid,
          data: response['aggregations'][request['agg']].buckets,
        });
      }
    });
  }

  public async getEventData(request: object): Promise<object>
  {
    if (request['variantid'] === undefined)
    {
      throw new Error('Required parameter \"variantid\" is missing');
    }

    const variantids = request['variantid'].split(',');
    const promises: Array<Promise<any>> = [];
    for (const variantid of variantids)
    {
      promises.push(this.getVariantEvents(variantid, request));
    }
    return Promise.all(promises);
  }

  /*
   * Check if id exists in payload table
   *
   */
  public async payloadExists(id: string): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const payloads: object[] = await this.elasticController.getTasty().select(this.payloadTable, [], { id }) as object[];
      return resolve(payloads.length === 0 ? false : true);
    });
  }

  /*
   * Store the validated event in the datastore
   *
   */
  public async storeEvent(event: EventConfig): Promise<EventConfig>
  {
    event.payload = JSON.stringify(event.payload);
    return this.elasticController.getTasty().upsert(this.eventTable, event) as Promise<EventConfig>;
  }
}

export default Events;
