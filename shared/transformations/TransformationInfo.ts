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

import DuplicateTransformationNode from './nodes/DuplicateTransformationNode';
import FilterTransformationNode from './nodes/FilterTransformationNode';
import InsertTransformationNode from './nodes/InsertTransformationNode';
import JoinTransformationNode from './nodes/JoinTransformationNode';
import SplitTransformationNode from './nodes/SplitTransformationNode';
import SubstringTransformationNode from './nodes/SubstringTransformationNode';
import TransformationNode from './nodes/TransformationNode';
import UppercaseTransformationNode from './nodes/UppercaseTransformationNode';
import { TransformationEngine } from './TransformationEngine';
import TransformationNodeType from './TransformationNodeType';
import TransformationNodeVisitor from './TransformationNodeVisitor';
import TransformationVisitResult from './TransformationVisitResult';

type AllNodeInfoType =
  {
    [K in TransformationNodeType]: InfoType
  };

export interface InfoType
{
  humanName: string; // something we can read
  editable?: boolean; // is it editable after creation
  creatable?: boolean; // can it created by the user?
  description?: string; // description of what the transformation does
  isAvailable?: (engine: TransformationEngine, fieldId: number) => boolean;
  type?: any;
  targetedVisitor: (visitor: TransformationNodeVisitor,
    transformationNode: TransformationNode,
    docCopy: object,
    options: object) => TransformationVisitResult;
}

const TransformationNodeInfo: AllNodeInfoType =
  {
    [TransformationNodeType.SplitNode]:
      {
        humanName: 'Split Field',
        editable: false,
        creatable: true,
        description: 'Split this field into 2 or more fields',
        type: SplitTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitSplitNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.JoinNode]:
      {
        humanName: 'Join Field',
        editable: false,
        creatable: true,
        description: 'Join this field with another field',
        type: JoinTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitJoinNode(transformationNode, docCopy, options),

      },
    [TransformationNodeType.FilterNode]: // what does this do?
      {
        humanName: 'Filter',
        editable: true,
        creatable: true,
        description: '???',
        type: FilterTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitFilterNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.DuplicateNode]:
      {
        humanName: 'Duplicate',
        editable: false,
        creatable: true,
        description: 'Duplicate this field',
        type: DuplicateTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitDuplicateNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.InsertNode]:
      {
        humanName: 'Insert String',
        editable: true,
        creatable: true,
        description: `Insert a string at a given position in this field's value`,
        type: InsertTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitInsertNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.UppercaseNode]:
      {
        humanName: 'Uppercase',
        editable: true,
        creatable: true,
        description: 'Make all the text in this field uppercase',
        isAvailable: (engine, fieldId) =>
        {
          return engine.getFieldType(fieldId) === 'string';
        },
        type: UppercaseTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitUppercaseNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.SubstringNode]:
      {
        humanName: 'Substring',
        editable: true,
        creatable: true,
        description: `Extract a piece from this field's text`,
        isAvailable: (engine, fieldId) =>
        {
          return engine.getFieldType(fieldId) === 'string';
        },
        type: SubstringTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitSubstringNode(transformationNode, docCopy, options),
      },
  };

export abstract class TransformationInfo
{
  public static getReadableName(type: TransformationNodeType)
  {
    return TransformationNodeInfo[type].humanName;
  }

  public static getDescription(type: TransformationNodeType)
  {
    return TransformationNodeInfo[type].description;
  }

  public static getInfo(type: TransformationNodeType): InfoType // get the whole info object
  {
    return TransformationNodeInfo[type];
  }

  public static getType(type: TransformationNodeType): any
  {
    return TransformationNodeInfo[type].type;
  }

  public static applyTargetedVisitor(visitor: TransformationNodeVisitor,
    transformationNode: TransformationNode,
    docCopy: object,
    options: object = {}): TransformationVisitResult
  {
    return TransformationNodeInfo[transformationNode.typeCode].targetedVisitor(
      visitor,
      transformationNode,
      docCopy,
      options,
    );
  }
}
