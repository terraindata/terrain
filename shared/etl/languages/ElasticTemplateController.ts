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
// tslint:disable:no-var-requires import-spacing strict-boolean-expressions

import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import * as _ from 'lodash';

import { FieldVerification, LanguageInterface } from 'shared/etl/languages/LanguageControllers';
import { ElasticMapping, MappingType } from 'shared/etl/mapping/ElasticMapping';
import { SinkOptionsType, Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { ElasticTypes } from 'shared/etl/types/ETLElasticTypes';
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import EngineUtil from 'shared/transformations/util/EngineUtil';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';
import { DefaultController } from './DefaultTemplateController';

import { FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';

import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';

class ElasticController extends DefaultController implements LanguageInterface
{
  public language = Languages.Elastic;

  public isFieldPrimaryKey(engine: TransformationEngine, fieldId: number)
  {
    const fieldProps = engine.getFieldProps(fieldId);
    return fieldProps !== undefined && _.get(fieldProps, [this.language, 'isPrimaryKey']) === true;
  }

  public canSetPrimaryKey(engine: TransformationEngine, fieldId: number)
  {
    const etlType = EngineUtil.fieldType(fieldId, engine);
    const isRootField = engine.getFieldPath(fieldId).size === 1;
    return (
      etlType === FieldTypes.String || etlType === FieldTypes.Number || etlType === FieldTypes.Integer
    ) && isRootField;
  }

  public setFieldPrimaryKey(engine: TransformationEngine, fieldId: number, value: boolean)
  {
    let sideEffects = false;
    const pkeyPath = List([this.language, 'isPrimaryKey']);
    engine.setFieldProp(fieldId, pkeyPath, value);
    if (value)
    {
      engine.getAllFieldIDs().forEach((id) =>
      {
        if (id !== fieldId && engine.getFieldProp(fieldId, pkeyPath) === true)
        {
          engine.setFieldProp(id, pkeyPath, false);
          sideEffects = true;
        }
      });
    }
    return sideEffects;
  }

  public changeFieldTypeSideEffects(engine: TransformationEngine, fieldId: number, newType)
  {
    const elasticProps = engine.getFieldProp(fieldId, List([this.language]));
    if (elasticProps !== undefined)
    {
      const newProps = _.extend({}, elasticProps, {
        elasticType: ElasticTypes.Auto,
      });
      engine.setFieldProp(fieldId, List([this.language]), newProps);
    }
    return false;
  }

  public verifyMapping(engine: TransformationEngine, sink: SinkConfig, existingMapping?: object): string[]
  {
    const mapping = new ElasticMapping(engine);
    let errors = [];

    if (mapping.getErrors().length > 0)
    {
      errors = errors.concat(mapping.getErrors());
    }
    if (existingMapping !== undefined && existingMapping[sink.options.table] !== undefined)
    {
      const mappingToCompare = { properties: existingMapping[sink.options.table] };
      const { hasConflicts, conflicts } = ElasticMapping.compareMapping(mapping.getMapping(), mappingToCompare);
      if (hasConflicts)
      {
        errors = errors.concat(conflicts);
      }
    }

    return errors;
  }

  public *getFieldErrors(engine: TransformationEngine, sink: SinkConfig, mapping?: object)
  {
    let existingMapping: MappingType;
    if (sink.type === Sinks.Database
      && mapping !== undefined
      && mapping[sink.options.table] !== undefined
    )
    {
      existingMapping = { properties: mapping[sink.options.table] };
    }

    const ids = engine.getAllFieldIDs();
    for (const id of ids.values() as IterableIterator<number>) // cannot use forEach inside iterator
    {
      let yielded = false; // make sure we yield at least once per field to allow async
      const okp = engine.getFieldPath(id);
      const name = okp.last();
      if (typeof name === 'string')
      {
        if (name.indexOf(' ') !== -1)
        {
          yielded = true;
          yield ({
            fieldId: id,
            message: 'Field name contains spaces.',
            type: 'error',
          } as FieldVerification);
        }
      }
      if (existingMapping !== undefined)
      {
        const { valid, message } = ElasticMapping.compareSingleField(id, engine, existingMapping);

        if (!valid)
        {
          yielded = true;
          yield ({
            fieldId: id,
            message,
            type: 'error',
          }) as FieldVerification;
        }
      }
      if (!yielded)
      {
        yield null; // since we can't yield like in node
      }
    }
  }
}

export default new ElasticController();
