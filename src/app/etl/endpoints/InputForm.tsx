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

// Copyright 2018 Terrain Data, Inc.
// tslint:disable:no-var-requires max-classes-per-file
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';
import { borderColor, Colors, fontColor } from 'src/app/colors/Colors';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { instanceFnDecorator } from 'shared/util/Classes';

import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import
{
  RootInputConfig,
} from 'shared/etl/immutable/EndpointRecords';
import
{
  InputConfig,
  InputFileEnum,
  InputFileOptionsType,
  InputFileOptionsTypes,
  InputFileTypes as InputFileTypes,
  InputOptionsEnum,
  InputOptionsType,
  RootInputConfig as RootInputConfigI,
} from 'shared/etl/types/InputTypes';
import Quarantine from 'util/RadiumQuarantine';

const DeleteIcon = require('images/icon_close.svg');
import 'common/components/ObjectForm.less';

import { List } from 'immutable';

export interface Props
{
  rootInputConfig: RootInputConfig;
  onChange: (config: RootInputConfig, isBlur?: boolean) => void;
  style?: any;
}

type FormState = RootInputConfigI;
export class InputsForm extends TerrainComponent<Props>
{
  public inputMap: InputDeclarationMap<FormState> = {
    inputs: {
      type: DisplayType.Custom,
      widthFactor: -1,
      options: {
        render: this.renderInputs,
      },
    },
  };

  @instanceFnDecorator(memoizeOne)
  public inputList(inputs: InputConfig[]): List<InputConfig>
  {
    if (inputs === undefined)
    {
      return List([]);
    }
    else
    {
      return List(inputs as InputConfig[]);
    }
  }

  public renderInput(input: InputConfig, index: number)
  {
    return (
      <div
        key={index}
        className='object-form-row'
      >
        <InputForm
          input={input}
          onChange={this.inputChangeFactory(index)}
        />
        <Quarantine>
          <div
            className='object-form-row-delete'
            style={fontColor(Colors().text3, Colors().text2)}
            onClick={this.handleDeleteRowFactory(index)}
          >
            <DeleteIcon />
          </div>
        </Quarantine>
      </div>
    );
  }

  public inputChangeFactory(index: number)
  {
    return (cfg: InputConfig, apply?: boolean) =>
    {
      const { rootInputConfig, onChange } = this.props;
      const inputs: InputConfig[] = rootInputConfig.inputs;
      const newList = inputs.slice();
      newList[index] = cfg;
      onChange(rootInputConfig.set('inputs', newList), apply);
    };
  }

  public renderInputs(state: FormState, disabled)
  {
    return (
      <div className='object-form-container'>
        <div className='object-form-label'>
          Inputs
        </div>
        <div className='object-kv-body' style={borderColor(Colors().border1)}>
          {this.inputList(state.inputs).map(this.renderInput)}
          {this.renderAddNewRow()}
        </div>
      </div>
    );
  }

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.props.rootInputConfig}
        onStateChange={this.props.onChange}
        style={this.props.style}
      />
    );
  }

  public renderAddNewRow()
  {
    return (
      <PathfinderCreateLine
        text={'Add New'}
        canEdit={true}
        onCreate={this.addRow}
        showText={true}
        style={overrideCreateStyle}
      />
    );
  }

  public addRow()
  {
    const { rootInputConfig, onChange } = this.props;
    const inputs = rootInputConfig.inputs != null ?
      rootInputConfig.inputs :
      [];

    const newItems = inputs.slice();
    newItems.push({
      type: 'File',
      options: {
        options: {},
        name: null,
        type: null,
      },
    });

    onChange(rootInputConfig.set('inputs', newItems), true);
  }

  @instanceFnDecorator(_.memoize)
  public handleDeleteRowFactory(index: number)
  {
    return () =>
    {
      const { rootInputConfig, onChange } = this.props;
      const inputs = rootInputConfig.inputs != null ?
        rootInputConfig.inputs :
        [];

      const newItems = inputs.slice();
      newItems.splice(index, 1);

      onChange(rootInputConfig.set('inputs', newItems), true);
    };
  }
}

const overrideCreateStyle = {
  height: '24px',
};

export interface InProps
{
  input: InputConfig;
  onChange: (cfg: InputConfig, apply?: boolean) => void;
}

export class InputForm extends TerrainComponent<InProps>
{
  public inputOptions: List<string> = List(['File']);
  public inputMap: InputDeclarationMap<InputConfig> = {
    type: {
      type: DisplayType.Pick,
      displayName: 'Type',
      options: {
        pickOptions: (s) => this.inputOptions,
        indexResolver: (value) => this.inputOptions.indexOf(value),
      },
    },
    options: {
      type: DisplayType.Custom,
      options: {
        render: this.renderOptions,
      },
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        inputState={this.props.input}
        onStateChange={this.props.onChange}
      />
    );
  }

