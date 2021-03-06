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

// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable
import * as GraphLib from 'graphlib';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as yadeep from 'yadeep';

import { _ETLTemplate, ETLTemplate, templateForBackend } from 'shared/etl/immutable/TemplateRecords';
import { NodeTypes, TemplateBase, TemplateObject } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNode from 'shared/transformations/TransformationNode';
import
{
  TransformationEngine as V5TransformationEngine,
  TransformationNode as V5Node,
} from 'shared/transformations/V5TransformationEngine';
import { KeyPath } from 'terrain-keypath';
import { convertV5Engine } from './ConvertV5Engine';

export const CURRENT_TEMPLATE_VERSION: TemplateVersion = 'tv5.1';
export const FIRST_TEMPLATE_VERSION: TemplateVersion = 'tv4';

export type TemplateVersion = 'tv4' | 'tv5' | 'tv5.1';
export const TemplateVersions = ['tv4', 'tv5', 'tv5.1'];

export function getTemplateVersion(templateObj: object): TemplateVersion
{
  const version = _.get(templateObj, ['meta', 'version']);
  if (version !== undefined && typeof version === 'string')
  {
    return version as TemplateVersion;
  }
  else
  {
    return FIRST_TEMPLATE_VERSION;
  }
}

function searchForEngines(template: TemplateBase): yadeep.ContextResult[]
{
  const locBase = List(['process', 'edges']);
  const match: object = yadeep.get(template, locBase);
  if (match === undefined)
  {
    return [];
  }
  const ret: yadeep.ContextResult[] = [];
  for (const key of Object.keys(match))
  {
    ret.push({
      value: match[key]['transformations'],
      location: locBase.push(key).push('transformations'),
    });
  }
  return ret;
}

/*
 *  This migration updates keypaths that use '*' as wildcards to use -1, and numeric keys to be actual numbers
 */
function upgrade4To5(templateObj: TemplateBase): { changes: number, template: TemplateBase }
{
  let changes = 0;
  const convertKeyPath = (kp: KeyPath) =>
  {
    let changed = false;
    const newKp = kp.map((value) =>
    {
      if (value === '*')
      {
        changed = true;
        return -1;
      }
      else if (typeof value === 'string' && !isNaN(Number(value)))
      {
        changed = true;
        return Number(value);
      }
      else
      {
        return value;
      }
    }).toList();
    if (changed)
    {
      changes++;
    }
    return newKp;
  };
  const convertAll = (kps: List<KeyPath>) => kps.map((kp) => convertKeyPath(kp)).toList();

  let template = _.cloneDeep(templateObj);
  for (const match of searchForEngines(template))
  {
    const { value, location } = match;
    const engine = V5TransformationEngine.load(value);
    const dag = engine.dag;
    const nodes = dag.nodes();
    if (nodes !== undefined && nodes.length > 0)
    {
      nodes.forEach((id) =>
      {
        const node: V5Node = dag.node(id);
        node.fields = convertAll(node.fields);
        if (node.meta['newFieldKeyPaths'] !== undefined)
        {
          node.meta['newFieldKeyPaths'] = convertAll(node.meta['newFieldKeyPaths']);
        }
      });
    }
    engine.fieldNameToIDMap = engine.fieldNameToIDMap.mapKeys((kp) => convertKeyPath(kp)).toMap();
    engine.IDToFieldNameMap = engine.IDToFieldNameMap.map((kp) => convertKeyPath(kp)).toMap();
    template = yadeep.setIn(template, location, JSON.stringify(engine.toJSON())) as TemplateBase;
  }
  return {
    template,
    changes,
  };
}

/*
 *  Change fieldNameToIDMap and IDToFieldNameMap to use IDToPathMap
 *  Refactor all differences in paths to use rename nodes
 *
 *  For each field, if the input and output keypaths are different, append a rename transformation
 *
 */
function upgrade5To51(templateObj: TemplateBase): { changes: number, template: TemplateBase }
{
  const changes = 1;

  const template = _.cloneDeep(templateObj);
  for (const match of searchForEngines(template))
  {
    const { value, location } = match;
    const oldEngine = V5TransformationEngine.load(typeof value === 'string' ? value : JSON.stringify(value));
    const newEngine = convertV5Engine(oldEngine);
    yadeep.setIn(template, location, newEngine.toJSON());
  }
  return {
    template,
    changes,
  };
}

export function updateTemplateIfNeeded(templateObj: TemplateBase): { template: TemplateBase, updated: boolean, message: string }
{
  let version = getTemplateVersion(templateObj);
  let template = templateObj;
  let message = '';
  let updated = false;
  let changes = 0;

  if (version === 'tv4')
  {
    const upgrade = upgrade4To5(template);
    template = upgrade.template;
    changes += upgrade.changes;
    updated = true;
    version = 'tv5';
  }

  if (version === 'tv5')
  {
    const upgrade = upgrade5To51(template);
    template = upgrade.template;
    changes += upgrade.changes;
    updated = true;
    version = 'tv5.1';
  }

  if (getTemplateVersion(template) !== CURRENT_TEMPLATE_VERSION)
  {
    changes++;
    updated = true;
    template.meta['version'] = CURRENT_TEMPLATE_VERSION;
  }

  message = `${changes} changes made to template`;

  return {
    template,
    updated,
    message,
  };
}

export interface MigrationTestFile
{
  testName: string;
  numDocs: number;
  numFailed: number;
  whichEdge: number;
  inputDocs: any[];
  outputDocs: Array<(object | 'FAIL')>;
  template: object;
}
