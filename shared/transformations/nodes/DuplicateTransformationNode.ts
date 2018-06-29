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
// tslint:disable:max-classes-per-file

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as yadeep from 'shared/util/yadeep';

const { List, Map } = Immutable;

import { ETLFieldTypes, FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeInfo from 'shared/transformations/TransformationNodeInfo';
import EngineUtil from 'shared/transformations/util/EngineUtil';

import Topology from 'shared/transformations/util/TopologyUtil';
import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import TransformationVisitError from 'shared/transformations/TransformationVisitError';
import TransformationVisitResult from 'shared/transformations/TransformationVisitResult';
import { KeyPath } from 'shared/util/KeyPath';

import isPrimitive = require('is-primitive');

const TYPECODE = TransformationNodeType.DuplicateNode;

// Duplicate is not categorized yet
export class DuplicateTransformationNode extends TransformationNode
{
  public readonly typeCode = TYPECODE;

  protected oneToOne(doc: object, inputField: KeyPath, outputField: KeyPath)
  {
    const matcherFn = Topology.createOneToOneMatcher(inputField, outputField);
    for (const match of yadeep.search(doc, inputField))
    {
      let { value } = match;
      if (!isPrimitive(value))
      {
        value = _.cloneDeep(value);
      }
      yadeep.set(doc, matcherFn(match.location), value, { create: true });
    }
  }

  protected oneToManyHelper(doc: object, inputField: KeyPath, outputField: KeyPath)
  {

  }

  /*
   *  e.g.
   *  [A, -1, D] to [A, -1, B, -1, C]
   *  Search all [A, -1, D]
   *    Search all [B, -1]
   *    Assign D to C
   */
  protected oneToMany(doc: object, inputField: KeyPath, outputField: KeyPath)
  {

  }

  /*
   *  e.g.
   *  [A, -1, B, -1, C] to [A, -1, D]
   *  Search all [A, -1]
   *    Search all [B, -1, C]
   *    Assign to [D]
   */
  protected manyToOne(doc: object, inputField: KeyPath, outputField: KeyPath): string // errors
  {
    const baseIndex = Topology.getDifferingBaseIndex(inputField, outputField);
    const basePath = inputField.slice(0, baseIndex).toList();
    const inputAfterBasePath = inputField.slice(baseIndex).toList();

    const matchFn = Topology.createOneToOneMatcher(inputField, outputField);
    for (const match of yadeep.search(doc, basePath))
    {
      // each match represents a match of the base path
      const { location, value } = match;
      if (isPrimitive(value))
      {
        return 'Encountered a primitive where an object should be';
      }
      const destKP = matchFn(outputField);
      const matches = yadeep.search(value, inputAfterBasePath);
      const values = matches.map((m) => {
        if (!isPrimitive(m.value))
        {
          return _.cloneDeep(m.value);
        }
        else
        {
          return m.value;
        }
      });
      yadeep.set(doc, destKP, values, { create: true });
    }
  }

  protected transformDocument(doc: object): TransformationVisitResult
  {
    const errors = [];
    const opts = this.meta as NodeOptionsType<any>;

    const inputField = this.fields.get(0);
    const outputField = opts.newFieldKeyPaths.get(0);

    // when we implement optimizations / caching and overrideable serialization we can memoize this
    const [r1, r2] = Topology.getRelation(inputField, outputField);

    if (r1 === 'one' && r2 === 'one')
    {
      this.oneToOne(doc, inputField, outputField);
    }
    else if (r1 === 'one' && r2 === 'many')
    {
      this.oneToMany(doc, inputField, outputField);
    }
    else if (r1 === 'many' && r2 === 'one')
    {
      const err = this.manyToOne(doc, inputField, outputField);
      if (err !== undefined)
      {
        errors.push(err);
      }
    }
    else
    {
      errors.push(`Error in ${this.typeCode}: Input and Output fields are incompatible`);
    }

    return {
      document: doc,
      errors,
    } as TransformationVisitResult;
  }
}

class DuplicateTransformationInfoC extends TransformationNodeInfo
{
  public readonly typeCode = TYPECODE;
  public humanName = 'Duplicate';
  public description = 'Duplicate this field';
  public nodeClass = DuplicateTransformationNode;

  public editable = false;
  public creatable = true;
  public newFieldType = 'same';

  public isAvailable(engine: TransformationEngine, fieldId: number)
  {
    const etlType = EngineUtil.getETLFieldType(fieldId, engine);
    return (
      EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId)) &&
      etlType !== ETLFieldTypes.Object && etlType !== ETLFieldTypes.Array
    );
  }
}

export const DuplicateTransformationInfo = new DuplicateTransformationInfoC();
