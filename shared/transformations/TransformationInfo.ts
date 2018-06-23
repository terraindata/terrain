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
import { ETLFieldTypes, FieldTypes } from 'shared/etl/types/ETLTypes';

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
import { RoundTransformationInfo, RoundTransformationNode } from './nodes/RoundTransformationNode';
import { SetIfTransformationInfo, SetIfTransformationNode } from './nodes/SetIfTransformationNode';
import { SplitTransformationInfo, SplitTransformationNode } from './nodes/SplitTransformationNode';
import { SubstringTransformationInfo, SubstringTransformationNode } from './nodes/SubstringTransformationNode';
import { SubtractTransformationInfo, SubtractTransformationNode } from './nodes/SubtractTransformationNode';
import { SumTransformationInfo, SumTransformationNode } from './nodes/SumTransformationNode';
import { ZipcodeTransformationInfo, ZipcodeTransformationNode } from './nodes/ZipcodeTransformationNode';

import TransformationNode from './nodes/TransformationNode';

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
  type: any;
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
        newFieldType: 'string',
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
          const etlType = EngineUtil.getETLFieldType(fieldId, engine);
          return (
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId)) &&
            etlType !== ETLFieldTypes.Object && etlType !== ETLFieldTypes.Array
          );
        },
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
      },
    [TransformationNodeType.CaseNode]:
      {
        humanName: 'Change Case',
        editable: true,
        creatable: true,
        description: 'Change case for text fields (e.g. lowercase, uppercase)',
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'string';
        },
        type: CaseTransformationNode,
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
      },
    [TransformationNodeType.RoundNode]:
      {
        humanName: 'Round',
        editable: true,
        creatable: true,
        description: 'Round this field to the specified number of decimals',
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'number';
        },
        shortSummary: (meta) =>
        {
          return `Round ${meta.shift}`;
        },
        type: RoundTransformationNode,
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
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        newFieldType: 'number',
      },
    [TransformationNodeType.ProductNode]:
      {
        humanName: 'Product of Fields',
        editable: false,
        creatable: true,
        description: `Multiplies two or more fields together and puts the result in a new field`,
        type: ProductTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'number' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        newFieldType: 'number',
      },
    [TransformationNodeType.QuotientNode]:
      {
        humanName: 'Quotient of Fields',
        editable: false,
        creatable: true,
        description: `Divides two fields and puts the result in a new field`,
        type: QuotientTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'number' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        newFieldType: 'number',
      },
    [TransformationNodeType.SumNode]:
      {
        humanName: 'Sum of Fields',
        editable: false,
        creatable: true,
        description: `Sums two or more fields and puts the result in a new field`,
        type: SumTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'number' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        newFieldType: 'number',
      },
    [TransformationNodeType.DifferenceNode]:
      {
        humanName: 'Difference of Fields',
        editable: false,
        creatable: true,
        description: `Subtracts one field from another and puts the result in a new field`,
        type: DifferenceTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'number' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        newFieldType: 'number',
      },
    [TransformationNodeType.EncryptNode]:
      {
        humanName: 'Encrypt',
        editable: true,
        creatable: true,
        description: `Encrypt a field using the secure AES algorithm`,
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'string';
        },
        type: EncryptTransformationNode,
      },
    [TransformationNodeType.DecryptNode]:
      {
        humanName: 'Decrypt',
        editable: true,
        creatable: true,
        description: `Decrypt a field that was previously encrypted with an Encrypt transformation`,
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'string';
        },
        type: DecryptTransformationNode,
      },
    [TransformationNodeType.GroupByNode]:
      {
        humanName: 'Group Array Values',
        editable: false,
        creatable: true,
        description: `Group an array of objects by a value`,
        type: GroupByTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'array' &&
            EngineUtil.getValueType(fieldId, engine) === 'object' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        newFieldType: 'array',
      },
    [TransformationNodeType.FilterArrayNode]:
      {
        humanName: 'Filter Array',
        editable: true,
        creatable: true,
        description: `Filter an array on its values`,
        type: FilterArrayTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'array' &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
        newFieldType: 'array',
      },
    [TransformationNodeType.RemoveDuplicatesNode]:
      {
        humanName: 'Remove Duplicates',
        editable: true,
        creatable: true,
        description: 'Remove Duplicate Values from an Array',
        type: RemoveDuplicatesTransformationNode,
        isAvailable: (engine, fieldId) =>
        {
          const valueType = EngineUtil.getValueType(fieldId, engine);
          return (
            EngineUtil.getRepresentedType(fieldId, engine) === 'array' &&
            (valueType === 'number' || valueType === 'string') &&
            EngineUtil.isNamedField(engine.getOutputKeyPath(fieldId))
          );
        },
      },
    [TransformationNodeType.ZipcodeNode]:
      {
        humanName: 'Zipcode',
        editable: true,
        creatable: true,
        description: 'Convert a zipcode into location data',
        isAvailable: (engine, fieldId) =>
        {
          return EngineUtil.getRepresentedType(fieldId, engine) === 'string';
        },
        type: ZipcodeTransformationNode,
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
}
