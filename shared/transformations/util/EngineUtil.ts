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
import { List, Map } from 'immutable';
import * as _ from 'lodash';

import LanguageController from 'shared/etl/languages/LanguageControllers';
import { ElasticTypes } from 'shared/etl/types/ETLElasticTypes';
import
{
  DateFormats, ETLFieldTypes, ETLToJSType, FieldTypes, getJSFromETL, JSToETLType, Languages, validJSTypes,
} from 'shared/etl/types/ETLTypes';
import TypeUtil from 'shared/etl/TypeUtil';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import objectify from 'shared/util/deepObjectify';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

export type PathHash = string;
export interface PathHashMap<T>
{
  [k: string]: T;
}
const valueTypeKeyPath = List(['valueType']);
const etlTypeKeyPath = List(['etlType']);
export default class EngineUtil
{
  /*
   *  Verify
   *  Fields:
   *  1: All fields have valid names (no * or number names)
   *  2: No dangling fields (fields without parents, or fields with children that aren't arrays or objects)
   *  3: All fields have valid types & value types if applicable
   *  4: No duplicate output key paths or input key paths
   *  Transformations:
   *  1: TODO All newFieldKeyPaths point to some field's outputKeyPath
   *  2: TODO All field's current type matches the most recent cast
   */
  public static verifyIntegrity(engine: TransformationEngine)
  {
    let errors = [];
    try
    {
      const fields = engine.getAllFieldIDs();
      const pathTypes: PathHashMap<FieldTypes> = {};
      const seenIKP = {};
      const seenOKP = {};
      fields.forEach((id) =>
      {
        const hashedOKP = EngineUtil.hashPath(engine.getOutputKeyPath(id));
        const hashedIKP = EngineUtil.hashPath(engine.getInputKeyPath(id));
        if (seenIKP[hashedIKP] !== undefined)
        {
          errors.push(`Duplicate Input path detected: ${hashedIKP}`);
        }
        else
        {
          seenIKP[hashedIKP] = id;
        }
        if (seenOKP[hashedOKP] !== undefined)
        {
          errors.push(`Duplicate Output path detected: ${hashedOKP}`);
        }
        else
        {
          seenOKP[hashedOKP] = id;
        }
        const strippedPath = EngineUtil.turnIndicesIntoValue(engine.getOutputKeyPath(id));
        pathTypes[EngineUtil.hashPath(strippedPath)] = engine.getFieldType(id) as FieldTypes;
      });
      fields.forEach((id) =>
      {
        const okp = engine.getOutputKeyPath(id);
        if (okp.size > 1)
        {
          const parentPath = okp.slice(0, -1).toList();
          const parentID = engine.getOutputFieldID(parentPath);
          if (engine.getFieldType(parentID) !== 'array' && engine.getFieldType(parentID) !== 'object')
          {
            errors.push(`Field ${okp.toJS()} has a parent that is not an array or object`);
          }
        }
        if (okp.last() === '*')
        {
          if (engine.getFieldType(id) !== 'array')
          {
            errors.push(`Field ${okp.toJS()} is not of type array, but has name '*'. This is not allowed`);
          }
        }
        const fieldTypeErrors = EngineUtil.fieldHasValidType(engine, id);
        if (fieldTypeErrors.length > 0)
        {
          errors = errors.concat(fieldTypeErrors);
        }
      });
    }
    catch (e)
    {
      errors.push(`Error while trying to verify transformation engine integrity: ${String(e)}`);
    }
    return errors;
  }

  // check to make sure the field's types exist and if its an array that it has a valid valueType
  public static fieldHasValidType(engine: TransformationEngine, id: number): string[]
  {
    const fieldType = engine.getFieldType(id) as FieldTypes;
    const etlType = EngineUtil.getETLFieldType(id, engine);
    const valueType = engine.getFieldProp(id, valueTypeKeyPath) as FieldTypes;
    if (validJSTypes.indexOf(fieldType) === -1)
    {
      return [`Field Type ${fieldType} is not a valid js type`];
    }
    if (fieldType === 'array' && validJSTypes.indexOf(valueType) === -1)
    {
      return [`Field Type is an Array, but valueType: ${valueType} is invalid.`];
    }

    const jsType = EngineUtil.getRepresentedType(id, engine);
    if (ETLToJSType[etlType].indexOf(jsType) === -1)
    {
      return [`Field JS Type and ETL Type are Incompatible. ${jsType} is incompatible with ${etlType}`];
    }
    return [];
  }