  public renderOptions(state, disabled)
  {
    const options = this.getCurrentOptions();
    switch (state.type)
    {
      case InputOptionsEnum.File:
        return (
          <FileForm
            options={options as FileState}
            onChange={this.handleOptionsChange}
          />
        );
      default:
        return null;
    }
  }

  public getCurrentOptions()
  {
    const { input } = this.props;
    return input.options != null ? input.options : {};
  }

  public handleOptionsChange(options, apply?: boolean)
  {
    const newInput = _.extend({}, this.props.input, {
      options,
    });
    this.props.onChange(newInput, apply);
  }
}

type FileState = InputOptionsType<InputOptionsEnum.File>;
export interface FileProps
{
  options: FileState;
  onChange: (cfg: FileState, apply?: boolean) => void;
}

export class FileForm extends TerrainComponent<FileProps>
{
  public fileOptions: List<InputFileEnum> = List([
    InputFileEnum.Date,
    InputFileEnum.Number,
    InputFileEnum.Text,
  ]);

  public inputMap: InputDeclarationMap<FileState> = {
    type: {
      type: DisplayType.Pick,
      displayName: 'Type',
      options: {
        pickOptions: (s) => this.fileOptions,
        indexResolver: (value) => this.fileOptions.indexOf(value),
      },
    },
    name: {
      type: DisplayType.TextBox,
      displayName: 'Name',
    },
    options: {
      type: DisplayType.Custom,
      options: {
        render: this.renderOptions,
      },
    },
  };

  public renderOptions(state, disabled)
  {
    const options = this.getCurrentType();
    switch (state.type)
    {
      case InputFileEnum.Date:
        return (
          <FileDateForm
            options={options as FileDateState}
            onChange={this.handleOptionsChange}
          />
        );
      case InputFileEnum.Number:
        return (
          <FileNumberForm
            options={options as FileNumberState}
            onChange={this.handleOptionsChange}
          />
        );
      case InputFileEnum.Text:
        return (
          <FileTextForm
            options={options as FileTextState}
            onChange={this.handleOptionsChange}
          />
        );
      default:
        return null;
    }
  }

  public getCurrentType()
  {
    const { options } = this.props;
    return options.options != null ? options.options : {};
  }

  public handleOptionsChange(options, apply?: boolean)
  {
    const newInput = _.extend({}, this.props.options, {
      options,
    });
    this.props.onChange(newInput, apply);
  }

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.options}
      />
    );
  }
}

interface OptionProps<T>
{
  onChange: (val, apply?) => void;
  options: T;
}

type FileDateState = InputFileOptionsType<InputFileEnum.Date>;
// export interface FileDateProps
// {
//   options: FileDateState;
//   onChange: (cfg: FileDateState, apply?: boolean) => void;
// }

export class FileDateForm extends TerrainComponent<OptionProps<FileDateState>>
{
  public inputMap: InputDeclarationMap<FileDateState> = {
    format: {
      type: DisplayType.TextBox,
      displayName: 'Format',
    },
    dayInterval: {
      type: DisplayType.NumberBox,
      displayName: 'Day Interval',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.options}
      />
    );
  }
}

type FileNumberState = InputFileOptionsType<InputFileEnum.Number>;
export interface FileNumberProps
{
  options: FileNumberState;
  onChange: (cfg: FileNumberState, apply?: boolean) => void;
}

export class FileNumberForm extends TerrainComponent<OptionProps<FileNumberState>>
{
  public inputMap: InputDeclarationMap<FileNumberState> = {
    start: {
      type: DisplayType.NumberBox,
      displayName: 'Start',
    },
    end: {
      type: DisplayType.NumberBox,
      displayName: 'End',
    },
    interval: {
      type: DisplayType.NumberBox,
      displayName: 'Interval',
    },
    padding: {
      type: DisplayType.TextBox,
      displayName: 'Padding',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.options}
      />
    );
  }
}

type FileTextState = InputFileOptionsType<InputFileEnum.Text>;
export interface FileTextProps
{
  options: FileTextState;
  onChange: (cfg: FileTextState, apply?: boolean) => void;
}

export class FileTextForm extends TerrainComponent<OptionProps<FileTextState>>
{
  public inputMap: InputDeclarationMap<FileTextState> = {
    name: {
      type: DisplayType.TextBox,
      displayName: 'Name',
    },
  };

  public render()
  {
    return (
      <DynamicForm
        inputMap={this.inputMap}
        onStateChange={this.props.onChange}
        inputState={this.props.options}
      />
    );
  }
}
