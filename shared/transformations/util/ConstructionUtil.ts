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
// tslint:disable:max-classes-per-file

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;

import isPrimitive = require('is-primitive');

import TypeUtil from 'shared/etl/TypeUtil';
import { KeyPathUtil as PathUtil } from 'shared/util/KeyPath';

import
{
  DateFormats, FieldTypes, getJSFromETL, Languages,
} from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import * as TerrainLog from 'loglevel';

const etlTypeKeyPath = List(['etlType']);

type SimpleType = ReturnType<typeof TypeUtil['getSimpleType']>;

export class TypeTracker
{
  public static messageValueLength = 20;

  protected readonly path: KeyPath;
  protected readonly onConflict;
  protected readonly interpretStrings: boolean;

  protected valuesSeen = 0;
  protected lastValue: any;
  protected simpleType: SimpleType = 'null';
  protected type: FieldTypes = null;
  protected stringsWereChecked = false;
  protected numbersWereChecked = false;
  protected stringNumbersWereChecked = false;
  protected couldBeInt = true;
  protected couldBeDate = true;
  protected couldBeGeo = true;
  protected couldBeStringNumber = true;
  protected couldBeStringInteger = true;
  protected couldBeStringBoolean = true;
  protected wasCoerced = false; // if true, then plain string

  constructor(path: KeyPath, onConflict: (msg: string) => void = null, interpretStrings = false)
  {
    this.path = path;
    this.onConflict = onConflict;
    this.interpretStrings = interpretStrings;
  }

  public numSeen(): number
  {
    return this.valuesSeen;
  }

  public getType(): FieldTypes
  {
    if (this.wasCoerced)
    {
      return FieldTypes.String;
    }
    switch (this.simpleType)
    {
      case 'array':
        return FieldTypes.Array;
      case 'object':
        return FieldTypes.Object;
      case 'boolean':
        return FieldTypes.Boolean;
      case 'number':
        return (this.numbersWereChecked && this.couldBeInt) ? FieldTypes.Integer : FieldTypes.Number;
      case 'string':
        if (!this.stringsWereChecked)
        {
          return FieldTypes.String;
        }
        if (this.couldBeDate)
        {
          return FieldTypes.Date;
        }
        if (this.couldBeGeo)
        {
          return FieldTypes.GeoPoint;
        }
        if (this.interpretStrings)
        {
          if (this.couldBeStringNumber)
          {
            return (this.stringNumbersWereChecked && this.couldBeStringInteger) ? FieldTypes.Integer : FieldTypes.Number;
          }
          if (this.couldBeStringBoolean)
          {
            return FieldTypes.Boolean;
          }
        }
        return FieldTypes.String;
      default:
        return FieldTypes.String;
    }
  }

  public push(value: any)
  {
    this.simpleType = this.processType(value);
    this.lastValue = value;
    this.valuesSeen++;
  }

  protected processType(value: any): SimpleType
  {
    let baseType = TypeUtil.getSimpleType(value);
    baseType = this.mergeType(baseType, value);
    if (baseType === 'number')
    {
      return this.processNumber(value);
    }
    else if (baseType === 'string')
    {
      return this.processString(value);
    }
    else
    {
      return baseType;
    }
  }

  protected processString(value: string): SimpleType
  {
    if (value == null || value === '' || this.wasCoerced)
    {
      return 'string';
    }
    this.stringsWereChecked = true;
    if (this.couldBeDate)
    {
      this.couldBeDate = TypeUtil.isDateHelper(value);
    }
    if (this.couldBeGeo)
    {
      this.couldBeGeo = TypeUtil.isGeoHelper(value);
    }
    if (this.interpretStrings && this.couldBeStringNumber)
    {
      const asNumber = Number(value);
      if (isNaN(asNumber) && value !== 'NaN')
      {
        this.couldBeStringNumber = false;
      }
      else if (this.couldBeStringInteger && value !== 'NaN')
      {
        this.stringNumbersWereChecked = true;
        this.couldBeStringInteger = TypeUtil.numberIsInteger(asNumber);
      }
    }
    if (this.interpretStrings && this.couldBeStringBoolean)
    {
      this.couldBeStringBoolean = TypeUtil.isBooleanHelper(value);
    }
    return 'string';
  }

  protected processNumber(value: number): SimpleType
  {
    if (value == null || isNaN(value))
    {
      return 'number';
    }
    this.numbersWereChecked = true;
    if (this.couldBeInt)
    {
      this.couldBeInt = TypeUtil.numberIsInteger(value);
    }
    return 'number';
  }

  protected mergeType(type: SimpleType, value: any): SimpleType
  {
    if (type === 'null')
    {
      return this.simpleType;
    }
    else if (type === this.simpleType || this.simpleType === 'null')
    {
      return type;
    }
    else
    {
      this.pushConflict(type, value);
      this.wasCoerced = true;
      return 'string';
    }
  }

