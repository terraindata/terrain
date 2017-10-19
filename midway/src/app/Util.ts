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

import * as asyncBusboy from 'async-busboy';
import * as fs from 'fs';
import * as http from 'http';
import * as request from 'request';
import * as rimraf from 'rimraf';
import * as sha1 from 'sha1';

import { exportTemplates } from './io/templates/ExportTemplateRouter';
import { importTemplates } from './io/templates/ImportTemplateRouter';
import { ImportTemplateConfig } from './io/templates/ImportTemplates';
import { UserConfig, Users } from './users/Users';

const users = new Users();

export async function authenticateNormal(req: object): Promise<UserConfig | null>
{
  return new Promise<UserConfig | null>(async (resolve, reject) =>
  {
    resolve(await users.loginWithAccessToken(Number(req['id']), req['accessToken']));
  });
}

export async function authenticateStream(req: http.IncomingMessage): Promise<object>
{
  return new Promise<object>(async (resolve, reject) =>
  {
    const { files, fields } = await asyncBusboy(req);
    const user = await users.loginWithAccessToken(Number(fields['id']), fields['accessToken']);
    resolve({ files, fields, user });
  });
}

export async function authenticatePersistentAccessToken(req: object): Promise<object>
{
  return new Promise<object>(async (resolve, reject) =>
  {
    if (req['templateId'] === undefined || req['persistentAccessToken'] === undefined)
    {
      return reject('Missing one or more auth fields.');
    }
    const importTemplate: object[] =
      await importTemplates.loginWithPersistentAccessToken(Number(req['templateId']), req['persistentAccessToken']);
    const exportTemplate: object[] =
      await exportTemplates.loginWithPersistentAccessToken(Number(req['templateId']), req['persistentAccessToken']);
    const template = importTemplate.concat(exportTemplate);
    if (template.length === 0)
    {
      return resolve({ template: null });
    }
    resolve({ template: template[0] });
  });
}

export async function authenticateStreamPersistentAccessToken(req: http.IncomingMessage): Promise<object>
{
  return new Promise<object>(async (resolve, reject) =>
  {
    const { files, fields } = await asyncBusboy(req);
    if (fields['templateId'] === undefined || fields['persistentAccessToken'] === undefined)
    {
      return reject(`Missing one or more auth fields. ${fields['templateId']} , ${fields['persistentAccessToken']}`);
    }
    const importTemplate: object[] =
      await importTemplates.loginWithPersistentAccessToken(Number(req['templateId']), req['persistentAccessToken']);
    const exportTemplate: object[] =
      await exportTemplates.loginWithPersistentAccessToken(Number(req['templateId']), req['persistentAccessToken']);
    const template = importTemplate.concat(exportTemplate);
    if (template.length === 0)
    {
      return resolve({ files, fields, template: null });
    }
    resolve({ files, fields, template: template[0] });
  });
}

export function getEmptyObject(payload: object): object
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
          res[item] = getEmptyObject(payload[item]);
        }
        break;

      default:
        res[item] = '';
    }
    return res;
  },
    emptyObj);
}

export function getRequest(url)
{
  return new Promise((resolve, reject) =>
  {
    request(url, (error, res, body) =>
    {
      if ((error === null || error === undefined) && res.statusCode === 200)
      {
        resolve(body);
      }
      else
      {
        reject(error);
      }
    });
  });
}

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

export function makePromiseCallbackVoid(resolve: () => void, reject: (Error) => void)
{
  return (error: Error) =>
  {
    if (error !== null && error !== undefined)
    {
      reject(error);
    }
    else
    {
      resolve();
    }
  };
}

export async function mkdir(dirName: string)
{
  return new Promise((resolve, reject) =>
  {
    fs.mkdir(dirName, makePromiseCallbackVoid(resolve, reject));
  });
}

export async function readFile(fileName: string, options: object)
{
  return new Promise((resolve, reject) =>
  {
    fs.readFile(fileName, options, makePromiseCallback(resolve, reject));
  });
}

/* differs from File System's rmdir in that no error is thrown if the directory does not exist */
export async function rmdir(dirName: string)
{
  return new Promise((resolve, reject) =>
  {
    rimraf(dirName, makePromiseCallbackVoid(resolve, reject));
  });
}

export function updateObject<T>(obj: T, newObj: T): T
{
  for (const key in newObj)
  {
    if (newObj.hasOwnProperty(key))
    {
      obj[key] = newObj[key];
    }
  }
  return obj;
}

export function verifyParameters(parameters: any, required: string[]): void
{
  if (parameters === undefined)
  {
    throw new Error('No parameters found.');
  }

  for (const key of required)
  {
    if (parameters.hasOwnProperty(key) === false)
    {
      throw new Error('Parameter "' + key + '" not found in request object.');
    }
  }
}

export async function writeFile(fileName: string, data: string, options: object)
{
  return new Promise((resolve, reject) =>
  {
    fs.writeFile(fileName, data, options, makePromiseCallbackVoid(resolve, reject));
  });
}
