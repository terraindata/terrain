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
import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';
import { _TemplateField, ELASTIC_TYPES, TEMPLATE_TYPES, TemplateEditorState, TemplateField } from 'etl/templates/TemplateTypes';

/*
 *  This class defines a base class with useful functions that are used by components
 *  that handle UI for template editor fields. This abstract "component" is sort of an object-oriented representation
 *  of a template editor field.
 */

export interface TemplateEditorFieldProps
{
  keyPath: KeyPath;
  field: TemplateField;
  canEdit: boolean;
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

export abstract class TemplateEditorField<Props extends TemplateEditorFieldProps> extends TerrainComponent<Props>
{
  constructor(props)
  {
    super(props);
    this._setFactory = _.memoize(this._setFactory);
  }

  // helper to calling setIn() on the TemplateField in the store
  protected _set<K extends keyof TemplateField>(key: K, value: TemplateField[K])
  {
    const { act, keyPath } = this.props;
    act({
      actionType: 'updateField',
      sourcePath: keyPath,
      key,
      value,
    });
  }

  protected _deleteSelf()
  {
    const { act, keyPath } = this.props;
    act({
      actionType: 'deleteField',
      sourcePath: keyPath,
    });
  }

  protected _clearChildren()
  {
    const { act, keyPath } = this.props;
    act({
      actionType: 'updateField',
      sourcePath: keyPath,
      key: 'children',
      value: List([]),
    });
  }

  // returns true if type is nested or if arrayType ends with nested
  protected _isNested(): boolean
  {
    const type = this.props.field.type;
    const arrayType = this.props.field.arrayType;
    return type === ELASTIC_TYPES.NESTED ||
      (type === ELASTIC_TYPES.ARRAY && arrayType.size > 0 && arrayType.last() === ELASTIC_TYPES.NESTED);
  }

  protected _isExport(): boolean
  {
    return this.props.templateEditor.template !== undefined &&
      this.props.templateEditor.template.type === TEMPLATE_TYPES.EXPORT;
  }

  protected _isRoot(): boolean
  {
    return this.props.keyPath.size === 0;
  }

  protected _inputDisabled(): boolean
  {
    return !this.props.field.isIncluded || !this.props.canEdit;
  }

  // for event handlers that should be disabled if input is disabled
  protected _noopIfDisabled<F>(fn: F): F | undefined
  {
    return this._inputDisabled() ? undefined : fn;
  }

  // similar to setStateWrapper
  protected _setFactory<K extends keyof TemplateField>(key: K, ...path: string[])
  {
    return (val) =>
    {
      for (const property of path)
      {
        val = val[property];
      }
      this._set(key, val);
    };
  }
}
