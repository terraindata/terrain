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

import { TemplateField } from 'etl/templates/FieldTypes';
import { createTreeFromEngine, updateFieldFromEngine } from 'etl/templates/SyncUtil';
import { FieldMap } from 'etl/templates/TemplateEditorTypes';
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { validateNewFieldName, validateRename } from 'shared/transformations/util/TransformationsUtil';
import { KeyPath as EnginePath, WayPoint } from 'shared/util/KeyPath';
import { isWildcardField } from 'shared/transformations/util/EngineUtil';
/*
 *  The FieldProxy structures act as the binding between the TemplateEditorField
 *  tree structure and the flattened structure of the transformation engine
 *  The proxy objects are generated synchronously and aren't meant to be persisted
 *  (don't hold references to proxies across call contexts!)
 */
export class FieldTreeProxy
{
  private onMutate: (fieldMap: FieldMap) => void;
  private updateVersion: () => void;
  private fieldMap: FieldMap;
  private engine: TransformationEngine;
  constructor(fieldMap: FieldMap,
    engine: TransformationEngine,
    onMutate?: (fieldMap: FieldMap) => void,
    updateVersion?: () => void)
  {
    this.fieldMap = fieldMap;
    this.engine = engine;
    this.onMutate = onMutate !== undefined ? onMutate : doNothing;
    this.updateVersion = updateVersion !== undefined ? updateVersion : doNothing;
  }

  public getEngine(): TransformationEngine
  {
    return this.engine;
  }

  public updateEngineVersion()
  {
    this.updateVersion();
  }

  public createParentlessField(field: TemplateField): FieldNodeProxy
  {
    this.fieldMap = this.fieldMap.set(field.fieldId, field);
    this.onMutate(this.fieldMap);
    return new FieldNodeProxy(this, field.fieldId);
  }

  public setField(fieldId: number, newField: TemplateField)
  {
    this.fieldMap = this.fieldMap.set(fieldId, newField);
    this.onMutate(this.fieldMap);
  }

  public rebuildAll()
  {
    this.fieldMap = createTreeFromEngine(this.engine);
    this.onMutate(this.fieldMap);
  }

  public updateField<K extends keyof TemplateField>(fieldId: number, key: K, value: TemplateField[K])
  {
    const newField = this.fieldMap.get(fieldId).set(key, value);
    this.fieldMap = this.fieldMap.set(fieldId, newField);
    this.onMutate(this.fieldMap);
  }

  public deleteField(fieldId: number)
  {
    this.fieldMap = this.fieldMap.delete(fieldId);
    this.onMutate(this.fieldMap);
  }

  public getFieldMap(): FieldMap
  {
    return this.fieldMap;
  }

  public getField(fieldId: number): TemplateField
  {
    return this.fieldMap.get(fieldId);
  }
}

export class FieldNodeProxy
{
  private pauseSync = false;
  private shouldSync = false;

  constructor(private tree: FieldTreeProxy, private fieldId: number)
  {

  }

  public exists()
  {
    return this.tree.getFieldMap().has(this.fieldId);
  }

  public field(): TemplateField
  {
    return this.tree.getField(this.fieldId);
  }

  public setFieldEnabled(enabled: boolean)
  {
    if (enabled)
    {
      this.tree.getEngine().enableField(this.fieldId);
    }
    else
    {
      this.tree.getEngine().disableField(this.fieldId);
    }
    this.syncWithEngine();
  }

  public changeName(value: string)
  {
    if (value === '' || value === undefined || value === null)
    {
      // TODO: handle error
      return this;
    }
    const engine = this.tree.getEngine();
    value = value.toString();
    let outputPath = engine.getOutputKeyPath(this.fieldId);
    outputPath = outputPath.set(outputPath.size - 1, value);
    engine.setOutputKeyPath(this.fieldId, outputPath);
    this.syncWithEngine();
  }

  public structuralChangeName(newPath: EnginePath)
  {
    const engine = this.tree.getEngine();
    if (validateRename(engine, this.fieldId, newPath).isValid)
    {
      engine.setOutputKeyPath(this.fieldId, newPath);

      for (let i = 1; i < newPath.size; i++)
      {
        const ancestorPath = newPath.slice(0, i).toList();
        const parentId = engine.getOutputFieldID(ancestorPath);
        if (parentId === undefined)
        {
          engine.addField(ancestorPath, 'object');
        }
      }
      this.syncWithEngine(true);
    }
  }

  public addNewField(newPath: EnginePath)
  {
    const engine = this.tree.getEngine();
    if (validateNewFieldName(engine, this.fieldId, newPath).isValid)
    {
      engine.addField(newPath, 'string');
      this.syncWithEngine(true);
    }
  }

  public changeType(newType: FieldTypes)
  {
    const engine = this.tree.getEngine();
    if (isWildcardField(engine.getInputKeyPath(this.fieldId)))
    {
      engine.setFieldProp(this.fieldId, List(['valueType']), newType);
    }
    else
    {
      engine.setFieldType(this.fieldId, newType);
    }
    this.syncWithEngine();
  }

  public setFieldProps(newFormState: object, language: Languages)
  {
    const engine = this.tree.getEngine();
    engine.setFieldProp(this.fieldId, EnginePath([language]), newFormState);
    this.syncWithEngine();
  }

  public syncWithEngine(structuralChanges = false) // This function will mutate the field from which it was called
  {
    if (this.pauseSync === false)
    {
      if (structuralChanges)
      {
        this.tree.rebuildAll();
      }
      else
      {
        const updatedField = updateFieldFromEngine(this.tree.getEngine(), this.fieldId, this.field());
        this.tree.setField(this.fieldId, updatedField);
      }
      this.tree.updateEngineVersion();
      this.shouldSync = false;
    }
    else
    {
      this.shouldSync = true;
    }
  }

  public withEngineMutations(fn: (proxy: FieldNodeProxy) => void) // sort of like immutable withMutations
  {
    this.pauseSync = true;
    this.shouldSync = false;
    fn(this);
    this.pauseSync = false;
    if (this.shouldSync)
    {
      this.syncWithEngine();
    }
  }

  public deleteSelf()
  {
    this.tree.deleteField(this.fieldId);
  }

  public clearChildren()
  {
    this.tree.updateField(this.fieldId, 'childrenIds', List([]));
  }
}

const doNothing = () => null;
