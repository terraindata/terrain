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
import * as shallowCompare from 'react-addons-shallow-compare';
import Util from 'util/Util';

import * as Immutable from 'immutable';
import memoizeOne from 'memoize-one';
const { List, Map } = Immutable;

import { compareObjects, isVisiblyEqual, PropertyTracker, UpdateChecker } from 'etl/ETLUtil';
import { FieldNodeProxy, FieldTreeProxy } from 'etl/templates/FieldProxy';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { EditorDisplayState, ETLTemplate, TemplateEditorState } from 'etl/templates/TemplateTypes';

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

  // injected props:
  act?: typeof TemplateEditorActions;
}

export const mapDispatchKeys = {
  act: TemplateEditorActions,
};
export const mapStateKeys = [
  ['templateEditor', 'template'],
  ['templateEditor', 'uiState'],
  ['templateEditor', 'rootField'],
];

interface Injected
{
  template: ETLTemplate;
  uiState: EditorDisplayState;
  rootField: TemplateField;
}

export abstract class TemplateEditorField<Props extends TemplateEditorFieldProps> extends TerrainComponent<Props>
{
  private onRootMutationBound: (f: TemplateField) => void;
  private updateEngineVersionBound: () => void;
  private uiStateTracker: PropertyTracker<EditorDisplayState> = new PropertyTracker(this.getUIStateValue.bind(this));
  private updateChecker: UpdateChecker = new UpdateChecker();

  constructor(props)
  {
    super(props);
    this.onRootMutationBound = this.onRootMutation.bind(this);
    this.updateEngineVersionBound = this.updateEngineVersion.bind(this);
    this.getKPCachedFn = memoizeOne(this.getKPCachedFn);
    this.getDKPCachedFn = memoizeOne(this.getDKPCachedFn);
  }

  public componentWillUpdate(nextProps, nextState)
  {
    // if you override this function, please call this
    this.uiStateTracker.reset();
    this.updateChecker.reset();
  }

  public shouldComponentUpdate(nextProps, nextState)
  {
    // check state
    if (!compareObjects(this.state, nextState))
    {
      return true;
    }
    // check custom update checks
    if (!this.updateChecker.runChecks(this.props, nextProps, this.state, nextState))
    {
      return true;
    }
    // check props
    const seen = this.uiStateTracker.getSeen();
    const customComparatorMap = {
      uiState: (value, nextValue) =>
      {
        return isVisiblyEqual(value, nextValue, seen);
      },
    };
    return !compareObjects(this.props, nextProps, customComparatorMap);
  }

  get _template(): ETLTemplate
  {
    return (this.props as Props & Injected).template;
  }

  get _rootField(): TemplateField
  {
    return (this.props as Props & Injected).rootField;
  }

  get _uiState(): PropertyTracker<EditorDisplayState>
  {
    return this.uiStateTracker;
  }

  protected _getChildPaths(index, cacheKey = this.props.field.children): { displayKeyPath: KeyPath, keyPath: KeyPath }
  {
    const keyPath = this.getKPCachedFn(this.props.keyPath, cacheKey)(index);
    const displayKeyPath = this.getDKPCachedFn(this.props.displayKeyPath, cacheKey)(index);
    return {
      keyPath,
      displayKeyPath,
    };
  }

  protected _getPreviewChildPaths(index, cacheKey = this.props.preview): { displayKeyPath: KeyPath, keyPath: KeyPath }
  {
    const keyPath = this.props.keyPath;
    const displayKeyPath = this.getDKPCachedFn(this.props.displayKeyPath, cacheKey)(index);
    return {
      keyPath,
      displayKeyPath,
    };
  }

  protected _proxy(): FieldNodeProxy
  {
    const engine = this._template.transformationEngine;
    const tree = new FieldTreeProxy(this._rootField, engine, this.onRootMutationBound, this.updateEngineVersionBound);
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
    this.updateChecker.addChecker(this.settingsAreOpenEquivalent, 'settingsOpen');
    return settingsAreOpen(this.props);
  }

  // Returns the given function if input is not disabled. Otherwise returns undefined.
  protected _noopIfDisabled<F>(fn: F): F | undefined
  {
    return this._inputDisabled() ? undefined : fn;
  }

  private onRootMutation(field: TemplateField)
  {
    this.props.act({
      actionType: 'setRoot',
      rootField: field,
    });
  }

  private updateEngineVersion()
  {
    this.props.act({
      actionType: 'updateEngineVersion',
    });
  }

  // gets memoizeOne'd
  private getKPCachedFn(keyPath, cacheDependency)
  {
    return _.memoize((index) =>
    {
      return keyPath.push('children', index);
    });
  }

  // gets memoizedOne'd
  private getDKPCachedFn(displayKeyPath, cacheDependency)
  {
    return _.memoize((index) =>
    {
      return displayKeyPath.push(index);
    });
  }

  private getUIStateValue(): EditorDisplayState
  {
    return (this.props as Props & Injected).uiState;
  }

  private settingsAreOpenEquivalent(props: Props, nextProps: Props)
  {
    return settingsAreOpen(props) === settingsAreOpen(nextProps);
  }
}

function settingsAreOpen(props: TemplateEditorFieldProps)
{
  const { displayKeyPath, keyPath, noInteract } = props;
  if (noInteract)
  {
    return false;
  }
  else
  {
    return keyPath.equals((props as TemplateEditorFieldProps & Injected).uiState.settingsKeyPath) &&
      displayKeyPath.equals((props as TemplateEditorFieldProps & Injected).uiState.settingsDisplayKeyPath);
  }
}
