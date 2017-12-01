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
import { backgroundColor, borderColor, Colors, getStyle } from 'app/colors/Colors';
import ColorsActions from 'app/colors/data/ColorsActions';
import * as classNames from 'classnames';
import * as _ from 'lodash';
import * as React from 'react';
import TerrainComponent from './../../common/components/TerrainComponent';
import './MultiInputStyle.less';

const RemoveIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');

export interface Props
{
  isNumber?: boolean;
  canEdit: boolean;
  keyPath?: KeyPath;
  action?: (keyPath, items) => void;
  onChange?: (items) => void;
  items: List<number | string>;
}

class MultiInput extends TerrainComponent<Props>
{
  public state: {
    newValue: string;
  } = {
    newValue: '',
  };

  public deleteItem(index)
  {
    const newItems = this.props.items.delete(index);
    if (this.props.onChange !== undefined)
    {
      this.props.onChange(newItems);
    }
    if (this.props.keyPath !== undefined && this.props.action !== undefined)
    {
      this.props.action(this.props.keyPath, newItems);
    }
  }

  public renderItems()
  {
    const { items } = this.props;
    return (
      <div>
        {
          items.map((item, index) =>
          {
            return (
              <div
                className='multi-input-item'
                key={index}
                style={_.extend({}, backgroundColor(Colors().bg3), borderColor(Colors().bg1))}
              >
                {item}
                {
                  this.props.canEdit ?
                    <div
                      className='multi-input-item-delete'
                      onClick={this._fn(this.deleteItem, index)}
                      style={getStyle('fill', Colors().iconColor)}
                    >
                      <RemoveIcon />
                    </div>
                    : null
                }
              </div>
            );
          })
        }
        {this.renderInput()}
      </div>
    );
  }

  public handleCreateItem()
  {
    let newValue: any = this.state.newValue;
    if (this.props.isNumber)
    {
      newValue = parseFloat(newValue);
    }
    this.props.action(this.props.keyPath, this.props.items.push(newValue));
    this.setState({
      newValue: '',
    });
  }

  public handleKeyDown(e)
  {
    switch (e.keyCode)
    {
      case 13:
      case 9:
        this.handleCreateItem();
        break;
      default:
    }
  }

  public handleValueChange(event)
  {
    this.setState({
      newValue: event.target.value,
    });
  }

  public renderInput()
  {
    if (!this.props.canEdit)
    {
      return null;
    }
    return (
      <div className='multi-input-input'>
        <input
          value={this.state.newValue}
          onChange={this.handleValueChange}
          placeholder={'Add value'}
          onKeyDown={this.handleKeyDown}
        />
      </div>
    );
  }

  public render()
  {
    return (
      <div className='multi-input-wrapper'>
        {this.renderItems()}
      </div>
    );
  }
}

export default MultiInput;
