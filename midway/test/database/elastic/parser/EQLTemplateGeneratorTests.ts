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
import EQLTemplateGenerator from '../../../../../shared/backends/elastic/parser/EQLTemplateGenerator';
import ESParser from '../../../../../shared/backends/elastic/parser/ESJSONParser';
import ESParserError from '../../../../../shared/backends/elastic/parser/ESParserError';
import ESValueInfo from '../../../../../shared/backends/elastic/parser/ESValueInfo';
import { makePromiseCallback } from '../../../../src/tasty/Utils';

/* tslint:disable:no-trailing-whitespace */

beforeAll(async (done) =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';
  done();
});

function testGeneration(testString: string, expectedValue: string)
{
  winston.info('testing \'' + testString + '\'');

  const parser: ESParser = new ESParser(testString);
  const valueInfo: ESValueInfo = parser.getValueInfo();
  const errors: ESParserError[] = parser.getErrors();

  expect(errors.length).toEqual(0);

  const result = EQLTemplateGenerator.generate(valueInfo);

  winston.info(result);
  expect(result).toEqual(expectedValue);
}

test('test generate template queries', () =>
{
  testGeneration('true', 'true');
  testGeneration('false', 'false');
  testGeneration('null', 'null');
  testGeneration('0', '0');
  testGeneration('1.923e-21', '1.923e-21');
  testGeneration('123', '123');
  testGeneration('9990000000000', '9990000000000');
  testGeneration('0.999', '0.999');
  testGeneration('[]', '[]');
  testGeneration('{}', ' {  } ');

  testGeneration(`{"index" : "movies","type" : "data","from" : 0,"size" : "10"}`,
    ` { "index":"movies","type":"data","from":0,"size":"10" } `);

  testGeneration(`{"index" : "movies","type" : @type,"from" : @from,"size" : "10"}`,
    ` { "index":"movies","type": {{#toJson}}@type{{/toJson}} ,"from": {{#toJson}}@from{{/toJson}} ,"size":"10" } `);

});