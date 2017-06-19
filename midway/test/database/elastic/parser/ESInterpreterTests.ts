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

import * as fs from 'fs';
import * as winston from 'winston';
import EQLConfig from '../../../../../shared/backends/elastic/parser/EQLConfig';
import EQLConverter from '../../../../../shared/backends/elastic/parser/EQLConverter';
import ESInterpreter from '../../../../../shared/backends/elastic/parser/ESInterpreter';
import ESJSONParser from '../../../../../shared/backends/elastic/parser/ESJSONParser';
import ESParserError from '../../../../../shared/backends/elastic/parser/ESParserError';
import { makePromiseCallback } from '../../../../src/tasty/Utils';

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

let expected;
let config: EQLConfig;

beforeAll(async (done) =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';

  const expectedString: any = await new Promise((resolve, reject) =>
  {
    fs.readFile(getExpectedFile(), makePromiseCallback(resolve, reject));
  });

  expected = JSON.parse(expectedString);
  try
  {
    new EQLConverter();
    config = new EQLConfig();
  } catch (e)
  {
    fail(e);
  }

  done();
});

function testParse(testString: string,
  expectedValue: any,
  expectedErrors: ESParserError[] = [])
{
  winston.info('testing \'' + testString + '\'');
  const interpreter: ESInterpreter = new ESInterpreter(testString, config);
  const parser: ESJSONParser = interpreter.parser;

  const objects = new WeakMap();
  let count = 0;
  winston.info(JSON.stringify(parser.getValueInfo(),
    (key, val) =>
    {
      if (val != null && typeof val === 'object')
      {
        const id = objects.get(val);
        if (id === undefined)
        {
          objects.set(val, count++);
        }
        else
        {
          return 'ref ' + String(id);
        }
      }

      return val;
    }, 2));

  // winston.info(JSON.stringify(parser.getValueInfos(), null, 1));
  // expect(value).toEqual(expectedValue);
  expect(parser.getErrors()).toEqual(expectedErrors);
}

test('parse valid json objects', () =>
{
  Object.getOwnPropertyNames(expected).forEach(
    (testName: string) =>
    {
      const testValue: any = expected[testName];

      // test parsing the value using a few spacing options
      testParse(JSON.stringify(testValue), testValue);
    });
});
