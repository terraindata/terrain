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
import { updateFieldFromEngine } from 'etl/templates/SyncUtil';
import { ELASTIC_TYPES, jsToElastic } from 'shared/etl/ETLTypes';
import { KeyPath as EngineKeypath, TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';

/*
 *  The FieldProxy structures act as the binding between the TemplateEditorField
 *  tree structure and the flattened structure of the transformation engine
 *  The proxy objects are generated synchronously and aren't meant to be persisted
 *  (don't hold references to proxies across call contexts!)
 */
export class FieldTreeProxy
{
  private onMutate: (root: TemplateField) => void = doNothing;

  constructor(private root: TemplateField,
    private engine: TransformationEngine,
    onMutate?: (f: TemplateField) => void)
  {
    if (onMutate !== undefined)
    {
      this.onMutate = onMutate;
    }
  }

  public getEngine(): TransformationEngine
  {
    return this.engine;
  }

  public createField(pathToField: KeyPath, field: TemplateField): FieldNodeProxy
  {
    const creatingField = this.root.getIn(pathToField);
    const nextIndex = creatingField.children.size;
    const pathToChildField = pathToField.push('children', nextIndex);
    this.root = this.root.setIn(pathToChildField, field);
    this.onMutate(this.root);
    return new FieldNodeProxy(this, pathToChildField);
  }

  public setField(pathToField: KeyPath, newField: TemplateField)
  {
    this.root = this.root.setIn(pathToField, newField);
    this.onMutate(this.root);
  }

  public updateField(pathToField: KeyPath, key: string | number, value: any)
  {
    const keyPath = pathToField.push(key);
    this.root = this.root.setIn(keyPath, value);
    this.onMutate(this.root);
  }

  public deleteField(pathToField: KeyPath)
  {
    this.root = this.root.deleteIn(pathToField);
    this.onMutate(this.root);
  }

  public getRootField(): TemplateField
  {
    return this.root;
  }

  public getField(path: KeyPath): TemplateField
  {
    return this.root.getIn(path);
  }

  public getRootNode(): FieldNodeProxy
  {
    return new FieldNodeProxy(this, List([]));
  }
}

export class FieldNodeProxy
{
  private pauseSync = false;
  private shouldSync = false;

  constructor(private tree: FieldTreeProxy, private path: KeyPath)
  {

  }

  public exists()
  {
    return this.tree.getRootField().hasIn(this.path);
  }

  public id(): number
  {
    return this.tree.getField(this.path).fieldId;
  }

  public field(): TemplateField
  {
    return this.tree.getField(this.path);
  }

  public discoverChild(field: TemplateField): FieldNodeProxy
  {
    return this.tree.createField(this.path, field);
  }

  public setFieldEnabled(enabled: boolean)
  {
    if (enabled)
    {
      this.tree.getEngine().enableField(this.id());
    }
    else
    {
      this.tree.getEngine().disableField(this.id());
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
    const field = this.field();
    const engine = this.tree.getEngine();
    value = value.toString();
    let outputPath = engine.getOutputKeyPath(field.fieldId);
    outputPath = outputPath.set(outputPath.size - 1, value);
    engine.setOutputKeyPath(field.fieldId, outputPath);
    this.syncWithEngine();
  }

  public addTransformation(nodeType: TransformationNodeType, fieldNamesOrIDs: List<EngineKeypath> | List<number>,
    options?: object)
  {
    this.tree.getEngine().appendTransformation(nodeType, fieldNamesOrIDs, options);
    this.syncWithEngine();
  }

  public syncWithEngine() // This function will mutate the field from which it was called
  {
    if (this.pauseSync === false)
    {
      const updatedField = updateFieldFromEngine(this.tree.getEngine(), this.id(), this.field());
      this.tree.setField(this.path, updatedField);
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
    this.tree.deleteField(this.path);
  }

  public clearChildren()
  {
    this.tree.updateField(this.path, 'children', List([]));
  }
}

const doNothing = () => null;
