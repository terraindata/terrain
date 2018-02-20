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

import { FieldNodeProxy, FieldTreeProxy } from 'etl/templates/FieldProxy';
import { TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateTypes';

import { TEMPLATE_TYPES } from 'shared/etl/ETLTypes';

/*
 *  This class defines a base class with useful functions that are used by components
 *  that handle UI for template editor fields.
 */

export interface TemplateEditorFieldProps
{
  keyPath: KeyPath; // keyPath from the root field to this field
  field: TemplateField;

  canEdit: boolean;
  noInteract: boolean; // determines if the template editor is not interactable (e.g. the side preview)
  preview: any;
  displayKeyPath: KeyPath; // not the key path in the store, but the key path in virtual DOM

  templateEditor?: TemplateEditorState; // from container
  act?: typeof TemplateEditorActions; // from container
}

export abstract class TemplateEditorField<Props extends TemplateEditorFieldProps> extends TerrainComponent<Props>
{
  private onRootMutationBound: (f: TemplateField) => void;

  constructor(props)
  {
    super(props);
    this.onRootMutationBound = this.onRootMutation.bind(this);
  }

  protected _proxy(): FieldNodeProxy
  {
    const engine = this.props.templateEditor.template.transformationEngine;
    const tree = new FieldTreeProxy(this._rootField(), engine, this.onRootMutationBound);
    return new FieldNodeProxy(tree, this.props.keyPath);
  }

  protected _passProps(config: object = {}): TemplateEditorFieldProps
  {
    return _.extend(_.pick(this.props, ['keyPath', 'field', 'canEdit', 'noInteract', 'preview', 'displayKeyPath']), config);
  }

  protected _inputDisabled(): boolean
  {
    return !this.props.field.isIncluded || !this.props.canEdit;
  }

  protected _settingsAreOpen(): boolean
  {
    const { displayKeyPath, keyPath, templateEditor, noInteract } = this.props;
    return !noInteract &&
      displayKeyPath.equals(templateEditor.uiState.settingsDisplayKeyPath) &&
      keyPath.equals(templateEditor.uiState.settingsKeyPath);
  }

  // Returns the given function if input is not disabled. Otherwise returns undefined.
  protected _noopIfDisabled<F>(fn: F): F | undefined
  {
    return this._inputDisabled() ? undefined : fn;
  }

  protected _isExport(): boolean
  {
    return this.props.templateEditor.template !== undefined &&
      this.props.templateEditor.template.type === TEMPLATE_TYPES.EXPORT;
  }

  protected _rootField()
  {
    return this.props.templateEditor.rootField;
  }

  private onRootMutation(field: TemplateField)
  {
    this.props.act({
      actionType: 'setRoot',
      rootField: field,
    });
  }
}
