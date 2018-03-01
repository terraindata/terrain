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
import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { FieldNodeProxy, FieldTreeProxy } from 'etl/templates/FieldProxy';
import
{
  _TemplateField, _TransformationNode,
  TemplateField, TransformationNode,
} from 'etl/templates/FieldTypes';
import { FieldMap } from 'etl/templates/TemplateTypes';
import { _ETLTemplate, ETLTemplate } from 'etl/templates/TemplateTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { KeyPath as EnginePath, WayPoint } from 'shared/util/KeyPath';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { createMergedEngine } from 'shared/transformations/util/EngineUtil';

export function createInitialTemplate(documents: List<object>, source?: SourceConfig, sink?: SinkConfig)
  : { template: ETLTemplate, fieldMap: FieldMap, warnings: string[], softWarnings: string[] }
{
  if (documents == null || documents.size === 0)
  {
    return {
      template: _ETLTemplate(),
      fieldMap: Map(),
      warnings: ['No documents provided for initial Template construction'],
      softWarnings: [],
    };
  }
  const { engine, warnings, softWarnings } = createMergedEngine(documents);
  const fieldMap = createTreeFromEngine(engine);

  let template = _ETLTemplate({
    id: -1,
    templateName: name,
    transformationEngine: engine,
  });

  // default source and sink is upload and download
  template = template.setIn(['sources', 'primary'],
    source !== undefined ?
      source
      :
      _SourceConfig({
        type: Sources.Upload,
      }),
  );
  template = template.setIn(['sinks', 'primary'],
    sink !== undefined ?
      sink
      :
      _SinkConfig({
        type: Sinks.Download,
      }),
  );

  return {
    template,
    fieldMap,
    warnings,
    softWarnings,
  };
}

export function createTreeFromEngine(engine: TransformationEngine): FieldMap
{
  const ids = engine.getAllFieldIDs();
  // sort the paths to ensure we visit parents before children
  const sortedIds = ids.sort((a, b) => engine.getOutputKeyPath(a).size - engine.getOutputKeyPath(b).size);
  const fieldMap = Map() as FieldMap;
  const tree = new FieldTreeProxy(fieldMap, engine);

  const enginePathToNode: {
    [kp: string]: FieldNodeProxy,
  } = {

    };

  sortedIds.forEach((id, index) =>
  {
    const enginePath = engine.getOutputKeyPath(id).toJS();
    if (enginePath.length === 0)
    {
      return;
    }
    const parentPath = enginePath.slice(0, -1);
    const parentNode: FieldNodeProxy = enginePathToNode[JSON.stringify(parentPath)];
    const newField = createFieldFromEngine(engine, id);
    const newNode = parentNode != null ?
      parentNode.discoverChild(newField) :
      tree.createParentlessField(newField);
    enginePathToNode[JSON.stringify(enginePath)] = newNode;
  });
  return tree.getFieldMap();
}

// takes a field id and and engine and constructs a TemplateField object (does not construct children)
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

  return _TemplateField({
    isIncluded: engine.getFieldEnabled(id),
    fieldId: id,
    type: engine.getFieldType(id) as FieldTypes,
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
  return updatedField.set('childrenIds', oldField.childrenIds);
}
