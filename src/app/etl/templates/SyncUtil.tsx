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
import { _ElasticFieldSettings, _TemplateField, _TransformationNode, ElasticFieldSettings, TemplateField, TransformationNode }
  from 'etl/templates/FieldTypes';
import { ELASTIC_TYPES, jsToElastic } from 'shared/etl/ETLTypes';
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
  language = 'elastic',
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
    langSettings: _ElasticFieldSettings({
      langType: language,
      type: jsToElastic(engine.getFieldType(id)),
    }),
    fieldId: id,
    transformations,
    name: enginePath[enginePath.length - 1],
  });

  return _TemplateField({
    isIncluded: engine.getFieldEnabled(id),
    langSettings: _ElasticFieldSettings({
      langType: language,
      type: jsToElastic(engine.getFieldType(id)),
    }),
    fieldId: id,
    transformations,
    name: enginePath[enginePath.length - 1],
  });
}

export function updateFieldFromEngine(
  engine: TransformationEngine,
  id: number,
  oldField: TemplateField,
  language = 'elastic',
): TemplateField
{
  const updatedField = createFieldFromEngine(engine, id, language);
  return updatedField.set('children', oldField.children);
}
