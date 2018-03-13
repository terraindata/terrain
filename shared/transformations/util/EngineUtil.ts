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
import * as _ from 'lodash';
const { List, Map } = Immutable;

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { KeyPath } from 'shared/util/KeyPath';

export type PathHash = string;
export interface PathHashMap<T>
{
  [k: string]: T;
}

// document merge logic
export function hashPath(keypath: KeyPath): PathHash
{
  return JSON.stringify(keypath.toJS());
}

export function unhashPath(keypath: PathHash): KeyPath
{
  return KeyPath(JSON.parse(keypath));
}

const valueTypeKeyPath = List(['valueType']);

// root is considered to be a named field
export function isNamedField(
  keypath: KeyPath,
): boolean
{
  const last = keypath.last();
  return last !== '*' && Number.isNaN(Number(last));
}

export function isArrayField(
  keypath: KeyPath,
  engine: TransformationEngine,
  pathToIdMap: PathHashMap<number>,
): boolean
{
  const hashedPath = hashPath(keypath);
  return engine.getFieldType(pathToIdMap[hashedPath]) === 'array';
}

// turn all indices into a particular value, based on
// an existing engine that has fields with indices in them
export function turnIndicesIntoValue(
  keypath: KeyPath,
  engine: TransformationEngine,
  pathToIdMap: PathHashMap<number>,
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
    if (!isNamedField(path))
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

// creates a mapping from hashed keypath to fieldId
export function createPathToIdMap(engine: TransformationEngine): PathHashMap<number>
{
  const fieldIds = engine.getAllFieldIDs();
  const mapping = {};
  fieldIds.forEach((id, i) =>
  {
    mapping[hashPath(engine.getOutputKeyPath(id))] = id;
  });
  return mapping;
}

// takes an engine path and the path type mapping and returns true if
// all of the path's parent paths represent array
export function isAValidField(keypath: KeyPath, pathTypes: PathHashMap<FieldTypes>): boolean
{
  if (keypath.size === 0)
  {
    return true;
  }
  for (const i of _.range(1, keypath.size))
  {
    const parentPath = keypath.slice(0, i).toList();
    const parentType = pathTypes[hashPath(parentPath)];
    if (parentType !== undefined && parentType !== 'object' && parentType !== 'array')
    {
      return false;
    }
  }
  return true;
}

export function addFieldsToEngine(
  pathTypes: PathHashMap<FieldTypes>,
  pathValueTypes: PathHashMap<FieldTypes>,
  engine: TransformationEngine,
)
{
  const hashedPaths = List(Object.keys(pathTypes));
  hashedPaths.forEach((hashedPath, i) =>
  {
    if (isAValidField(unhashPath(hashedPath), pathTypes))
    {
      const fieldType = pathTypes[hashedPath];
      const id = engine.addField(unhashPath(hashedPath), fieldType);

      const valueType = pathValueTypes[hashedPath];
      if (valueType !== undefined)
      {
        engine.setFieldProp(id, valueTypeKeyPath, valueType);
      }
    }
  });
}

export function getConsistentType(id: number, engine: TransformationEngine): FieldTypes
{
  if (engine.getInputKeyPath(id).last() === '*')
  {
    return engine.getFieldProp(id, valueTypeKeyPath) as FieldTypes;
  }
  else
  {
    return engine.getFieldType(id) as FieldTypes;
  }
}

export function createMergedEngine(documents: List<object>):
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
    const pathToIdMap = createPathToIdMap(e);

    fieldIds.forEach((id, j) =>
    {
      const currentType: FieldTypes = getConsistentType(id, e);
      const deIndexedPath = turnIndicesIntoValue(e.getOutputKeyPath(id), e, pathToIdMap, '*');
      const path = hashPath(deIndexedPath);

      if (pathTypes[path] !== undefined)
      {
        const existingType = pathTypes[path];
        const newType = mergeTypes(currentType, existingType);
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
  addFieldsToEngine(pathTypes, pathValueTypes, engine);

  return {
    engine,
    warnings,
    softWarnings,
  };
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

// warning types get typed as strings, but should emit a warning
function mergeTypes(type1: FieldTypes, type2: FieldTypes): FieldTypes | 'warning' | 'softWarning'
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
