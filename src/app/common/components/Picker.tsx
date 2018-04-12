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

// tslint:disable:strict-boolean-expressions

import Colors, { backgroundColor, borderColor, fontColor } from 'app/colors/Colors';
import * as classNames from 'classnames';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import Util from 'util/Util';
import BuilderActions from './../../builder/data/BuilderActions';
import TerrainComponent from './../../common/components/TerrainComponent';
import './PickerStyle.less';

export interface PickerOption
{
  value: number | string;
  selected: boolean;
  label?: string | number;
}

export interface Props
{
  options: List<PickerOption>;
  canEdit: boolean;
  circular?: boolean;
  onSelect: (index: number, value: PickerOption) => void;
  rowSize?: number;
  optionHeight?: number;
  optionWidth?: number;
}

export class Picker extends TerrainComponent<Props>
{

  public getOptionName(option: PickerOption)
  {
    if (!option)
    {
      return null;
    }
    return option.label || option.value;
  }

  public renderRow(options: List<PickerOption>, index: number)
  {
    const { canEdit, circular, onSelect, optionHeight, optionWidth } = this.props;
    const optionStyle = [
      {
        borderRadius: circular ? '100%' : 3,
      },
      {
        height: optionHeight || 30,
      },
      {
        width: optionWidth || 30,
      },
    ];
    const rowSize = this.props.rowSize || 0;
    return (
      <div
        className={classNames({
          'picker-row': true,
          'picker-row-flex': !rowSize,
        })}
        key={index}
      >
        {
          options.map((opt, i) =>
          {
            const disabled = !canEdit || !opt;
            const colorStyle = disabled ? UNEDITABLE_STYLE : opt.selected ? SELECTED_STYLE : DEFAULT_STYLE;
            return (<div
              className='picker-option'
              style={colorStyle.concat(optionStyle)}
              onClick={!disabled && this._fn(onSelect, i + index * rowSize, opt)}
              key={i}
            >
              <span>{this.getOptionName(opt)}</span>
            </div>);
          },
          )
        }
      </div>
    );
  }

  public render()
  {
    const { rowSize, options } = this.props;
    let rows = List([]);
    if (rowSize)
    {
      const numRows = Math.ceil(options.size / rowSize);
      for (let i = 0; i < numRows; i++)
      {
        let row = options.slice(i * rowSize, i * rowSize + rowSize).toList();
        if (row.size < rowSize)
        {
          const oldSize = row.size;
          for (let j = 0; j < rowSize - oldSize; j++)
          {
            row = row.push(null);
          }
        }
        rows = rows.push(row);
      }
    }
    else
    {
      rows = rows.push(options);
    }
    return (
      <div
        className='picker-wrapper'
      >
        {
          rows.map((row, i) =>
            this.renderRow(row, i),
          )
        }
      </div>
    );
  }
}

const SELECTED_STYLE = [
  backgroundColor(Colors().lightBlue),
  fontColor(Colors().active),
];

const DEFAULT_STYLE = [
  backgroundColor(Colors().blockOutline),
  fontColor(Colors().fontColor2),
];

const UNEDITABLE_STYLE = [
  backgroundColor(Colors().blockBg),
  fontColor(Colors().fontColor2),
];

export default Radium(Picker);
