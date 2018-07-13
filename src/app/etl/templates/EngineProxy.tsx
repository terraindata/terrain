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
// tslint:disable:max-classes-per-file

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;

import { _ReorderableSet, ReorderableSet } from 'shared/etl/immutable/ReorderableSet';
import LanguageController from 'shared/etl/languages/LanguageControllers';
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import * as Utils from 'shared/etl/util/ETLUtils';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import { validateNewFieldName, validateRename } from 'shared/transformations/util/TransformationsUtil';
import { KeyPath as EnginePath, WayPoint } from 'shared/util/KeyPath';

export interface TransformationConfig
{
  type?: FieldTypes; // specify new field type
  newSourceType?: FieldTypes; // if the source field changes types due to transformation
}

/*
 *  Should this file in be /shared?
 *  Proxy objects are generated synchronously and aren't meant to be persisted
 *  Don't hold references to proxies across call contexts
 */
export class EngineProxy
{
  constructor(
    private engine: TransformationEngine,
    private requestRebuild: (id?: number) => void,
    private orderController: {
      setOrder: (newOrdering: ReorderableSet<number>) => void,
      getOrder: () => ReorderableSet<number>,
    },
  )
  {

  }

  public getEngine(): TransformationEngine
  {
    return this.engine;
  }

  public rebuildAll()
  {
    if (this.requestRebuild !== undefined)
    {
      this.requestRebuild();
    }
  }

  public rebuildField(fieldId: number)
  {
    if (this.requestRebuild !== undefined)
    {
      this.requestRebuild(fieldId);
    }
  }

  public makeFieldProxy(fieldId: number)
  {
    return new FieldProxy(this, fieldId);
  }

  public addTransformation(
    type: TransformationNodeType,
    fields: List<EnginePath>,
    options: {
      newFieldKeyPaths?: List<EnginePath>;
      [k: string]: any;
    },
    config?: TransformationConfig, // if not specified, any new fields will have the same type as source field
  )
  {
    const origFieldId = this.engine.getFieldID(fields.get(0));
    this.engine.appendTransformation(type, fields, options);
    if (config !== undefined && config.newSourceType !== undefined)
    {
      fields.forEach((kp) =>
      {
        const fieldId = this.engine.getFieldID(kp);
        Utils.engine.changeType(this.engine, fieldId, config.newSourceType);
      });
    }
    if (options.newFieldKeyPaths !== undefined)
    {
      options.newFieldKeyPaths.forEach((kp) =>
      {
        const newId = this.engine.getFieldID(kp);
        this.orderField(newId, origFieldId);

        if (config !== undefined && config.type !== undefined)
        {
          Utils.engine.setType(this.engine, newId, config.type);
        }
        else
        {
          const synthType = Utils.engine.fieldType(origFieldId, this.engine);
          Utils.engine.setType(this.engine, newId, synthType);
        }
      });
    }
    this.requestRebuild();
  }

  public editTransformation(id: number, options)
  {
    this.engine.editTransformation(id, options);
    this.requestRebuild(id);
  }

  public deleteTransformation(id: number)
  {
    this.engine.deleteTransformation(id);
  }

  public setFieldHidden(id: number, hidden: boolean)
  {
    this.setUIFieldProp(id, 'hidden', hidden);
  }

  public setUIFieldProp(fieldId: number, key: string, value: any)
  {
    this.engine.setFieldProp(fieldId, EnginePath(['uiState', key]), value);
    this.requestRebuild();
  }

