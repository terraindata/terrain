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
import * as util from 'util';
import * as winston from 'winston';

import SharedUtil from '../../../../shared/Util';
import ESJSONParser from '../../../database/elastic/parser/ESJSONParser';

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

let expected;

beforeAll(async (done) =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';

  const contents: any = await new Promise((resolve, reject) =>
  {
    fs.readFile(getExpectedFile(), SharedUtil.promise.makeCallback(resolve, reject));
  });

  expected = JSON.parse(contents);
  done();
});

function testParse(testString: string,
  expectedValue: any,
  expectedErrors: any[] = [])
{
  winston.info('testing \'' + testString + '\'');
  const parser: ESJSONParser = new ESJSONParser(testString);
  const value = parser.getValue();
  const errors = parser.getErrors();

  // winston.info(util.inspect(parser.getValueInfo()));
  // winston.info(util.inspect(parser.getValueInfos()));
  // winston.info(util.inspect(parser.getTokens()));
  winston.info(util.inspect(errors));

  expect(value).toEqual(expectedValue);

  expect(errors.length).toEqual(expectedErrors.length);
  for (let i = 0; i < errors.length; ++i)
  {
    expect(errors[i]).toMatchObject(expectedErrors[i]);
  }
}

test('parse valid json objects', () =>
{
  Object.getOwnPropertyNames(expected).forEach(
    (testName: string) =>
    {
      const testValue: any = expected[testName];

      // test parsing the value using a few spacing options
      testParse(JSON.stringify(testValue), testValue);
      testParse(JSON.stringify(testValue, null, 1), testValue);
      testParse(JSON.stringify(testValue, null, 2), testValue);
      testParse(JSON.stringify(testValue, null, 3), testValue);
      testParse(JSON.stringify(testValue, null, 4), testValue);
    });
});

test('parse invalid json objects', () =>
{
  testParse('string', null,
    [
      {
        isWarning: false,
        token: { charNumber: 0, row: 0, col: 0 },
      },
    ]);

  testParse('fulse', false,
    [
      {
        isWarning: false,
        token: { charNumber: 0, row: 0, col: 0 },
      },
    ]);

  testParse('falsey', false,
    [
      {
        isWarning: false,
        token: { charNumber: 0, row: 0, col: 0 },
      },
    ]);

  testParse('tru', true,
    [
      {
        isWarning: false,
        token: { charNumber: 0, row: 0, col: 0 },
      },
    ]);

  testParse('trueee', true,
    [
      {
        isWarning: false,
        token: { charNumber: 0, row: 0, col: 0 },
      },
    ]);

  testParse('n', null,
    [
      {
        isWarning: false,
        token: { charNumber: 0, row: 0, col: 0 },
      },
    ]);

  testParse('nil', null,
    [
      {
        isWarning: false,
        token: { charNumber: 0, row: 0, col: 0 },
      },
    ]);

  testParse('nullllleray', null,
    [
      {
        isWarning: false,
        token: { charNumber: 0, row: 0, col: 0 },
      },
    ]);

  testParse('["string]', ['string'],
    [
      {
        isWarning: false,
        token: { charNumber: 1, row: 0, col: 1 },
      },
    ]);

  testParse(`{
  "index": "movies",
  "type": "data",
  "from": 0,
  "size": "10"
}`, JSON.parse(`{"from": 0, "index": "movies", "size": "10", "type": "data"}`), []);

  testParse(`{
  "index" : "movies",
  "type" : "data",
  "size" : 10,
  "from" : 0,
  "body" : {
    "query" : {
      "bool" : {
        "must_not" : [ { "match" : { "title": "blah blah"} } ]
      }
    }
  }
}`,
    {
      body: { query: { bool: { must_not: [{ match: { title: 'blah blah' } }] } } },
      from: 0,
      index: 'movies',
      size: 10,
      type: 'data',
    });
});
