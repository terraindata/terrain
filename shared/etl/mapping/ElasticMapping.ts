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

import { List, Map } from 'immutable';
import * as _ from 'lodash';

import { defaultProps, ElasticFieldProps, ElasticTypes, etlTypeToElastic } from 'shared/etl/types/ETLElasticTypes';
import { ETLFieldTypes, FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import EngineUtil, { PathHashMap } from 'shared/transformations/util/EngineUtil';
import { KeyPath as EnginePath } from 'shared/util/KeyPath';

export interface TypeConfig
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

export interface MappingType
{
  properties?: {
    [k: string]: {
      properties?: MappingType['properties'],
    } & TypeConfig,
  };
}

// generator that iterates over each field in mapping
// e.g. ['properties', 'foo'], ['properties', 'foo', 'properties', 'bar'], ...
function* getKeyPathsForComparison(mapping: MappingType): IterableIterator<List<string>>
{
  if (_.has(mapping, 'properties'))
  {
    const basePath = List(['properties']);
    for (const key of Object.keys(mapping['properties']))
    {
      yield basePath.push(key);
      for (const kp of getKeyPathsForComparison(mapping['properties'][key]))
      {
        yield basePath.push(key).concat(kp).toList();
      }
    }
  }
}

// turn a keypath into a readable string.
// isMappingPath specifies if its a regular keypath, or one that comes from a MappingType
function humanReadablePathName(keypath: EnginePath, isMappingPath = false)
{
  const filterFn = isMappingPath ?
    (val, index) => index % 2 === 1
    :
    (val, index) => true;

  return keypath.filter(filterFn)
    .reduce((accum, val) =>
    {
      if (accum === '')
      {
        return `[${val}`;
      }
      else
      {
        return `${accum}, ${val}`;
      }
    }, '') as string + ']';
}

export interface MappingComparison
{
  isSubset: boolean; // if true, then newMapping represents a subset of existingMapping (less than or equal)
  hasConflicts: boolean; // if true, the two mappings are not compatible
  conflicts: string[]; // an array of human readable conflict descriptions
}

export class ElasticMapping
{
  // compare two elastic mapping to determine if they are compatible
  public static compareMapping(toCompare: MappingType, existingMapping: MappingType): MappingComparison
  {
    const result: MappingComparison = {
      isSubset: true,
      hasConflicts: false,
      conflicts: [],
    };

    for (const kp of getKeyPathsForComparison(toCompare))
    {
      const kpArray = kp.toArray();
      const toCompareConfig: TypeConfig = _.get(toCompare, kpArray);
      const existingConfig: TypeConfig = _.get(existingMapping, kpArray);

      if (existingConfig === undefined)
      {
        result.isSubset = false;
      }
      else
      {
        if (toCompareConfig['type'] !== existingConfig['type'])
        {
          result.hasConflicts = true;
          const message = `Type conflict for field ${humanReadablePathName(kp, true)}. ` +
            `Type '${toCompareConfig['type']}'' does not match type '${existingConfig['type']}'.`;
          result.conflicts.push(message);
        }
        else if (toCompareConfig['analyzer'] !== toCompareConfig['analyzer'])
        {
          result.hasConflicts = true;
          const message = `Type conflict for field ${humanReadablePathName(kp, true)}. ` +
            `Analyzer '${toCompareConfig['analyzer']}' does not match Analyzer '${existingConfig['analyzer']}'.`;
          result.conflicts.push(message);
        }
      }
    }
    return result;
  }

  private errors: string[] = [];
  private pathSchema: PathHashMap<{
    type: ElasticTypes,
    analyzer: string,
  }> = {};
  private engine: TransformationEngine;
  private isMerge: boolean;
  private mapping: MappingType = {};
  private primaryKey: string | null = null;
  private primaryKeyAttempts: string[] = [];

  constructor(engine: TransformationEngine, isMerge: boolean = false)
  {
    this.engine = engine;
    this.isMerge = isMerge;
    this.createElasticMapping();
    this.findPrimaryKeys();
  }

  public getMapping(): MappingType
  {
    return this.mapping;
  }

  public getErrors(): string[]
  {
    return this.errors;
  }

  public getPrimaryKey(): string | null
  {
    return this.primaryKey;
  }

  protected getTextConfig(elasticProps: ElasticFieldProps): TypeConfig
  {
    if (this.isMerge)
    {
      return {
        type: 'keyword',
        index: true,
        fields: {
          keyword: {
            type: 'keyword',
            index: true,
            ignore_above: 256,
          },
        },
      };
    }

    const config: TypeConfig = {
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
    };
    if (elasticProps.isAnalyzed)
    {
      config.analyzer = elasticProps.analyzer;
    }
    return config;
  }

  protected getTypeConfig(fieldID: number): TypeConfig | null
  {
    const elasticProps = this.getElasticProps(fieldID);

    const etlType = this.getETLType(fieldID);
    const elasticType = elasticProps.elasticType === ElasticTypes.Auto ?
      etlTypeToElastic(etlType)
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

  protected getETLType(fieldID: number): ETLFieldTypes
  {
    return EngineUtil.getETLFieldType(fieldID, this.engine);
  }

  // converts engine keypaths to keypaths in the elastic mapping
  // e.g. ['foo', 'bar'] to ['properties', 'foo', 'properties', 'bar']
  // e.g. ['foo', '0', 'bar'] to ['properties', 'foo', 'properties', 'bar']
  // e.g. ['foo', '*'] to ['properties', 'foo']
  protected enginePathToMappingPath(path: EnginePath): EnginePath
  {
    return path.flatMap(
      (value, i) => EngineUtil.isNamedField(path, i) ? ['properties', value] : [],
    ).toList() as EnginePath;
  }

  protected getElasticProps(fieldID: number): ElasticFieldProps
  {
    const props: Partial<ElasticFieldProps> = this.engine.getFieldProp(fieldID, elasticPropPath);
    return defaultProps(props);
  }

  protected clearGeopointMappings()
  {
    const ids = this.engine.getAllFieldIDs();
    ids.forEach((id, i) =>
    {
      const etlType = this.getETLType(id);
      if (etlType !== ETLFieldTypes.GeoPoint)
      {
        return;
      }
      else
      {
        const okp = this.engine.getOutputKeyPath(id);
        const cleanedPath = this.enginePathToMappingPath(okp).toJS();
        const fieldMapping = _.get(this.mapping, cleanedPath);
        const newFieldMapping = _.omit(fieldMapping, ['properties']);
        _.set(this.mapping, cleanedPath, newFieldMapping);
      }
    });
  }

  protected addFieldToMapping(id: number)
  {
    const config = this.getTypeConfig(id);
    const enginePath = this.engine.getOutputKeyPath(id);
    const cleanedPath = this.enginePathToMappingPath(enginePath);
    const hashed = EngineUtil.hashPath(cleanedPath);

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

  protected createElasticMapping()
  {
    const ids = this.engine.getAllFieldIDs();
    ids.forEach((id, i) =>
    {
      try
      {
        if (this.engine.getFieldEnabled(id))
        {
          this.addFieldToMapping(id);
        }
      }
      catch (e)
      {
        this.errors.push(
          `Error encountered while adding field '${id}' to mapping. Details: ${String(e)}`,
        );
      }
    });
    try
    {
      this.clearGeopointMappings();
    }
    catch (e)
    {
      this.errors.push(`Error encountered while clearing Geopoint Mappings. Details: ${String(e)}`);
    }
  }

  protected verifyAndSetPrimaryKey(id: number)
  {
    const elasticProps = this.getElasticProps(id);
    const etlType = this.getETLType(id);
    const elasticType = elasticProps.elasticType === ElasticTypes.Auto ?
      etlTypeToElastic(etlType)
      :
      elasticProps.elasticType;
    const enginePath = this.engine.getOutputKeyPath(id);
    if (enginePath.size > 1)
    {
      this.errors.push(
        `'${humanReadablePathName(enginePath)}' is not a valid primary key. ` +
        `Primary keys should be a root level field`,
      );
      this.primaryKeyAttempts.push(humanReadablePathName(enginePath));
    }
    else if (enginePath.size === 0)
    {
      this.errors.push(
        `'${humanReadablePathName(enginePath)}' is not a valid primary key. `,
      );
      this.primaryKeyAttempts.push(humanReadablePathName(enginePath));
    }
    else
    {
      const primaryKey = enginePath.get(0);
      this.primaryKeyAttempts.push(primaryKey);
      if (typeof primaryKey !== 'string')
      {
        this.errors.push(
          `Unexpected primary key name. Field name '${String(primaryKey)}' is not a string`,
        );
      }
      else if (this.primaryKey !== null && this.primaryKey !== primaryKey)
      {
        this.errors.push(
          `Cannot set new primary key to '${primaryKey}'. There is already a primary key '${this.primaryKey}'`,
        );
      }
      else if (
        elasticType === ElasticTypes.Array
        || elasticType === ElasticTypes.Nested
        || elasticType === ElasticTypes.Boolean
      )
      {
        this.errors.push(
          `Field '${primaryKey}' of type '${elasticType}' cannot be a primary key. Primary keys cannot be Array, Nested or Boolean.`,
        );
      }
      else
      {
        this.primaryKey = primaryKey;
      }
    }
  }

  protected findPrimaryKeys()
  {
    const ids = this.engine.getAllFieldIDs();

    ids.forEach((id, i) =>
    {
      try
      {
        if (this.engine.getFieldEnabled(id))
        {
          const elasticProps = this.getElasticProps(id);
          if (elasticProps.isPrimaryKey)
          {
            this.verifyAndSetPrimaryKey(id);
          }
        }
      }
      catch (e)
      {
        this.errors.push(
          `Error encountered while searching for primary key. Details: ${String(e)}`,
        );
      }
    });

    if (this.primaryKey === null)
    {
      const msg = this.primaryKeyAttempts.length > 0 ?
        `Primary keys are specified but none are valid`
        :
        `No primary key specified`;
      this.errors.push(
        msg,
      );
    }
  }
}

const elasticPropPath = EnginePath([Languages.Elastic]);
