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

import AddTransformationNode from 'shared/transformations/nodes/AddTransformationNode';
import ArraySumTransformationNode from 'shared/transformations/nodes/ArraySumTransformationNode';
import DecryptTransformationNode from 'shared/transformations/nodes/DecryptTransformationNode';
import DifferenceTransformationNode from 'shared/transformations/nodes/DifferenceTransformationNode';
import DivideTransformationNode from 'shared/transformations/nodes/DivideTransformationNode';
import EncryptTransformationNode from 'shared/transformations/nodes/EncryptTransformationNode';
import FindReplaceTransformationNode from 'shared/transformations/nodes/FindReplaceTransformationNode';
import HashTransformationNode from 'shared/transformations/nodes/HashTransformationNode';
import MultiplyTransformationNode from 'shared/transformations/nodes/MultiplyTransformationNode';
import ProductTransformationNode from 'shared/transformations/nodes/ProductTransformationNode';
import QuotientTransformationNode from 'shared/transformations/nodes/QuotientTransformationNode';
import SetIfTransformationNode from 'shared/transformations/nodes/SetIfTransformationNode';
import SubtractTransformationNode from 'shared/transformations/nodes/SubtractTransformationNode';
import SumTransformationNode from 'shared/transformations/nodes/SumTransformationNode';
import ArrayCountTransformationNode from './nodes/ArrayCountTransformationNode';
import CastTransformationNode from './nodes/CastTransformationNode';
import DuplicateTransformationNode from './nodes/DuplicateTransformationNode';
import FilterTransformationNode from './nodes/FilterTransformationNode';
import InsertTransformationNode from './nodes/InsertTransformationNode';
import JoinTransformationNode from './nodes/JoinTransformationNode';
import SplitTransformationNode from './nodes/SplitTransformationNode';
import SubstringTransformationNode from './nodes/SubstringTransformationNode';
import TransformationNode from './nodes/TransformationNode';
import UppercaseTransformationNode from './nodes/UppercaseTransformationNode';
import TransformationVisitResult from './TransformationVisitResult';

export default abstract class TransformationNodeVisitor
{
  public abstract visitDefault(node: TransformationNode, doc: object, options: object): TransformationVisitResult;

  public visitDuplicateNode(node: DuplicateTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitFilterNode(node: FilterTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitJoinNode(node: JoinTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitInsertNode(node: InsertTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitSplitNode(node: SplitTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitSubstringNode(node: SubstringTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitCastNode(node: CastTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitHashNode(node: HashTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitUppercaseNode(node: UppercaseTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitAddNode(node: AddTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitSubtractNode(node: SubtractTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitMultiplyNode(node: MultiplyTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitDivideNode(node: DivideTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitSetIfNode(node: SetIfTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitFindReplaceNode(node: FindReplaceTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitArraySumNode(node: ArraySumTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

  public visitArrayCountNode(node: ArrayCountTransformationNode, doc: object, options: object = {}): TransformationVisitResult
  {
    return this.visitDefault(node, doc, options);
  }

    public visitProductNode(node: ProductTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        return this.visitDefault(node, doc, options);
    }

    public visitQuotientNode(node: QuotientTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        return this.visitDefault(node, doc, options);
    }

    public visitSumNode(node: SumTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        return this.visitDefault(node, doc, options);
    }

    public visitDifferenceNode(node: DifferenceTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        return this.visitDefault(node, doc, options);
    }

    public visitEncryptNode(node: EncryptTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        return this.visitDefault(node, doc, options);
    }

    public visitDecryptNode(node: DecryptTransformationNode, doc: object, options: object = {}): TransformationVisitResult
    {
        return this.visitDefault(node, doc, options);
    }
}
