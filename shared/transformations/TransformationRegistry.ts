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
import { RenameTransformationInfo, RenameTransformationNode } from './nodes/RenameTransformationNode';
import { RoundTransformationInfo, RoundTransformationNode } from './nodes/RoundTransformationNode';
import { SetIfTransformationInfo, SetIfTransformationNode } from './nodes/SetIfTransformationNode';
import { SplitTransformationInfo, SplitTransformationNode } from './nodes/SplitTransformationNode';
import { SubstringTransformationInfo, SubstringTransformationNode } from './nodes/SubstringTransformationNode';
import { SubtractTransformationInfo, SubtractTransformationNode } from './nodes/SubtractTransformationNode';
import { SumTransformationInfo, SumTransformationNode } from './nodes/SumTransformationNode';
import { ZipcodeTransformationInfo, ZipcodeTransformationNode } from './nodes/ZipcodeTransformationNode';

import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeInfo from 'shared/transformations/TransformationNodeInfo';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import TransformationNodeVisitor, { VisitorLookupMap } from 'shared/transformations/TransformationNodeVisitor';

const infos: {
  [k in TransformationNodeType]: TransformationNodeInfo & { typeCode: k }
} = {
    [TransformationNodeType.AddNode]: AddTransformationInfo,
    [TransformationNodeType.ArrayCountNode]: ArrayCountTransformationInfo,
    [TransformationNodeType.ArraySumNode]: ArraySumTransformationInfo,
    [TransformationNodeType.CaseNode]: CaseTransformationInfo,
    [TransformationNodeType.CastNode]: CastTransformationInfo,
    [TransformationNodeType.DecryptNode]: DecryptTransformationInfo,
    [TransformationNodeType.DifferenceNode]: DifferenceTransformationInfo,
    [TransformationNodeType.DivideNode]: DivideTransformationInfo,
    [TransformationNodeType.DuplicateNode]: DuplicateTransformationInfo,
    [TransformationNodeType.EncryptNode]: EncryptTransformationInfo,
    [TransformationNodeType.FilterArrayNode]: FilterArrayTransformationInfo,
    [TransformationNodeType.FindReplaceNode]: FindReplaceTransformationInfo,
    [TransformationNodeType.GroupByNode]: GroupByTransformationInfo,
    [TransformationNodeType.HashNode]: HashTransformationInfo,
    [TransformationNodeType.InsertNode]: InsertTransformationInfo,
    [TransformationNodeType.JoinNode]: JoinTransformationInfo,
    [TransformationNodeType.MultiplyNode]: MultiplyTransformationInfo,
    [TransformationNodeType.ProductNode]: ProductTransformationInfo,
    [TransformationNodeType.QuotientNode]: QuotientTransformationInfo,
    [TransformationNodeType.RemoveDuplicatesNode]: RemoveDuplicatesTransformationInfo,
    [TransformationNodeType.RenameNode]: RenameTransformationInfo,
    [TransformationNodeType.RoundNode]: RoundTransformationInfo,
    [TransformationNodeType.SetIfNode]: SetIfTransformationInfo,
    [TransformationNodeType.SplitNode]: SplitTransformationInfo,
    [TransformationNodeType.SubstringNode]: SubstringTransformationInfo,
    [TransformationNodeType.SubtractNode]: SubtractTransformationInfo,
    [TransformationNodeType.SumNode]: SumTransformationInfo,
    [TransformationNodeType.ZipcodeNode]: ZipcodeTransformationInfo,
  };

class TransformationRegistryVisitor extends TransformationNodeVisitor<TransformationNodeInfo>
{
  public visitorLookup: VisitorLookupMap<TransformationNodeInfo> = {};

  constructor()
  {
    super();
    this.init();
  }

  public visitDefault()
  {
    return null;
  }

  private init()
  {
    for (const type of Object.keys(infos) as TransformationNodeType[])
    {
      this.visitorLookup[type] = () => infos[type];
    }
  }
}

const registryVisitor = new TransformationRegistryVisitor();

export type TNodeObject = Pick<TransformationNode, 'fields' | 'meta'>;

class TransformationRegistryLookup
{
  public getReadableName(type: TransformationNodeType)
  {
    return registryVisitor.visit(type).humanName;
  }

  public getReadableSummary(type: TransformationNodeType, transformation: TNodeObject): string
  {
    return registryVisitor.visit(type).shortSummary(transformation.meta);
  }

  public getDescription(type: TransformationNodeType)
  {
    return registryVisitor.visit(type).description;
  }

  public isAvailable(type: TransformationNodeType, engine: TransformationEngine, field: number)
  {
    return registryVisitor.visit(type).isAvailable(engine, field);
  }

  public canCreate(type: TransformationNodeType): boolean
  {
    return registryVisitor.visit(type).creatable;
  }

  public canEdit(type: TransformationNodeType): boolean
  {
    return registryVisitor.visit(type).editable;
  }

  public getType(type: TransformationNodeType): any
  {
    return registryVisitor.visit(type).nodeClass;
  }

  public getNewFieldType(type: TransformationNodeType): any
  {
    return registryVisitor.visit(type).newFieldType;
  }
}

export default new TransformationRegistryLookup();
