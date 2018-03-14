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
import * as rimraf from 'rimraf';

import ESJSONParser from '../../../shared/database/elastic/parser/ESJSONParser';
import ESParser from '../../../shared/database/elastic/parser/ESParser';
import MidwayErrorItem from '../../../shared/error/MidwayErrorItem';

export function doRequest(url)
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

export function getParsedQuery(body: string): ESParser
{
  const parser = new ESJSONParser(body, true);
  if (parser.hasError())
  {
    const es = parser.getErrors();
    const errors: MidwayErrorItem[] = [];

    es.forEach((e) =>
    {
      const row = (e.token !== null) ? e.token.row : 0;
      const col = (e.token !== null) ? e.token.col : 0;
      const pos = (e.token !== null) ? e.token.charNumber : 0;
      const title: string = String(row) + ':' + String(col) + ':' + String(pos) + ' ' + String(e.message);
      errors.push({ status: -1, title, detail: '', source: {} });
    });

    if (errors.length === 0)
    {
      errors.push({ status: -1, title: '0:0:0 Syntax Error', detail: '', source: {} });
    }

    throw errors;
  }

  return parser;
}
