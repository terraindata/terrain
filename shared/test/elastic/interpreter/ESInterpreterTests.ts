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

// Copyright 2018 Terrain Data, Inc.

import * as fs from 'fs';
import * as _ from 'lodash';
import * as util from 'util';

import { TestLogger } from 'shared/test/TestLogger';
import SharedUtil from '../../../../shared/Util';
import ESInterpreter from '../../../database/elastic/parser/ESInterpreter';
import ESJSONParser from '../../../database/elastic/parser/ESJSONParser';
import ESParserError from '../../../database/elastic/parser/ESParserError';

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

let expected;

beforeAll(async (done) =>
{
  TestLogger.level = 'debug';

  const expectedString: any = await new Promise((resolve, reject) =>
  {
    fs.readFile(getExpectedFile(), SharedUtil.promise.makeCallback(resolve, reject));
  });

  expected = JSON.parse(expectedString);
  done();
});

function testParse(testName: string,
  testString: string,
  expectedValue: any,
  expectedErrors: ESParserError[] = [])
{
  TestLogger.info('testing "' + testName + '": "' + testString + '"');
  const interpreter: ESInterpreter = new ESInterpreter(testString);
  const parser: ESJSONParser = interpreter.parser as ESJSONParser;

  if (parser.getErrors().length > 0)
  {
    TestLogger.info(util.inspect(parser.getErrors(), false, 16));
    TestLogger.info(util.inspect(parser.getValueInfo(), false, 16));
  }

  expect(parser.getValue()).toEqual(expectedValue);
  expect(new ESJSONParser(interpreter.finalQuery).getValue()).toEqual(expectedValue);
  expect(parser.getErrors()).toEqual(expectedErrors);
  // test post size manipulating
  if (expectedValue.hasOwnProperty('size'))
  {
    interpreter.adjustQuerySize(1, 200, 1, false);
    expect(interpreter.rootValueInfo.value.size).toBe(1);
  }

  if (expectedValue.hasOwnProperty('from'))
  {
    const oldfrom = Number(expectedValue.from);
    interpreter.adjustQuerySize(1, 200, 2, true);
    expect(interpreter.rootValueInfo.value.from).toBe(oldfrom + 1);
  }

  const factors = _.get(interpreter.rootValueInfo.value, ['sort', '_script', 'script', 'params', 'factors']);
  if (Array.isArray(factors) && factors.length > 0)
  {
    interpreter.normalizeTerrainScriptWeight();
    const newFactors = _.get(interpreter.rootValueInfo.value, ['sort', '_script', 'script', 'params', 'factors']);
    let newSum = 0;
    newFactors.map((f) =>
    {
      newSum = newSum + Number(f.weight);
    });
    const sumDiff = 1 - newSum;
    TestLogger.info('Old weights: ' + JSON.stringify(factors.map((f) => f.weight)) + ' New weights: ' +
      JSON.stringify(newFactors.map((f) => f.weight)) + ' Weight sum diff ' + String(sumDiff));
    expect(Math.abs(1 - newSum) < 0.001).toBe(true);
  }
}

test('parse valid json objects', () =>
{
  Object.getOwnPropertyNames(expected).forEach(
    (testName: string) =>
    {
      const testValue: any = expected[testName];
      testParse(testName, JSON.stringify(testValue), testValue);
    });
});
