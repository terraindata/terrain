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
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { instanceFnDecorator } from 'shared/util/Classes';
import { backgroundColor, borderColor, buttonColors, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';
const { List, Map } = Immutable;

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import
{
  _TemplateField,
  TemplateField,
} from 'etl/templates/FieldTypes';
import LanguageUI from 'etl/templates/languages/LanguageUI';
import LanguageController from 'shared/etl/languages/LanguageControllers';
import { ETLFieldTypes, etlFieldTypesList, etlFieldTypesNames, FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './FieldSettings.less';

export interface Props extends TemplateEditorFieldProps
{
  registerApply: (apply: () => void) => void;
}

interface SettingsState
{
  fieldName: string;
  isPrimaryKey: boolean;
  type: ETLFieldTypes;
}

class FieldMainSettings extends TemplateEditorField<Props>
{
  public state: {
    formState: SettingsState,
  };

  public settingsInputMap: InputDeclarationMap<SettingsState> = {
    fieldName: {
      type: DisplayType.TextBox,
      displayName: 'Name',
      getDisplayState: this.getFieldNameDisplayState,
    },
    type: {
      type: DisplayType.Pick,
      displayName: 'Field Type',
      options: {
        pickOptions: (s) => etlFieldTypesList,
        indexResolver: (value) => etlFieldTypesList.indexOf(value),
        displayNames: (s) => etlFieldTypesNames,
      },
    },
    isPrimaryKey: {
      type: DisplayType.CheckBox,
      displayName: 'Primary Key',
      getDisplayState: this.getPrimaryKeyDisplayState,
    },
  };

  constructor(props)
  {
    super(props);
    this.state = {
      formState: this.getFormStateFromField(props),
    };
  }

  public componentDidMount()
  {
    this.props.registerApply(() => this.handleSettingsApplied());
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

  public getFieldNameDisplayState(s: SettingsState)
  {
    return this._field().canEditName() ? DisplayState.Active : DisplayState.Hidden;
  }

  public getPrimaryKeyDisplayState(s: SettingsState)
  {
    const { canChangeKey } = this.getPrimaryKeyInfo();
    return canChangeKey ? DisplayState.Active : DisplayState.Hidden;
  }

  @instanceFnDecorator(memoizeOne)
  public _getPrimaryKeyInfo(currentLanguage: Languages, engine: TransformationEngine, fieldId: number, engineVersion: number)
  {
    const controller = LanguageController.get(currentLanguage);
    const isPrimaryKey = controller.isFieldPrimaryKey(engine, fieldId);
    const canChangeKey = controller.canSetPrimaryKey(engine, fieldId);
    return {
      isPrimaryKey,
      canChangeKey,
    };
  }

  public getPrimaryKeyInfo(props = this.props):
    {
      isPrimaryKey: boolean,
      canChangeKey: boolean,
    }
  {
    const fieldId = props.fieldId;
    const engine = this._currentEngine(props);
    const engineVersion = this._engineVersion(props);
    const language = this._getCurrentLanguage(props);
    return this._getPrimaryKeyInfo(language, engine, fieldId, engineVersion);
  }

  public getFormStateFromField(props)
  {
    const fieldId = props.fieldId;
    const { isPrimaryKey } = this.getPrimaryKeyInfo(props);
    const field = this._fieldMap(props).get(props.fieldId);
    return {
      fieldName: field.name,
      isPrimaryKey,
      type: field.etlType,
    };
  }

  public render()
  {
    return (
      <div className='field-main-settings'>
        <DynamicForm
          inputMap={this.settingsInputMap}
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

    const { isPrimaryKey, canChangeKey } = this.getPrimaryKeyInfo();

    const shouldChange =
      (canChangeKey && formState.isPrimaryKey !== isPrimaryKey) ||
      (field.name !== formState.fieldName) ||
      (field.etlType !== formState.type);
    if (shouldChange)
    {
      this._try((proxy) =>
      {
        if (canChangeKey && formState.isPrimaryKey !== isPrimaryKey)
        {
          proxy.setPrimaryKey(formState.isPrimaryKey, this._getCurrentLanguage());
        }
        if (field.name !== formState.fieldName)
        {
          proxy.changeName(formState.fieldName);
        }
        if (field.etlType !== formState.type)
        {
          proxy.changeType(formState.type);
        }
      });
    }
  }

  public handleCloseSettings()
  {
    this.props.act({
      actionType: 'closeSettings',
    });
  }
}

export default Util.createTypedContainer(
  FieldMainSettings,
  mapStateKeys,
  mapDispatchKeys,
);
