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
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

/**
 * A visitor should be stateless; thus, visiting methods should be static.
 */
class TransformationNodeVisitor
{
  public static visit(node: TransformationNode, doc: object): TransformationVisitResult
  {
    const docCopy = doc; // Preserve original doc in case of errors that would mangle it
    switch (node.typeCode)
    {
      case TransformationNodeType.LoadNode:
        return TransformationNodeVisitor.visitLoadNode(node, docCopy);
      case TransformationNodeType.StoreNode:
        return TransformationNodeVisitor.visitStoreNode(node, docCopy);
      case TransformationNodeType.PutNode:
        return TransformationNodeVisitor.visitPutNode(node, docCopy);
      case TransformationNodeType.GetNode:
        return TransformationNodeVisitor.visitGetNode(node, docCopy);
      case TransformationNodeType.SplitNode:
        return TransformationNodeVisitor.visitSplitNode(node, docCopy);
      case TransformationNodeType.JoinNode:
        return TransformationNodeVisitor.visitJoinNode(node, docCopy);
      case TransformationNodeType.FilterNode:
        return TransformationNodeVisitor.visitFilterNode(node, docCopy);
      case TransformationNodeType.DuplicateNode:
        return TransformationNodeVisitor.visitDuplicateNode(node, docCopy);
      case TransformationNodeType.RenameNode:
        return TransformationNodeVisitor.visitRenameNode(node, docCopy);
      case TransformationNodeType.PlusNode:
        return TransformationNodeVisitor.visitPlusNode(node, docCopy);
      case TransformationNodeType.PrependNode:
        return TransformationNodeVisitor.visitPrependNode(node, docCopy);
      case TransformationNodeType.AppendNode:
        return TransformationNodeVisitor.visitAppendNode(node, docCopy);
      case TransformationNodeType.CapitalizeNode:
        return TransformationNodeVisitor.visitCapitalizeNode(node, docCopy);
      case TransformationNodeType.SubstringNode:
        return TransformationNodeVisitor.visitSubstringNode(node, docCopy);
      default:
        return {
          errors: [
            {
              message: `Attempted to visit an unsupported transformation node type: ${node.typeCode}`,
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
    }
  }

  public static visitLoadNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitStoreNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitPutNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitGetNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitSplitNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitJoinNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitFilterNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitDuplicateNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitRenameNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitPlusNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitPrependNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitAppendNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    return {} as TransformationVisitResult;
  }

  public static visitCapitalizeNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    for (const fieldID of node.fieldIDs)
    {
      if (typeof doc[fieldID] !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to capitalize a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      doc[fieldID] = doc[fieldID].toUpperCase();
    }

    return {
      document: doc,
    } as TransformationVisitResult;
  }

  public static visitSubstringNode(node: TransformationNode, doc: object): TransformationVisitResult
  {
    for (const fieldID of node.fieldIDs)
    {
      if (typeof doc[fieldID] !== 'string')
      {
        return {
          errors: [
            {
              message: 'Attempted to take a substring of a non-string field (this is not supported)',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      if (!node.meta.hasOwnProperty('from') || node.meta['from'] < 0)
      {
        return {
          errors: [
            {
              message: 'Substring node: "from" property is missing or invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      if (!node.meta.hasOwnProperty('length') || node.meta['length'] < 0)
      {
        return {
          errors: [
            {
              message: 'Substring node: "length" property is missing or invalid',
            } as TransformationVisitError,
          ],
        } as TransformationVisitResult;
      }
      // Currently assumes a single from and length for all fieldIDs
      doc[fieldID] = doc[fieldID].substr(node.meta['from'], node.meta['length']);
    }

    return {
      document: doc,
    } as TransformationVisitResult;
  }
}

export default TransformationNodeVisitor;
