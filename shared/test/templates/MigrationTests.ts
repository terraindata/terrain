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

import { List } from 'immutable';
import * as _ from 'lodash';

import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationRegistry from 'shared/transformations/TransformationRegistry';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import { NodeTypes, TemplateBase, TemplateObject } from 'shared/etl/types/ETLTypes';
import { _ETLTemplate, ETLTemplate, templateForBackend } from 'shared/etl/immutable/TemplateRecords';

import {
  CURRENT_TEMPLATE_VERSION, getTemplateVersion, MigrationTestFile, TemplateVersion, updateTemplateIfNeeded,
} from 'shared/etl/migrations/TemplateVersions';

import * as V5InterpretedTypecasts from './cases/V5InterpretedTypecasts';
import * as V5NumericKeypathsAndMovies from './cases/V5NumericKeypathsAndMovies';
import * as V5NumericKeypathsRemoveCasts from './cases/V5NumericKeypathsRemoveCasts';
import * as V5ParseStringifiedArray from './cases/V5ParseStringifiedArray';
import * as V5ParseStringifiedArrayMoreComplex from './cases/V5ParseStringifiedArrayMoreComplex';
import * as V5SimpleCase from './cases/V5SimpleCase';
import * as V5SomeComplexRenames from './cases/V5SomeComplexRenames';
import * as V5SomeTransformations from './cases/V5SomeTransformations';
import * as V5TestDeleteFields1 from './cases/V5TestDeleteFields1';
import * as V5TestDisableFields from './cases/V5TestDisableFields';
import * as V5TrickyNumberCasts from './cases/V5TrickyNumberCasts';

/*
 *  Migrate the template in the test file and transform the test file's input documents to ensure
 *  that they match the output documents
 */
function runMigrationFile(test: MigrationTestFile)
{
  const { testName, numDocs, numFailed, whichEdge, inputDocs, outputDocs, template } = test;

  const migratedTemplateObj = updateTemplateIfNeeded(template as TemplateBase).template;
  expect(getTemplateVersion(migratedTemplateObj)).toBe(CURRENT_TEMPLATE_VERSION);

  const templateRecord = _ETLTemplate(template, true);
  const engine: any = templateRecord.getEdge(whichEdge).transformations;

  let failed = 0;
  let passed = 0;
  inputDocs.forEach((doc, i) => {
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

describe('Run V5 Migration Tests', () => {
  test('V5InterpretedTypecasts', () => {
    runMigrationFile(V5InterpretedTypecasts);
  });
  test('V5NumericKeypathsAndMovies', () => {
    runMigrationFile(V5NumericKeypathsAndMovies);
  });
  test('V5NumericKeypathsRemoveCasts', () => {
    runMigrationFile(V5NumericKeypathsAndMovies);
  });
});
