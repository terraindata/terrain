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

// Copyright 2017 Terrain Data, Inc.
// tslint:disable:max-line-length

import * as _ from 'lodash';

export default class TypeUtil
{
  public static isNullHelper(value: string): boolean
  {
    return value === null || value === undefined || value === '' || value === 'null' || value === 'undefined';
  }

  public static isBooleanHelper(value: string): boolean
  {
    let parsedValue: any;
    try
    {
      parsedValue = JSON.parse(value);
    }
    catch (e)
    {
      return false;
    }
    return parsedValue === false || parsedValue === true;
  }

  public static isDateHelper(value: string): boolean
  {
    const MMDDYYYYRegex = new RegExp(/^((0?[1-9]|1[0,1,2])\/(0?[1-9]|[1,2][0-9]|3[0,1])\/([0-9]{4}))$/);
    const YYYYMMDDRegex = new RegExp(/([0-9]{4}-[0,1]{1}[0-9]{1}-[0-3]{1}[0-9]{1})/);
    const ISORegex = new RegExp(/^([0-9]{4})-([0,1]{1}[0-9]{1})-([0-3]{1}[0-9]{1})( |T){0,1}([0-2]{1}[0-9]{1}):{0,1}([0-5]{1}[0-9]{1}):{0,1}([0-9]{2})(\.([0-9]{3,6})|((-|\+)?[0-9]{2}:[0-9]{2}))?Z?$/);
    return MMDDYYYYRegex.test(value) || YYYYMMDDRegex.test(value) || ISORegex.test(value);
  }

  public static isDoubleHelper(value: string): boolean
  {
    const parsedValue: number | boolean = TypeUtil.getDoubleFromString(value);
    return (typeof parsedValue) === 'number';
  }

  public static isIntHelper(value: string): boolean
  {
    const parsedValue: number | boolean = TypeUtil.getDoubleFromString(value);
    // return ((typeof parsedValue) === 'number') && Number.isInteger(parsedValue as number);
    return ((typeof parsedValue) === 'number') && (value.indexOf('.') === -1);
  }

  public static getDoubleFromString(value: string): number | boolean
  {
    const parsedValue: number | boolean = TypeUtil._getDoubleFromStringHelper(value);
    if (typeof parsedValue === 'number')
    {
      return parsedValue;
    }
    if (value.charAt(0) === '$')
    {
      const dollarValue: number | boolean = TypeUtil._getDoubleFromStringHelper(value.substring(1));
      if (typeof dollarValue === 'number')
      {
        return dollarValue;
      }
    }
    if (value.charAt(value.length - 1) === '%')
    {
      const percentValue: number | boolean = TypeUtil._getDoubleFromStringHelper(value.substring(0, value.length - 1));
      if (typeof percentValue === 'number')
      {
        return percentValue / 100;
      }
    }
    return false;
  }

  // accounts for numbers with commas, e.g., "1,105.20"
  private static _getDoubleFromStringHelper(value: string): number | boolean
  {
    const parsedValue: number = Number(value);
    if (!isNaN(parsedValue))
    {
      return parsedValue;
    }
    let decimalInd: number = value.indexOf('.');
    decimalInd = decimalInd === -1 ? value.length : decimalInd;
    let ind = decimalInd - 4;
    while (ind > 0)
    {
      if (value.charAt(ind) === ',')
      {
        value = value.substring(0, ind) + value.substring(ind + 1);
        ind -= 4;
      }
      else
      {
        return false;
      }
    }
    const noCommaValue: number = Number(value);
    if (!isNaN(noCommaValue))
    {
      return noCommaValue;
    }
    return false;
  }
}
