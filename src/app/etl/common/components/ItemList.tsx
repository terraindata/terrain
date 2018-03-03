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

import * as classNames from 'classnames';
import { List } from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';

import { backgroundColor, borderColor, Colors } from 'app/colors/Colors';
import { Menu, MenuOption } from 'common/components/Menu';
import TerrainComponent from 'common/components/TerrainComponent';
import Quarantine from 'util/RadiumQuarantine';
import './ItemList.less';

// configure each column
export interface HeaderConfigItem<T> {
  name: string;
  render: (rowElem: T, index) => any;
}
export type HeaderConfig<T> = Array<HeaderConfigItem<T>>;

export interface Props<T>
{
  items: List<T>;
  columnConfig: HeaderConfig<T>;
  onRowClicked?: (index) => void; // callback for when a row is clicked
  rowStyle?: any;
  getMenuOptions?: (item, index) => any; // passed to <Menu/> for each item if a context menu is desired
  state?: any; // for specifying dependencies so ItemList knows when to rerender
}

const memoize = _.memoize;

export class ItemList<T> extends TerrainComponent<Props<T>>
{
  constructor(props)
  {
    super(props);
  }

  @memoizeOne
  public rowClickedMemoized(onRowClicked)
  {
    return _.memoize((index) => () => {onRowClicked(index)});
  }

  public getRowClickedFn(index): () => void
  {
    if (this.props.onRowClicked === undefined)
    {
      return undefined;
    }
    return this.rowClickedMemoized(this.props.onRowClicked)(index);
  }

  @memoizeOne
  public getRowStyle(style)
  {
    if (style !== undefined)
    {
      if (Array.isArray(style))
      {
        return [tableRowStyle, ...style];
      }
      else
      {
        return [tableRowStyle, style];
      }
      
    }
    else
    {
      return tableRowStyle;
    }
    
  }

  public renderRow(item: T, index: number)
  {
    const onClick = this.getRowClickedFn(index);
    const style = this.getRowStyle(this.props.rowStyle);
    return (
      <Quarantine key={index}>
        <div
          className='row-info'
          onClick={onClick}
          style={style}
        >
          {
            this.props.columnConfig.map((headerItem: HeaderConfigItem<T>, i: number) =>
            {
              return (
                <div className='row-info-data' key={i}>
                  {headerItem.render(item, index)}
                </div>
              );
            })
          }
          {
            this.props.getMenuOptions !== undefined ?
              <div className='row-info-data' key='context-menu'>
                <div className='item-list-menu-options-wrapper'>
                  <Menu options={this.props.getMenuOptions(item, index)} />
                </div>
              </div>
              : undefined
          }
        </div>
      </Quarantine>
    );
  }

  public render()
  {
    return (
      this.props.items.size > 0 ?
        <div className='item-list-table'>
          <div
            className={classNames({
              'row-info-header': true,
            })}
            key='header'
          >
            {
              this.props.columnConfig.map((headerItem: HeaderConfigItem<T>, i: number) =>
              {
                return (
                  <div className='row-info-data' key={i}>
                    {headerItem.name}
                  </div>
                );
              })
            }
            {
              this.props.getMenuOptions !== undefined ?
                <div className='row-info-data' key='context-menu' />
                : undefined
            }
          </div>
          {
            this.props.items.map(this.renderRow).toList()
          }
        </div>
        :
        <div> List Has No Items </div>
    );
  }
}

const tableRowStyle = _.extend({},
  backgroundColor(Colors().bg3),
  borderColor(Colors().bg2),
);