  // get all fields that are computed from this field
  public static getFieldDependents(engine: TransformationEngine, fieldId: number): List<number>
  {
    const transformations = engine.getTransformations(fieldId);
    const asSet = transformations.flatMap((id) =>
    {
      const transformation = engine.getTransformationInfo(id);
      const nfkp: List<List<string>> = _.get(transformation, ['meta', 'newFieldKeyPaths']);
      if (nfkp === undefined)
      {
        return undefined;
      }
      else
      {
        return nfkp;
      }
    }).map((kp) => engine.getOutputFieldID(kp))
      .toList()
      .toSet();
    return List(asSet);
  }

  // root is considered to be a named field
  public static isNamedField(
    keypath: KeyPath,
    index?: number,
  ): boolean
  {
    const last = index === undefined ? keypath.last() : keypath.get(index);
    return last !== '*' && Number.isNaN(Number(last));
  }

  public static isWildcardField(
    keypath: KeyPath,
    index?: number,
  ): boolean
  {
    const last = index === undefined ? keypath.last() : keypath.get(index);
    return last === '*';
  }

  // document merge logic
  public static hashPath(keypath: KeyPath): PathHash
  {
    return JSON.stringify(keypath.toJS());
  }

  public static unhashPath(keypath: PathHash): KeyPath
  {
    return KeyPath(JSON.parse(keypath));
  }

  public static getValueType(fieldId: number, engine: TransformationEngine): FieldTypes
  {
    return engine.getFieldProp(fieldId, valueTypeKeyPath);
  }

  // turn all indices into a particular value, based on
  // an existing engine that has fields with indices in them
  public static turnIndicesIntoValue(
    keypath: KeyPath,
    value = '*',
  ): KeyPath
  {
    if (keypath.size === 0)
    {
      return keypath;
    }
    const arrayIndices = {};
    for (const i of _.range(1, keypath.size))
    {
      const path = keypath.slice(0, i + 1).toList();
      if (!EngineUtil.isNamedField(path))
      {
        arrayIndices[i] = true;
      }
    }

    const scrubbed = keypath.map((key, i) =>
    {
      return arrayIndices[i] === true ? value : key;
    }).toList();
    return scrubbed;
  }

