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

// tslint:disable:strict-boolean-expressions member-access

import * as classNames from 'classnames';
import { List, Map } from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Util from 'util/Util';
import BuilderActions from '../../builder/data/BuilderActions';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import BuilderTextbox from './BuilderTextbox';

import './LinearSelector.less';

export interface Props
{
  options: List<string | number>;
  displayNames?: Map<string | number, string>;
  selected: string | number;
  keyPath?: KeyPath;
  onChange?: (value: string | number) => void;
  canEdit?: boolean;
  className?: string;
  width?: string;
  label?: string;
  allowCustomInput?: boolean;
  action?: (keyPath, value) => void;
  hideOptions?: boolean; // hide the unchosen options, show again on click
  builderActions?: typeof BuilderActions;
}

@Radium
class LinearSelector extends TerrainComponent<Props>
{

  public state: {
    usingCustomValue: boolean,
    showCustomTextbox: boolean,
    customInput: string,
    showAllOptions: boolean,
  } = {
      usingCustomValue: false,
      showCustomTextbox: false,
      customInput: '',
      showAllOptions: this.props.hideOptions ? false : true,
    };

  // Determine whether using custom input
  public componentWillMount()
  {
    const usingCustomValue = this.props.allowCustomInput
      && this.props.options.indexOf(this.props.selected) === -1;
    this.setState({
      usingCustomValue,
      customInput: usingCustomValue ? this.props.selected : this.state.customInput,
    });
  }

  // Determine whether using custom input
  // Set position of the selector if selected option has changed
  public componentWillReceiveProps(nextProps)
  {
    const usingCustomValue = nextProps.allowCustomInput
      && nextProps.options.indexOf(nextProps.selected) === -1;
    this.setState({
      usingCustomValue,
      customInput: usingCustomValue ? nextProps.selected : this.state.customInput,
    });
  }

  public selectOption(option, customOption)
  {
    if (!this.props.canEdit)
    {
      return;
    }
    if (this.props.keyPath)
    {
      if (this.props.action)
      {
        this.props.action(this.props.keyPath, option);
      }
      else
      {
        this.props.builderActions.change(this.props.keyPath, option);
      }
    }
    if (this.props.onChange)
    {
      this.props.onChange(option);
    }
    this.setState({
      usingCustomValue: customOption,
      showAllOptions: this.props.hideOptions ? false : true,
    });
  }

  public renderOption(option, i)
  {
    const onClickFn = this.state.showAllOptions ?
      this._fn(this.selectOption, option, false) :
      this._toggle('showAllOptions');

    const selected = this.props.selected === option;
    return (
      <div
        className={classNames({
          'linear-selector-option': true,
          'linear-selector-option-selected': selected,
          'linear-selector-option-hidden': !selected && !this.state.showAllOptions,
        })}
        onClick={onClickFn}
        key={i}
        ref={String(option)}
        style={[
          fontColor(selected ? Colors().fontWhite : Colors().text3),
          backgroundColor(selected ? Colors().active : ''),
        ]}
      >
        {this.props.displayNames ? this.props.displayNames.get(option) : option}
      </div>
    );
  }

  public showCustomTextbox()
  {
    if (!this.state.usingCustomValue)
    {
      this.selectOption(this.state.customInput, true);
    }
    if (!this.state.showCustomTextbox)
    {
      this.setState({
        showCustomTextbox: true,
        showAllOptions: true,
      });
    }
  }

  public submitCustomInput()
  {
    this.setState({
      showCustomTextbox: false,
      usingCustomValue: true,
      showAllOptions: this.props.hideOptions ? false : true,
    });
  }

  public onInputChange(value)
  {
    this.setState({
      customInput: value,
    });
  }

  public render()
  {
    const { usingCustomValue } = this.state;
    return (
      <div className='linear-selector-wrapper'>
        <div
          className='linear-selector-options'
          ref='all-options'
          style={fontColor(Colors().text3)}
        >
          {
            this.props.label &&
            <div className='linear-selector-label'>
              {this.props.label}
            </div>
          }
          {
            this.props.options.map((option, i) => this.renderOption(option, i))
          }
          {
            this.props.allowCustomInput &&
            <div
              className={classNames({
                'linear-selector-custom': true,
                'linear-selector-option-hidden': !usingCustomValue && !this.state.showAllOptions,
              })}
              onClick={this.showCustomTextbox}
              ref={'custom'}
            >
              {
                (usingCustomValue && this.state.showCustomTextbox) ?
                  <BuilderTextbox
                    value={this.props.selected}
                    keyPath={this.props.keyPath}
                    canEdit={this.props.canEdit}
                    onBlur={this.submitCustomInput}
                    autoFocus={true}
                    onChange={this.onInputChange}
                    action={this.props.action}
                  /> :
                  <div className={classNames({
                    'linear-selector-option-selected': usingCustomValue,
                    'linear-selector-option': true,
                  })}
                    style={[
                      fontColor(usingCustomValue ? Colors().fontWhite : Colors().text3),
                      backgroundColor(usingCustomValue && !this.state.showCustomTextbox ? Colors().active : ''),
                    ]}
                  >
                    {
                      (usingCustomValue && this.props.selected !== undefined && this.props.selected !== '') ?
                        this.props.selected : this.state.customInput || 'Other'
                    }
                  </div>
              }
            </div>
          }
        </div>
      </div>
    );
  }
}

export default Util.createTypedContainer(
  LinearSelector,
  [],
  { builderActions: BuilderActions },
);
