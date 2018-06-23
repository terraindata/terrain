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
import { ETLFieldTypes, FieldTypes } from 'shared/etl/types/ETLTypes';

import { AddTransformationInfo, AddTransformationNode } from './nodes/AddTransformationNode';
import { ArrayCountTransformationInfo, ArrayCountTransformationNode } from './nodes/ArrayCountTransformationNode';
import { ArraySumTransformationInfo, ArraySumTransformationNode } from './nodes/ArraySumTransformationNode';
import { CaseTransformationInfo, CaseTransformationNode } from './nodes/CaseTransformationNode';
import { CastTransformationInfo, CastTransformationNode } from './nodes/CastTransformationNode';
import { DecryptTransformationInfo, DecryptTransformationNode } from './nodes/DecryptTransformationNode';
import { DifferenceTransformationInfo, DifferenceTransformationNode } from './nodes/DifferenceTransformationNode';
import { DivideTransformationInfo, DivideTransformationNode } from './nodes/DivideTransformationNode';
import { DuplicateTransformationInfo, DuplicateTransformationNode } from './nodes/DuplicateTransformationNode';
import { EncryptTransformationInfo, EncryptTransformationNode } from './nodes/EncryptTransformationNode';
import { FilterArrayTransformationInfo, FilterArrayTransformationNode } from './nodes/FilterArrayTransformationNode';
import { FindReplaceTransformationInfo, FindReplaceTransformationNode } from './nodes/FindReplaceTransformationNode';
import { GroupByTransformationInfo, GroupByTransformationNode } from './nodes/GroupByTransformationNode';
import { HashTransformationInfo, HashTransformationNode } from './nodes/HashTransformationNode';
import { InsertTransformationInfo, InsertTransformationNode } from './nodes/InsertTransformationNode';
import { JoinTransformationInfo, JoinTransformationNode } from './nodes/JoinTransformationNode';
import { MultiplyTransformationInfo, MultiplyTransformationNode } from './nodes/MultiplyTransformationNode';
import { ProductTransformationInfo, ProductTransformationNode } from './nodes/ProductTransformationNode';
import { QuotientTransformationInfo, QuotientTransformationNode } from './nodes/QuotientTransformationNode';
import { RemoveDuplicatesTransformationInfo, RemoveDuplicatesTransformationNode } from './nodes/RemoveDuplicatesTransformationNode';
import { RoundTransformationInfo, RoundTransformationNode } from './nodes/RoundTransformationNode';
import { SetIfTransformationInfo, SetIfTransformationNode } from './nodes/SetIfTransformationNode';
import { SplitTransformationInfo, SplitTransformationNode } from './nodes/SplitTransformationNode';
import { SubstringTransformationInfo, SubstringTransformationNode } from './nodes/SubstringTransformationNode';
import { SubtractTransformationInfo, SubtractTransformationNode } from './nodes/SubtractTransformationNode';
import { SumTransformationInfo, SumTransformationNode } from './nodes/SumTransformationNode';
import { ZipcodeTransformationInfo, ZipcodeTransformationNode } from './nodes/ZipcodeTransformationNode';

import TransformationNode from './nodes/TransformationNode';

import { TransformationEngine } from './TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from './TransformationNodeType';
import TransformationNodeVisitor from './TransformationNodeVisitor';
import TransformationVisitResult from './TransformationVisitResult';
import EngineUtil from './util/EngineUtil';

import TransformationRegistry from 'shared/transformations/TransformationRegistry';

export type TNodeObject = Pick<TransformationNode, 'fields' | 'meta'>;

export abstract class TransformationInfo
{
  public static getReadableName(type: TransformationNodeType)
  {
    return TransformationRegistry.visit(type).humanName;
  }

  public static getReadableSummary(type: TransformationNodeType, transformation: TNodeObject): string
  {
    return TransformationRegistry.visit(type).shortSummary(transformation.meta);
  }

  public static getDescription(type: TransformationNodeType)
  {
    return TransformationRegistry.visit(type).description;
  }

  public static isAvailable(type: TransformationNodeType, engine: TransformationEngine, field: number)
  {
    return TransformationRegistry.visit(type).isAvailable(engine, field);
  }

  public static canCreate(type: TransformationNodeType): boolean
  {
    return TransformationRegistry.visit(type).creatable;
  }

  public static canEdit(type: TransformationNodeType): boolean
  {
    return TransformationRegistry.visit(type).editable;
  }

  public static getType(type: TransformationNodeType): any
  {
    return TransformationRegistry.visit(type).nodeClass;
  }

  public static getNewFieldType(type: TransformationNodeType): any
  {
    return TransformationRegistry.visit(type).newFieldType;
  }
}
