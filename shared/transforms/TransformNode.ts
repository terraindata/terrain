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

// tslint:disable:strict-boolean-expressions

import TransformNodeType from './TransformNodeType';
import TransformNodeVisitor from './TransformNodeVisitor';

import AppendNode from './AppendNode';
import DuplicateNode from './DuplicateNode';
import FilterNode from './FilterNode';
import GetNode from './GetNode';
import JoinNode from './JoinNode';
import LoadNode from './LoadNode';
import PlusNode from './PlusNode';
import PrependNode from './PrependNode';
import PutNode from './PutNode';
import RenameNode from './RenameNode';
import SplitNode from './SplitNode';
import StoreNode from './StoreNode';

/**
 *
 */
abstract class TransformNode
{
  public nodeType: TransformNodeType;

  public type: string;
  public name: string;
  public path: string[];
  public desc: string;

  /**
   *
   */
  public constructor(type: string, nodeType: TransformNodeType)
  {
    this.nodeType = nodeType;
    this.type = type;
  }

  public init(): void
  {
    // todo
  }

  public accept<ReturnType>(visitor: TransformNodeVisitor<ReturnType>): ReturnType
  {
    switch (this.nodeType)
    {
      case TransformNodeType.LoadNode:
        return visitor.visitLoadNode(this as any as LoadNode);
      case TransformNodeType.StoreNode:
        return visitor.visitStoreNode(this as any as StoreNode);
      case TransformNodeType.PutNode:
        return visitor.visitPutNode(this as any as PutNode);
      case TransformNodeType.GetNode:
        return visitor.visitGetNode(this as any as GetNode);
      case TransformNodeType.SplitNode:
        return visitor.visitSplitNode(this as any as SplitNode);
      case TransformNodeType.JoinNode:
        return visitor.visitJoinNode(this as any as JoinNode);
      case TransformNodeType.FilterNode:
        return visitor.visitFilterNode(this as any as FilterNode);
      case TransformNodeType.DuplicateNode:
        return visitor.visitDuplicateNode(this as any as DuplicateNode);
      case TransformNodeType.RenameNode:
        return visitor.visitRenameNode(this as any as RenameNode);
      case TransformNodeType.PlusNode:
        return visitor.visitPlusNode(this as any as PlusNode);
      case TransformNodeType.PrependNode:
        return visitor.visitPrependNode(this as any as PrependNode);
      case TransformNodeType.AppendNode:
        return visitor.visitAppendNode(this as any as AppendNode);
      default:
        return visitor.visitTransformNode(this);
    }
  }

}

export default TransformNode;
