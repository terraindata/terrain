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
import { instanceFnDecorator } from 'src/app/Classes';

import { compareObjects, isVisiblyEqual, PropertyTracker, UpdateChecker } from 'etl/ETLUtil';
import GraphHelpers from 'etl/helpers/GraphHelpers';
import { EngineProxy, FieldProxy } from 'etl/templates/FieldProxy';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { EditorDisplayState, FieldMap, TemplateEditorState } from 'etl/templates/TemplateEditorTypes';
import { ETLTemplate } from 'etl/templates/TemplateTypes';
import { SinkConfig, SinkOptionsType, Sinks, SourceConfig, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { Languages, NodeTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

/*
 *  This class defines a base class with useful functions that are used by components
 *  that handle UI for template editor fields.
 */
export interface TemplateEditorFieldProps
{
  fieldId: number;
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
  ['templateEditor'],
];

interface Injected
{
  templateEditor: TemplateEditorState;
}

export abstract class TemplateEditorField<Props extends TemplateEditorFieldProps> extends TerrainComponent<Props>
{
  private uiStateTracker: PropertyTracker<EditorDisplayState> = new PropertyTracker(this.getUIStateValue.bind(this));
  private updateChecker: UpdateChecker = new UpdateChecker();

  constructor(props)
  {
    super(props);
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
    const uiStateKeysSeen = this.uiStateTracker.getSeen();
    const customComparatorMap = {
      templateEditor: (current, next) =>
      {
        const subComparatorMap = {
          uiState: (value, nextValue) =>
          {
            return isVisiblyEqual(value, nextValue, uiStateKeysSeen);
          },
        };
        return compareObjects(current.toObject(), next.toObject(), subComparatorMap);
      },
    };
    return !compareObjects(this.props, nextProps, customComparatorMap);
  }

  protected _template(props = this.props): ETLTemplate
  {
    return (props as Props & Injected).templateEditor.template;
  }

  protected _fieldMap(props = this.props): FieldMap
  {
    return (props as Props & Injected).templateEditor.fieldMap;
  }

  protected _field(id = this.props.fieldId, props = this.props): TemplateField
  {
    return this._fieldMap(props).get(id);
  }

  protected _uiState(): PropertyTracker<EditorDisplayState>
  {
    return this.uiStateTracker;
  }

  protected _checkedState(): boolean | null
  {
    this.updateChecker.setChecker('checkedState', getCheckedState);
    return getCheckedState(this.props);
  }

  protected _currentEngine(): TransformationEngine
  {
    this.updateChecker.setChecker('currentEngine', getCurrentEngine);
    return getCurrentEngine(this.props);
  }

  // for array types
  @instanceFnDecorator(memoizeOne)
  protected _getPreviewChildPath(index, cacheKey = this.props.preview): KeyPath
  {
    return this.getDKPCachedFn(this.props.displayKeyPath, cacheKey)(index);
  }

  // todo should this return a promise to be consistent with ETLHelpers?
  protected _try(tryFn: (proxy: FieldProxy) => void)
  {
    GraphHelpers.mutateEngine((engineProxy: EngineProxy) =>
    {
      tryFn(engineProxy.makeFieldProxy(this.props.fieldId));
    }).then((isStructural: boolean) =>
    {
      if (isStructural)
      {
        this.props.act({
          actionType: 'rebuildFieldMap',
        });
      }
      else
      {
        this.props.act({
          actionType: 'rebuildField',
          fieldId: this.props.fieldId,
        });
      }
      this.props.act({
        actionType: 'updateEngineVersion',
      });
    }).catch(this._logError);
  }

  protected _passProps(config: object = {}): TemplateEditorFieldProps
  {
    return _.extend(_.pick(this.props, ['fieldId', 'canEdit', 'noInteract', 'preview', 'displayKeyPath']), config);
  }

  protected _isPrimaryKey()
  {
    const language = this._getCurrentLanguage();
    switch (language)
    {
      case 'elastic':
        return _.get(this._field().fieldProps, ['elastic', 'isPrimaryKey']) === true;
      default:
        return false;
    }
  }

  protected _isRootField()
  {
    const { fieldId } = this.props;
    const kp = this._field().outputKeyPath;
    return kp.size === 1;
  }

  protected _getCurrentLanguage(): Languages
  {
    this.updateChecker.setChecker('currentLanguage', getCurrentLanguage);
    return getCurrentLanguage(this.props);
  }

  protected _inputDisabled(): boolean
  {
    return !this._field().isIncluded || !this.props.canEdit;
  }

  protected _settingsAreOpen(): boolean
  {
    this.updateChecker.setChecker('settingsOpen', settingsAreOpen);
    return settingsAreOpen(this.props);
  }

  protected _willFieldChange(nextProps)
  {
    return this._field(this.props.fieldId, this.props)
      !== this._field(nextProps.fieldId, nextProps);
  }

  // Returns the given function if input is not disabled. Otherwise returns undefined.
  protected _noopIfDisabled<F>(fn: F): F | undefined
  {
    return this._inputDisabled() ? undefined : fn;
  }

  @instanceFnDecorator(memoizeOne)
  private getDKPCachedFn(displayKeyPath, cacheDependency)
  {
    return _.memoize((index) =>
    {
      return displayKeyPath.push(index);
    });
  }

  // ignores property tracker
  private getUIStateValue(): EditorDisplayState
  {
    return (this.props as Props & Injected).templateEditor.uiState;
  }

  protected _logError(ev)
  {
    // tslint:disable-next-line
    console.error(ev);
  }
}

function getCheckedState(props: TemplateEditorFieldProps): boolean | null
{
  const uiState = (props as TemplateEditorFieldProps & Injected).templateEditor.uiState;
  if (uiState.checkedFields === null)
  {
    return null;
  }
  else
  {
    return uiState.checkedFields.get(props.fieldId) === true;
  }
}

function getCurrentEngine(props: TemplateEditorFieldProps)
{
  return (props as TemplateEditorFieldProps & Injected).templateEditor.getCurrentEngine();
}

function getCurrentLanguage(props: TemplateEditorFieldProps)
{
  const templateEditor = (props as TemplateEditorFieldProps & Injected).templateEditor;
  return templateEditor.template.getEdgeLanguage(templateEditor.getCurrentEdgeId());
}

function settingsAreOpen(props: TemplateEditorFieldProps)
{
  const { displayKeyPath, noInteract, fieldId } = props;
  if (noInteract)
  {
    return false;
  }
  else
  {
    const uiState = (props as TemplateEditorFieldProps & Injected).templateEditor.uiState;
    return fieldId === uiState.settingsFieldId &&
      displayKeyPath.equals(uiState.settingsDisplayKeyPath);
  }
}
