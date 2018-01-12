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

import TransformNode from './TransformNode';

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
abstract class TransformNodeVisitor<ReturnType>
{
  public abstract visitTransformNode(node: TransformNode): ReturnType;

  public visitLoadNode(node: LoadNode): ReturnType { return this.visitTransformNode(node); }

  public visitStoreNode(node: StoreNode): ReturnType { return this.visitTransformNode(node); }

  public visitPutNode(node: PutNode): ReturnType { return this.visitTransformNode(node); }

  public visitGetNode(node: GetNode): ReturnType { return this.visitTransformNode(node); }

  public visitSplitNode(node: SplitNode): ReturnType { return this.visitTransformNode(node); }

  public visitJoinNode(node: JoinNode): ReturnType { return this.visitTransformNode(node); }

  public visitFilterNode(node: FilterNode): ReturnType { return this.visitTransformNode(node); }

  public visitDuplicateNode(node: DuplicateNode): ReturnType { return this.visitTransformNode(node); }

  public visitRenameNode(node: RenameNode): ReturnType { return this.visitTransformNode(node); }

  public visitPlusNode(node: PlusNode): ReturnType { return this.visitTransformNode(node); }

  public visitPrependNode(node: PrependNode): ReturnType { return this.visitTransformNode(node); }

  public visitAppendNode(node: AppendNode): ReturnType { return this.visitTransformNode(node); }
}

export default TransformNodeVisitor;
