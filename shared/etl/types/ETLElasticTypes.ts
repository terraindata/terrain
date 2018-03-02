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
import * as _ from 'lodash';
import { FieldTypes } from 'shared/etl/types/ETLTypes';
// string values for this enum are how elastic expects them

export enum ElasticTypes
{
  Auto = 'auto', // this is not actually an elastic type
  Text = 'text',
  Long = 'long',
  Boolean = 'boolean',
  Date = 'date',
  Array = 'array',
  Nested = 'nested',
  Double = 'double',
  Short = 'short',
  Byte = 'byte',
  Integer = 'integer',
  HalfFloat = 'half_float',
  Float = 'float',
  GeoPoint = 'geo_point',
}

// field props for each transformation engine field
export interface ElasticFieldProps
{
  isAnalyzed: boolean;
  analyzer: string;
  elasticType: ElasticTypes;
  isPrimaryKey: boolean;
}

// compute smart defaults for a given props object and js field type. Could be undefined or empty
export function defaultProps(type: FieldTypes, obj: any = {}): ElasticFieldProps
{
  // in case the passed object is undefined or not an object
  const config = (obj == null || typeof obj !== 'object') ? {} : obj;
  return _.extend(
    {
      isAnalyzed: type === 'string',
      isPrimaryKey: false,
      analyzer: 'standard',
      elasticType: ElasticTypes.Auto,
    },
    config,
  );
}

export const JsToElasticOptions: {
  [k in FieldTypes]: ElasticTypes[]
} = {
  array: [ElasticTypes.Auto, ElasticTypes.Array],
  object: [ElasticTypes.Auto, ElasticTypes.Nested],
  string: [ElasticTypes.Auto, ElasticTypes.Text, ElasticTypes.Date, ElasticTypes.GeoPoint],
  number: [ElasticTypes.Auto, ElasticTypes.Double, ElasticTypes.Long, ElasticTypes.Short, ElasticTypes.Byte,
    ElasticTypes.Integer, ElasticTypes.HalfFloat, ElasticTypes.Float],
  boolean: [ElasticTypes.Auto, ElasticTypes.Boolean],
};

export function jsToElastic(type): ElasticTypes
{
  const eType = JsToElasticOptions[type][0];
  return eType !== undefined ? eType : ElasticTypes.Text;
}
