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
import Utils from 'shared/etl/util/XYZUtil';

import
{
  DateFormats, ETLFieldTypes, ETLToJSType, FieldTypes, getJSFromETL, JSToETLType, Languages, validJSTypes,
} from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import * as TerrainLog from 'loglevel';

export interface PathHashMap<T>
{
  [k: string]: T;
}
const etlTypeKeyPath = List(['etlType']);

type SimpleType = ReturnType<typeof Utils['type']['getSimpleType']>;

export class TypeTracker
{
  public static messageValueLength = 20;

  protected readonly path: KeyPath;
  protected readonly onConflict;
  protected readonly interpretStrings: boolean;

  protected lastValue: any;
  protected simpleType: SimpleType = 'null';
  protected type: ETLFieldTypes = null;
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

  public getType(): ETLFieldTypes
  {
    if (this.wasCoerced)
    {
      return ETLFieldTypes.String;
    }
    switch (this.simpleType)
    {
      case 'array':
        return ETLFieldTypes.Array;
      case 'object':
        return ETLFieldTypes.Object;
      case 'boolean':
        return ETLFieldTypes.Boolean;
      case 'number':
        return (this.numbersWereChecked && this.couldBeInt) ? ETLFieldTypes.Integer : ETLFieldTypes.Number;
      case 'string':
        if (!this.stringsWereChecked)
        {
          return ETLFieldTypes.String;
        }
        if (this.couldBeDate)
        {
          return ETLFieldTypes.Date;
        }
        if (this.couldBeGeo)
        {
          return ETLFieldTypes.GeoPoint;
        }
        if (this.interpretStrings)
        {
          if (this.couldBeStringNumber)
          {
            return (this.stringNumbersWereChecked && this.couldBeStringInteger) ? ETLFieldTypes.Integer : ETLFieldTypes.Number;
          }
          if (this.couldBeStringBoolean)
          {
            return ETLFieldTypes.Boolean;
          }
        }
        return ETLFieldTypes.String;
      default:
        return ETLFieldTypes.String;
    }
  }

  public push(value: any)
  {
    this.simpleType = this.processType(value);
    this.lastValue = value;
  }

  protected processType(value: any): SimpleType
  {
    let baseType = Utils.type.getSimpleType(value);
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
      this.couldBeDate = Utils.type.isDateHelper(value);
    }
    if (this.couldBeGeo)
    {
      this.couldBeGeo = Utils.type.isGeoHelper(value);
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
        this.couldBeStringInteger = Utils.type.numberIsInteger(asNumber);
      }
    }
    if (this.interpretStrings && this.couldBeStringBoolean)
    {
      this.couldBeStringBoolean = Utils.type.isBooleanHelper(value);
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
      this.couldBeInt = Utils.type.numberIsInteger(value);
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

export default abstract class ConstructionUtil
{
  public static createEngineFromDocuments(documents: List<object>)
  {
    const pathTypes: PathHashMap<TypeTracker> = {};

    documents.forEach((doc, docIndex) => {
      for (const leaf of yadeep.postorder(doc))
      {
        const { location, value } = leaf;
        const path = Utils.path.convertIndices(location);
        const hash = Utils.path.hash(path);
        if (pathTypes[hash] === undefined)
        {
          pathTypes[hash] = new TypeTracker(path);
        }
        pathTypes[hash].push(value);
      }
    });

  }
}
