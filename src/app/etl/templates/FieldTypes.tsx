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
import { ELASTIC_TYPES } from 'shared/etl/TemplateTypes';
import { TransformationNode as TransformationNodeBase } from 'shared/transformations/TransformationNode';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { NodeOptionsType, NodeTypes } from 'shared/transformations/TransformationNodeType';
import { makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

class ElasticFieldSettingsC
{
  public langType: string = 'elastic';
  public isAnalyzed: boolean = true;
  public analyzer: string = '';
  public type: ELASTIC_TYPES = ELASTIC_TYPES.TEXT;
  public arrayType: List<ELASTIC_TYPES> = List([ELASTIC_TYPES.TEXT]);
}
export type ElasticFieldSettings = WithIRecord<ElasticFieldSettingsC>;
export const _ElasticFieldSettings = makeExtendedConstructor(ElasticFieldSettingsC, false, {
  arrayType: List,
});

// only put fields in here that are needed to track display-sensitive state
class TemplateFieldC
{
  public readonly isIncluded: boolean = true;
  public readonly langSettings: ElasticFieldSettings = _ElasticFieldSettings();
  public readonly fieldId: number = 0;
  public readonly name: string = '';
  public readonly children: List<TemplateField> = List([]);
  public readonly transformations: List<TransformationNode> = List([]);

  public isArray(): boolean
  {
    const type = this.langSettings.type;
    return type === ELASTIC_TYPES.ARRAY;
  }

  // returns how deep the array type is. For example, if the field's type is array of array of text, then the depth is 2.
  public arrayDepth(): number
  {
    const { arrayType } = this.langSettings;
    return this.isArray() ? arrayType.size : 0;
  }

  public isNested(): boolean
  {
    const { type, arrayType } = this.langSettings;
    return type === ELASTIC_TYPES.NESTED ||
      (type === ELASTIC_TYPES.ARRAY && arrayType.size > 0 && arrayType.last() === ELASTIC_TYPES.NESTED);
  }

  public getSubfields() // TODO: if nothing fancy needs to happen, just directly access children
  {
    return this.children;
  }

  public getName(): string
  {
    return this.name;
  }

  public isRoot(keyPath): boolean
  {
    return keyPath.size === 0;
  }
}
export type TemplateField = WithIRecord<TemplateFieldC>;
export const _TemplateField = makeExtendedConstructor(TemplateFieldC, true, {
  langSettings: _ElasticFieldSettings,
});

// recordized version of transformationNode.
// This had to be copied due to how Typescript treats inherited members
class TransformationNodeC
{
  public id: number = 0;
  public typeCode: TransformationNodeType = TransformationNodeType.LoadNode;
  public fieldIDs: List<number> = List([]);
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
