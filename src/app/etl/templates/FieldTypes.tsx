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
import
{
  ELASTIC_TYPES, ExportTemplateBase,
  ImportTemplateBase, TEMPLATE_TYPES,
} from 'shared/etl/ETLTypes';
import { makeConstructor, makeDeepConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

class ElasticFieldSettingsC
{
  public langType: string = 'elastic';
  public isAnalyzed: boolean = true;
  public analyzer: string = '';
  public type: ELASTIC_TYPES = ELASTIC_TYPES.TEXT;
  public arrayType: List<ELASTIC_TYPES> = List([ELASTIC_TYPES.TEXT]);
}
export type ElasticFieldSettings = WithIRecord<ElasticFieldSettingsC>;
export const _ElasticFieldSettings = makeDeepConstructor(ElasticFieldSettingsC, {
  arrayType: List,
});

class TemplateFieldC
{
  public isIncluded: boolean = true;
  public langSettings: ElasticFieldSettings = _ElasticFieldSettings();
  public fieldId: number = 0;
  public name: string = '';
  public children: List<TemplateField> = List([]);
}
export type TemplateField = WithIRecord<TemplateFieldC>;
export const _TemplateField = makeDeepConstructor(TemplateFieldC, {
  children: (config: object[] = []) =>
  {
    return List<TemplateField>(config.map((value: object, index) => _TemplateField(value, true)));
  },
  langSettings: _ElasticFieldSettings,
});

// has methods that abstract how the tree is mutated
// can also be constructed to create a 'tree' that emulates a store
export class FieldTree
{
  public static createField(rootField: TemplateField, sourcePath: KeyPath,
    field: TemplateField): TemplateField
  {
    const creatingField = rootField.getIn(sourcePath);
    const nextIndex = creatingField.children.size;
    return rootField.setIn(sourcePath.push('children', nextIndex), field);
  }

  public static updateField(rootField: TemplateField, sourcePath: KeyPath,
    key: string | number, value: any): TemplateField
  {
    const keyPath = sourcePath.push(key);
    return rootField.setIn(keyPath, value);
  }

  public static deleteField(rootField: TemplateField, sourcePath: KeyPath): TemplateField
  {
    return rootField.deleteIn(sourcePath);
  }

  constructor(private root: TemplateField = _TemplateField())
  {

  }

  public createField(sourcePath: KeyPath, field: TemplateField)
  {
    this.root = FieldTree.createField(this.root, sourcePath, field);
  }

  public updateField(sourcePath: KeyPath, key: string | number, value: any)
  {
    this.root = FieldTree.updateField(this.root, sourcePath, key, value);
  }

  public deleteField(sourcePath: KeyPath)
  {
    this.root = FieldTree.deleteField(this.root, sourcePath);
  }

  public getRoot(): TemplateField
  {
    return this.root;
  }

  public getField(path: KeyPath): TemplateField
  {
    return this.root.getIn(path);
  }

  public createRootNode(): FieldTreeNode
  {
    return new FieldTreeNode(this, List([]));
  }
}

export class FieldTreeNode
{
  constructor(private tree: FieldTree, private path: KeyPath)
  {

  }

  public me(): TemplateField
  {
    return this.tree.getField(this.path);
  }

  public makeChild(field: TemplateField): FieldTreeNode
  {
    this.tree.createField(this.path, field);
    const childKeyPath = this.path.push(this.me().children.size - 1);
    return new FieldTreeNode(this.tree, childKeyPath);
  }

  public set<K extends keyof TemplateField>(key: K, value: TemplateField[K])
  {
    this.tree.updateField(this.path, key, value);
  }

  public get<K extends keyof TemplateField>(key: K): TemplateField[K]
  {
    return this.me().get(key);
  }
}