  protected pushConflict(type: SimpleType, value: any)
  {
    if (this.onConflict !== null)
    {
      this.onConflict(`Conflict between type '${type}' and type '${this.simpleType}' from values ` +
        `${this.formatMessageValue(value)} and ${this.formatMessageValue(this.lastValue)}`);
    }
  }

  protected formatMessageValue(value: any): string
  {
    const str = String(value);
    if (str.length > TypeTracker.messageValueLength)
    {
      return `"${str.slice(0, TypeTracker.messageValueLength)}..."`;
    }
    else
    {
      return `"${str}"`;
    }
  }
}

interface FieldNode
{
  path: KeyPath;
  name: WayPoint; // null if root
  type?: FieldTypes;
  arrChild?: FieldNode;
  fields: { [k: string]: FieldNode };
}

export default abstract class ConstructionUtil
{
  public static createEngineFromDocuments(documents: List<object>, interpretText = false):
    { engine: TransformationEngine, errors: string[] }
  {
    const pathTypes: { [k: string]: TypeTracker } = {};
    const errAccumulator = ConstructionUtil.errorAccumulator();
    documents.forEach((doc, docIndex) =>
    {
      for (const leaf of yadeep.traverse(doc, { primitivesOnly: true, arrayLimit: 20 }))
      {
        const { location, value } = leaf;
        const path = PathUtil.convertIndices(location);
        const hash = PathUtil.hash(path);
        if (pathTypes[hash] === undefined)
        {
          pathTypes[hash] = new TypeTracker(path, errAccumulator.fn, interpretText);
        }
        pathTypes[hash].push(value);
      }
    });

    const tree = ConstructionUtil.buildTreeFromPathTypes(pathTypes, errAccumulator.fn);

    const engine = new TransformationEngine();
    for (const match of yadeep.traverse(tree, { primitivesOnly: true }))
    {
      const { value, location } = match;
      if (location.last() === 'type')
      {
        const kp = yadeep.get(tree, location.set(-1, 'path'));
        const type = value;
        engine.addField(kp, getJSFromETL(type), { etlType: type });
      }
    }

    return {
      engine,
      errors: errAccumulator.errors,
    };
  }

  private static buildTreeFromPathTypes(pathTypes: { [k: string]: TypeTracker }, onConflict: (msg: string) => void): FieldNode
  {
    const tree: FieldNode = {
      path: KeyPath([]),
      name: null,
      fields: {},
    };

    const walk = (kp: KeyPath, desiredType: FieldTypes) =>
    {
      let node: FieldNode = tree;
      for (let i = 0; i < kp.size; i++)
      {
        const waypoint = kp.get(i);
        if (waypoint === -1)
        {
          if (node.type === undefined)
          {
            node.type = FieldTypes.Array;
          }
          if (node.type !== FieldTypes.Array)
          {
            const message = `Encountered a ${node.type} field where an array field was expected`;
            node.type = FieldTypes.String;
            node.arrChild = undefined;
            node.fields = {};
            return message;
          }
          else if (node.arrChild === undefined)
          {
            node.type = FieldTypes.Array;
            node.arrChild = {
              path: node.path.push(-1),
              name: -1,
              fields: {},
            };
            node = node.arrChild;
          }
          else
          {
            node = node.arrChild;
          }
        }
        else
        {
          if (node.type === undefined)
          {
            node.type = FieldTypes.Object;
          }
          if (node.type !== FieldTypes.Object)
          {
            const message = `Encountered a ${node.type} field where an object field was expected`;
            node.type = FieldTypes.String;
            node.arrChild = undefined;
            node.fields = {};
            return message;
          }
          else if (node.fields[waypoint] === undefined)
          {
            node.type = FieldTypes.Object;
            node.fields[waypoint] = {
              path: node.path.push(waypoint),
              name: waypoint,
              fields: {},
            };
            node = node.fields[waypoint];
          }
          else
          {
            node = node.fields[waypoint];
          }
        }
      }
      if (Object.keys(node.fields).length > 0 || node.arrChild !== undefined)
      {
        node.type = FieldTypes.String;
        node.fields = {};
        node.arrChild = undefined;
        return `Field with primitive type cannot be an array or object`;
      }
      else
      {
        node.type = desiredType;
      }
      return true;
    };

    for (const key of Object.keys(pathTypes))
    {
      const kp = PathUtil.unhash(key);
      const errors = walk(kp, pathTypes[key].getType());
      if (errors !== true)
      {
        onConflict(errors);
      }
    }
    return tree;
  }

  private static errorAccumulator(maxErrors: number = 5): { numErrors: number, errors: string[], fn: (err) => void }
  {
    const errors = [];
    let total = 0;
    return {
      errors,
      numErrors: total,
      fn: (err) =>
      {
        total++;
        if (errors.length <= maxErrors)
        {
          errors.push(err);
        }
      },
    };
  }
}
