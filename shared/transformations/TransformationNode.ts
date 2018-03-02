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

import TransformationNodeType from './TransformationNodeType';
import TransformationNodeVisitor from "sharedtransformations/TransformationNodeVisitor";
import TransformationVisitResult from "sharedtransformations/TransformationVisitResult";
import LoadNodeVisitor from "sharedtransformations/visitors/LoadNodeVisitor";
import SplitNodeVisitor from "sharedtransformations/visitors/SplitNodeVisitor";
import FilterNodeVisitor from "sharedtransformations/visitors/FilterNodeVisitor";
import TransformationVisitError from "sharedtransformations/TransformationVisitError";
import PrependNodeVisitor from "sharedtransformations/visitors/PrependNodeVisitor";
import PutNodeVisitor from "sharedtransformations/visitors/PutNodeVisitor";
import GetNodeVisitor from "sharedtransformations/visitors/GetNodeVisitor";
import AppendNodeVisitor from "sharedtransformations/visitors/AppendNodeVisitor";
import StoreNodeVisitor from "sharedtransformations/visitors/StoreNodeVisitor";
import DuplicateNodeVisitor from "sharedtransformations/visitors/DuplicateNodeVisitor";
import PlusNodeVisitor from "sharedtransformations/visitors/PlusNodeVisitor";
import SubstringNodeVisitor from "sharedtransformations/visitors/SubstringNodeVisitor";
import UppercaseNodeVisitor from "sharedtransformations/visitors/UppercaseNodeVisitor";
import JoinNodeVisitor from "sharedtransformations/visitors/JoinNodeVisitor";

export class TransformationNode
{
  public id: number;
  public typeCode: TransformationNodeType;
  public fieldIDs: List<number>;
  public meta: object;

  constructor(id: number, typeCode: TransformationNodeType, fieldIDs: List<number>, options?: object)
  {
    this.id = id;
    this.typeCode = typeCode;
    this.fieldIDs = fieldIDs;
    this.meta = options;
  }

  public accept(visitor: TransformationNodeVisitor, doc: object): TransformationVisitResult
  {
      const docCopy = Object.assign({}, doc); // Preserve original doc in case of errors that would mangle it
      switch (this.typeCode)
      {
          case TransformationNodeType.LoadNode:
              return visitor.visitLoadNode(this, docCopy);
          case TransformationNodeType.StoreNode:
              return visitor.visitStoreNode(this, docCopy);
          case TransformationNodeType.PutNode:
              return visitor.visitPutNode(this, docCopy);
          case TransformationNodeType.GetNode:
              return visitor.visitGetNode(this, docCopy);
          case TransformationNodeType.SplitNode:
              return visitor.visitSplitNode(this, docCopy);
          case TransformationNodeType.JoinNode:
              return visitor.visitJoinNode(this, docCopy);
          case TransformationNodeType.FilterNode:
              return visitor.visitFilterNode(this, docCopy);
          case TransformationNodeType.DuplicateNode:
              return visitor.visitDuplicateNode(this, docCopy);
          case TransformationNodeType.PlusNode:
              return visitor.visitPlusNode(this, docCopy);
          case TransformationNodeType.PrependNode:
              return visitor.visitPrependNode(this, docCopy);
          case TransformationNodeType.AppendNode:
              return visitor.visitAppendNode(this, docCopy);
          case TransformationNodeType.UppercaseNode:
              return visitor.visitUppercaseNode(this, docCopy);
          case TransformationNodeType.SubstringNode:
              return visitor.visitSubstringNode(this, docCopy);
          default:
              return {
                  errors: [
                      {
                          message: `Attempted to visit an unsupported transformation node type: ${this.typeCode}`,
                      } as TransformationVisitError,
                  ],
              } as TransformationVisitResult;
      }
  }
}

export default TransformationNode;
