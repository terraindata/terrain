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
// tslint:disable:no-var-requires

import { List } from 'immutable';
import * as _ from 'lodash';

import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationRegistry from 'shared/transformations/TransformationRegistry';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import { _ETLTemplate, ETLTemplate, templateForBackend } from 'shared/etl/immutable/TemplateRecords';
import { NodeTypes, TemplateBase, TemplateObject } from 'shared/etl/types/ETLTypes';
import { destringifySavedTemplate, templateForSave } from '../../src/app/etl/TemplateConfig';

import
{
  CURRENT_TEMPLATE_VERSION, getTemplateVersion, MigrationTestFile, TemplateVersion, updateTemplateIfNeeded,
} from 'shared/etl/migrations/TemplateVersions';

import * as Utils from 'shared/transformations/util/EngineUtils';

const V5InterpretedTypecasts = require('./cases/V5InterpretedTypecasts');
const V5NumericKeypathsAndMoves = require('./cases/V5NumericKeypathsAndMoves');
const V5NumericKeypathsRemoveCasts = require('./cases/V5NumericKeypathsRemoveCasts');
const V5ParseStringifiedArray = require('./cases/V5ParseStringifiedArray');
const V5ParseStringifiedArrayMoreComplex = require('./cases/V5ParseStringifiedArrayMoreComplex');
const V5SimpleCase = require('./cases/V5SimpleCase');
const V5SomeComplexRenames = require('./cases/V5SomeComplexRenames');
const V5SomeTransformations = require('./cases/V5SomeTransformations');
const V5TestDeleteFields1 = require('./cases/V5TestDeleteFields1');
const V5TestDisableFields = require('./cases/V5TestDisableFields');
const V5TrickyNumberCasts = require('./cases/V5TrickyNumberCasts');

function runTransforms(engine: TransformationEngine, inputDocs: object[], outputDocs: Array<object | 'FAIL'>, numFailed: number)
{
  expect(Utils.validation.verifyEngine(engine)).toEqual([]);
  let failed = 0;
  let passed = 0;
  inputDocs.forEach((doc, i) =>
  {
    const expected = outputDocs[i];
    let output: 'FAIL' | object = 'FAIL';
    try
    {
      output = engine.transform(doc);
      passed++;
    }
    catch (e)
    {
      failed++;
    }

    expect(output).toEqual(expected);
  });
  expect(failed).toBe(numFailed);
}

/*
 *  Migrate the template in the test file and transform the test file's input documents to ensure
 *  that they match the output docu
 */
function runMigrationFile(test: MigrationTestFile)
{
  const { testName, numDocs, numFailed, whichEdge, inputDocs, outputDocs, template } = test;

  const migratedTemplateObj = updateTemplateIfNeeded(template as TemplateBase).template;
  expect(getTemplateVersion(migratedTemplateObj)).toBe(CURRENT_TEMPLATE_VERSION);

  const templateRecord = _ETLTemplate(migratedTemplateObj, true);
  const engine: TransformationEngine = templateRecord.getEdge(whichEdge).transformations;
  runTransforms(engine, inputDocs, outputDocs, numFailed);

  let roundTripTemplate: any = templateForBackend(templateRecord);
  roundTripTemplate = templateForSave(roundTripTemplate);
  roundTripTemplate = destringifySavedTemplate(roundTripTemplate);
  roundTripTemplate = _ETLTemplate(roundTripTemplate, true);

  const roundTripEngine = _ETLTemplate(roundTripTemplate, true).getEdge(whichEdge).transformations;
  runTransforms(roundTripEngine, inputDocs, outputDocs, numFailed);
}

function testShortCut(file: MigrationTestFile)
{
  test(`Migration Test: ${file.testName}`, () =>
  {
    runMigrationFile(file);
  });
}

describe('Run V5 Migration Tests', () =>
{
  testShortCut(V5InterpretedTypecasts);
  testShortCut(V5NumericKeypathsAndMoves);
  testShortCut(V5NumericKeypathsRemoveCasts);
  testShortCut(V5ParseStringifiedArray);
  testShortCut(V5ParseStringifiedArrayMoreComplex);
  testShortCut(V5SimpleCase);
  testShortCut(V5SomeComplexRenames);
  testShortCut(V5SomeTransformations);
  testShortCut(V5TestDeleteFields1);
  testShortCut(V5TestDisableFields);
  testShortCut(V5TrickyNumberCasts);
});
