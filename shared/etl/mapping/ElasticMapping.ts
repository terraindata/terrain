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
import { defaultProps, ElasticFieldProps, ElasticTypes, JsAutoMap } from 'shared/etl/types/ETLElasticTypes';
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { hashPath, isNamedField, isWildcardField, PathHashMap } from 'shared/transformations/util/EngineUtil';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

interface TypeConfig
{
  type: string;
  index?: boolean;
  fields?: {
    keyword: {
      type: 'keyword';
      index: boolean;
      ignore_above?: number;
    },
  };
  analyzer?: string;
}

interface MappingType {
  properties?: {
    [k: string]: {
      properties?: MappingType['properties'],
    } & TypeConfig,
  };
}

export class ElasticMapping
{
  private errors: string[] = [];
  private pathSchema: PathHashMap<{
    type: ElasticTypes,
    analyzer: string,
  }> = {};
  private engine: TransformationEngine;
  private mapping: MappingType = {};

  constructor(engine: TransformationEngine)
  {
    this.engine = engine;
    this.createElasticMapping();
  }

  public getTextConfig(elasticProps: ElasticFieldProps): TypeConfig
  {
    return {
      type: elasticProps.isAnalyzed ? 'text' : 'keyword',
      index: true,
      fields:
        {
          keyword: elasticProps.isAnalyzed ?
            {
              type: 'keyword',
              index: elasticProps.isAnalyzed,
            }
            :
            {
              type: 'keyword',
              index: true,
              ignore_above: 256,
            },
        },
      analyzer: elasticProps.analyzer,
    };
  }

  public getTypeConfig(fieldID: number): TypeConfig | null
  {
    const elasticProps = this.getElasticProps(fieldID);
    const valueType = this.getValueType(fieldID);

    const jsType = this.getRepresentedType(fieldID);
    const elasticType = elasticProps.elasticType === ElasticTypes.Auto ?
      JsAutoMap[jsType]
      :
      elasticProps.elasticType;

    switch (elasticType)
    {
      case ElasticTypes.Text:
        return this.getTextConfig(elasticProps);
      case ElasticTypes.Array:
        return null;
      case ElasticTypes.Nested:
        return {
          type: ElasticTypes.Nested,
        };
      default:
        return {
          type: elasticType,
        };
    }
  }

  public getRepresentedType(fieldID: number): FieldTypes
  {
    const kp = this.engine.getOutputKeyPath(fieldID);
    if (isWildcardField(kp))
    {
      return this.getValueType(fieldID);
    }
    else
    {
      return this.engine.getFieldType(fieldID) as FieldTypes;
    }
  }

  // converts engine keypaths to keypaths in the elastic mapping
  // e.g. ['foo', 'bar'] to ['properties', 'foo', 'properties', 'bar']
  // e.g. ['foo', '0', 'bar'] to ['properties', 'foo', 'properties', 'bar']
  // e.g. ['foo', '*'] to ['properties', 'foo']
  public enginePathToMappingPath(path: EnginePath): EnginePath
  {
    return path.flatMap(
      (value, i) => isNamedField(path, i) ? ['properties', value] : [],
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

  public addFieldToMapping(id: number)
  {
    const config = this.getTypeConfig(id);
    const enginePath = this.engine.getOutputKeyPath(id);
    const cleanedPath = this.enginePathToMappingPath(enginePath);
    const hashed = hashPath(cleanedPath);

    if (config !== null)
    {
      if (this.pathSchema[hashed] === undefined)
      {
        const mappingPath = cleanedPath.toJS();
        const toExtend = _.get(this.mapping, mappingPath, {});
        const newObject = _.extend({}, toExtend, config);
        _.set(this.mapping, cleanedPath.toJS(), newObject);
        this.pathSchema[hashed] = {
          type: config.type as ElasticTypes,
          analyzer: config.analyzer,
        };
      }
      else if (config.type !== this.pathSchema[hashed].type)
      {
        this.errors.push(
          `Type Mismatch: ${enginePath.toJS()} has a type of '${config.type}' but ` +
          `the type is already defined to be '${this.pathSchema[hashed].type}'`,
        );
      }
      else if (config.analyzer !== this.pathSchema[hashed].analyzer)
      {
        this.errors.push(
          `Type Mismatch: ${enginePath.toJS()} has an analyzer of '${config.analyzer}' but ` +
          `the analyzer is already defined to be '${this.pathSchema[hashed].analyzer}'`,
        );
      }
    }
  }

  public createElasticMapping()
  {
    const ids = this.engine.getAllFieldIDs();
    ids.forEach((id, i) =>
    {
      try
      {
        this.addFieldToMapping(id);
      }
      catch (e)
      {
        this.errors.push(
          `Error encountered while adding field ${id} to mapping. Details: ${String(e)}`,
        );
      }
    });
  }

  public getMapping(): MappingType
  {
    return this.mapping;
  }

  public getErrors(): string[]
  {
    return this.errors;
  }
}

const elasticPropPath = EnginePath([Languages.Elastic]);
const valueTypePath = EnginePath(['valueType']);
