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
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

import Autocomplete from 'common/components/Autocomplete';
import CheckBox from 'common/components/CheckBox';
import Dropdown from 'common/components/Dropdown';
import { Menu, MenuOption } from 'common/components/Menu';
import { TemplateEditorActions } from 'etl/templates/data/TemplateEditorRedux';

import
{
  _TemplateField, ELASTIC_TYPES, TEMPLATE_TYPES,
  TemplateEditorState, TemplateField
} from 'etl/templates/TemplateTypes';
import { TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';
import TemplateEditorFieldTypeSection from './TemplateEditorFieldTypeSection';

import './TemplateEditorField.less';

export interface Props extends TemplateEditorFieldProps
{
  keyPath: KeyPath;
  field: TemplateField;
  canEdit: boolean;
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

@Radium
class TemplateEditorFieldSettings extends TemplateEditorField<Props>
{
  public state: {
    originalNameOpen: boolean;
  } = {
    originalNameOpen: false,
  }

  constructor(props)
  {
    super(props);
    this._getContextMenuOptions = memoizeOne(this._getContextMenuOptions);
  }

  // memoized once
  public _getContextMenuOptions(isExport: boolean): List<MenuOption>
  {
    return List([
      {
        text: 'transform this field*',
        onClick: () => 0,
      },
      {
        text: 'duplicate field*',
        onClick: () => 0,
      },
      {
        text: 'remove field',
        onClick: this._deleteSelf.bind(this),
      },
    ]);
  }

  public getContextMenuOptions(): List<MenuOption>
  {
    return this._getContextMenuOptions(this._isExport());
  }

  public renderFieldNameSection()
  {
    const { field, canEdit } = this.props;
    const inputDisabled = this._inputDisabled();

    const inputFieldName =
      <Autocomplete
        value={field.name}
        onChange={this._setFactory('name')}
        disabled={inputDisabled}
        options={emptyOptions}
        style={fontColor(Colors().text1)}
      />;

    const showOriginalName = field.name !== field.originalName;
    let inputOriginalName = <div />

    if (showOriginalName)
    {
      inputOriginalName = this.state.originalNameOpen ?
        <div className='tef-layout-autocomplete-spacer'>
          <Autocomplete
            value={field.originalName}
            onChange={this._setFactory('originalName')}
            disabled={inputDisabled}
            options={emptyOptions}
            onFocus={this.enableOriginalNameInput}
            onBlur={this.disableOriginalNameInput}
            autoFocus={true}
            style={originalNameAutocompleteStyle}
          />
        </div>
        :
        <div className='tef-layout-label tef-center normal-text'>
          &nbsp;{field.originalName}
        </div>
    }

    const fieldNameSection = (
      <div className='tef-layout-content-row tef-layout-no-padding-bottom'>
        <div className='tef-layout-label tef-special-first-label'> Name </div>
        <div className='tef-layout-autocomplete-spacer'> {inputFieldName} </div>
        {showOriginalName ?
          <div
            className='template-editor-field-label-group'
            style={originalNameLabelStyle}
            onClick={this._noopIfDisabled(this.enableOriginalNameInput)}
            key={this.state.originalNameOpen ? 'autocomplete' : 'label'}
          >
            <div className='tef-layout-label tef-left normal-text'> (from </div>
            {inputOriginalName}
            <div className='tef-layout-label tef-right normal-text'> ) </div>
          </div> : undefined
        }
      </div>
    );

    return fieldNameSection;
  }

  public render()
  {
    const { field, canEdit, keyPath } = this.props;
    const inputDisabled = this._inputDisabled();
    const disableCheckbox = !canEdit; // only disable checkbox if it is disabled from a parent

    return (
      <div
        className='template-editor-field-row'
        style={fontColor(Colors().text1)}
      >
        <div className='include-field-checkbox-spacer'>
          <CheckBox
            checked={field.isIncluded}
            onChange={this.handleIncludeCheckboxClicked}
            disabled={disableCheckbox}
            large={true}
          />
        </div>
        <div className={classNames({
          'template-editor-field-settings': true,
          'template-editor-field-input-disabled': inputDisabled,
        })}
          style={[
            backgroundColor(Colors().bg3),
            borderColor(Colors().border1)
          ]}
        >
          <div className='tef-layout-row'>
            <div className='tef-layout-column'>
              {this.renderFieldNameSection()}
              {
                <TemplateEditorFieldTypeSection
                  field={field}
                  canEdit={canEdit}
                  keyPath={keyPath}
                />
              }
            </div>
            <div className='tef-layout-padded flex-container-center'>
              <div className='tef-menu-wrapper-positioning'>
                <Menu
                  options={this.getContextMenuOptions()}
                  style={_.extend({}, getStyle('top', '0px'), getStyle('right', '0px'))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  public enableOriginalNameInput()
  {
    this.setState({
      originalNameOpen: true,
    });
  }

  public disableOriginalNameInput()
  {
    this.setState({
      originalNameOpen: false,
    });
  }

  public handleIncludeCheckboxClicked()
  {
    this._set('isIncluded', !this.props.field.isIncluded);
  }

}

const originalNameLabelStyle = [
  fontColor(Colors().text3),
];

const originalNameAutocompleteStyle = [
  getStyle('width', '160px'),
  fontColor(Colors().text1),
];

const emptyOptions = List([]);

export default Util.createTypedContainer(
  TemplateEditorFieldSettings,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
