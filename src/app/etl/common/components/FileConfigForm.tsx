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

import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { instanceFnDecorator } from 'shared/util/Classes';

import Util from 'app/util/Util';
import { _FileConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { FileConfig as FileConfigI } from 'shared/etl/types/EndpointTypes';
import { FileTypes, Languages } from 'shared/etl/types/ETLTypes';

const { List } = Immutable;

export interface Props
{
  fileConfig: FileConfig;
  onChange: (config: FileConfig, isBlur?: boolean) => void;
  hideTypePicker?: boolean;
  style?: any;
}

type FormState = FileConfigI & {
  useXmlPath: boolean;
  useJsonPath: boolean;
};

export default class FileConfigForm extends TerrainComponent<Props>
{
  public inputMap: InputDeclarationMap<FormState> =
    {
      fileType: {
        type: DisplayType.Pick,
        displayName: 'File Type',
        widthFactor: 2,
        group: 'file type',
        options: {
          pickOptions: (s: FormState) => fileTypeList,
          indexResolver: (value) => fileTypeList.indexOf(value),
        },
        getDisplayState: this.fileTypeDisplayState,
      },
      // hasCsvHeader: {
      //   type: DisplayType.CheckBox,
      //   displayName: 'File Has Header',
      //   group: 'file type',
      //   widthFactor: 4,
      //   getDisplayState: (s: FormState) => (s.fileType === FileTypes.Csv || s.fileType === FileTypes.Tsv)
      //     ? DisplayState.Active : DisplayState.Hidden,
      // }, currently disabled since we don't allow not having a header
      jsonNewlines: {
        type: DisplayType.CheckBox,
        displayName: 'Objects separated by newlines',
        group: 'file type',
        widthFactor: 4,
        getDisplayState: (s: FormState) => s.fileType === FileTypes.Json ? DisplayState.Active : DisplayState.Hidden,
      },
      useXmlPath: {
        type: DisplayType.CheckBox,
        displayName: 'Use XML Extract Key',
        group: 'path',
        widthFactor: 2,
        getDisplayState: (s: FormState) => s.fileType === FileTypes.Xml ? DisplayState.Active : DisplayState.Hidden,
      },
      xmlPath: {
        type: DisplayType.TextBox,
        displayName: 'XML Extract Key',
        group: 'path',
        widthFactor: 4,
        getDisplayState: this.xmlPathDisplay,
      },
      useJsonPath: {
        type: DisplayType.CheckBox,
        displayName: 'Use JSON Path',
        group: 'path',
        widthFactor: 2,
        getDisplayState: (s: FormState) => s.fileType === FileTypes.Json ? DisplayState.Active : DisplayState.Hidden,
      },
      jsonPath: {
        type: DisplayType.TextBox,
        displayName: 'JSON Path',
        group: 'path',
        widthFactor: 4,
        getDisplayState: this.jsonPathDisplay,
      },
    };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.configToState(this.props.fileConfig)}
        onStateChange={this.handleFormChange}
        style={this.props.style}
      />
    );
  }

  public xmlPathDisplay(s: FormState)
  {
    return (s.fileType === FileTypes.Xml && s.useXmlPath === true) ? DisplayState.Active : DisplayState.Hidden;
  }

  public jsonPathDisplay(s: FormState)
  {
    return (s.fileType === FileTypes.Json && s.useJsonPath === true) ? DisplayState.Active : DisplayState.Hidden;
  }

  public fileTypeDisplayState(s: FormState)
  {
    return this.props.hideTypePicker === true ? DisplayState.Hidden : DisplayState.Active;
  }

  @instanceFnDecorator(memoizeOne)
  public configToState(config: FileConfig): FormState
  {
    const state = Util.asJS(config) as FormState;
    if (state.xmlPath !== null)
    {
      state.useXmlPath = true;
    }
    if (state.jsonPath !== null)
    {
      state.useJsonPath = true;
    }
    return state;
  }

  public handleFormChange(formState: FormState, isBlur?: boolean)
  {
    const state = _.extend({}, formState);

    if (state.useXmlPath && state.xmlPath === null)
    {
      state.xmlPath = '';
    }
    else if (!state.useXmlPath && state.xmlPath !== null)
    {
      state.xmlPath = null;
    }

    if (state.useJsonPath && state.jsonPath === null)
    {
      state.jsonPath = '';
    }
    else if (!state.useJsonPath && state.jsonPath !== null)
    {
      state.jsonPath = null;
    }

    this.props.onChange(_FileConfig(state), isBlur);
  }
}

const fileTypeList = List([FileTypes.Json, FileTypes.Csv, FileTypes.Xml, FileTypes.Tsv, FileTypes.Xlsx]);
