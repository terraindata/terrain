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
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { altStyle, backgroundColor, borderColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import './Selector.less';

const MAX_VALUES_SHOWN = 5;

export interface SelectionChoice
{
  title: string;
  key: string;
  subtitle: string;
  values: List<string>;
}

export interface Props
{
  items: List<SelectionChoice>;
  expanded: boolean;
  onSelect: (index: number, key?: string) => void;
  selectedIndex: number;
  expandSelector: () => void;
}

@Radium
class Selector extends TerrainComponent<Props>
{

  public renderItem(item: SelectionChoice, i)
  {
    return (
      <div
        className='selector-item'
        key={i}
        onClick={this._fn(this.props.onSelect, i, item.key)}
      >
        <div className='selector-item-title'>{item.title}</div>
        <div className='selector-item-subtitle'>{item.subtitle}</div>
        {
          item.values.splice(0, MAX_VALUES_SHOWN).map((value, j) =>
            <div className='selector-item-value' key={j}>
              {value}
            </div>,
          )
        }
        {
          item.values.size > MAX_VALUES_SHOWN ?
            <div>...</div>
            :
            null
        }
      </div>
    );
  }

  public renderItems(items)
  {
    return (
      <div className='selector-items-wrapper'>
        <div className='select-items-bg' style={backgroundColor(Colors().bg3)}>
          {
            _.map(items.toJS(), this.renderItem)
          }
        </div>
      </div>
    );
  }

  public render()
  {
    const { items, expanded, selectedIndex } = this.props;
    const selectedName = items.get(selectedIndex).title;
    return (
      <div className='selector-wrapper'>
        <div
          className='selector-selected-title'
          onClick={this.props.expandSelector}
        >
          {selectedName}
        </div>
        {
          expanded ?
            this.renderItems(items) :
            null
        }
      </div>
    );
  }
}

export default Selector;
