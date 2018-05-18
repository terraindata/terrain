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
// tslint:disable:no-var-requires no-empty-interface max-classes-per-file

import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { InfoType, TransformationInfo } from 'shared/transformations/TransformationInfo';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { TransformationFormProps } from './TransformationFormBase';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import { ArraySumTFF } from './ArraySumTransformationForm';
import { CastTFF } from './CastTransformationForm';
import { DuplicateTFF } from './DuplicateTransformationForm';
import { InsertTFF } from './InsertTransformationForm';
import { JoinTFF } from './JoinTransformationForm';
import { DifferenceTFF, ProductTFF, QuotientTFF, SumTFF } from './NumericOperationForms';
import { SetIfTFF } from './SetIfTransformationForm';
import
{
  AddTFF, DecryptTFF, DivideTFF, EncryptTFF, FindReplaceTFF, HashTFF,
  MultiplyTFF, SubstringTFF, SubtractTFF, UppercaseTFF,
} from './SimpleTransformations';
import { SplitTFF } from './SplitTransformationForm';

export function getTransformationForm(type: TransformationNodeType): React.ComponentClass<TransformationFormProps>
{
  switch (type)
  {
    case TransformationNodeType.UppercaseNode:
      return UppercaseTFF;
    case TransformationNodeType.SubstringNode:
      return SubstringTFF;
    case TransformationNodeType.DuplicateNode:
      return DuplicateTFF;
    case TransformationNodeType.SplitNode:
      return SplitTFF;
    case TransformationNodeType.JoinNode:
      return JoinTFF;
    case TransformationNodeType.CastNode:
      return CastTFF;
    case TransformationNodeType.HashNode:
      return HashTFF;
    case TransformationNodeType.ArraySumNode:
      return ArraySumTFF;
    case TransformationNodeType.AddNode:
      return AddTFF;
    case TransformationNodeType.SubtractNode:
      return SubtractTFF;
    case TransformationNodeType.MultiplyNode:
      return MultiplyTFF;
    case TransformationNodeType.DivideNode:
      return DivideTFF;
    case TransformationNodeType.SetIfNode:
      return SetIfTFF;
    case TransformationNodeType.FindReplaceNode:
      return FindReplaceTFF;
    case TransformationNodeType.InsertNode:
      return InsertTFF;
    case TransformationNodeType.SumNode:
      return SumTFF;
    case TransformationNodeType.DifferenceNode:
      return DifferenceTFF;
    case TransformationNodeType.ProductNode:
      return ProductTFF;
    case TransformationNodeType.QuotientNode:
      return QuotientTFF;
    case TransformationNodeType.EncryptNode:
      return EncryptTFF;
    case TransformationNodeType.DecryptNode:
      return DecryptTFF;
    default:
      return null;
  }
}

export const availableTransformations: List<TransformationNodeType> = determineAvailableTransformations();
// all transformation types for which getTransformationForm does not return null

function determineAvailableTransformations(): List<TransformationNodeType>
{
  let typeList = List([]);
  for (const type in TransformationNodeType)
  {
    if (
      getTransformationForm(type as TransformationNodeType) !== null
      && TransformationInfo.canCreate(type as TransformationNodeType)
    )
    {
      typeList = typeList.push(type);
    }
  }
  return typeList;
}
