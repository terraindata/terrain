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
import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';

import
{
  _TemplateField, _TransformationNode,
  TemplateField, TransformationNode,
} from 'etl/templates/FieldTypes';
import { FieldMap } from 'etl/templates/TemplateEditorTypes';
import { _ETLTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { KeyPath as EnginePath, WayPoint } from 'shared/util/KeyPath';

export function createTreeFromEngine(engine: TransformationEngine): FieldMap
{
  const ids = engine.getAllFieldIDs();
  // sort the paths to ensure we visit parents before children
  const sortedIds = ids.sort((a, b) => engine.getOutputKeyPath(a).size - engine.getOutputKeyPath(b).size);

  const enginePathToField: {
    [kp: string]: TemplateField,
  } = {};

  sortedIds.forEach((id, index) =>
  {
    const enginePath = engine.getOutputKeyPath(id).toJS();
    if (enginePath.length === 0)
    {
      return;
    }
    const parentPath = enginePath.slice(0, -1);
    const parentHash = JSON.stringify(parentPath);
    const parentField: TemplateField = enginePathToField[parentHash];
    const newField = createFieldFromEngine(engine, id);

    if (parentField != null)
    {
      const newParentField = parentField.update('childrenIds', (childIds): List<number> => childIds.push(id));
      enginePathToField[parentHash] = newParentField;
    }
    enginePathToField[JSON.stringify(enginePath)] = newField;
  });

  let fieldMap = Map() as FieldMap;
  sortedIds.forEach((id, index) =>
  {
    const enginePath = engine.getOutputKeyPath(id).toJS();
    const field = enginePathToField[JSON.stringify(enginePath)];
    if (field != null)
    {
      fieldMap = fieldMap.set(id, field);
    }
  });
  return fieldMap;
}

// takes a field id and and engine and constructs a TemplateField object (does not construct children)
export function createFieldFromEngine(
  engine: TransformationEngine,
  id: number,
): TemplateField
{
  const enginePath = engine.getOutputKeyPath(id);
  const transformationIds = engine.getTransformations(id);

  const transformations: List<TransformationNode> = transformationIds.map((transformationId, index) =>
  {
    const transformNode = engine.getTransformationInfo(transformationId);
    return _TransformationNode({
      id: transformNode.id,
      typeCode: transformNode.typeCode,
      fields: transformNode.fields,
      meta: transformNode.meta,
    });
  }).toList();

  return _TemplateField({
    isIncluded: engine.getFieldEnabled(id),
    fieldId: id,
    fieldProps: engine.getFieldProps(id),
    inputKeyPath: engine.getInputKeyPath(id),
    outputKeyPath: engine.getOutputKeyPath(id),
    type: engine.getFieldType(id) as FieldTypes,
    transformations,
    name: enginePath.last(),
  });
}

export function updateFieldFromEngine(
  engine: TransformationEngine,
  id: number,
  oldField: TemplateField,
): TemplateField
{
  const updatedField = createFieldFromEngine(engine, id);
  return updatedField.set('childrenIds', oldField.childrenIds);
}

export function postorderForEach(
  engine: TransformationEngine,
  fromId: number,
  fn: (id: number) => void,
)
{
  const fieldMap = createTreeFromEngine(engine);
  for (const id of postorder(fieldMap, fromId))
  {
    fn(id);
  }
}

function* postorder(fieldMap: FieldMap, id: number)
{
  const field = fieldMap.get(id);
  if (field !== undefined)
  {
    const ids = field.childrenIds;
    for (let i = 0; i < ids.size; i++)
    {
      yield* postorder(fieldMap, ids.get(i));
    }
    yield id;
  }
}

export function preorderForEach(
  engine: TransformationEngine,
  fromId: number,
  fn: (id: number) => void,
)
{
  const fieldMap = createTreeFromEngine(engine);
  for (const id of preorder(fieldMap, fromId))
  {
    fn(id);
  }
}

function* preorder(fieldMap: FieldMap, id: number)
{
  const field = fieldMap.get(id);
  if (field !== undefined)
  {
    const ids = field.childrenIds;
    yield id;
    for (let i = 0; i < ids.size; i++)
    {
      yield* preorder(fieldMap, ids.get(i));
    }
  }
}
