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

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

// import Autocomplete from 'common/components/Autocomplete';
// import CheckBox from 'common/components/CheckBox';
// import Dropdown from 'common/components/Dropdown';
// import { Menu, MenuOption } from 'common/components/Menu';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { TemplateEditorActions } from 'etl/templates/TemplateEditorRedux';

import
{
  _ElasticFieldSettings, _TemplateField,
  ElasticFieldSettings, TemplateField,
} from 'etl/templates/FieldTypes';
import { TemplateEditorState } from 'etl/templates/TemplateTypes';

import ElasticFieldTypeSection from './ElasticFieldTypeSection';
import { TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';
import TemplateEditorFieldTransformations from './TemplateEditorFieldTransformations';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';

import './FieldSettings.less';

export interface Props extends TemplateEditorFieldProps
{
  // below from container
  templateEditor?: TemplateEditorState;
  act?: typeof TemplateEditorActions;
}

const CloseIcon = require('images/icon_close.svg');

enum ViewCategory
{
  SETTINGS,
  TRANSFORMATIONS,
  ADVANCED,
}

@Radium
class TemplateEditorFieldSettings extends TemplateEditorField<Props>
{
  public state: {
    currentCategory: ViewCategory,
    formState: SettingsState,
  };

  constructor(props)
  {
    super(props);
    this.state = {
      formState: this.getFormStateFromField(props),
      currentCategory: ViewCategory.SETTINGS,
    };
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.field.isIncluded !== this.props.field.isIncluded || nextProps.field.name !== this.props.field.name)
    {
      this.setState({
        formState: this.getFormStateFromField(nextProps),
      });
    }
  }

  public getFormStateFromField(props)
  {
    const { field } = props;
    return {
      fieldName: field.name,
      isIncluded: field.isIncluded,
    };
  }

  // public renderGeneralSettings()
  // {
  //   const { field } = this.props;
  //   return (
  //     <div className='field-settings-row'>
  //       <div className='field-settings-label'>
  //         Name
  //       </div>
  //       <Autocomplete
  //         value={field.name}
  //         onChange={this.handleNameChange}
  //         options={List([])}
  //       />
  //       <div
  //         className='tef-checkbox-section'
  //         style={field.isIncluded ? fontColor(Colors().text2) : fontColor(Colors().text3)}
  //         onClick={this.handleIncludeCheckboxClicked}
  //       >
  //         <div className='tef-checkbox-spacer'>
  //           <CheckBox
  //             checked={field.isIncluded}
  //             onChange={() => { /* do nothing */ }}
  //             disabled={this._inputDisabled()}
  //           />
  //         </div>
  //         <div className='tef-checkbox-label'> Include this field </div>
  //       </div>
  //     </div>
  //   );
  // }

  public renderSettings()
  {
    return (
      <DynamicForm
        inputMap={settingsInputMap}
        inputState={this.state.formState}
        onStateChange={this._setStateWrapper('formState')}
        mainButton={{
          name: 'Apply',
          onClicked: this.handleSettingsApplied,
        }}
        style={getStyle('flexGrow', '1')}
      />
    );
  }

  public renderTitleBar()
  {
    const activeStyle = fontColor(Colors().active, Colors().active);
    const inactiveStyle = fontColor(Colors().text2, Colors().inactiveHover);
    return (
      <div
        className='field-settings-title-bar'
        style={[backgroundColor(Colors().bg3), borderColor(Colors().border1)]}
      >
        <div
          className='field-settings-category'
          key='settings'
          style={this.state.currentCategory === ViewCategory.SETTINGS ? activeStyle : inactiveStyle}
          onClick={this.changeSettingsFactory(ViewCategory.SETTINGS)}
        >
          Settings
        </div>
        <div
          className='field-settings-category'
          key='transforms'
          style={this.state.currentCategory === ViewCategory.TRANSFORMATIONS ? activeStyle : inactiveStyle}
          onClick={this.changeSettingsFactory(ViewCategory.TRANSFORMATIONS)}
        >
          Transform
        </div>
        <div
          className='field-settings-category'
          key='advanced'
          style={this.state.currentCategory === ViewCategory.ADVANCED ? activeStyle : inactiveStyle}
          onClick={this.changeSettingsFactory(ViewCategory.ADVANCED)}
        >
          Advanced
        </div>
        <div className='field-settings-title-filler' />
        <div
          className='field-settings-close-button'
          style={fontColor(Colors().text3, Colors().text2)}
          key='close'
          onClick={this.handleCloseSettings}
        >
          <CloseIcon width='12px' height='12px' />
        </div>
      </div>
    );
  }

  public render()
  {
    return (
      <div className='template-editor-field-settings' style={fontColor(Colors().text2)}>
        {this.renderTitleBar()}
        <div className='field-settings-section'>
          {
            this.state.currentCategory === ViewCategory.SETTINGS ?
              this.renderSettings() : null
          }
          {
            this.state.currentCategory === ViewCategory.ADVANCED ?
              <ElasticFieldTypeSection
                {...this._passProps()}
              /> : null
          }
          {
            this.state.currentCategory === ViewCategory.TRANSFORMATIONS ?
              <TemplateEditorFieldTransformations
                {...this._passProps()}
              /> : null
          }
        </div>
      </div>
    );
  }

  public changeSettingsFactory(category: ViewCategory)
  {
    return () =>
    {
      this.setState({
        currentCategory: category,
      });
    };
  }

  public handleSettingsApplied()
  {
    const { field } = this.props;
    const { formState } = this.state;
    this._proxy().withEngineMutations((proxy) =>
    {
      if (field.isIncluded !== formState.isIncluded)
      {
        proxy.setFieldEnabled(formState.isIncluded);
      }
      if (field.name !== formState.fieldName)
      {
        proxy.changeName(formState.fieldName);
      }
    });
  }

  public handleCloseSettings()
  {
    this.props.act({
      actionType: 'closeSettings',
    });
  }

}

interface SettingsState
{
  fieldName: string;
  isIncluded: boolean;
}

const settingsInputMap: InputDeclarationMap<SettingsState> = {
  fieldName: {
    type: DisplayType.TextBox,
    displayName: 'Name',
  },
  isIncluded: {
    type: DisplayType.CheckBox,
    displayName: 'Include this field',
  },
};

export default Util.createTypedContainer(
  TemplateEditorFieldSettings,
  ['templateEditor'],
  { act: TemplateEditorActions },
);
