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

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';

import
{
  _ElasticFieldSettings, _TemplateField,
  ElasticFieldSettings, TemplateField,
} from 'etl/templates/FieldTypes';
import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './FieldSettings.less';

export type Props = TemplateEditorFieldProps;

@Radium
class FieldMainSettings extends TemplateEditorField<Props>
{
  public state: {
    formState: SettingsState,
  };

  constructor(props)
  {
    super(props);
    this.state = {
      formState: this.getFormStateFromField(props),
    };
  }

  public componentWillReceiveProps(nextProps)
  {
    if (this._willFieldChange(nextProps))
    {
      this.setState({
        formState: this.getFormStateFromField(nextProps),
      });
    }
  }

  public getFormStateFromField(props)
  {
    const field = this._fieldMap(props).get(props.fieldId);
    return {
      fieldName: field.name,
      isIncluded: field.isIncluded,
      type: field.type,
    };
  }

  public render()
  {
    return (
      <div className='field-main-settings'>
        <DynamicForm
          inputMap={settingsInputMap}
          inputState={this.state.formState}
          onStateChange={this._setStateWrapper('formState')}
          centerForm={true}
          mainButton={{
            name: 'Apply',
            onClicked: this.handleSettingsApplied,
          }}
          secondButton={{
            name: 'Close',
            onClicked: this.handleCloseSettings,
          }}
          style={{
            flexGrow: 1,
            padding: '12px',
          }}
          actionBarStyle={{
            justifyContent: 'center',
          }}
        />
      </div>
    );
  }

  public handleSettingsApplied()
  {
    const field = this._field();
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
      if (field.type !== formState.type)
      {
        proxy.changeType(formState.type);
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
  type: FieldTypes;
}

const settingsInputMap: InputDeclarationMap<SettingsState> = {
  fieldName: {
    type: DisplayType.TextBox,
    displayName: 'Name',
    group: 'row',
  },
  isIncluded: {
    type: DisplayType.CheckBox,
    displayName: 'Include this field',
    group: 'row',
  },
  type: {
    type: DisplayType.Pick,
    displayName: 'Field Type',
    options: {
      pickOptions: (s: SettingsState) => typeOptions,
      indexResolver: (value) => typeOptions.indexOf(value),
    },
  },
};

const typeOptions = List(['array', 'object', 'string', 'number', 'boolean']);

export default Util.createTypedContainer(
  FieldMainSettings,
  mapStateKeys,
  mapDispatchKeys,
);
