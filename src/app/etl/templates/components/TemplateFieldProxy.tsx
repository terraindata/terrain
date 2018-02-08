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
// tslint:disable:no-var-requires import-spacing

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import
{
  _ElasticFieldSettings, _TemplateField,
  ElasticFieldSettings, FieldTree, TemplateField,
} from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateTypes';
import { ELASTIC_TYPES, TEMPLATE_TYPES } from 'shared/etl/ETLTypes';

/*
 *  This class defines a base class with useful functions that abstract how the store works.
 *  Each instance of this class is a proxy for a field in the TemplateField tree.
 *  They are also constructable.
 */

export interface TemplateFieldProxyProps
{
  keyPath: KeyPath; // keyPath from the root field to this field
  field: TemplateField;

  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

export class TemplateFieldProxy<Props extends TemplateFieldProxyProps> extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);
  }

  // invokes operator on every field (represented as a TemplateFieldProxy) in the tree
  public _dfs(operator: (obj: TemplateFieldProxy<Props>) => void)
  {
    const { field, keyPath } = this.props;
    operator(this);
    this.props.field.children.map((value, index) =>
    {
      const newKeyPath = keyPath.push('children', index);
      const child = new TemplateFieldProxy({
        keyPath: newKeyPath,
        field: value,
        templateEditor: this.props.templateEditor,
        act: this.props.act,
      });
      child._dfs(operator);
    });
  }

  // Helper to calling setIn() on the TemplateField in the store.
  public _set<K extends keyof TemplateField>(key: K, value: TemplateField[K])
  {
    const { act, keyPath } = this.props;
    act({
      actionType: 'setRoot',
      rootField: FieldTree.updateField(this._root(), keyPath, key, value),
    });
  }

  public _deleteSelf()
  {
    const { act, keyPath } = this.props;
    act({
      actionType: 'setRoot',
      rootField: FieldTree.deleteField(this._root(), keyPath),
    });
  }

  public _clearChildren()
  {
    const { act, keyPath } = this.props;
    this._set('children', List([]));
  }

  // returns true if the field's type is nested or if the field's arrayType ends with nested
  public _isNested(): boolean
  {
    const { type, arrayType } = this.props.field.langSettings;
    return type === ELASTIC_TYPES.NESTED ||
      (type === ELASTIC_TYPES.ARRAY && arrayType.size > 0 && arrayType.last() === ELASTIC_TYPES.NESTED);
  }

  // returns how deep the array type is. For example, if the field's type is array of array of text, then the depth is 2.
  public _arrayDepth(): number
  {
    const { arrayType } = this.props.field.langSettings;
    return this._isArray() ? arrayType.size : 0;
  }

  // returns true if the field's type is an array
  public _isArray(): boolean
  {
    const type = this.props.field.langSettings.type;
    return type === ELASTIC_TYPES.ARRAY;
  }

  public _isExport(): boolean
  {
    return this.props.templateEditor.template !== undefined &&
      this.props.templateEditor.template.type === TEMPLATE_TYPES.EXPORT;
  }

  public _isRoot(): boolean
  {
    return this.props.keyPath.size === 0;
  }

  private _root()
  {
    return this.props.templateEditor.getIn(['template', 'rootField']);
  }

}
