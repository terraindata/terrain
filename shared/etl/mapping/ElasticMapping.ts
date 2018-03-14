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

// tslint:disable:max-classes-per-file strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
const { List, Map } = Immutable;

// import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { ElasticTypes, ElasticFieldProps, defaultProps, JsAutoMap } from 'shared/etl/types/ETLElasticTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { Languages, FieldTypes } from 'shared/etl/types/ETLTypes';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';
import { isNamedField, isWildcardField } from 'shared/transformations/util/EngineUtil';

class ElasticMapping
{
  private errors: string[];
  private engine: TransformationEngine;

  constructor(engine: TransformationEngine)
  {
    this.errors = [];
    this.engine = engine;
  }

  public getArrayConfig(elasticProps: ElasticFieldProps, valueType?: FieldTypes)
  {
    const elasticType = JsAutoMap[valueType];
    if (elasticType === ElasticTypes.Text)
    {
      return this.getTextConfig(elasticProps);
    }
    else
    {
      return {
        type: elasticType
      }
    }
  }

  public getTextConfig(elasticProps: ElasticFieldProps)
  {
    return {
      type: elasticProps.isAnalyzed ? 'text' : 'keyword',
      index: true,
      fields:
        {
          keyword: elasticProps.isAnalyzed ?
            {
              type: 'keyword',
              index: elasticProps.isAnalyzed
            }
            :
            {
              type: 'keyword',
              index: true,
              ignore_above: 256
            },
        },
      analyzer: elasticProps.analyzer,
    };
  }

  public getTypeConfig(fieldID: number): object | null
  {
    const elasticProps = this.getElasticProps(fieldID);
    const valueType = this.getValueType(fieldID);

    const jsType = this.engine.getFieldType(fieldID);
    const elasticType = elasticProps.elasticType === ElasticTypes.Auto ?
      JsAutoMap[jsType]
      :
      elasticProps.elasticType;

    switch (elasticType)
    {
      case ElasticTypes.Text:
        return this.getTextConfig(elasticProps)
      case ElasticTypes.Array:
        return this.getArrayConfig(elasticProps, valueType);
      case ElasticTypes.Nested:
        return {
          type: ElasticTypes.Nested,
        }
      default:
        return {
          type: elasticType
        }
    }
  }

  // converts engine keypaths to keypaths in the elastic mapping
  // e.g. ['foo', 'bar'] to ['properties', 'foo', 'properties', 'bar']
  // e.g. ['foo', '0', 'bar'] to ['properties', 'foo', 'properties', 'bar']
  // e.g. ['foo', '*'] to ['properties', 'foo']
  public enginePathToMappingPath(path: EnginePath): EnginePath
  {
    return path.flatMap(
      (value, i) => isNamedField(path, i) ? ['properties', value] : []
    ).toList() as EnginePath;
  }

  public getValueType(fieldID: number): FieldTypes
  {
    return this.engine.getFieldProp(fieldID, valueTypePath) as FieldTypes;
  }

  public getElasticProps(fieldID: number): ElasticFieldProps
  {
    const props: Partial<ElasticFieldProps> = this.engine.getFieldProp(fieldID, elasticPropPath);
    return defaultProps(props);
  }

  public createElasticMapping()
  {
    const mapping = {};
    const ids = this.engine.getAllFieldIDs;

  }
}

const elasticPropPath = EnginePath([Languages.Elastic]);
const valueTypePath = EnginePath(['valueType']);

export function createElasticMapping(engine: TransformationEngine)
{

}