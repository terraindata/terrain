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

// tslint:disable:no-invalid-this no-var-requires strict-boolean-expressions

import { List } from 'immutable';
import * as Radium from 'radium';
import * as React from 'react';
import BuilderTextbox from '../../../common/components/BuilderTextbox';
import CreateLine from '../../../common/components/CreateLine';
import DatePicker from '../../../common/components/DatePicker';
import Dropdown from '../../../common/components/Dropdown';
import TerrainComponent from '../../../common/components/TerrainComponent';
import Util from '../../../util/Util';
import Actions from '../../data/BuilderActions';
import './InputStyle.less';
const shallowCompare = require('react-addons-shallow-compare');
import { cardStyle, Colors, fontColor, getCardColors } from '../../../colors/Colors';

const TextIcon = require('./../../../../images/icon_textDropdown.svg');
const DateIcon = require('./../../../../images/icon_dateDropdown.svg');
const NumberIcon = require('./../../../../images/icon_numberDropdown.svg');
const CloseIcon = require('./../../../../images/icon_close_8x8.svg');

import { InputType } from '../../../../blocks/types/Input';

interface Props
{
  input: any;
  index: number;
  canEdit: boolean;
  onCreateInput: (index: number) => void;
  language: string;
}

const TYPE_OPTIONS =
  List([
    InputType[0],
    InputType[1],
    InputType[2],
  ]);

const colorForInputType = (inputType: InputType): string =>
{
  switch (inputType)
  {
    case InputType.NUMBER:
      return Colors().builder.cards.numberClause;
    case InputType.TEXT:
      return Colors().builder.cards.stringClause;
    case InputType.DATE:
      return Colors().builder.cards.enumClause;
    default:
      return '#f00';
  }
};

@Radium
class InputComponent extends TerrainComponent<Props>
{
  public getKeyPath(type?: string)
  {
    const keyPath = List(['query', 'inputs']);
    if (type)
    {
      return keyPath.push(this.props.index as any).push(type);
    }
    return keyPath;
  }

  public handleInputTypeChange(inputType: number)
  {
    Actions.change(this.getKeyPath('inputType'), inputType);

    if (inputType === InputType.DATE)
    {
      let date = new Date(this.props.input.value);
      if (date.toString() === 'Invalid Date')
      {
        date = new Date();
      }
      const value = Util.formatInputDate(date, this.props.language);
      Actions.change(this.getKeyPath('value'), value);
    }
  }

  public closeInput()
  {
    Util.animateToHeight(this.refs.input, 0);
    setTimeout(() =>
    {
      Actions.remove(this.getKeyPath(), this.props.index);
    }, 250);
  }

  public createInput()
  {
    this.props.onCreateInput(this.props.index);
  }

  public changeValue(value)
  {
    Actions.change(this.getKeyPath('value'), value);
  }

  public renderInputValue()
  {
    if (this.props.input.inputType === InputType.DATE)
    {
      return (
        <div>
          <DatePicker
            date={this.props.input.value}
            onChange={this.changeValue}
            canEdit={true}
            language={this.props.language}
          />
        </div>
      );
    }

    return (
      <BuilderTextbox
        canEdit={true}
        value={this.props.input.value}
        className='input-text input-text-second'
        keyPath={this.getKeyPath('value')}
        isNumber={this.props.input.inputType === InputType.NUMBER}
        typeErrorMessage='This input is in number mode\nthis should be a number.'
        placeholder='Sample value'
        autoDisabled={true}
        language={null}
        onFocus={this.focus}
        onBlur={this.blur}
        textStyle={fontColor(colorForInputType(this.props.input.inputType))}
      />
    );
  }

  public focus()
  {
    this.setState({
      focused: true,
    });
  }

  public blur()
  {
    this.setState({
      focused: false,
    });
  }

  public componentDidMount()
  {
    Util.animateToAutoHeight(this.refs.input);
  }

  public render()
  {
    const { input } = this.props;
    const inputColors = getCardColors('parameter', Colors().builder.cards.inputParameter);
    const inputColor = inputColors[0];
    const inputBg = inputColors[1];

    return (
      <div className='input' ref='input'>
        {
          this.props.canEdit ?
            <CreateLine
              open={false}
              onClick={this.createInput}
            />
            :
            <div className='input-spacing' />
        }
        <div
          className='input-inner'
          style={
            cardStyle(inputColor, this.state.focused ? inputBg : Colors().bg3)
          }
        >
          <div className='input-top-row flex-container'>
            <div
              className='input-prefix'
              style={fontColor(inputColor)}
            >
              @
            </div>
            <BuilderTextbox
              canEdit={this.props.canEdit}
              value={input.key}
              className='flex-grow input-text input-text-first input-borderless standard-input'
              keyPath={this.getKeyPath('key')}
              placeholder='Input name'
              autoDisabled={true}
              language={null}
              onFocus={this.focus}
              onBlur={this.blur}
              textStyle={fontColor(inputColor)}
            />
            <Dropdown
              options={TYPE_OPTIONS}
              selectedIndex={input.inputType}
              onChange={this.handleInputTypeChange}
              centerAlign={true}
              canEdit={true}
              textColor={colorForInputType}
            />
            <div className='input-close' onClick={this.closeInput}>
              <CloseIcon />
            </div>
          </div>
          <div className='input-bottom-row'>
            {
              this.renderInputValue()
            }
          </div>
        </div>
      </div>
    );
  }
}

export default InputComponent;
