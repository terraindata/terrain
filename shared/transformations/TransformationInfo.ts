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
import DivideTransformationNode from 'shared/transformations/nodes/DivideTransformationNode';
import FindReplaceTransformationNode from 'shared/transformations/nodes/FindReplaceTransformationNode';
import HashTransformationNode from 'shared/transformations/nodes/HashTransformationNode';
import MultiplyTransformationNode from 'shared/transformations/nodes/MultiplyTransformationNode';
import SetIfTransformationNode from 'shared/transformations/nodes/SetIfTransformationNode';
import SubtractTransformationNode from 'shared/transformations/nodes/SubtractTransformationNode';
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
import { TransformationEngine } from './TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from './TransformationNodeType';
import TransformationNodeVisitor from './TransformationNodeVisitor';
import TransformationVisitResult from './TransformationVisitResult';
import EngineUtil from './util/EngineUtil';

type AllNodeInfoType =
  {
    [K in TransformationNodeType]: InfoType<K>
  };

export interface InfoType<T extends TransformationNodeType = any>
{
  humanName: string; // something we can read
  editable?: boolean; // is it editable after creation
  creatable?: boolean; // can it created by the user?
  description?: string; // description of what the transformation does
  isAvailable?: (engine: TransformationEngine, fieldId: number) => boolean;
  shortSummary?: (meta: NodeOptionsType<T>) => string;
  type?: any;
  targetedVisitor: (visitor: TransformationNodeVisitor,
    transformationNode: TransformationNode,
    docCopy: object,
    options: object) => TransformationVisitResult;
  newFieldType?: string;
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
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'string' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        shortSummary: (meta) =>
        {
          const names = meta.newFieldKeyPaths.map((value) => value.last());
          return `Split on ${meta.delimiter} into ${names.toJS()}`;
        },
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitSplitNode(transformationNode, docCopy, options),
        newFieldType: 'string',
      },
    [TransformationNodeType.JoinNode]:
      {
        humanName: 'Join Field',
        editable: false,
        creatable: true,
        description: 'Join this field with another field',
        type: JoinTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'string' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        shortSummary: (meta) =>
        {
          const names = meta.newFieldKeyPaths.map((value) => value.last());
          return `Join on ${meta.delimiter} from ${names.toJS()}`;
        },
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitJoinNode(transformationNode, docCopy, options),
        newFieldType: 'string',
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
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitDuplicateNode(transformationNode, docCopy, options),
        newFieldType: 'same',
      },
    [TransformationNodeType.InsertNode]:
      {
        humanName: 'Append / Prepend',
        editable: true,
        creatable: true,
        description: `Append, Prepend, or Insert Text`,
        type: InsertTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'string';
        },
        shortSummary: (meta) =>
        {
          if (meta.at === -1)
          {
            return 'Append Text';
          }
          else if (meta.at === 0)
          {
            return 'Prepend Text';
          }
          else
          {
            return `Insert Text at Position ${meta.at}`;
          }
        },
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
          return EngineUtil.getRepresentedType(fieldId, engine) === 'string';
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
          return EngineUtil.getRepresentedType(fieldId, engine) === 'string';
        },
        shortSummary: (meta) =>
        {
          return `Substring from ${meta.from} to ${meta.from + meta.length}`;
        },
        type: SubstringTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitSubstringNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.CastNode]:
      {
        humanName: 'Cast',
        editable: true,
        creatable: true,
        description: `Convert this field to a different type`,
        type: CastTransformationNode,
        shortSummary: (meta) =>
        {
          return `Cast to ${meta.toTypename}`;
        },
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitCastNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.HashNode]:
      {
        humanName: 'Hash',
        editable: true,
        creatable: true,
        description: `Hash this field using SHA3/Keccak256`,
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'string';
        },
        shortSummary: (meta) =>
        {
          return `Hash with salt "${meta.salt}`;
        },
        type: HashTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitHashNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.AddNode]:
      {
        humanName: 'Add',
        editable: true,
        creatable: true,
        description: 'Add a constant number to this field',
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'number';
        },
        shortSummary: (meta) =>
        {
          return `Add ${meta.shift}`;
        },
        type: AddTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitAddNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.SubtractNode]:
      {
        humanName: 'Subtract',
        editable: true,
        creatable: true,
        description: 'Subtract a constant number from this field',
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'number';
        },
        shortSummary: (meta) =>
        {
          return `Subtract ${meta.shift}`;
        },
        type: SubtractTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitSubtractNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.MultiplyNode]:
      {
        humanName: 'Multiply',
        editable: true,
        creatable: true,
        description: 'Multiply this field by a constant factor',
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'number';
        },
        shortSummary: (meta) =>
        {
          return `Multiply by ${meta.factor}`;
        },
        type: MultiplyTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitMultiplyNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.DivideNode]:
      {
        humanName: 'Divide',
        editable: true,
        creatable: true,
        description: 'Divide this field by a constant number',
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'number';
        },
        shortSummary: (meta) =>
        {
          return `Divide by ${meta.factor}`;
        },
        type: DivideTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitDivideNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.SetIfNode]:
      {
        humanName: 'Set If',
        editable: true,
        creatable: true,
        description: 'Checks if a field matches a certain special value, and if so, replaces that value',
        isAvailable: (engine, fieldId) =>
        {
          const type = EngineUtil.getRepresentedType(fieldId, engine);
          return type === 'number' || type === 'string' || type === 'boolean';
        },
        type: SetIfTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitSetIfNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.FindReplaceNode]:
      {
        humanName: 'Find/Replace',
        editable: true,
        creatable: true,
        description: 'Finds and replaces certain patterns of characters in a string',
        isAvailable: (engine, fieldId) =>
        {
          const type = EngineUtil.getRepresentedType(fieldId, engine);
          return type === 'string';
        },
        type: FindReplaceTransformationNode,
        targetedVisitor: (visitor: TransformationNodeVisitor,
          transformationNode: TransformationNode,
          docCopy: object,
          options: object) =>
          visitor.visitFindReplaceNode(transformationNode, docCopy, options),
      },
    [TransformationNodeType.ArraySumNode]:
      {
        humanName: 'Array Sum',
        editable: false,
        creatable: true,
        description: `Sum the entries of an array`,
        type: ArraySumTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'array' &&
            EngineUtil.getValueType(fieldId, engine) === 'number' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        targetedVisitor: (visitor: TransformationNodeVisitor,
                          transformationNode: TransformationNode,
                          docCopy: object,
                          options: object) =>
          visitor.visitArraySumNode(transformationNode, docCopy, options),
        newFieldType: 'number',
      },
    [TransformationNodeType.ArrayCountNode]:
      {
        humanName: 'Array Count',
        editable: false,
        creatable: true,
        description: `Counts how many elements are in an array`,
        type: ArrayCountTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'array' &&
            EngineUtil.getValueType(fieldId, engine) === 'number' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        targetedVisitor: (visitor: TransformationNodeVisitor,
                          transformationNode: TransformationNode,
                          docCopy: object,
                          options: object) =>
          visitor.visitArrayCountNode(transformationNode, docCopy, options),
        newFieldType: 'number',
      },
  };

