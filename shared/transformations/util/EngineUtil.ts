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

import { FieldTypes } from 'shared/etl/types/ETLTypes';
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

export default class EngineUtil
{
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

  // takes an engine path and the path type mapping and returns true if
  // all of the path's parent paths represent array
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

  public static addFieldsToEngine(
    pathTypes: PathHashMap<FieldTypes>,
    pathValueTypes: PathHashMap<FieldTypes>,
    engine: TransformationEngine,
  )
  {
    const hashedPaths = List(Object.keys(pathTypes));
    hashedPaths.forEach((hashedPath, i) =>
    {
      if (EngineUtil.isAValidField(EngineUtil.unhashPath(hashedPath), pathTypes))
      {
        let fieldType = pathTypes[hashedPath];
        const valueType = pathValueTypes[hashedPath];
        if (valueType !== undefined)
        {
          fieldType = 'array';
        }
        const id = engine.addField(EngineUtil.unhashPath(hashedPath), fieldType);
        if (valueType !== undefined)
        {
          engine.setFieldProp(id, valueTypeKeyPath, valueType);
        }
      }
    });
  }

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
    const outputFieldId = newEngine.addField(List([outputKey]), 'array');
    const outputFieldWildcardId = newEngine.addField(outputKeyPathBase, 'array');
    newEngine.setFieldProp(outputFieldId, valueTypePath, 'object');
    newEngine.setFieldProp(outputFieldWildcardId, valueTypePath, 'object');
    rightEngine.getAllFieldIDs().forEach((id) =>
    {
      const newKeyPath = outputKeyPathBase.concat(rightEngine.getOutputKeyPath(id)).toList();
      const newId = EngineUtil.transferField(id, newKeyPath, rightEngine, newEngine);
    });
    return newEngine;
  }

  // attempt to convert fields from text and guess if they should be numbers or booleans
  // adds type casts
  public static interpretTextFields(engine: TransformationEngine, documents: List<object>)
  {
    const docs = EngineUtil.preprocessDocuments(documents);
    engine.getAllFieldIDs().forEach((id) =>
    {
      if (EngineUtil.getRepresentedType(id, engine) !== 'string')
      {
        return;
      }
      const okp = engine.getOutputKeyPath(id);
      const ikp = engine.getInputKeyPath(id);
      let values = [];
      docs.forEach((doc) =>
      {
        const vals = yadeep.get(engine.transform(doc), okp);
        values = values.concat(vals);
      });
      const bestType = TypeUtil.getCommonJsType(values);
      if (bestType !== EngineUtil.getRepresentedType(id, engine))
      {
        const transformOptions: NodeOptionsType<TransformationNodeType.CastNode> = {
          toTypename: bestType,
        };
        if (EngineUtil.isNamedField(ikp))
        {
          engine.setFieldType(id, bestType);
        }
        else
        {
          engine.setFieldProp(id, valueTypeKeyPath, bestType);
        }
        engine.appendTransformation(TransformationNodeType.CastNode, List([ikp]), transformOptions);
      }
    });
  }

  // attempt to detect date types and integer float
  // does not add type casts
  public static autodetectElasticTypes(engine: TransformationEngine, documents: List<object>)
  {
    const docs = EngineUtil.preprocessDocuments(documents);
    engine.getAllFieldIDs().forEach((id) =>
    {
      if (engine.getFieldProp(id, List(['elastic', 'isPrimaryKey'])))
      {
        return;
      }
      const okp = engine.getOutputKeyPath(id);

      let values = [];
      docs.forEach((doc) =>
      {
        const vals = yadeep.get(engine.transform(doc), okp);
        values = values.concat(vals);
      });
      const repType = EngineUtil.getRepresentedType(id, engine);
      if (repType === 'string')
      {
        const type = TypeUtil.getCommonElasticType(values);
        engine.setFieldProp(id, List(['elastic', 'elasticType']), type);
      }
      else if (repType === 'number')
      {
        const type = TypeUtil.getCommonElasticNumberType(values);
        engine.setFieldProp(id, List(['elastic', 'elasticType']), type);
      }
    });
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

      const ikp = engine.getInputKeyPath(id);
      const repType = EngineUtil.getRepresentedType(id, engine);
      if (repType !== 'array' && repType !== 'object')
      {
        // TODO 1942 remove check above when arrays are properly deobjectified
        const transformOptions: NodeOptionsType<TransformationNodeType.CastNode> = {
          toTypename: repType,
        };
        engine.appendTransformation(TransformationNodeType.CastNode, List([ikp]), transformOptions);
      }
    });
  }

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
      const e: TransformationEngine = new TransformationEngine(doc);
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

  private static preprocessDocuments(documents: List<object>): List<object>
  {
    return documents.map((doc) => objectify(doc)).toList();
  }

  // copy a field from e1 to e2 with specified keypath
  // does not transfer transformations
  private static transferField(id1: number, keypath: KeyPath, e1: TransformationEngine, e2: TransformationEngine)
  {
    const id2 = e2.addField(keypath, e1.getFieldType(id1));
    e2.setFieldProps(id2, e1.getFieldProps(id1));
    if (e1.getFieldEnabled(id1))
    {
      e2.enableField(id2);
    }
    else
    {
      e2.disableField(id2);
    }
    return id2;
  }

  // warning types get typed as strings, but should emit a warning
  private static mergeTypes(type1: FieldTypes, type2: FieldTypes): FieldTypes | 'warning' | 'softWarning'
  {
    if (CompatibilityMatrix[type1][type2] !== undefined)
    {
      return CompatibilityMatrix[type1][type2];
    }
    else
    {
      return CompatibilityMatrix[type2][type1];
    }
  }
}

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
