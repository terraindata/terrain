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

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import TypeUtil from 'shared/transformations/util/TypeUtil';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';

type SimpleType = ReturnType<typeof TypeUtil['getSimpleType']>;

/*
 *  Instances of this class accumulate values in order to provide a guess
 *  for what the best type is given the values seen.
 */
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
