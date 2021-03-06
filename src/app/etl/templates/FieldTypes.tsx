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
// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable import-spacing
import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeBase from 'shared/transformations/TransformationNode';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType, NodeTypes } from 'shared/transformations/TransformationNodeType';
import { makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'shared/util/Classes';

import * as Utils from 'shared/transformations/util/EngineUtils';

// only put fields in here that are needed to track display-sensitive state
class TemplateFieldC
{
  public readonly isIncluded: boolean = true;
  public readonly isHidden: boolean = false;
  public readonly fieldProps: object = {};
  public readonly etlType: FieldTypes = FieldTypes.Object;
  public readonly fieldId: number = -1;
  public readonly name: string = '';
  public readonly childrenIds: List<number> = List([]);
  public readonly transformations: List<TransformationNode> = List([]);
  public readonly fieldPath: KeyPath = List([]);

  public isWildcardField(): boolean
  {
    return Utils.path.isWildcard(this.fieldPath);
  }

  public isAncestorNamedField(index: number)
  {
    return Utils.path.isNamed(this.fieldPath.slice(0, index + 1).toList());
  }

  public canMoveField(): boolean
  {
    return this.isNamedField();
  }

  public canEditField(): boolean
  {
    return true;
  }

  public canTransformField(): boolean
  {
    return true;
  }

  public canEditName(): boolean
  {
    return !this.isWildcardField();
  }

  public isPrimitive(): boolean
  {
    return this.etlType !== FieldTypes.Array &&
      this.etlType !== FieldTypes.Object &&
      this.etlType !== FieldTypes.GeoPoint;
  }

  public isLocalToRoot(): boolean
  {
    // we can use a placeholder name
    return Utils.topology.areFieldsLocal(this.fieldPath, List(['sample_name']));
  }

  public isNamedField()
  {
    return Utils.path.isNamed(this.fieldPath);
  }
}
export type TemplateField = WithIRecord<TemplateFieldC>;
export const _TemplateField = makeExtendedConstructor(TemplateFieldC, true);

// recordized version of transformationNode.
// This had to be copied due to how Typescript treats inherited members
class TransformationNodeC
{
  public id: number = 0;
  public typeCode: TransformationNodeType = TransformationNodeType.SplitNode;
  public fields: List<{ id: number, path: KeyPath }> = List([]);
  public meta: object = {};
}
export type TransformationNode = WithIRecord<TransformationNodeC>;
export const _TransformationNode = makeConstructor(TransformationNodeC);

// Ignore these types; they are to make sure that TransformationNodeC is the same as TransformationNodeBase
type AssertNodeC = {
  [K in keyof TransformationNodeC]: TransformationNodeC[K]
};
type AssertNodeBase = {
  [K in keyof TransformationNodeBase]: TransformationNodeBase[K]
};
type AssertCIsBase<T extends AssertNodeC> = T;
type AssertBaseIsC<T extends AssertNodeBase> = AssertCIsBase<T>;
