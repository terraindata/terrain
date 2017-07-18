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

import * as srs from 'secure-random-string';
import * as sha1 from 'sha1';

import ElasticConfig from '../../database/elastic/ElasticConfig';
import ElasticController from '../../database/elastic/ElasticController';
import * as DBUtil from '../../database/Util';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import { ItemConfig, Items } from '../items/Items';
import * as Util from '../Util';
import * as EventEncryption from './Encryption';

const items: Items = new Items();

const timeInterval: number = 5; // minutes before refreshing
const timePeriods: number = 2; // number of past intervals to check, minimum 1
const timeSalt: string = srs({ length: 256 }); // time salt

export interface EventTemplateConfig
{
  eventId: string;
  id?: number;
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
  eventId: string;
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
    this.elasticController = new ElasticController(elasticConfig, 0, 'Events');
    this.eventTable = new Tasty.Table(
      'data',
      ['eventId'],
      [
        'date',
        'ip',
        'payload',
        'type',
      ],
      'events',
    );

    this.payloadTable = new Tasty.Table(
      'data',
      ['eventId'],
      [
        'meta',
        'payload',
      ],
      'payload',
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
        const privateKey: string = await this.getUniqueId(event.ip as string, event.eventId, newTime);
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
      eventReq.payload = await this.getPayload(eventReq.eventId);
      const privateKey: string = await this.getUniqueId(eventReq.ip, eventReq.eventId);
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
  * Return a list of HTML IDs and relevant info for event tracking purposes
  *
  */
  public async getHTMLIDs(): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      const itemLst: ItemConfig[] = await items.get();
      const payloadLst: object[] = [];
      const returnLst: object[] = [];
      itemLst.forEach((item) =>
      {
        if (item.status !== 'ARCHIVE' && item.meta !== undefined)
        {
          const meta = JSON.parse(item.meta);
          let itemParent: any;
          let itemId: any;
          if (item.parent !== undefined)
          {
            itemParent = item.parent.toString();
          }
          if (item.id !== undefined)
          {
            itemId = item.id.toString();
          }
          const otherFields: object =
            {
              eventType: 'group',
              ip: '',
              language: 'elastic',
              name: '',
              type: 'click',
              url: '',
              variantId: '',
            };

          const payloadEvent: object =
            {
              eventId: 'item' + (itemId as string),
              meta: otherFields,
              payload:
                {
                  date: '',
                  dependencies: item.parent === 0 ? [] : ['item' + (itemParent as string)],
                  numClicks: 0,
                  loadTime: 0,
                },
            };
          const returnEvent: object =
            {
              eventId: 'item' + (itemId as string),
            };

          // for now, only use items that are ES
          if (meta.algorithmsOrder !== undefined && (meta['defaultLanguage'] === 'elastic' || meta['language'] === 'elastic'))
          {
            returnEvent['eventType'] = 'group';
            payloadLst.push(payloadEvent);
            returnLst.push(returnEvent);
          }
          if (meta.variantsOrder !== undefined && (meta['defaultLanguage'] === 'elastic' || meta['language'] === 'elastic'))
          {
            returnEvent['eventType'] = 'algorithm';
            payloadLst.push(payloadEvent);
            returnLst.push(returnEvent);
          }
          if (meta.query !== undefined && (meta['defaultLanguage'] === 'elastic' || meta['language'] === 'elastic'))
          {
            returnEvent['eventType'] = 'variant';
            payloadLst.push(payloadEvent);
            returnLst.push(returnEvent);
          }
        }
      });
      await this.elasticController.getTasty().upsert(this.payloadTable, payloadLst);
      resolve(returnLst);
    });
  }

  /*
   * Get payload from datastore given the eventId
   *
   */
  public async getPayload(eventId: string): Promise<PayloadConfig>
  {
    return new Promise<PayloadConfig>(async (resolve, reject) =>
    {
      const payloads: PayloadConfig[] = await this.elasticController.getTasty().select(
        this.payloadTable, [], { eventId }) as PayloadConfig[];
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
        const payload: PayloadConfig = await this.getPayload(jsonObj['eventId']);
        const meta: object = payload.meta;
        delete payload.meta;
        const fullPayload: object = Object.assign(payload, meta);
        if (jsonObj['eventId'] === undefined || !(Object.keys(payload).length === 0))
        {
          continue;
        }
        const eventRequest: EventConfig =
          {
            eventId: fullPayload['eventId'],
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

  /*
   * Check if eventId exists in payload table
   *
   */
  public async payloadExists(eventId: string): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const payloads: object[] = await this.elasticController.getTasty().select(this.payloadTable, [], { eventId }) as object[];
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
