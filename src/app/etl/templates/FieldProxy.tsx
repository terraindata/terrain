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

import { postorderForEach, preorderForEach } from 'etl/templates/SyncUtil';
import { FieldTypes, ETLFieldTypes, Languages, getJSFromETL } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType, { NodeOptionsType } from 'shared/transformations/TransformationNodeType';
import EngineUtil from 'shared/transformations/util/EngineUtil';
import { validateNewFieldName, validateRename } from 'shared/transformations/util/TransformationsUtil';
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
    private requestRebuild?: (id?: number) => void,
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

  public addTransformation(type: TransformationNodeType, fields: List<EnginePath>, options)
  {
    this.engine.appendTransformation(type, fields, options);
    this.requestRebuild();
  }

  public editTransformation(id: number, fields: List<EnginePath>, options)
  {
    this.engine.editTransformation(id, fields, options);
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
   *  If extracted field is still an array type, then we also need to create the wildcard for that field
   *  After creating the extracted field, we need to perform the duplication operation on the extracted field
   */
  public extractArrayField(sourceId: number, index: number, destKP: List<string>)
  {
    const sourceKP = this.engine.getOutputKeyPath(sourceId);
    if (sourceKP.size === 0)
    {
      throw new Error('Cannot extract array field, source keypath is empty');
    }
    const specifiedSourceKP = sourceKP.set(sourceKP.size - 1, String(index));
    const specifiedSourceType = EngineUtil.getETLFieldType(sourceId, this.engine);

    let specifiedSourceId: number;

    if (specifiedSourceType === ETLFieldTypes.Array)
    {
      const anyChildId = EngineUtil.findChildField(sourceId, this.engine);
      if (anyChildId === undefined)
      {
        throw new Error('Field type is array, but could not find any children in the Transformation Engine');
      }
      const childType = EngineUtil.getETLFieldType(anyChildId, this.engine);
      specifiedSourceId = this.addField(specifiedSourceKP, ETLFieldTypes.Array, childType);
    }
    else
    {
      specifiedSourceId = this.addField(specifiedSourceKP, specifiedSourceType);
    }

    this.requestRebuild();
    this.duplicateField(specifiedSourceId, destKP, true);
  }

  public copyField(sourceId: number, destKP: List<string>, despecify = false): number
  {
    const optionsNew: NodeOptionsType<TransformationNodeType.DuplicateNode> = {
      newFieldKeyPaths: List([destKP]),
    };
    this.addTransformation(
      TransformationNodeType.DuplicateNode,
      List([this.engine.getInputKeyPath(sourceId)]),
      optionsNew,
    );
    const newFieldId = this.engine.getInputFieldID(destKP);
    EngineUtil.transferFieldData(sourceId, newFieldId, this.engine, this.engine);

    let idToCopy = sourceId;
    if (despecify)
    {
      const kpToCopy = EngineUtil.turnIndicesIntoValue(this.engine.getOutputKeyPath(sourceId));
      idToCopy = this.engine.getOutputFieldID(kpToCopy);
    }

    const rootOutputKP = this.engine.getOutputKeyPath(sourceId);
    preorderForEach(this.engine, idToCopy, (childId) =>
    {
      // do not copy root
      if (childId !== idToCopy)
      {
        const toTransferKeypath = this.engine.getOutputKeyPath(childId);
        const pathAfterRoot = toTransferKeypath.slice(rootOutputKP.size);
        EngineUtil.transferField(childId, destKP.concat(pathAfterRoot).toList(), this.engine);
      }
    });
    return newFieldId;
  }

  public duplicateField(sourceId: number, destKP: List<string>, despecify = false)
  {
    const originalOKP = this.engine.getOutputKeyPath(sourceId);
    this.engine.setOutputKeyPath(sourceId, originalOKP.set(-1, '_' + originalOKP.last()));
    const tempDestKP = this.getSyntheticInputPath(destKP);
    const tempOriginalKP = this.getSyntheticInputPath(originalOKP);
    const destId = this.copyField(sourceId, tempDestKP, despecify);
    const newOrigId = this.copyField(sourceId, tempOriginalKP, despecify);
    this.engine.setOutputKeyPath(destId, destKP);
    this.engine.setOutputKeyPath(newOrigId, originalOKP);
    this.engine.disableField(sourceId);
    this.setFieldHidden(sourceId, true);
    this.requestRebuild();
  }

  public addField(keypath: List<string>, type: ETLFieldTypes, valueType: ETLFieldTypes = ETLFieldTypes.String)
  {
    let newId: number;
    if (type === ETLFieldTypes.Array)
    {
      newId = this.engine.addField(keypath, type, { valueType });
      const wildId = this.engine.addField(keypath.push('*'), 'array', { valueType });
      EngineUtil.castField(this.engine, wildId, getJSFromETL(valueType));
    }
    else
    {
      newId = this.engine.addField(keypath, type);
    }
    EngineUtil.castField(this.engine, newId, getJSFromETL(type));
    this.requestRebuild();
    return newId;
  }

  public addRootField(name: string, type: ETLFieldTypes)
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

  // this is not deterministic
  private getSyntheticInputPath(keypath: List<string>): List<string>
  {
    return keypath.unshift(`_synthetic_${this.randomId()}`);
  }

  private randomId(): string
  {
    return Math.random().toString(36).substring(2);
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
  public deleteField(rootId: number)
  {
    postorderForEach(this.engine, rootId, (fieldId) =>
    {
      const dependents: List<number> = EngineUtil.getFieldDependents(this.engine, fieldId);
      if (dependents.size > 0)
      {
        const paths = JSON.stringify(
          dependents.map((id) => this.engine.getOutputKeyPath(id),
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
    let outputPath = this.engine.getOutputKeyPath(this.fieldId);
    outputPath = outputPath.set(outputPath.size - 1, value);
    this.engine.setOutputKeyPath(this.fieldId, outputPath);
    this.syncWithEngine();
  }

  public structuralChangeName(newPath: EnginePath)
  {
    if (validateRename(this.engine, this.fieldId, newPath).isValid)
    {
      // Transformation Engine automatically reassigns child output paths
      this.engine.setOutputKeyPath(this.fieldId, newPath);

      for (let i = 1; i < newPath.size; i++)
      {
        const ancestorPath = newPath.slice(0, i).toList();
        const parentId = this.engine.getOutputFieldID(ancestorPath);
        if (parentId === undefined)
        {
          this.engine.addField(ancestorPath, 'object');
        }
      }
      this.syncWithEngine(true);
    }
  }

  // add a field under this field
  public addNewField(name: string, type: ETLFieldTypes)
  {
    const newPath = this.engine.getOutputKeyPath(this.fieldId).push(name);
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

  public changeType(newType: ETLFieldTypes)
  {
    if (EngineUtil.isWildcardField(this.engine.getInputKeyPath(this.fieldId)))
    {
      this.engine.setFieldProp(this.fieldId, List(['valueType']), newType);
    }
    else
    {
      this.engine.setFieldType(this.fieldId, newType);
    }
    EngineUtil.changeFieldTypeSideEffects(this.engine, this.fieldId, newType);
    EngineUtil.castField(this.engine, this.fieldId, getJSFromETL(newType));
    this.syncWithEngine(true);
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

const doNothing = () => null;
