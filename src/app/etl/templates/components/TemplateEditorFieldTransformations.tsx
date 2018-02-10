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
console.log('hi');
import Autocomplete from 'common/components/Autocomplete';
import CheckBox from 'common/components/CheckBox';
import Dropdown from 'common/components/Dropdown';
import { Menu, MenuOption } from 'common/components/Menu';
import { tooltip } from 'common/components/tooltip/Tooltips';

import { TemplateField } from 'etl/templates/FieldTypes';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';
import { TemplateEditorState } from 'etl/templates/TemplateTypes';

import { TransformationView } from 'etl/templates/components/transformations/TransformationView';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './TemplateEditorField.less';

const EditIcon = require('images/icon_edit.svg');
const AddIcon = require('images/icon_add.svg');

export interface Props extends TemplateEditorFieldProps
{
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

const enum ViewState
{
  LIST_ALL,
  EDIT,
  CREATE_NEW,
}

@Radium
class TemplateEditorFieldTransformations extends TemplateEditorField<Props>
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

  public transformationListItemStyle(isActive: boolean): { textStyle: object, buttonStyle: object }
  {
    const textStyle = fontColor(isActive ? Colors().active : Colors().text2);
    const buttonStyle = isActive ?
      [fontColor(Colors().altBg1, Colors().altBg1), backgroundColor(Colors().active, Colors().activeHover)] :
      [fontColor(Colors().text3, Colors().altBg1), backgroundColor('rgba(0,0,0,0)', Colors().inactiveHover)];
    return { textStyle, buttonStyle };
  }

  public renderTransformationListItem(value, index)
  {
    const style = this.transformationListItemStyle(index === this.state.currentIndex && this.state.viewState === ViewState.EDIT);

    return (
      <div className='transformation-row' key={index}>
        <div className='transformation-row-text' style={style.textStyle}>
          {value.id}
        </div>
        <div className='edit-transformation-spacer'>
          <div
            className='edit-transformation-button'
            key={`edit ${index}`}
            style={style.buttonStyle}
            onClick={this.handleEditTransformationFactory(index)}
          >
            <EditIcon />
          </div>
        </div>
      </div>
    );
  }

  public renderEditTransformationSection()
  {
    return (
      <div className='transformation-editor'>
        I don't know what should go here yet. {this.state.currentIndex}
      </div>
    );
  }

  public renderCreateTransformationSection()
  {
    return (
      <div className='transformation-creator'>
        I also don't know what to put here...
      </div>
    );
  }

  public renderNewTransformationButton()
  {
    return (
      <div
        className='add-transformation-row'
        key='new-button'
        style={fontColor(Colors().text3, Colors().active)}
        onClick={this.handleAddNewTransformation}
      >
        <div className='add-transformation-button' >
          <AddIcon />
        </div>
        <div className='transformation-row-text'>
          Add Another Transformation
        </div>

      </div>
    );
  }

  public render()
  {
    const { keyPath, field, canEdit, preview } = this.props;
    const transformations = field.transformations;
    return (
      <div className='template-editor-field-transformations'>
        <div className='transformations-list'>
          {transformations.map(this.renderTransformationListItem)}
          {this.renderNewTransformationButton()}
        </div>
        <div className='transformation-fade-container'>
          <FadeInOut open={this.state.viewState === ViewState.EDIT}>
            {this.renderEditTransformationSection()}
          </FadeInOut>
          <FadeInOut open={this.state.viewState === ViewState.CREATE_NEW}>
            {this.renderCreateTransformationSection()}
          </FadeInOut>
        </div>
      </div>
    );
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

  public handleAddNewTransformation()
  {
    this._proxy().addTransformation(TransformationNodeType.CapitalizeNode, List([this.props.field.fieldId]));
    this.setState({
      viewState: ViewState.CREATE_NEW,
    });
  }

}

export default Util.createTypedContainer(
  TemplateEditorFieldTransformations,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
