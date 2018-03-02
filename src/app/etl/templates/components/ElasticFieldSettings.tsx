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
// tslint:disable:no-var-requires

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
  _TemplateField,
  TemplateField,
} from 'etl/templates/FieldTypes';
import { ElasticTypes, JsToElasticOptions } from 'shared/etl/types/ETLElasticTypes';
import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { mapDispatchKeys, mapStateKeys, TemplateEditorField, TemplateEditorFieldProps } from './TemplateEditorField';

import './FieldSettings.less';

export type Props = TemplateEditorFieldProps;

interface SettingsState
{
  elasticType: ElasticTypes;
  analyzed: boolean;
  analyzer: string;
}

class ElasticFieldSettings extends TemplateEditorField<Props>
{
  public state: SettingsState;

  private inputMap: InputDeclarationMap<SettingsState> = {
    elasticType: {
      type: DisplayType.Pick,
      displayName: 'Elastic Type',
      options: {
        pickOptions: this.getTypeOptions,
        indexResolver: this.resolveTypeIndex,
      },
    },
    analyzed: {
      type: DisplayType.CheckBox,
      displayName: 'Analyze This Field',
      group: 'analyzer row',
    },
    analyzer: {
      type: DisplayType.Pick,
      displayName: 'Analyzer',
      group: 'analyzer row',
      options: {
        pickOptions: this.getAnalyzerOptions,
        indexResolver: this.resolveAnalyzerIndex,
      },
      shouldShow: this.shouldShowAnalyzer,
    },
  };

  constructor(props)
  {
    super(props);
    this.state = {
      elasticType: ElasticTypes.Auto,
      analyzed: false,
      analyzer: 'standard',
    };
  }

  @memoizeOne
  public _getTypeOptions(jsType: FieldTypes)
  {
    return List(JsToElasticOptions[jsType]);
  }

  public getTypeOptions()
  {
    const { fieldId } = this.props;
    const jsType = this._engine().getFieldType(fieldId);
    return this._getTypeOptions(jsType as FieldTypes);
  }

  public resolveTypeIndex(option)
  {
    const { fieldId } = this.props;
    const jsType = this._engine().getFieldType(fieldId);
    return JsToElasticOptions[jsType].indexOf(option);
  }

  public shouldShowAnalyzer(s: SettingsState)
  {
    return s.analyzed ? DisplayState.Active : DisplayState.Hidden;
  }

  @memoizeOne
  public getAnalyzerOptions()
  {
    return List(['standard']);
  }

  public resolveAnalyzerIndex()
  {
    return 0;
  }

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.state}
        onStateChange={this.setState}
        centerForm={true}
        mainButton={{
          name: 'Apply',
          onClicked: this.handleSettingsApplied,
        }}
        style={{
          flexGrow: 1,
          padding: '12px',
        }}
        actionBarStyle={{
          justifyContent: 'center',
        }}
      />
    );
  }

  public handleSettingsApplied()
  {

  }
}

export default Util.createTypedContainer(
  ElasticFieldSettings,
  mapStateKeys,
  mapDispatchKeys,
);