  // returns the first child field
  public static findChildField(fieldId: number, engine: TransformationEngine): number | undefined
  {
    const myKP = engine.getOutputKeyPath(fieldId);
    const key = engine.getAllFieldIDs().findKey((id: number) =>
    {
      const childKP = engine.getOutputKeyPath(id);
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

  // takes an engine path and the path type mapping and returns true if
  // all of the path's parent paths represent array or object fields
  public static isAValidField(keypath: KeyPath, pathTypes: PathHashMap<FieldTypes>): boolean
  {
    if (keypath.size === 0)
    {
      return true;
    }
    for (const i of _.range(1, keypath.size))
    {
      const parentPath = keypath.slice(0, i).toList();
      const parentType = pathTypes[EngineUtil.hashPath(parentPath)];
      if (parentType !== undefined && parentType !== 'object' && parentType !== 'array')
      {
        return false;
      }
    }
    return true;
  }

  // Add the fields in the pathTypes and pathValueTypes map to the given engine
  public static addFieldsToEngine(
    pathTypes: PathHashMap<FieldTypes>,
    pathValueTypes: PathHashMap<FieldTypes>,
    engine: TransformationEngine,
  )
  {
    const hashedPaths = List(Object.keys(pathTypes));
    hashedPaths.forEach((hashedPath, i) =>
    {
      const unhashedPath = EngineUtil.unhashPath(hashedPath);
      if (EngineUtil.isAValidField(unhashedPath, pathTypes))
      {
        let fieldType = pathTypes[hashedPath];
        let valueType = pathValueTypes[hashedPath];
        if (valueType !== undefined)
        {
          fieldType = 'array';
        }
        if (valueType === undefined && EngineUtil.isWildcardField(unhashedPath))
        {
          valueType = fieldType;
          fieldType = 'array';
        }

        const id = engine.addField(unhashedPath, fieldType);
        if (valueType !== undefined)
        {
          engine.setFieldProp(id, valueTypeKeyPath, valueType !== null ? valueType : 'string');
        }
      }
    });
  }

  public static addFieldToEngine(
    engine: TransformationEngine,
    keypath: List<string>,
    type: ETLFieldTypes,
    valueType?: ETLFieldTypes,
    useValueType?: boolean,
  ): number
  {
    const cfg = {
      etlType: useValueType ? valueType : type,
    };
    if (valueType !== undefined)
    {
      cfg['valueType'] = getJSFromETL(valueType);
    }
    return engine.addField(keypath, getJSFromETL(type), cfg);
  }

  // set the field type with no validation
  public static rawSetFieldType(
    engine: TransformationEngine,
    fieldId: number,
    etlType: ETLFieldTypes,
    type: ETLFieldTypes,
    valueType?: ETLFieldTypes,
  )
  {
    engine.setFieldProp(fieldId, etlTypeKeyPath, etlType);
    engine.setFieldType(fieldId, getJSFromETL(type));
    if (valueType !== undefined)
    {
      engine.setFieldProp(fieldId, valueTypeKeyPath, getJSFromETL(valueType));
    }
  }

  public static changeFieldType(
    engine: TransformationEngine,
    fieldId: number,
    newType: ETLFieldTypes,
  )
  {
    if (EngineUtil.isWildcardField(engine.getOutputKeyPath(fieldId)))
    {
      engine.setFieldProp(fieldId, valueTypeKeyPath, getJSFromETL(newType));
    }
    else
    {
      engine.setFieldType(fieldId, getJSFromETL(newType));
    }

    engine.setFieldProp(fieldId, etlTypeKeyPath, newType);
  }

  // get the JS type of a field. If it represents an array wildcard, get the valueType
  public static getRepresentedType(id: number, engine: TransformationEngine): FieldTypes
  {
    const kp = engine.getOutputKeyPath(id);
    if (EngineUtil.isWildcardField(kp))
    {
      return engine.getFieldProp(id, valueTypeKeyPath) as FieldTypes;
    }
    else
    {
      return engine.getFieldType(id) as FieldTypes;
    }
  }

  // get the ETL type of a field
  public static getETLFieldType(id: number, engine: TransformationEngine): ETLFieldTypes
  {
    const etlType = engine.getFieldProp(id, etlTypeKeyPath) as ETLFieldTypes;
    if (etlType == null)
    {
      return JSToETLType[EngineUtil.getRepresentedType(id, engine)];
    }
    else
    {
      return etlType;
    }
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
      const keypath = leftEngine.getOutputKeyPath(id);
      const newId = EngineUtil.transferField(id, keypath, leftEngine, newEngine);
    });
    const outputKeyPathBase = List([outputKey, '*']);
    const valueTypePath = List(['valueType']);
    const outputFieldId = EngineUtil.addFieldToEngine(newEngine, List([outputKey]), ETLFieldTypes.Array, ETLFieldTypes.Object);
    const outputFieldWildcardId = EngineUtil.addFieldToEngine(
      newEngine, outputKeyPathBase, ETLFieldTypes.Array, ETLFieldTypes.Object, true);

    rightEngine.getAllFieldIDs().forEach((id) =>
    {
      const newKeyPath = outputKeyPathBase.concat(rightEngine.getOutputKeyPath(id)).toList();
      const newId = EngineUtil.transferField(id, newKeyPath, rightEngine, newEngine);
    });
    return newEngine;
  }

  public static interpretETLTypes(
    engine: TransformationEngine,
    options?: {
      documents: List<object>,
      castStringsToPrimitives?: boolean,
    },
  )
  {
    if (options === undefined || options.documents === undefined)
    {
      engine.getAllFieldIDs().forEach((id) =>
      {
        const repType = EngineUtil.getRepresentedType(id, engine);
        const type = JSToETLType[repType];
        engine.setFieldProp(id, etlTypeKeyPath, type);
      });
      return;
    }

    if (options.castStringsToPrimitives)
    {
      EngineUtil.interpretTextFields(engine, options.documents);
    }

    const ignoreFields: {[k: number]: boolean} = {};
    const docs = EngineUtil.preprocessDocuments(options.documents, engine);
    engine.getAllFieldIDs().forEach((id) =>
    {
      if (ignoreFields[id])
      {
        return;
      }
      const ikp = engine.getInputKeyPath(id);
      const okp = engine.getOutputKeyPath(id);

      const repType = EngineUtil.getRepresentedType(id, engine);

      if (repType === 'string')
      {
        const values = EngineUtil.getValuesToAnalyze(docs, okp);
        const type = TypeUtil.getCommonETLStringType(values);
        EngineUtil.changeFieldType(engine, id, type);
        if (type === ETLFieldTypes.GeoPoint)
        {
          EngineUtil.castField(engine, id, ETLFieldTypes.GeoPoint);
          const latField = EngineUtil.addFieldToEngine(engine, ikp.push('lat'), ETLFieldTypes.Number);
          const longField = EngineUtil.addFieldToEngine(engine, ikp.push('lon'), ETLFieldTypes.Number);
          engine.setOutputKeyPath(latField, okp.push('lat')); // refactor to use synthetic util?
          engine.setOutputKeyPath(longField, okp.push('lon'));

          EngineUtil.castField(engine, latField, ETLFieldTypes.Number);
          EngineUtil.castField(engine, longField, ETLFieldTypes.Number);
        }
        else if (type === ETLFieldTypes.Date)
        {
          EngineUtil.castField(engine, id, ETLFieldTypes.Date);
        }
      }
      else if (repType === 'number')
      {
        const values = EngineUtil.getValuesToAnalyze(docs, okp);
        const type = TypeUtil.getCommonETLNumberType(values);
        EngineUtil.changeFieldType(engine, id, type);
      }
      else if (repType === 'object')
      {
        const values = EngineUtil.getValuesToAnalyze(docs, okp);
        if (TypeUtil.areValuesGeoPoints(values))
        {
          EngineUtil.changeFieldType(engine, id, ETLFieldTypes.GeoPoint);
          EngineUtil.castField(engine, id, ETLFieldTypes.GeoPoint);
          const latId = engine.getOutputFieldID(okp.push('lat'));
          const lonId = engine.getOutputFieldID(okp.push('lon'));
          EngineUtil.changeFieldType(engine, latId, ETLFieldTypes.Number);
          EngineUtil.changeFieldType(engine, lonId, ETLFieldTypes.Number);
          EngineUtil.castField(engine, latId, ETLFieldTypes.Number);
          EngineUtil.castField(engine, lonId, ETLFieldTypes.Number);
          ignoreFields[latId] = true;
          ignoreFields[lonId] = true;
        }
      }
      else
      {
        const type = JSToETLType[repType];
        engine.setFieldProp(id, etlTypeKeyPath, type);
      }
    });
  }

  public static changeFieldTypeSideEffects(engine: TransformationEngine, fieldId: number, newType: ETLFieldTypes)
  {
    LanguageController.get(Languages.Elastic)
      .changeFieldTypeSideEffects(engine, fieldId, newType);
    LanguageController.get(Languages.JavaScript)
      .changeFieldTypeSideEffects(engine, fieldId, newType);
  }

  // cast the field to the specified type (or the field's current type if type is not specified)
  public static castField(engine: TransformationEngine, fieldId: number, type?: ETLFieldTypes, format?: DateFormats)
  {
    const ikp = engine.getInputKeyPath(fieldId);
    const etlType: ETLFieldTypes = type === undefined ? EngineUtil.getETLFieldType(fieldId, engine) : type;
    const castType = ETLTypeToCastString[etlType];

    if (etlType === ETLFieldTypes.Date && format === undefined)
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

  // return the best guess engine from the given documents
  public static createEngineFromDocuments(documents: List<object>):
    {
      engine: TransformationEngine,
      warnings: string[],
      softWarnings: string[],
    }
  {
    const warnings: string[] = [];
    const softWarnings: string[] = [];
    const pathTypes: PathHashMap<FieldTypes> = {};
    const pathValueTypes: PathHashMap<FieldTypes> = {};
    documents.forEach((doc, i) =>
    {
      // if (doc['searchHistory'])
      // {
      //   if (Array.isArray(doc['searchHistory']))
      //   {
      //     for (const history of doc['searchHistory'])
      //     {
      //       console.log(history['searchMinBedrooms']);
      //     }
      //   }
      // }

      const e: TransformationEngine = new TransformationEngine(doc);
      EngineUtil.stripMalformedFields(e, doc); // is pretty slow, any better ways?
      const fieldIds = e.getAllFieldIDs();

      fieldIds.forEach((id, j) =>
      {
        const currentType: FieldTypes = EngineUtil.getRepresentedType(id, e);
        const deIndexedPath = EngineUtil.turnIndicesIntoValue(e.getOutputKeyPath(id), '*');
        const path = EngineUtil.hashPath(deIndexedPath);

        if (pathTypes[path] !== undefined)
        {
          const existingType = pathTypes[path];
          const newType = EngineUtil.mergeTypes(currentType, existingType);
          if (newType === 'warning' || newType === 'softWarning')
          {
            if (newType === 'warning')
            {
              warnings.push(
                `path: ${path} has incompatible types.` +
                ` Interpreted types ${currentType} and ${existingType} are incompatible.` +
                ` The resultant type will be coerced to a string.` +
                ` Details: document ${i}`,
              );
            }
            else
            {
              softWarnings.push(
                `path: ${path} has different types, but can be resolved.` +
                ` Interpreted types ${currentType} and ${existingType} are different.` +
                ` The resultant type will be coerced to a string.` +
                ` Details: document ${i}`,
              );
            }
            pathTypes[path] = 'string';
            pathValueTypes[path] = undefined;
          }
          else if (existingType === null && newType !== null)
          {
            pathTypes[path] = newType;
            pathValueTypes[path] = e.getFieldProp(id, valueTypeKeyPath);
          }
        }
        else
        {
          pathTypes[path] = currentType;
          pathValueTypes[path] = e.getFieldProp(id, valueTypeKeyPath);
        }
      });
    });
    const engine = new TransformationEngine();
    EngineUtil.addFieldsToEngine(pathTypes, pathValueTypes, engine);

    return {
      engine,
      warnings,
      softWarnings,
    };
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

  private static preprocessDocuments(documents: List<object>, engine: TransformationEngine): List<object>
  {
    return documents.map((doc) => engine.transform(doc)).toList();
  }

  // warning types get typed as strings, but should emit a warning
  private static mergeTypes(type1: FieldTypes = null, type2: FieldTypes = null): FieldTypes | 'warning' | 'softWarning'
  {
    if (type1 === null)
    {
      return type2;
    }
    else if (type2 === null)
    {
      return type1;
    }
    else if (CompatibilityMatrix[type1][type2] !== undefined)
    {
      return CompatibilityMatrix[type1][type2];
    }
    else
    {
      return CompatibilityMatrix[type2][type1];
    }
  }

  private static getValuesToAnalyze(
    docs: List<object>,
    okp: KeyPath,
  ): any[]
  {
    let values = [];
    docs.forEach((doc) =>
    {
      const vals = yadeep.get(doc, okp);
      if (vals !== undefined)
      {
        values = values.concat(vals);
      }
    });
    return values;
  }

  // remove fields that the engine thinks are object but are actually null
  private static stripMalformedFields(engine: TransformationEngine, doc: object)
  {
    const fieldsToDelete = [];
    engine.getAllFieldIDs().forEach((id) => {
      if (EngineUtil.getRepresentedType(id, engine) !== 'object')
      {
        return;
      }
      const value = yadeep.get(doc, engine.getOutputKeyPath(id));
      if (Array.isArray(value))
      {
        let allNull = true;
        for (const val of value)
        {
          if (val !== null && value !== undefined)
          {
            allNull = false;
          }
        }
        if (allNull)
        {
          fieldsToDelete.push(id);
        }
      }
      else if (value === null || value === undefined)
      {
        fieldsToDelete.push(id);
      }
    });
    _.forEach(fieldsToDelete, (id) => {
      engine.deleteField(id);
    });
  }

  // attempt to convert fields from text and guess if they should be numbers or booleans
  // adds type casts
  private static interpretTextFields(engine: TransformationEngine, documents: List<object>)
  {
    const docs = EngineUtil.preprocessDocuments(documents, engine);
    engine.getAllFieldIDs().forEach((id) =>
    {
      if (EngineUtil.getRepresentedType(id, engine) !== 'string')
      {
        return;
      }
      const okp = engine.getOutputKeyPath(id);
      const ikp = engine.getInputKeyPath(id);
      const values = EngineUtil.getValuesToAnalyze(docs, okp);
      const bestType = TypeUtil.getCommonJsType(values);
      if (bestType !== EngineUtil.getRepresentedType(id, engine))
      {
        if (!EngineUtil.isWildcardField(ikp))
        {
          engine.setFieldType(id, bestType);
        }
        else
        {
          engine.setFieldProp(id, valueTypeKeyPath, bestType);
        }
        EngineUtil.castField(engine, id, ETLToJSType[bestType]);
      }
    });
  }
}

export const ETLTypeToCastString: {
  [k in ETLFieldTypes]: string
} = {
    [ETLFieldTypes.Array]: 'array',
    [ETLFieldTypes.Object]: 'object',
    [ETLFieldTypes.Date]: 'date',
    [ETLFieldTypes.GeoPoint]: 'object',
    [ETLFieldTypes.Number]: 'number',
    [ETLFieldTypes.Integer]: 'number',
    [ETLFieldTypes.Boolean]: 'boolean',
    [ETLFieldTypes.String]: 'string',
  };

const CompatibilityMatrix: {
  [x in FieldTypes]: {
    [y in FieldTypes]?: FieldTypes | 'warning' | 'softWarning'
  }
} = {
    array: {
      array: 'array',
      object: 'warning',
      string: 'warning',
      number: 'warning',
      boolean: 'warning',
    },
    object: {
      object: 'object',
      string: 'warning',
      number: 'warning',
      boolean: 'warning',
    },
    string: {
      string: 'string',
      number: 'softWarning',
      boolean: 'softWarning',
    },
    number: {
      number: 'number',
      boolean: 'softWarning',
    },
    boolean: {
      boolean: 'boolean',
    },
  };
