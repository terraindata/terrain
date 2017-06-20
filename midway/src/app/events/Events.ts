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

// Part of events PoC

import aesjs = require('aes-js');
import hashObj = require('hash-object');
import srs = require('secure-random-string');
import sha1 = require('sha1');

import ElasticConfig from '../../database/elastic/ElasticConfig';
import ElasticController from '../../database/elastic/ElasticController';
import * as DBUtil from '../../database/Util';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import * as Util from '../Util';

const timeInterval: number = 5; // minutes before refreshing
const timePeriods: number = 2; // number of past intervals to check, minimum 1
const timeSalt: string = srs({ length: 256 }); // time salt
const payloadSkeleton: object = {}; // payload object where key is the eventId and the value is the empty payload

export interface EventConfig
{
  date?: number;
  eventId: string;
  id?: number;
  ip?: string;
  message: string;
  payload: any;
  type: string;
  url?: string;
}

export interface EventRequestConfig
{
  date?: number;
  eventId: string;
  id?: number;
  ip: string;
  message?: string;
  payload?: object;
  url?: string;
  variantId?: string;
}

export class Events
{
  private eventTable: Tasty.Table;
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
        'message',
        'payload',
        'type',
      ],
      'events',
    );
  }

  /*
   * Decode message from /events/update route
   *
   */
  public async decodeMessage(event: EventConfig): Promise<boolean>
  {
    const checkTime = this.getClosestTime();
    const message = event['message'];
    const emptyPayloadHash: string = hashObj(this.getEmptyObject(event.payload));
    for (let tp = 0; tp < timePeriods; ++tp)
    {
      const newTime: number = checkTime - tp * timeInterval * 60;
      const privateKey: string = this.getUniqueId(event.ip as string, event.eventId, newTime);
      const decodedMsg: string = this.decrypt(message, privateKey);
      if (this.isJSON(decodedMsg) && emptyPayloadHash === hashObj(JSON.parse(decodedMsg)))
      {

        await this.storeEvent(event);
        return true;
      }
    }
    return false;
  }

  /*
   * Decrypt a message with the private key using AES128
   *
   */
  public decrypt(msg: string, privateKey: string): string
  {
    const key: any = aesjs.utils.utf8.toBytes(privateKey); // type UInt8Array
    const msgBytes: any = aesjs.utils.hex.toBytes(msg);
    const aesCtr: any = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    return aesjs.utils.utf8.fromBytes(aesCtr.decrypt(msgBytes));
  }

  /*
   * Prep an empty payload with the encoded message
   *
   */
  public async encodeMessage(eventReq: EventRequestConfig): Promise<EventRequestConfig>
  {
    return new Promise<EventRequestConfig>(async (resolve, reject) =>
    {
      eventReq.payload = payloadSkeleton[eventReq.eventId];
      const privateKey: string = this.getUniqueId(eventReq.ip, eventReq.eventId);
      eventReq.message = await this.encrypt(JSON.stringify(eventReq.payload), privateKey);
      delete eventReq['ip'];
      resolve(eventReq);
    });
  }

  /*
   * Encrypt a message with the private key using AES128
   *
   */
  public encrypt(msg: string, privateKey: string): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      const key: any = aesjs.utils.utf8.toBytes(privateKey); // type UInt8Array
      const msgBytes: any = aesjs.utils.utf8.toBytes(msg);
      const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
      resolve(aesjs.utils.hex.fromBytes(aesCtr.encrypt(msgBytes)));
    });
  }

  /*
   * Validate that the string is valid JSON
   *
   */
  public isJSON(str: string): boolean
  {
    let res: any = false;
    try
    {
      res = JSON.parse(str);
    }
    catch (e)
    {
      return false;
    }
    return res;
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
   * Create an object with the same keys but empty values
   *
   */
  public getEmptyObject(payload: object): object
  {
    let emptyObj: any = {};
    if (Array.isArray(payload))
    {
      emptyObj = [];
    }
    return Object.keys(payload).reduce((res, item) =>
    {
      switch (typeof (payload[item]))
      {
        case 'boolean':
          res[item] = false;
          break;

        case 'number':
          res[item] = 0;
          break;
          
        case 'object':
          if (payload[item] === null)
          {
            res[item] = null;
          }
          else
          {
            res[item] = this.getEmptyObject(payload[item]);
          }
          break;

        default:
          res[item] = '';
      }
      return res;
    },
      emptyObj);
  }

  /*
   * Generate a random string that will be used as a private key for encryption/decryption
   *
   */
  public getUniqueId(IPSource: string, uniqueId?: string, currTime?: number): string
  {
    currTime = currTime !== undefined ? currTime : this.getClosestTime();
    if (uniqueId === undefined)
    {
      uniqueId = '';
    }
    return sha1(currTime.toString() + IPSource + uniqueId + timeSalt).substring(0, 16);
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
        resolve();
        return;
      }

      const JSONArr: object[] = req;
      const encodedEventArr: EventRequestConfig[] = [];
      for (const jsonObj of JSONArr)
      {
        if (jsonObj['eventId'] === undefined || !(jsonObj['eventId'] in payloadSkeleton))
        {
          continue;
        }
        const eventRequest: EventRequestConfig =
          {
            eventId: jsonObj['eventId'],
            variantId: jsonObj['variantId'],
            ip: IPSource,
            url: jsonObj['url'] !== undefined ? jsonObj['url'] : '',
          };
        encodedEventArr.push(await this.encodeMessage(eventRequest));
      }
      if (encodedEventArr.length === 0)
      {
        resolve();
        return;
      }
      resolve(JSON.stringify(encodedEventArr));
    });
  }

  /*
   * Store the validated event in the datastore
   *
   */
  public async storeEvent(event: EventConfig): Promise<any>
  {
    event.payload = JSON.stringify(event.payload);
    const events: object[] = [event as object];
    return await this.elasticController.getTasty().upsert(this.eventTable, events);
  }
}

export default Events;
