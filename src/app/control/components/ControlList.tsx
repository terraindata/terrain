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
// this file has been obsoleted by ItemList and should be cleaned up along with the rest of control
import * as classNames from 'classnames';
import { List } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';

import { backgroundColor, borderColor, Colors } from 'app/colors/Colors';
import { Menu, MenuOption } from 'common/components/Menu';
import TerrainComponent from 'common/components/TerrainComponent';

import './ControlList.less';

export type HeaderConfigItem = [string, (rowElem, index) => any];
export type HeaderConfig = HeaderConfigItem[];

export interface Props
{
  items: List<any>;
  config: HeaderConfig;
  getMenuOptions?: (item, index) => any; // passed to <Menu/> for each item if a context menu is desired
  [_dependents: string]: any; // for if the config has functions that depend on values outside of items
}

export class ControlList extends TerrainComponent<Props>
{
  public renderRow(item, index: number)
  {
    return (
      <div className='row-info' key={index} style={tableRowStyle}>
        {
          this.props.config.map((headerItem: HeaderConfigItem, i: number) =>
          {
            return (
              <div className='row-info-data' key={i}>
                {headerItem[1](item, index)}
              </div>
            );
          })
        }
        {
          this.props.getMenuOptions !== undefined ?
            <div className='row-info-data' key='context-menu'>
              <div className='control-list-menu-options-wrapper'>
                <Menu options={this.props.getMenuOptions(item, index)} />
              </div>
            </div>
            : undefined
        }
      </div>
    );
  }

  public render()
  {
    return (
      this.props.items.size > 0 ?
        <div className='control-list-table'>
          <div
            className={classNames({
              'row-info-header': true,
            })}
            key='header'
          >
            {
              this.props.config.map((headerItem: HeaderConfigItem, i: number) =>
              {
                return (
                  <div className='row-info-data' key={i}>
                    {headerItem[0]}
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
            this.props.items.map(this.renderRow)
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
