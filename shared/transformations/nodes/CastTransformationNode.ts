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
import * as yadeep from 'shared/util/yadeep';

const { List, Map } = Immutable;

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeInfo from 'shared/transformations/TransformationNodeInfo';

import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { KeyPath } from 'shared/util/KeyPath';

import SimpleTransformationType from 'shared/transformations/types/SimpleTransformationType';

import dateFormat = require('date-format');

const TYPECODE = TransformationNodeType.CastNode;

export class CastTransformationNode extends SimpleTransformationType
{
  public readonly typeCode = TYPECODE;
  public readonly skipNulls = false;

  public shouldTransform(el: any)
  {
    if (el == null)
    {
      return false;
    }
    else
    {
      return true;
    }
  }

  public transformer(el: any): any
  {
    const opts = this.meta as NodeOptionsType<typeof TYPECODE>;

    switch (opts.toTypename)
    {
      case FieldTypes.String:
        return this.castToString(el);
      case FieldTypes.Object:
        return this.castToObject(el);
      case FieldTypes.Array:
        return this.castToArray(el);
      case FieldTypes.Number:
        return this.castToNumber(el);
      case FieldTypes.Integer:
        return this.castToInteger(el);
      case FieldTypes.Boolean:
        return this.castToBoolean(el);
      case FieldTypes.Date:
        return this.castToDate(el);
      case FieldTypes.GeoPoint:
        return this.castToGeopoint(el);
      default:
        const assertUnreachable = (p: never) =>
        {
          throw new Error(`${p} is not a valid type cast`);
        };
        return assertUnreachable(opts.toTypename);
    }
  }

  public castToGeopoint(el: any): object
  {
    try
    {
      let geoPointObj = el;
      if (typeof el === 'string')
      {
        geoPointObj = JSON.parse(el);
      }
      const lat = Number(geoPointObj.lat);
      const lon = Number(geoPointObj.lon);
      if (isNaN(lat) || isNaN(lon))
      {
        return null;
      }
      return {
        lat,
        lon,
      };
    }
    catch (e)
    {
      return null;
    }
  }

  public castToDate(el: any): string
  {
    const opts = this.meta as NodeOptionsType<typeof TYPECODE>;
    try
    {
      if (opts.format === 'ISOstring')
      {
        return new Date(el).toISOString();
      }
      else if (opts.format === 'MMDDYYYY')
      {
        return dateFormat('MM/dd/yyyy', new Date(el));
      }
      else
      {
        return el;
      }
    }
    catch (ex)
    {
      return null;
    }
  }

  public castToNumber(el: any): number
  {
    return Number(el);
  }

  public castToInteger(el: any): number
  {
    return Number.parseInt(Number(el) as any, 10);
  }

  public castToBoolean(el: any): boolean
  {
    if (typeof el === 'string')
    {
      return el.toLowerCase() === 'true';
    }
    else
    {
      return Boolean(el);
    }
  }

  public castToString(el: any): string
  {
    if (typeof el === 'object')
    {
      return JSON.stringify(el);
    }
    else
    {
      return String(el);
    }
  }

  public castToArray(el: any): any[]
  {
    if (Array.isArray(el))
    {
      return el;
    }
    else
    {
      return [];
    }
  }

  public castToObject(el: any): object
  {
    if (typeof el !== 'object' || Array.isArray(el))
    {
      return {};
    }
    else
    {
      return el;
    }
  }
}

class CastTransformationInfoC extends TransformationNodeInfo
{
  public readonly typeCode = TYPECODE;
  public humanName = 'Cast';
  public description = 'Convert this field to a different type';
  public nodeClass = CastTransformationNode;

  public editable = false;
  public creatable = true;

  public shortSummary(meta: NodeOptionsType<typeof TYPECODE>)
  {
    return `Cast to ${meta.toTypename}`;
  }

  public computeNewSourceType(engine?, node?, index?)
  {
    const opts = node.meta as NodeOptionsType<typeof TYPECODE>;
    return opts.toTypename;
  }
}

export const CastTransformationInfo = new CastTransformationInfoC();
