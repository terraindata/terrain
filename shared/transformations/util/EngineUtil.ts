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

import * as Immutable from 'immutable';
import { List } from 'immutable';
import * as _ from 'lodash';
import * as Utils from 'shared/etl/util/ETLUtils';

import LanguageController from 'shared/etl/languages/LanguageControllers';
import { ElasticTypes } from 'shared/etl/types/ETLElasticTypes';
import { DateFormats, FieldTypes, getJSFromETL, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';

const etlTypeKeyPath = List(['etlType']);
export default class EngineUtil
{
  // get all fields that are computed from this field
  public static getFieldDependents(engine: TransformationEngine, fieldId: number): List<number>
  {
    const transformations = engine.getTransformations(fieldId);
    const asSet = transformations.flatMap((id) =>
    {
      const transformation = engine.getTransformationInfo(id);
      const nfkp: List<KeyPath> = _.get(transformation, ['meta', 'newFieldKeyPaths']);
      if (nfkp === undefined)
      {
        return undefined;
      }
      else
      {
        return nfkp;
      }
    }).map((kp) => engine.getFieldID(kp))
      .toList()
      .toSet();
    return List(asSet);
  }

  public static addFieldToEngine(
    engine: TransformationEngine,
    keypath: KeyPath,
    type: FieldTypes,
  ): number
  {
    const cfg = {
      etlType: type,
    };
    return engine.addField(keypath, getJSFromETL(type), cfg);
  }

  /*
   *  Difference between setType and changeType is that changeType should be on fields that a user
   *  may have set options on (such as elastic props).
   */
  public static setType(engine: TransformationEngine, fieldId: number, type: FieldTypes)
  {
    engine.setFieldProp(fieldId, etlTypeKeyPath, type);
    const jsType = Utils.path.isWildcard(engine.getFieldPath(fieldId)) ? 'array' : getJSFromETL(type);
    engine.setFieldType(fieldId, jsType);
  }

  public static changeType(engine: TransformationEngine, fieldId: number, type: FieldTypes)
  {
    EngineUtil.changeFieldTypeSideEffects(engine, fieldId, type);
    EngineUtil.setType(engine, fieldId, type);
  }

  // get the ETL type of a field
  public static fieldType(id: number, engine: TransformationEngine): FieldTypes
  {
    const etlType = engine.getFieldProp(id, etlTypeKeyPath) as FieldTypes;
    return etlType == null ? FieldTypes.String : etlType;
  }

  public static changeFieldTypeSideEffects(engine: TransformationEngine, fieldId: number, newType: FieldTypes)
  {
    LanguageController.get(Languages.Elastic)
      .changeFieldTypeSideEffects(engine, fieldId, newType);
    LanguageController.get(Languages.JavaScript)
      .changeFieldTypeSideEffects(engine, fieldId, newType);
  }

  // cast the field to the specified type (or the field's current type if type is not specified)
  public static castField(engine: TransformationEngine, fieldId: number, type?: FieldTypes, format?: DateFormats)
  {
    const ikp = engine.getFieldPath(fieldId);
    const etlType: FieldTypes = type === undefined ? EngineUtil.fieldType(fieldId, engine) : type;
    const castType = ETLTypeToCastString[etlType];

    if (etlType === FieldTypes.Date && format === undefined)
    {
      format = DateFormats.ISOstring;
    }

    const transformOptions: NodeOptionsType<TransformationNodeType.CastNode> = {
      toTypename: castType,
      format,
    };

    engine.appendTransformation(TransformationNodeType.CastNode, List([ikp]), transformOptions);
  }

  // TODO move this to an "analysis" or "Transformations util"
  public static addInitialTypeCasts(engine: TransformationEngine)
  {
    engine.getAllFieldIDs().forEach((id) =>
    {
      const firstCastIndex = engine.getTransformations(id).findIndex((transformId) =>
      {
        const node = engine.getTransformationInfo(transformId);
        return node.typeCode === TransformationNodeType.CastNode;
      });

      // do not perform casts if there is already a cast
      if (firstCastIndex !== -1)
      {
        return;
      }

      EngineUtil.castField(engine, id);
    });
  }

  public static copyField(e1: TransformationEngine, id1: number, keypath: KeyPath, node?: number, e2 = e1)
  {
    const id2 = e2.addField(keypath, e1.getFieldType(id1), {}, node);
    EngineUtil.transferFieldData(id1, id2, e1, e2);
    return id2;
  }

  // copies a field's configuration from e1 to e2. id1 and id2 should both exist in e1 and e2 respectively
  public static transferFieldData(id1: number, id2: number, e1: TransformationEngine, e2: TransformationEngine)
  {
    e2.setFieldType(id2, e1.getFieldType(id1));
    e2.setFieldProps(id2, _.cloneDeep(e1.getFieldProps(id1)));
    if (e1.getFieldEnabled(id1))
    {
      e2.enableField(id2);
    }
    else
    {
      e2.disableField(id2);
    }
  }
}

export const ETLTypeToCastString: {
  [k in FieldTypes]: string
} = {
    [FieldTypes.Array]: 'array',
    [FieldTypes.Object]: 'object',
    [FieldTypes.Date]: 'date',
    [FieldTypes.GeoPoint]: 'object',
    [FieldTypes.Number]: 'number',
    [FieldTypes.Integer]: 'number',
    [FieldTypes.Boolean]: 'boolean',
    [FieldTypes.String]: 'string',
  };
