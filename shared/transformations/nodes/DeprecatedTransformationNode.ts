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
import * as yadeep from 'yadeep';

const { List, Map } = Immutable;

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeInfo from 'shared/transformations/TransformationNodeInfo';

import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { KeyPath } from 'terrain-keypath';

import SimpleTransformationType from 'shared/transformations/types/SimpleTransformationType';

import dateFormat = require('date-format');

const TYPECODE = TransformationNodeType.DeprecatedNode;

export class DeprecatedTransformationNode extends SimpleTransformationType
{
  public readonly typeCode = TYPECODE;
  public readonly skipNulls = false;

  public shouldTransform(el: any)
  {
    const opts = this.meta as NodeOptionsType<typeof TYPECODE>;
    if (opts.deprecatedType === 'CastNode')
    {
      if (typeof el === opts.toTypename || el == null || (el.constructor === Array && opts.toTypename === 'array'))
      {
        return false;
      }
      else
      {
        return true;
      }
    }
    return false;
  }

  public transformer(el: any): any
  {
    const opts = this.meta as NodeOptionsType<typeof TYPECODE>;
    if (opts.deprecatedType === 'CastNode')
    {
      return this.castTransformer(el);
    }
    else
    {
      return el;
    }
  }

  public castTransformer(el: any)
  {
    const opts = this.meta as NodeOptionsType<typeof TYPECODE>;
    switch (opts.toTypename)
    {
      case 'string': {
        if (typeof el === 'object')
        {
          return JSON.stringify(el);
        }
        else
        {
          return el.toString();
        }
      }
      case 'number': {
        return Number(el);
      }
      case 'boolean': {
        if (typeof el === 'string')
        {
          return el.toLowerCase() === 'true';
        }
        else
        {
          return Boolean(el);
        }
      }
      case 'object': {
        if (typeof el === 'string')
        {
          try
          {
            const parsed = JSON.parse(el);
            return parsed;
          }
          catch (e)
          {
            return {};
          }
        }
        else
        {
          return {};
        }
      }
      case 'array': {
        if (typeof el === 'string')
        {
          try
          {
            const parsed = JSON.parse(el);
            if (!Array.isArray(parsed))
            {
              return [];
            }
            return parsed;
          }
          catch (e)
          {
            return [];
          }
        }
        else
        {
          return [el];
        }
      }
      case 'date': {
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
      default: {
        return null;
      }
    }
  }
}

class DeprecatedTransformationInfoC extends TransformationNodeInfo
{
  public readonly typeCode = TYPECODE;
  public humanName = 'Deprecated Transformation';
  public description = 'This Transformation Has Been Deprecated';
  public nodeClass = DeprecatedTransformationNode;

  public editable = false;
  public creatable = false;

  public shortSummary(meta: NodeOptionsType<typeof TYPECODE>)
  {
    if (meta.deprecatedType === 'CastNode')
    {
      return `Cast to ${meta.toTypename}`;
    }
  }
}

export const DeprecatedTransformationInfo = new DeprecatedTransformationInfoC();
