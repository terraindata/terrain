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
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import * as Utils from 'shared/transformations/util/EngineUtils';
import { KeyPath as EnginePath, WayPoint } from 'shared/util/KeyPath';

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
    fields: List<EnginePath | number>,
    options: {
      newFieldKeyPaths?: List<EnginePath>;
      [k: string]: any;
    },
  ): number
  {
    const firstField = fields.get(0);
    const origFieldId = typeof firstField === 'number' ? firstField : this.engine.getFieldID(firstField);

    const nodeId = this.engine.appendTransformation(type, fields, options);

    if (options.newFieldKeyPaths !== undefined)
    {
      options.newFieldKeyPaths.forEach((kp) =>
      {
        const newId = this.engine.getFieldID(kp);
        this.orderField(newId, origFieldId);
      });
    }
    this.requestRebuild();
    return nodeId;
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

  // extract a specific index of an array field and duplicate it to somewhere else
  public extractIndexedArrayField(sourceId: number, index: number, destKP: KeyPath)
  {
    const sourceKP = this.engine.getFieldPath(sourceId);

    if (sourceKP.size === 0)
    {
      throw new Error('Cannot extract array field, source keypath is empty');
    }
    const specifiedSourceKP = sourceKP.set(sourceKP.size - 1, index);
    const specifiedSourceId = Utils.fields.addIndexedField(this.engine, specifiedSourceKP);

    const options: NodeOptionsType<TransformationNodeType.DuplicateNode> = {
      newFieldKeyPaths: List([destKP]),
    };

    this.addTransformation(
      TransformationNodeType.DuplicateNode,
      List([specifiedSourceId]),
      options,
    );
    const parentKP = sourceKP.slice(0, -1).toList();
    this.orderField(this.engine.getFieldID(destKP), this.engine.getFieldID(parentKP));
    this.requestRebuild();
  }

  // extract a specific field of an array and make it an array somewhere ese
  public extractSimpleArrayField(sourceId, destKP: KeyPath)
  {
    this.addTransformation(
      TransformationNodeType.DuplicateNode,
      List([this.engine.getFieldPath(sourceId)]),
      { newFieldKeyPaths: List([destKP]) },
    );
    this.requestRebuild();
  }

  public addField(keypath: KeyPath, type: FieldTypes, childType = FieldTypes.String)
  {
    let newId: number;
    if (type === FieldTypes.Array)
    {
      newId = this.addInferredField(keypath, type);
      const wildId = this.addInferredField(keypath.push(-1), childType);
    }
    else
    {
      newId = this.addInferredField(keypath, type);
    }
    Utils.transformations.castField(this.engine, newId, type);
    this.requestRebuild();
    return newId;
  }

  public addRootField(name: string, type: FieldTypes)
  {
    const pathToAdd = List([name]);
    if (Utils.validation.canAddField(this.engine, -1, pathToAdd).isValid)
    {
      this.addInferredField(pathToAdd, type);
      this.requestRebuild();
    }
  }

  /*
   *  If applyToChildren is true, set all children of the field
   *  to have the same enabled/disabled state.
   */
  public setFieldEnabled(fieldId: number, enabled: boolean, applyToChildren?: boolean)
  {
    const setEnabled = (id) =>
    {
      if (enabled)
      {
        this.engine.enableField(id);
      }
      else
      {
        this.engine.disableField(id);
      }
    };

    if (applyToChildren)
    {
      Utils.traversal.postorderFields(this.engine, fieldId, setEnabled);
    }
    else
    {
      setEnabled(fieldId);
    }
    this.requestRebuild(applyToChildren ? undefined : fieldId);
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

  public duplicateField(sourceId: number, destKP: KeyPath): number
  {
    const nodeId = this.addTransformation(
      TransformationNodeType.DuplicateNode,
      List([this.engine.getFieldPath(sourceId)]),
      { newFieldKeyPaths: List([destKP]) },
    );
    this.requestRebuild();
    return nodeId;
  }

  private addInferredField(
    keypath: KeyPath,
    etlType: FieldTypes,
  ): number
  {
    return Utils.fields.addInferredField(this.engine, keypath, etlType);
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
    if (Utils.validation.canRename(this.engine, this.fieldId, newPath).isValid)
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
    if (Utils.validation.canAddField(this.engine, this.fieldId, newPath).isValid)
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
    const oldType = Utils.fields.fieldType(this.fieldId, this.engine);
    if (oldType === newType)
    {
      return;
    }

    if (newType === FieldTypes.String && (oldType === FieldTypes.Array || oldType === FieldTypes.Object))
    {
      Utils.transformations.stringifyField(this.engine, this.fieldId);
    }
    else if (oldType === FieldTypes.String && newType === FieldTypes.Array)
    {
      Utils.transformations.parseField(this.engine, this.fieldId, FieldTypes.Array);
    }
    else if (oldType === FieldTypes.String && newType === FieldTypes.Object)
    {
      Utils.transformations.parseField(this.engine, this.fieldId, FieldTypes.Object);
    }
    else
    {
      Utils.transformations.castField(this.engine, this.fieldId, newType);
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
