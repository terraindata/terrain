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

import LanguageController from 'shared/etl/languages/LanguageControllers';
import { ElasticTypes } from 'shared/etl/types/ETLElasticTypes';
import { DateFormats, FieldTypes, getJSFromETL, Languages } from 'shared/etl/types/ETLTypes';
import TypeUtil from 'shared/etl/TypeUtil';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import objectify from 'shared/util/deepObjectify';
import { KeyPath, KeyPathUtil as PathUtil, WayPoint } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import * as TerrainLog from 'loglevel';

const etlTypeKeyPath = List(['etlType']);
export default class EngineUtil
{
  /*
   *  Removed documentation because IT BECAME LIES (todo redo it)
   */
  public static verifyIntegrity(engine: TransformationEngine)
  {
    const errors = [];
    try
    {
      const fields = engine.getAllFieldIDs();
      fields.forEach((id) =>
      {
        const okp = engine.getFieldPath(id);
        if (okp.size > 1)
        {
          const parentPath = okp.slice(0, -1).toList();
          const parentID = engine.getFieldID(parentPath);
          const type = EngineUtil.fieldType(parentID, engine);
          if (type !== FieldTypes.Array && type !== FieldTypes.Object)
          {
            errors.push(`Field ${okp.toJS()} has a parent that is not an array or object`);
          }
        }
      });
    }
    catch (e)
    {
      errors.push(`Error while trying to verify transformation engine integrity: ${String(e)}`);
    }
    return errors;
  }

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

  // returns the first child field
  public static findChildField(fieldId: number, engine: TransformationEngine): number | undefined
  {
    const myKP = engine.getFieldPath(fieldId);
    const key = engine.getAllFieldIDs().findKey((id: number) =>
    {
      const childKP = engine.getFieldPath(id);
      if (childKP.size === myKP.size + 1)
      {
        return childKP.slice(0, -1).equals(myKP);
      }
      else
      {
        return false;
      }
    });
    return key;
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
    const jsType = PathUtil.isWildcard(engine.getFieldPath(fieldId)) ? 'array' : getJSFromETL(type);
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

  // take two engines and return an engine whose fields most closely resembles the result of the merge
  public static mergeJoinEngines(
    leftEngine: TransformationEngine,
    rightEngine: TransformationEngine,
    outputKey: string,
  ): TransformationEngine
  {
    const newEngine = new TransformationEngine();
    leftEngine.getAllFieldIDs().forEach((id) =>
    {
      const keypath = leftEngine.getFieldPath(id);
      const newId = EngineUtil.transferField(id, keypath, leftEngine, newEngine);
    });
    const outputKeyPathBase = List([outputKey, -1]);
    const outputFieldId = EngineUtil.addFieldToEngine(newEngine, List([outputKey]), FieldTypes.Array);
    const outputFieldWildcardId = EngineUtil.addFieldToEngine(newEngine, outputKeyPathBase, FieldTypes.Object);

    rightEngine.getAllFieldIDs().forEach((id) =>
    {
      const newKeyPath = outputKeyPathBase.concat(rightEngine.getFieldPath(id)).toList();
      const newId = EngineUtil.transferField(id, newKeyPath, rightEngine, newEngine);
    });
    return newEngine;
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

  // for each field make an initial type cast based on the js type
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

  // copy a field from e1 to e2 with specified keypath
  // if e2 is not provided, then transfer from e1 to itself
  // does not transfer transformations
  public static transferField(id1: number, keypath: KeyPath, e1: TransformationEngine, e2?: TransformationEngine)
  {
    if (e2 === undefined)
    {
      e2 = e1;
    }
    const id2 = e2.addField(keypath, e1.getFieldType(id1));
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

  public static postorderForEach(
    engine: TransformationEngine,
    fromId: number,
    fn: (id: number) => void,
  )
  {
    const tree = engine.createTree();
    for (const id of EngineUtil.postorder(tree, fromId))
    {
      fn(id);
    }
  }

  public static preorderForEach(
    engine: TransformationEngine,
    fromId: number,
    fn: (id: number) => void,
  )
  {
    const tree = engine.createTree();
    for (const id of EngineUtil.preorder(tree, fromId))
    {
      fn(id);
    }
  }

  public static * postorder(
    tree: Immutable.Map<number, List<number>>,
    id: number,
    shouldExplore: (id) => boolean = () => true,
  )
  {
    const children = tree.get(id);
    if (children !== undefined)
    {
      for (let i = 0; i < children.size; i++)
      {
        yield* EngineUtil.postorder(tree, children.get(i), shouldExplore);
      }
      yield id;
    }
  }

  public static * preorder(
    tree: Immutable.Map<number, List<number>>,
    id: number,
    shouldExplore: (id) => boolean = () => true,
  )
  {
    const children = tree.get(id);
    if (children !== undefined && shouldExplore(id))
    {
      yield id;
      for (let i = 0; i < children.size; i++)
      {
        yield* EngineUtil.preorder(tree, children.get(i), shouldExplore);
      }
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
