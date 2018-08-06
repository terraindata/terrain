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
// tslint:disable:no-var-requires import-spacing max-classes-per-file
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import * as React from 'react';
import { instanceFnDecorator } from 'shared/util/Classes';
import { backgroundColor, borderColor, Colors, fontColor } from 'src/app/colors/Colors';

import { List, Map } from 'immutable';

import CheckBox from 'common/components/CheckBox';
import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import Quarantine from 'util/RadiumQuarantine';

import './FormSandbox.less';

const Form1 = {
  'Username': 'Alex',
  'Email': 'alex@email.com',
  'Would you like to be spammed with useless emails?': true,
};

const Form2 = {
  'Item Name': 'Candy Bar',
  'Stock': 10,
  'Price': 30.5,
  'type': ['snack', 'drink', 'produce'],
};

interface FormProps
{
  inputState: object;
  onChange: (val) => any;
}

function fastFormGenerator<T extends object>(state: T): [React.ComponentClass<FormProps>, object]
{
  const declaration: InputDeclarationMap<T> = {} as any;
  const initialState = _.cloneDeep(state);

  for (const key of Object.keys(state))
  {
    const value = state[key];
    switch (typeof value)
    {
      case 'string':
        declaration[key] = {
          type: DisplayType.TextBox,
          displayName: key,
        };
        break;
      case 'number':
        declaration[key] = {
          type: DisplayType.NumberBox,
          displayName: key,
        };
        break;
      case 'boolean':
        declaration[key] = {
          type: DisplayType.CheckBox,
          displayName: key,
        };
        break;
      case 'object':
        if (Array.isArray(value))
        {
          if (value.length === 0)
          {
            declaration[key] = {
              type: DisplayType.TagsBox,
              displayName: key,
            };
          }
          else
          {
            initialState[key] = value[0];
            declaration[key] = {
              type: DisplayType.Pick,
              displayName: key,
              options: {
                pickOptions: (s) => List(value),
                indexResolver: (v) => value.indexOf(v),
              },
            };
          }
        }
        else
        {
          declaration[key] = {
            type: DisplayType.Delegate,
            displayName: key,
            options: {
              component: fastFormGenerator(declaration[key]),
            },
          };
        }
        break;
      default:
        declaration[key] = {};
    }
  }

  class FormClass extends TerrainComponent<FormProps>
  {
    public render()
    {
      return (
        <DynamicForm
          inputMap={declaration}
          inputState={this.props.inputState}
          onStateChange={this.props.onChange}
        />
      );
    }
  }

  return [FormClass, initialState];
}

function createFormOption(formState: object)
{
  const [componentClass, initialState] = fastFormGenerator(formState);
  return {
    componentClass,
    initialState,
  };
}

const options: {
  [k: string]: { componentClass: React.ComponentClass<FormProps>, initialState: object },
} = {
  Signup: createFormOption(Form1),
  Item: createFormOption(Form2),
};

const optionKeys = List(Object.keys(options) as string[]);

interface ControlState
{
  width: number;
  height: number;
  form: string;
  drawBorder: boolean;
}

const sizeFactor = 200;

class FormSandbox extends TerrainComponent<{}>
{
  public state: {
    formState: object,
    controlState: ControlState,
  } = {
      formState: options['Signup'].initialState,
      controlState: {
        width: 2,
        height: 2,
        form: 'Signup',
        drawBorder: true,
      },
    };

  public controlMap: InputDeclarationMap<ControlState> = {
    drawBorder: {
      type: DisplayType.CheckBox,
      displayName: 'Draw Border',
      options: {
        large: true,
      },
    },
    form: {
      type: DisplayType.Pick,
      displayName: 'Sample Form',
      options: {
        pickOptions: (s) => optionKeys,
        indexResolver: (v) => optionKeys.indexOf(v),
      },
    },
  };

  public renderForm(FClass: React.ComponentClass<FormProps>)
  {
    return (
      <div
        className='sandbox-form-container'
        style={{
          border: `1px solid ${this.state.controlState.drawBorder ? Colors().logLevels.warn : 'rgba(0,0,0,0)'}`,
          width: `${this.state.controlState.width * sizeFactor}px`,
          height: `${this.state.controlState.height * sizeFactor}px`,
        }}
      >
        <FClass
          onChange={this._setStateWrapper('formState')}
          inputState={this.state.formState}
        />
      </div>
    );
  }

  public getCellStyle(row: number, col: number)
  {
    if (row <= this.state.controlState.height && col <= this.state.controlState.width)
    {
      return [backgroundColor(Colors().active, Colors().activeHover), borderColor(Colors().border1)];
    }
    else
    {
      return [backgroundColor(Colors().bg2, Colors().activeHover), borderColor(Colors().border1)];
    }
  }

  @instanceFnDecorator(_.memoize)
  public cellClickFactory(hash: string, row: number, col: number)
  {
    return () =>
    {
      const newState = _.extend({}, this.state.controlState, {
        height: row,
        width: col,
      });
      this.setState({
        controlState: newState,
      });
    };
  }

  public renderSizePickerCol(row: number, col: number)
  {
    const hash = `${row}.${col}`;
    return (
      <div
        className='sandbox-form-size-cell'
        key={hash}
        style={this.getCellStyle(row, col)}
        onClick={this.cellClickFactory(hash, row, col)}
      />
    );
  }

  public renderSizePickerRow(row: number)
  {
    return (
      <div className='sandbox-form-size-row'>
        {this.renderSizePickerCol(row, 1)}
        {this.renderSizePickerCol(row, 2)}
        {this.renderSizePickerCol(row, 3)}
        {this.renderSizePickerCol(row, 4)}
      </div>
    );
  }

  public renderSizePicker()
  {
    return (
      <Quarantine>
        <div
          className='sandbox-form-size-controller'
          style={borderColor(Colors().border1)}
        >
          {this.renderSizePickerRow(1)}
          {this.renderSizePickerRow(2)}
          {this.renderSizePickerRow(3)}
          {this.renderSizePickerRow(4)}
        </div>
      </Quarantine>
    );
  }

  public render()
  {
    return (
      <div style={{ padding: '12px' }}>
        Form Sandbox Control
        <div className='sandbox-form-controller'>
          <div className='sandbox-control-section'>
            <DynamicForm
              inputMap={this.controlMap}
              inputState={this.state.controlState}
              onStateChange={this.handleControlStateChange}
            />
          </div>
          <div className='sandbox-control-section'>
            Size
            {this.renderSizePicker()}
          </div>
        </div>
        {this.renderForm(options[this.state.controlState.form].componentClass)}
      </div>
    );
  }

  public handleControlStateChange(newControlState: ControlState)
  {
    const newState: Partial<this['state']> = {};
    if (this.state.controlState.form !== newControlState.form)
    {
      newState.formState = options[newControlState.form].initialState;
    }
    newState.controlState = newControlState;
    this.setState(newState);
  }

}

export default FormSandbox;