  /*
   *  This is a rather complicated operation
   *  If the given keypath is [foo, *], then we need to create the specific field [foo, index]
   *  After creating the extracted field, we need to perform the duplication operation on the extracted field
   */
  public extractIndexedArrayField(sourceId: number, index: number, destKP: KeyPath)
  {
    const sourceKP = this.engine.getFieldPath(sourceId);

    if (sourceKP.size === 0)
    {
      throw new Error('Cannot extract array field, source keypath is empty');
    }
    const specifiedSourceKP = sourceKP.set(sourceKP.size - 1, index);
    const specifiedSourceType = Utils.engine.fieldType(sourceId, this.engine);

    let specifiedSourceId: number;

    if (specifiedSourceType === FieldTypes.Array)
    {
      const anyChildId = Utils.engine.findChildField(sourceId, this.engine);
      if (anyChildId === undefined)
      {
        throw new Error('Field type is array, but could not find any children in the Transformation Engine');
      }
      const childType = Utils.engine.fieldType(anyChildId, this.engine);
      specifiedSourceId = this.addField(specifiedSourceKP, FieldTypes.Array, childType);
    }
    else
    {
      specifiedSourceId = this.addField(specifiedSourceKP, specifiedSourceType);
    }
    this.duplicateField(specifiedSourceId, destKP);

    const parentKP = sourceKP.slice(0, -1).toList();
    this.orderField(this.engine.getFieldID(destKP), this.engine.getFieldID(parentKP));
    this.requestRebuild();
  }

  public extractSimpleArrayField(sourceId, destKP: KeyPath)
  {
    const optionsNew: NodeOptionsType<TransformationNodeType.DuplicateNode> = {
      newFieldKeyPaths: List([destKP]),
    };
    this.addTransformation(
      TransformationNodeType.DuplicateNode,
      List([this.engine.getFieldPath(sourceId)]),
      optionsNew,
    );
    const newFieldId = this.engine.getFieldID(destKP);

    const newFieldType = Utils.engine.fieldType(sourceId, this.engine);
    this.addFieldToEngine(destKP.push(-1), newFieldType);
    Utils.engine.setType(this.engine, newFieldId, FieldTypes.Array);
    this.requestRebuild();
  }

  public addField(keypath: KeyPath, type: FieldTypes, childType = FieldTypes.String)
  {
    let newId: number;
    if (type === FieldTypes.Array)
    {
      newId = this.addFieldToEngine(keypath, type);
      const wildId = this.addFieldToEngine(keypath.push(-1), childType);
    }
    else
    {
      newId = this.addFieldToEngine(keypath, type);
    }
    Utils.engine.castField(this.engine, newId, type);
    this.requestRebuild();
    return newId;
  }

  public addRootField(name: string, type: FieldTypes)
  {
    const pathToAdd = List([name]);
    if (validateNewFieldName(this.engine, -1, pathToAdd).isValid)
    {
      this.addField(pathToAdd, type);
      this.requestRebuild();
    }
  }

  public setFieldEnabled(fieldId: number, enabled: boolean)
  {
    if (enabled)
    {
      this.engine.enableField(fieldId);
    }
    else
    {
      this.engine.disableField(fieldId);
    }
    this.requestRebuild(fieldId);
  }

  // Reorder fieldId so that it appears after afterId
  public orderField(fieldId: number, afterId?: number, insertBefore = false)
  {
    if (fieldId === afterId)
    {
      return; // noop
    }
    let order = this.orderController.getOrder();
    order = order.insert(fieldId, afterId); // insert field after
    if (insertBefore)
    {
      order = order.insert(afterId, fieldId); // swap so fieldId comes first
    }
    this.orderController.setOrder(order);
  }

  // if despecify is true, then strip away specific indices
  public duplicateField(sourceId: number, destKP: KeyPath): number
  {
    const optionsNew: NodeOptionsType<TransformationNodeType.DuplicateNode> = {
      newFieldKeyPaths: List([destKP]),
    };
    this.addTransformation(
      TransformationNodeType.DuplicateNode,
      List([this.engine.getFieldPath(sourceId)]),
      optionsNew,
    );
    const newFieldId = this.engine.getFieldID(destKP);
    Utils.engine.transferFieldData(sourceId, newFieldId, this.engine, this.engine);
    this.requestRebuild();
    return newFieldId;
  }

  private addFieldToEngine(
    keypath: KeyPath,
    etlType: FieldTypes,
  ): number
  {
    return Utils.engine.addFieldToEngine(this.engine, keypath, etlType);
  }
}

export class FieldProxy
{
  private get engine(): TransformationEngine
  {
    return this.engineProxy.getEngine();
  }

  constructor(private engineProxy: EngineProxy, private fieldId: number)
  {

  }

  public setFieldEnabled(enabled: boolean)
  {
    this.engineProxy.setFieldEnabled(this.fieldId, enabled);
  }

