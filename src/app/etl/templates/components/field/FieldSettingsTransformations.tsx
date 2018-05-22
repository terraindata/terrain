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
// tslint:disable:no-var-requires import-spacing strict-boolean-expressions

import * as classNames from 'classnames';
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import FadeInOut from 'common/components/FadeInOut';
import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import Autocomplete from 'common/components/Autocomplete';
import CheckBox from 'common/components/CheckBox';
import Dropdown from 'common/components/Dropdown';
import { Menu, MenuOption } from 'common/components/Menu';
import { tooltip } from 'common/components/tooltip/Tooltips';

import GraphHelpers from 'etl/helpers/GraphHelpers';
import { TransformationCreator } from 'etl/templates/components/transformations/TransformationCreator';
import { TransformationEditor } from 'etl/templates/components/transformations/TransformationEditor';
import { EngineProxy, FieldProxy } from 'etl/templates/EngineProxy';
import { TemplateField, TransformationNode } from 'etl/templates/FieldTypes';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import { TransformationInfo } from 'shared/transformations/TransformationInfo';

import 'etl/templates/components/transformations/TransformationEditor.less';

const EditIcon = require('images/icon_edit.svg');
const DeleteIcon = require('images/icon_close.svg');

export type Props = TemplateEditorFieldProps;

const enum ViewState
{
  LIST_ALL,
  EDIT,
  CREATE_NEW,
}

@Radium
class FieldSettingsTransformations extends TemplateEditorField<Props>
{
  public state: {
    viewState: ViewState,
    currentIndex: number,
  } = {
      viewState: ViewState.LIST_ALL,
      currentIndex: -1,
    };

  constructor(props)
  {
    super(props);
    this.transformationListItemStyle = _.memoize(this.transformationListItemStyle);
    this.handleEditTransformationFactory = _.memoize(this.handleEditTransformationFactory);
  }

  public renderEditTransformationSection()
  {
    const { currentIndex } = this.state;
    const field = this._field();
    const engine = this._currentEngine();
    if (currentIndex >= 0 && currentIndex < field.transformations.size && engine != null)
    {
      return (
        <TransformationEditor
          key={currentIndex}
          transformation={field.transformations.get(currentIndex)}
          engine={engine}
          fieldID={this._field().fieldId}
          onClose={this.handleUIClose}
          tryMutateEngine={this.mutateEngine}
        />
      );
    }
    else
    {
      return null;
    }
  }

  public renderCreateTransformationSection()
  {
    const engine = this._currentEngine();
    if (engine != null)
    {
      return (
        <TransformationCreator
          engine={engine}
          fieldID={this._field().fieldId}
          onClose={this.handleUIClose}
          tryMutateEngine={this.mutateEngine}
        />
      );
    }
    else
    {
      return null;
    }
  }

  public transformationListItemStyle(isActive: boolean): { textStyle: object, buttonStyle: object }
  {
    const textStyle = fontColor(isActive ? Colors().active : Colors().text2);
    const buttonStyle = isActive ?
      [fontColor(Colors().altBg1, Colors().altBg1), backgroundColor(Colors().active, Colors().activeHover)] :
      [fontColor(Colors().text3, Colors().altBg1), backgroundColor('rgba(0,0,0,0)', Colors().inactiveHover)];
    return { textStyle, buttonStyle };
  }

  public renderTransformationListItem(value: TransformationNode, index: number)
  {
    const style = this.transformationListItemStyle(index === this.state.currentIndex && this.state.viewState === ViewState.EDIT);
    const canEdit = TransformationInfo.canEdit(value.typeCode);
    return (
      <div className='transformation-row' key={index}>
        <div className='transformation-row-text' style={style.textStyle}>
          {index + 1}
        </div>
        <div className='transformation-row-text' style={style.textStyle}>
          {TransformationInfo.getReadableSummary(value.typeCode, value)}
        </div>
        <div className='tef-transformation-spacer'>
          {
            canEdit ?
              <div
                className='tef-transformation-button'
                key={`delete ${index}`}
                style={style.buttonStyle}
                onClick={this.handleDeleteTransformationFactory(index)}
              >
                <DeleteIcon />
              </div>
              :
              null
          }
          {
            canEdit ?
              <div
                className='tef-transformation-button'
                key={`edit ${index}`}
                style={style.buttonStyle}
                onClick={this.handleEditTransformationFactory(index)}
              >
                <EditIcon />
              </div>
              :
              null
          }
        </div>
      </div>
    );
  }

  public renderNewTransformationButton()
  {
    const buttonText = this._field().transformations.size === 0 ?
      'Add a Transformation' :
      'Add Another Transformation';
    const buttonStyle = this._field().transformations.size === 0 ?
      [fontColor(Colors().activeText, Colors().activeText), backgroundColor(Colors().active, Colors().activeHover)] :
      [fontColor(Colors().text3, Colors().active)];
    return (
      <div
        className='add-transformation-row'
        key='new-button'
        style={buttonStyle}
        onClick={this.handleAddNewTransformation}
      >
        <div className='transformation-row-text'>
          {buttonText}
        </div>
      </div>
    );
  }

  public renderTransformationsList()
  {
    const transformations = this._field().transformations;
    if (transformations.size !== 0)
    {
      return transformations.map(this.renderTransformationListItem);
    }
    else
    {
      return null;
    }
  }

  public renderTransformations()
  {
    return (
      <div
        className='transformations-list-column'
      >
        <div className='transformations-list'>
          {this.renderTransformationsList()}
          {this.renderNewTransformationButton()}
        </div>
      </div>
    );
  }

  public render()
  {
    const { canEdit, preview } = this.props;
    const field = this._field();
    const transformations = field.transformations;
    return (
      <div className='template-editor-field-transformations'>
        {
          this.state.viewState === ViewState.LIST_ALL ?
            this.renderTransformations() : null
        }
        {
          this.state.viewState === ViewState.CREATE_NEW ?
            this.renderCreateTransformationSection() : null
        }
        {
          this.state.viewState === ViewState.EDIT ?
            this.renderEditTransformationSection() : null
        }
      </div>
    );
  }

  public mutateEngine(tryFn: (proxy: EngineProxy) => void)
  {
    GraphHelpers.mutateEngine(tryFn)
      .then(this.handleTransformationChange)
      .catch(this.handleTransformationError);
  }

  public handleTransformationError(err: any)
  {
    this.props.act({
      actionType: 'addModal',
      props: {
        title: 'Error',
        message: `Could not edit or add transformation: ${String(err)}`,
        error: true,
      },
    });
  }

  public handleTransformationChange(structuralChanges: boolean)
  {
    const { act, fieldId } = this.props;
    if (structuralChanges)
    {
      act({
        actionType: 'rebuildFieldMap',
      });
    }
    else
    {
      act({
        actionType: 'rebuildField',
        fieldId,
      });
    }
  }

  public handleEditTransformationFactory(index: number)
  {
    return () =>
    {
      this.setState({
        viewState: ViewState.EDIT,
        currentIndex: index,
      });
    };
  }

  public handleDeleteTransformationFactory(index: number)
  {
    const toDelete = this._field().transformations.get(index);
    return () =>
    {
      this._try((proxy) =>
      {
        proxy.deleteTransformation(toDelete.id);
      });
    };
  }

  public handleUIClose()
  {
    this.setState({
      viewState: ViewState.LIST_ALL,
    });
  }

  public handleAddNewTransformation()
  {
    this.setState({
      viewState: ViewState.CREATE_NEW,
    });
  }
}

export default Util.createTypedContainer(
  FieldSettingsTransformations,
  mapStateKeys,
  mapDispatchKeys,
);
