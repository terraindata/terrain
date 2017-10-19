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

import * as aesjs from 'aes-js';
import * as srs from 'secure-random-string';
import * as sha1 from 'sha1';

const timePeriods: number = 2; // number of past intervals to check, minimum 1
const timeSalt: string = srs({ length: 256 }); // time salt
const timeInterval: number = 5; // minutes before refreshing

export function isJSON(str: string): boolean
{
  try
  {
    JSON.parse(str);
  }
  catch (e)
  {
    return false;
  }
  return true;
}

export function buildDesiredHash(nameToType: object): string
{
  let strToHash: string = 'object';   // TODO: check
  const nameToTypeArr: any[] = Object.keys(nameToType).sort();
  for (const name in nameToTypeArr)
  {
    if (nameToType.hasOwnProperty(name))
    {
      strToHash += '|' + name + ':' + (nameToType[name] as string) + '|';
    }
  }
  return sha1(strToHash);
}

/*
 * Decrypt a message with the private key using AES128
 */
export async function decrypt(msg: string, privateKey: string): Promise<string>
{
  return new Promise<string>((resolve, reject) =>
  {
    const key = aesjs.utils.utf8.toBytes(privateKey); // type UInt8Array
    const msgBytes = aesjs.utils.hex.toBytes(msg);
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    resolve(aesjs.utils.utf8.fromBytes(aesCtr.decrypt(msgBytes)));
  });
}

/*
 * Encrypt a message with the private key using AES128
 */
export async function encrypt(msg: string, privateKey: string): Promise<string>
{
  return new Promise<string>((resolve, reject) =>
  {
    const key: any = aesjs.utils.utf8.toBytes(privateKey); // type UInt8Array
    const msgBytes: any = aesjs.utils.utf8.toBytes(msg);
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    resolve(aesjs.utils.hex.fromBytes(aesCtr.encrypt(msgBytes)));
  });
}

/*
 * Return the number of seconds since epoch time rounded to nearest timeInterval
 */
function getClosestTime(): number
{
  let currSeconds: any = new Date();
  currSeconds = Math.floor(currSeconds / 1000);
  return currSeconds - (currSeconds % (timeInterval * 60));
}

/*
 * Generate a random string that will be used as a private key for encryption/decryption
 */
export async function getUniqueId(ip: string, uniqueId?: string, currTime?: number): Promise<string>
{
  return new Promise<string>(async (resolve, reject) =>
  {
    currTime = currTime !== undefined ? currTime : getClosestTime();
    uniqueId = uniqueId !== undefined ? uniqueId : '';
    resolve(sha1(currTime.toString() + ip + uniqueId + timeSalt).substring(0, 16));
  });
}

/*
 * Decode message from /events/update route
 */
export async function decodeMessage(event: any): Promise<any>
{
  return new Promise<any>(async (resolve, reject) =>
  {
    const checkTime = getClosestTime();
    const message = event['message'] as string;
    const emptyPayloadHash: string = buildDesiredHash(event.payload);
    for (let tp = 0; tp < timePeriods; ++tp)
    {
      const newTime: number = checkTime - tp * timeInterval * 60;
      const privateKey: string = await getUniqueId(event.ip as string, event.id, newTime);
      const decodedMsg: string = await decrypt(message, privateKey);
      if (isJSON(decodedMsg) && emptyPayloadHash === buildDesiredHash(JSON.parse(decodedMsg)))
      {
        return resolve(event);
      }
    }
    return resolve({});
  });
}

/*
 * Prep an empty payload with the encoded message
 */
export async function encodeMessage(event: any): Promise<any>
{
  return new Promise<any>(async (resolve, reject) =>
  {
    const privateKey: string = await getUniqueId(event.ip, event.id);
    event.message = await encrypt(JSON.stringify(event.payload), privateKey);
    delete event['ip'];
    resolve(event);
  });
}

// /*
//  * Parse incoming event request event
//  */
// public async registerEventHandler(ip: string, reqs: object[]): Promise<string>
// {
//   return new Promise<string>(async (resolve, reject) =>
//   {
//     if (reqs === undefined || (Object.keys(reqs).length === 0 && reqs.constructor === Object) || reqs.length === 0)
//     {
//       return resolve('');
//     }
//     const encodedEvents: EventTemplateConfig[] = [];
//     for (const req of reqs)
//     {
//       if (req['ip'] === undefined)
//       {
//         req['ip'] = ip;
//       }
//       encodedEvents.push(await Encryption.encodeMessage(req));
//     }
//     if (encodedEvents.length === 0)
//     {
//       return resolve('');
//     }

//     return resolve(JSON.stringify(encodedEvents));
//   });
// }
