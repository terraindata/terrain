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

import * as winston from 'winston';
import { TransformationNode } from './TransformationNode';
import TransformationNodeType from './TransformationNodeType';

/**
 *
 */
abstract class TransformationNodeVisitor<ReturnType>
{
  public visit(node: TransformationNode, doc: object): ReturnType
  {
    switch (node.typeCode)
    {
      case TransformationNodeType.LoadNode:
        return this.visitLoadNode(node, doc);
      case TransformationNodeType.StoreNode:
        return this.visitStoreNode(node, doc);
      case TransformationNodeType.PutNode:
        return this.visitPutNode(node, doc);
      case TransformationNodeType.GetNode:
        return this.visitGetNode(node, doc);
      case TransformationNodeType.SplitNode:
        return this.visitSplitNode(node, doc);
      case TransformationNodeType.JoinNode:
        return this.visitJoinNode(node, doc);
      case TransformationNodeType.FilterNode:
        return this.visitFilterNode(node, doc);
      case TransformationNodeType.DuplicateNode:
        return this.visitDuplicateNode(node, doc);
      case TransformationNodeType.RenameNode:
        return this.visitRenameNode(node, doc);
      case TransformationNodeType.PlusNode:
        return this.visitPlusNode(node, doc);
      case TransformationNodeType.PrependNode:
        return this.visitPrependNode(node, doc);
      case TransformationNodeType.AppendNode:
        return this.visitAppendNode(node, doc);
      case TransformationNodeType.CapitalizeNode:
        return this.visitCapitalizeNode(node, doc);
      default:
        winston.error(`Attempted to visit an unsupported transformation node type: ${node.typeCode}`);
        break;
    }
  }

  public visitLoadNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitStoreNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitPutNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitGetNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitSplitNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitJoinNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitFilterNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitDuplicateNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitRenameNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitPlusNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitPrependNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitAppendNode(node: TransformationNode, doc: object): ReturnType
  {
    return ReturnType();
  }

  public visitCapitalizeNode(node: TransformationNode, doc: object): ReturnType
  {
    for (const fieldID of node.fieldIDs)
    {
      if (typeof doc[fieldID] !== 'string')
      {
        // TODO return error object
      }
      doc[fieldID] = doc[fieldID].toUpperCase();
    }

    return {
      document: doc,
    };
  }
}

export default TransformationNodeVisitor;
