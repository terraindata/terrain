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
import { postorderForEach } from 'etl/templates/SyncUtil';
import { FieldMap } from 'etl/templates/TemplateEditorTypes';
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import EngineUtil from 'shared/transformations/util/EngineUtil';
import { validateNewFieldName, validateRename } from 'shared/transformations/util/TransformationsUtil';
import { KeyPath as EnginePath, WayPoint } from 'shared/util/KeyPath';
/*
 *  The FieldProxy structures act as the binding between the TemplateEditorField
 *  tree structure and the flattened structure of the transformation engine
 *  The proxy objects are generated synchronously and aren't meant to be persisted
 *  (don't hold references to proxies across call contexts!)
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

  public addRootField(name: string, type: string)
  {
    const pathToAdd = List([name]);
    if (validateNewFieldName(this.engine, -1, pathToAdd).isValid)
    {
      if (type === 'array')
      {
        this.engine.addField(pathToAdd, type, { valueType: 'string' });
        this.engine.addField(pathToAdd.push('*'), 'array', { valueType: 'string' });
      }
      else
      {
        this.engine.addField(pathToAdd, type);
      }
      this.requestRebuild();
    }
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
    if (enabled)
    {
      this.engine.enableField(this.fieldId);
    }
    else
    {
      this.engine.disableField(this.fieldId);
    }
    this.syncWithEngine();
  }

  // delete this field and all child fields
  public deleteField(rootId: number)
  {
    postorderForEach(this.engine, rootId, (fieldId) =>
    {
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
  public addNewField(name: string, type: FieldTypes)
  {
    const newPath = this.engine.getOutputKeyPath(this.fieldId).push(name);
    if (validateNewFieldName(this.engine, this.fieldId, newPath).isValid)
    {
      if (type === 'array')
      {
        this.engine.addField(newPath, type, { valueType: 'string' });
        this.engine.addField(newPath.push('*'), 'array', { valueType: 'string' });
      }
      else
      {
        this.engine.addField(newPath, type);
      }
      this.syncWithEngine(true);
    }
    else
    {
      // todo error
    }
  }

  // todo add cast transformation
  public changeType(newType: FieldTypes)
  {
    if (EngineUtil.isWildcardField(this.engine.getInputKeyPath(this.fieldId)))
    {
      this.engine.setFieldProp(this.fieldId, List(['valueType']), newType);
    }
    else
    {
      this.engine.setFieldType(this.fieldId, newType);
    }
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
