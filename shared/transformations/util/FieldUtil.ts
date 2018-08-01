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
import * as Utils from 'shared/transformations/util/EngineUtils';

import LanguageController, { AllLanguages } from 'shared/etl/languages/LanguageControllers';
import { ElasticTypes } from 'shared/etl/types/ETLElasticTypes';
import { DateFormats, FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import FriendEngine from 'shared/transformations/FriendEngine';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, {
  IdentityTypes,
  NodeOptionsType,
  TransformationEdgeTypes as EdgeTypes,
} from 'shared/transformations/TransformationNodeType';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';

const etlTypeKeyPath = List(['etlType']);
type IdentityOptions = NodeOptionsType<TransformationNodeType.IdentityNode>;
/*
 *  Utility class to perform common operations on the fields of transformation engines
 */
export default class FieldUtil
{
  /*
   *  Use this for organic fields
   */
  public static addFieldToEngine(engine: TransformationEngine, keypath: KeyPath, type: FieldTypes, node?: number): number
  {
    const cfg = {
      etlType: type,
    };
    return engine.addField(keypath, cfg, node);
  }

  /*
   *  Add a field but attempt to infer pre-existing transformations and perform a replay on renames
   *  Should refactor this to use a visitor that traverses all the nodes associated with the parent to
   *  determine necessary side effects
   */
  public static addInferredField(engine: TransformationEngine, keypath: KeyPath, type: FieldTypes): number
  {
    const inferred = Utils.traversal.findInferredSources(engine as FriendEngine, keypath);
    if (inferred == null) // then organic and parentless
    {
      return FieldUtil.addFieldToEngine(engine, keypath, type);
    }
    const { parentId, syntheticSource, renames } = inferred;

    const graph = (engine as FriendEngine).dag;
    const parentIdentity = Utils.traversal.findIdentityNode(engine, parentId);
    const parentNode = graph.node(String(parentIdentity));
    const initialParentPath = parentNode.fields.get(0).path;
    const finalParentPath = engine.getFieldPath(parentId);

    // we need to "replay" all renames that occured on the parent
    const childSegment = keypath.slice(finalParentPath.size);
    const indices = keypath.filter((wp) => typeof wp === 'number');
    const pathTranslator = (parentPath: KeyPath) =>
    {
      let specifiedIndex = 0;
      for (let i = 0; i < parentPath.size; i++)
      {
        if (typeof parentPath.get(i) === 'number')
        {
          parentPath = parentPath.set(i, indices.get(specifiedIndex));
          specifiedIndex++;
        }
      }
      return parentPath.concat(childSegment).toList();
    };

    const fieldId = FieldUtil.addFieldToEngine(
      engine, pathTranslator(initialParentPath), type, syntheticSource == null ? undefined : syntheticSource);

    for (const rename of renames)
    {
      const renameSource = Utils.traversal.findIdentitySourceNode(engine, Number(rename));
      const parentRename = graph.node(String(rename));
      const fieldPath = pathTranslator(parentRename.fields.get(0).path);

      (engine as FriendEngine).setFieldPath(fieldId, fieldPath);
      const renameIdentity = (engine as FriendEngine).addIdentity(fieldId, renameSource, IdentityTypes.Rename);
      Utils.traversal.appendNodeToField(engine, fieldId, renameIdentity, EdgeTypes.Same);
    }
    return fieldId;
  }

  // add field, but infer the type
  public static addIndexedField(engine: TransformationEngine, keypath: KeyPath): number
  {
    const existingId = engine.getFieldID(keypath);
    if (existingId !== undefined)
    {
      return existingId;
    }

    const pathToCheck = Utils.path.convertIndices(keypath);
    const id = engine.getFieldID(pathToCheck);
    if (id === undefined)
    {
      throw new Error('Could not find appropriate field to get type information');
    }
    else
    {
      return FieldUtil.addInferredField(engine, keypath, FieldUtil.fieldType(id, engine));
    }
  }

  public static setType(engine: TransformationEngine, fieldId: number, type: FieldTypes)
  {
    FieldUtil.changeFieldTypeSideEffects(engine, fieldId, type);
    engine.setFieldProp(fieldId, etlTypeKeyPath, type);
  }

  public static fieldType(id: number, engine: TransformationEngine): FieldTypes
  {
    const etlType = engine.getFieldProp(id, etlTypeKeyPath) as FieldTypes;
    return etlType == null ? FieldTypes.String : etlType;
  }

  public static isOrganic(engine: TransformationEngine, id: number)
  {
    const identity = Utils.traversal.findIdentityNode(engine, id);
    const node = engine.getTransformationInfo(identity);
    return (node.meta as IdentityOptions).type === IdentityTypes.Organic;
  }

  public static changeFieldTypeSideEffects(engine: TransformationEngine, fieldId: number, newType: FieldTypes)
  {
    for (const language of AllLanguages)
    {
      LanguageController.get(language).changeFieldTypeSideEffects(engine, fieldId, newType);
    }
  }

  public static copyField(e1: TransformationEngine, id1: number, keypath: KeyPath, node?: number, e2 = e1)
  {
    const id2 = e2.addField(keypath, {}, node);
    FieldUtil.transferFieldData(id1, id2, e1, e2);
    return id2;
  }

  // copies a field's configuration from e1 to e2. id1 and id2 should both exist in e1 and e2 respectively
  public static transferFieldData(id1: number, id2: number, e1: TransformationEngine, e2: TransformationEngine)
  {
    e2.setFieldProps(id2, _.cloneDeep(e1.getFieldProps(id1)));
    if (e1.getFieldEnabled(id1))
    {
      e2.enableField(id2);
    }
    else
    {
      e2.disableField(id2);
    }

    if (e1 === e2)
    {
      for (const language of AllLanguages)
      {
        LanguageController.get(language).copyFieldInfoSideEffects(e1, id2, id1);
      }
    }
  }
}
