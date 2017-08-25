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
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, buttonColors, Colors } from '../../common/Colors';
import TerrainComponent from './../../common/components/TerrainComponent';
import './TemplateList.less';

const CloseIcon = require('./../../../images/icon_close_8x8.svg?name=CloseIcon');

export interface Props
{
  items: List<string>;
  title?: string;
  onDelete?: (index: number) => void;
  onSelectOption?: () => void;
  onApply?: (index: number) => void;
}

@Radium
class TemplateList extends TerrainComponent<Props>
{
  public state: {
    selectedIndex: number,
  } = {
    selectedIndex: -1,
  };

  public handleDelete(index: number)
  {
    this.props.onDelete(index);
  }

  public handleApply()
  {
    this.props.onApply(this.state.selectedIndex);
  }

  public handleSelectOption(index: number)
  {
    this.setState({
      selectedIndex: this.state.selectedIndex === index ? -1 : index,
    });
  }

  public renderTitle()
  {
    if (this.props.title !== undefined && this.props.title !== '')
    {
      return (
        <div
          className='list-title'
          style={{
            color: Colors().text1,
          }}
        >
          {
            this.props.title
          }
        </div>
      );
    }
  }

  public renderApply()
  {
    // TODO: button changes colors on delete
    return (
      <div
        className='list-apply button'
        onClick={this._fn(this.handleApply)}
        style={this.state.selectedIndex === -1 ? Colors().bg3 : buttonColors()}
      >
        Apply
      </div>
    );
  }

  public renderList()
  {
    if (this.props.items.size === 0)
    {
      return (
        <div
          className='list-empty'
          style={{
            color: Colors().text1,
          }}
        >
          There are no templates to load
        </div>
      );
    }
    else
    {
      return (
        <div
          className='flex-container list-items'
        >
          {
            this.props.items.map((item, index) =>
              <div
                className={classNames({
                  'clickable list-items-item': true,
                  'list-items-item-selected': index === this.state.selectedIndex,
                })}
                onClick={this._fn(this.handleSelectOption, index)}
                style={{
                  background: Colors().bg3,
                  color: Colors().text1,
                }}
                key={index}
              >
                <div
                  className='flex-container list-items-item-wrapper'
                >
                  {
                    item
                  }
                  <CloseIcon
                    onClick={this._fn(this.handleDelete, index)}
                    className='close delete-list-item'
                    data-tip='Delete List Item'
                  />
                </div>
              </div>,
            )
          }
        </div>
      );
    }
  }

  public render()
  {
    return (
      <div
        className='flex-container list-container'
        style={backgroundColor(Colors().bg1)}
      >
        {this.renderTitle()}
        {this.renderList()}
        {this.renderApply()}
      </div>
    );
  }
}

export default TemplateList;