  // delete this field and all child fields
  public deleteField(rootId: number, childrenOnly?: boolean)
  {
    Utils.traversal.postorderFields(this.engine, rootId, (fieldId) =>
    {
      if (childrenOnly && fieldId === rootId)
      {
        return;
      }

      const dependents: List<number> = Utils.engine.getFieldDependents(this.engine, fieldId);
      if (dependents.size > 0)
      {
        const paths = JSON.stringify(
          dependents.map((id) => this.engine.getFieldPath(id),
          ).toList().toJS(), null, 2);
        throw new Error(`Cannot delete field. This field has ${dependents.size} dependent fields: ${paths}`);
      }
      this.engine.deleteField(fieldId);
    });
    this.syncWithEngine(true);
  }

  public changeName(value: string)
  {
    if (value === '' || value === undefined || value === null)
    {
      // TODO: handle error
      return this;
    }
    value = value.toString();
    let outputPath = this.engine.getFieldPath(this.fieldId);
    outputPath = outputPath.set(outputPath.size - 1, value);
    this.engine.renameField(this.fieldId, outputPath);
    this.syncWithEngine();
  }

  public structuralChangeName(newPath: EnginePath)
  {
    if (validateRename(this.engine, this.fieldId, newPath).isValid)
    {
      // Transformation Engine automatically reassigns child output paths
      this.engine.renameField(this.fieldId, newPath);

      for (let i = 1; i < newPath.size; i++)
      {
        const ancestorPath = newPath.slice(0, i).toList();
        const parentId = this.engine.getFieldID(ancestorPath);
        if (parentId === undefined)
        {
          this.engineProxy.addField(ancestorPath, FieldTypes.Object);
        }
      }
      this.syncWithEngine(true);
    }
  }

  // add a field under this field
  public addNewField(name: string, type: FieldTypes)
  {
    const newPath = this.engine.getFieldPath(this.fieldId).push(name);
    if (validateNewFieldName(this.engine, this.fieldId, newPath).isValid)
    {
      this.engineProxy.addField(newPath, type);
      this.syncWithEngine(true);
    }
    else
    {
      // todo error
    }
  }

  public changeType(newType: FieldTypes)
  {
    const oldType = Utils.engine.fieldType(this.fieldId, this.engine);
    if (oldType === newType)
    {
      return;
    }

    const tree = this.engine.createTree();
    if (tree.get(this.fieldId).size > 0 && oldType === FieldTypes.Array)
    {
      try
      {
        this.deleteField(this.fieldId, true);
      }
      catch (e)
      {
        throw new Error(`Could not remove dependent fields: ${String(e)}`);
      }
    }

    Utils.engine.changeType(this.engine, this.fieldId, newType);
    Utils.engine.castField(this.engine, this.fieldId, newType);

    if (newType === FieldTypes.Array)
    {
      const childPath = this.engine.getFieldPath(this.fieldId).push(-1);
      Utils.engine.addFieldToEngine(this.engine, childPath, FieldTypes.String);
      Utils.engine.setType(this.engine, this.fieldId, FieldTypes.Array);
    }

    this.syncWithEngine(true);
  }

  public setPrimaryKey(value: boolean, language: Languages)
  {
    const controller = LanguageController.get(language);
    if (!value || controller.canSetPrimaryKey(this.engine, this.fieldId))
    {
      const sideEffects = controller.setFieldPrimaryKey(this.engine, this.fieldId, value);
      this.syncWithEngine(sideEffects);
    }
    else
    {
      throw new Error('Cannot change this field to be a primary key');
    }
  }

  public setFieldProps(newFormState: object, language: Languages)
  {
    this.engine.setFieldProp(this.fieldId, EnginePath([language]), newFormState);
    this.syncWithEngine();
  }

  public deleteTransformation(transformationId: number)
  {
    this.engine.deleteTransformation(transformationId);
    this.syncWithEngine();
  }

  private syncWithEngine(structuralChanges = false)
  {
    if (structuralChanges)
    {
      this.engineProxy.rebuildAll();
    }
    else
    {
      this.engineProxy.rebuildField(this.fieldId);
    }
  }
}

const etlTypeKeyPath = List(['etlType']);
const doNothing = () => null;
