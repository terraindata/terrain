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
// tslint:disable:max-classes-per-file import-spacing

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import { FieldNodeProxy, FieldTreeProxy } from 'etl/templates/FieldProxy';
import
{
  _TemplateField, _TransformationNode,
  TemplateField, TransformationNode,
} from 'etl/templates/FieldTypes';
import { _ETLTemplate, ETLTemplate } from 'etl/templates/TemplateTypes';
import { KeyPath as EnginePath, WayPoint } from 'shared/transformations/KeyPath';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

export function createTreeFromEngine(engine: TransformationEngine): TemplateField
{
  const ids = engine.getAllFieldIDs();
  // sort the paths to ensure we visit parents before children
  const sortedIds = ids.sort((a, b) => engine.getOutputKeyPath(a).size - engine.getOutputKeyPath(b).size);
  const rootId = sortedIds.get(0);
  const rootField = createFieldFromEngine(engine, rootId);
  const tree = new FieldTreeProxy(rootField, engine);
  const rootNode = tree.getRootNode();

  const enginePathToNode: {
    [kp: string]: FieldNodeProxy,
  } = {
      [JSON.stringify([])]: rootNode,
    };

  sortedIds.forEach((id, index) =>
  {
    const enginePath = engine.getOutputKeyPath(id).toJS();
    if (enginePath.length === 0)
    {
      return;
    }
    const parentPath = enginePath.slice(0, -1); // TODO update this when arrays become a thing
    const parentNode: FieldNodeProxy = enginePathToNode[JSON.stringify(parentPath)];
    const newField = createFieldFromEngine(engine, id);

    const newNode = parentNode.discoverChild(newField);
    enginePathToNode[JSON.stringify(enginePath)] = newNode;
  });

  return tree.getRootField();
}

export function createFieldFromEngine(
  engine: TransformationEngine,
  id: number,
): TemplateField
{
  const enginePath = engine.getOutputKeyPath(id).toJS();
  const transformationIds = engine.getTransformations(id);

  const transformations: List<TransformationNode> = transformationIds.map((transformationId, index) =>
  {
    const transformNode = engine.getTransformationInfo(transformationId);
    return _TransformationNode({
      id: transformNode.id,
      typeCode: transformNode.typeCode,
      fieldIDs: transformNode.fieldIDs,
      meta: transformNode.meta,
    });
  }).toList();
  const result = _TemplateField({
    isIncluded: engine.getFieldEnabled(id),
    fieldId: id,
    transformations,
    name: enginePath[enginePath.length - 1],
  });

  return _TemplateField({
    isIncluded: engine.getFieldEnabled(id),
    fieldId: id,
    transformations,
    name: enginePath[enginePath.length - 1],
  });
}

export function updateFieldFromEngine(
  engine: TransformationEngine,
  id: number,
  oldField: TemplateField,
): TemplateField
{
  const updatedField = createFieldFromEngine(engine, id);
  return updatedField.set('children', oldField.children);
}

export function initialTemplateFromDocs(documents: List<object>)
  : { template: ETLTemplate, rootField: TemplateField }
{
  if (documents.size === 0)
  {
    return {
      template: _ETLTemplate(),
      rootField: _TemplateField(),
    };
  }
  const engine = createEngineFromDocs(documents);
  const rootField = createTreeFromEngine(engine);

  const template = _ETLTemplate({
    id: -1,
    templateName: name,
    transformationEngine: engine,
  });
  return {
    template,
    rootField,
  };
}

export function createEngineFromDocs(documents: List<object>)
{
  return createMergedEngine(documents);
}

type FieldTypes = 'array' | 'object' | 'string' | 'number' | 'boolean';
function hashPath(keypath: EnginePath)
{
  return JSON.stringify(keypath.toJS());
}

function unhashPath(keypath: string)
{
  return EnginePath(JSON.parse(keypath));
}

function turnIndicesIntoWildcards(
  keypath: EnginePath,
  engine: TransformationEngine,
  mapping: {[k: string]: number}
): EnginePath
{
  if (keypath.size === 0)
  {
    return keypath;
  }
  const arrayIndices = {};
  for (const i of _.range(1, keypath.size))
  {
    const parentPath = keypath.slice(0, i).toList();
    const parentId = mapping[hashPath(parentPath)];

    if (parentId !== undefined && engine.getFieldType(parentId) === 'array')
    {
      arrayIndices[i] = true;
    }
  }
  return keypath.map((key, i) => {
    return arrayIndices[i] === true ? '*' : key
  }).toList();
}

// creates a mapping from hashed keypath to fieldId
function createPathToIdMap(engine: TransformationEngine): {[k: string]: number}
{
  const fieldIds = engine.getAllFieldIDs();
  const mapping = {};
  fieldIds.forEach((id, i) => {
    mapping[hashPath(engine.getOutputKeyPath(id))] = id;
  });
  return mapping;
}

// takes an engine path and the path type mapping and returns true if
// all of the path's parent paths represent array or object types
function isAValidField(keypath: EnginePath, pathTypes: {[k: string]: FieldTypes}): boolean
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

function createMergedEngine(documents: List<object>): TransformationEngine
{
  const warnings: string[] = [];
  const softWarnings: string[] = [];
  const pathTypes: {[k: string]: FieldTypes } = {};
  documents.forEach((doc, i) => {
    const e: TransformationEngine = new TransformationEngine(doc);
    const fieldIds = e.getAllFieldIDs();
    const pathToIdMap = createPathToIdMap(e);
    // fieldIds = fieldIds.sortBy((a, b) => e.getOutputKeyPath(a).size - e.getOutputKeyPath(b).size);
    fieldIds.forEach((id, j) => {
      const currentType: FieldTypes = e.getFieldType(id) as FieldTypes;
      const wildCardedPath = turnIndicesIntoWildcards(e.getOutputKeyPath(id), e, pathToIdMap)
      const path = hashPath(wildCardedPath);
      if (pathTypes[path] !== undefined)
      {
        const existingType = pathTypes[path];
        const newType = mergeTypes(currentType, existingType);
        if (newType === 'warning' || newType === 'softWarning')
        {
          if (newType === 'warning')
          {
            warnings.push(
              `path: ${path} has incompatible types. \
              Interpreted types ${currentType} and ${existingType} are incompatible. \
              The resultant type will be coerced to a string. \
              Details: document ${i}`
            );
          }
          else
          {
            softWarnings.push(
              `path: ${path} has different types, but can be resolved. \
              Interpreted types ${currentType} and ${existingType} are different. \
              The resultant type will be coerced to a string. \
              Details: document ${i}`
            );
          }
          pathTypes[path] = 'string';
        }
      }
      else
      {
        pathTypes[path] = currentType;
      }
    });
  });

  const engine = new TransformationEngine();
  const hashedPaths = List(Object.keys(pathTypes));
  hashedPaths.forEach((hashedPath, i) => {
    if (isAValidField(unhashPath(hashedPath), pathTypes))
    {
      const fieldType = pathTypes[hashedPath];
      engine.addField(unhashPath(hashedPath), fieldType);
    }
  });
  return engine;
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
}

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
