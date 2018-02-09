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
// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable import-spacing
import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import { ELASTIC_TYPES, jsToElastic } from 'shared/etl/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { makeExtendedConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

class ElasticFieldSettingsC
{
  public langType: string = 'elastic';
  public isAnalyzed: boolean = true;
  public analyzer: string = '';
  public type: ELASTIC_TYPES = ELASTIC_TYPES.TEXT;
  public arrayType: List<ELASTIC_TYPES> = List([ELASTIC_TYPES.TEXT]);
}
export type ElasticFieldSettings = WithIRecord<ElasticFieldSettingsC>;
export const _ElasticFieldSettings = makeExtendedConstructor(ElasticFieldSettingsC, false, {
  arrayType: List,
});

// only put fields in here that are needed to track display-sensitive state
class TemplateFieldC
{
  public readonly isIncluded: boolean = true;
  public readonly langSettings: ElasticFieldSettings = _ElasticFieldSettings();
  public readonly fieldId: number = 0;
  public readonly name: string = '';
  public readonly children: List<TemplateField> = List([]);

  public isArray(): boolean
  {
    const type = this.langSettings.type;
    return type === ELASTIC_TYPES.ARRAY;
  }

  // returns how deep the array type is. For example, if the field's type is array of array of text, then the depth is 2.
  public arrayDepth(): number
  {
    const { arrayType } = this.langSettings;
    return this.isArray() ? arrayType.size : 0;
  }

  public isNested(): boolean
  {
    const { type, arrayType } = this.langSettings;
    return type === ELASTIC_TYPES.NESTED ||
      (type === ELASTIC_TYPES.ARRAY && arrayType.size > 0 && arrayType.last() === ELASTIC_TYPES.NESTED);
  }

  public getSubfields()
  {
    return this.children;
  }

  // TODO: make this do a keypath lookup
  public getName(): string
  {
    return this.name;
  }

  // TODO: get rid of this
  public isRoot(keyPath): boolean
  {
    return keyPath.size === 0;
  }
}
export type TemplateField = WithIRecord<TemplateFieldC>;
export const _TemplateField = makeExtendedConstructor(TemplateFieldC, true, {
  langSettings: _ElasticFieldSettings,
});

export function createFieldFromEngine(
  engine: TransformationEngine,
  id: number,
  language = 'elastic',
): TemplateField
{
  const enginePath = engine.getOutputKeyPath(id).toJS();
  return _TemplateField({
    isIncluded: engine.getFieldEnabled(id),
    langSettings: _ElasticFieldSettings({
      langType: language,
      type: jsToElastic(engine.getFieldType(id)),
    }),
    fieldId: id,
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

const doNothing = () => null;
// has methods that abstract how the tree is mutated
// can also be constructed to create a 'tree' that emulates a store
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

  public makeChild(field: TemplateField): FieldNodeProxy
  {
    return this.tree.createField(this.path, field);
  }

  // public set<K extends keyof TemplateField>(key: K, value: TemplateField[K]): FieldNodeProxy
  // {
  //   this.tree.updateField(this.path, key, value);
  //   return this;
  // }

  public setFieldEnabled(enabled: boolean): FieldNodeProxy
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
    return this;
  }

  public changeName(value: string): FieldNodeProxy
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
    return this;
  }

  public syncWithEngine()
  {
    const updatedField = updateFieldFromEngine(this.tree.getEngine(), this.id(), this.field());
    this.tree.setField(this.path, updatedField);
  }

  // public get<K extends keyof TemplateField>(key: K): TemplateField[K]
  // {
  //   return this.field().get(key);
  // }

  public deleteSelf()
  {
    this.tree.deleteField(this.path);
  }

  public clearChildren()
  {
    this.tree.updateField(this.path, 'children', List([]));
  }
}