export type TNodeObject = Pick<TransformationNode, 'fields' | 'meta'>;

export abstract class TransformationInfo
{
  public static getReadableName(type: TransformationNodeType)
  {
    return TransformationNodeInfo[type].humanName;
  }

  public static getReadableSummary(type: TransformationNodeType, transformation: TNodeObject): string
  {
    const getSummary = TransformationNodeInfo[type].shortSummary;
    if (getSummary !== undefined)
    {
      try
      {
        return (getSummary as any)(transformation.meta);
      }
      catch (e)
      {
        return TransformationInfo.getReadableName(type);
      }
    }
    else
    {
      return TransformationInfo.getReadableName(type);
    }
  }

  public static getDescription(type: TransformationNodeType)
  {
    return TransformationNodeInfo[type].description;
  }

  public static getInfo(type: TransformationNodeType): InfoType // get the whole info object
  {
    return TransformationNodeInfo[type];
  }

  public static isAvailable(type: TransformationNodeType, engine: TransformationEngine, field: number)
  {
    const info = TransformationNodeInfo[type];
    if (info.isAvailable === undefined)
    {
      return true;
    }
    else
    {
      return info.isAvailable(engine, field);
    }
  }

  public static canCreate(type: TransformationNodeType): boolean
  {
    return TransformationNodeInfo[type].creatable;
  }

  public static canEdit(type: TransformationNodeType): boolean
  {
    return TransformationNodeInfo[type].editable;
  }

  public static getType(type: TransformationNodeType): any
  {
    return TransformationNodeInfo[type].type;
  }

  public static getNewFieldType(type: TransformationNodeType): any
  {
    return TransformationNodeInfo[type].newFieldType;
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
