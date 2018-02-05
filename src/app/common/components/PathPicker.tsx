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
import { tooltip, TooltipProps } from 'common/components/tooltip/Tooltips';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import './PathPickerStyle.less';

export interface PathPickerOption
{
  value: any;
  displayName?: string | number | El;
  color?: string;
  extraContent?: string | El;
}

export interface Props
{
  options: List<PathPickerOption>;
  value: any;
  onChange: (value: any) => void;
  canEdit?: boolean;

  shortNameText: string;
  headerText: string;

  forceOpen?: boolean;
  hasOther?: string;

  // wrapperTooltip?: string;
}

@Radium
class PathPicker extends TerrainComponent<Props>
{
  state = {
    showOther: false,
  };

  componentWillReceiveProps(nextProps: Props)
  {
  }

  public componentDidUpdate(prevProps: Props, prevState)
  {
  }

  public render()
  {
    const { props, state } = this;

    return (
      <div
        className='pathpicker'
      >
        {
          this.renderBoxValue()
        }

        {
          this.renderPicker()
        }
      </div>
    );
  }

  private renderBoxValue()
  {
    const { props, state } = this;

    return (
      <div
        className='pathpicker-box-value'
        style={borderColor(Colors().bg1)}
        onClick={this.handleBoxValueClick}
      >
        <div className='pathpicker-short-title'>
          {
            props.shortNameText
          }
        </div>
        <div className='pathpicker-value'>
          {
            this.renderValue('short', this.getCurrentIndex())
          }
        </div>
      </div>
    );
  }

  private renderValue(type: 'short' | 'long', index: number)
  {
    const { props, state } = this;
    let showOther = false;
    let value;
    let option;

    if (index === -1)
    {
      // value not present
      showOther = true;
      value = props.value;
    }
    else
    {
      option = props.options.get(index);
      value = option.value;
    }

    return (
      <div
      >
        <div
          className='pathpicker-value-text'
          style={fontColor(Colors().active)}
        >
          {
            value
          }
        </div>
      </div>
    );
  }

  private handleBoxValueClick()
  {

  }

  private getCurrentIndex(): number
  {
    const { props, state } = this;
    return props.options.findIndex(
      (option) => option.value === props.value);
  }

  private renderPicker()
  {
    const { props, state } = this;

    return (
      <div
      >
      </div>
    );
  }
}
// <input
//   type='text'
//   value={props.value}
//   placeholder={this.props.textPlaceholder !== undefined ?
//     this.props.textPlaceholder : 'Custom value'}
//   onChange={this.handleTextChange}
//   className='transition box-size'
// />

export default PathPicker;
