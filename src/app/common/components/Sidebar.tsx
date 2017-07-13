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

// tslint:disable:no-var-requires restrict-plus-operands interface-name

import * as classNames from 'classnames';
import * as React from 'react';
import { Link } from 'react-router';
import { backgroundColor, Colors, fontColor } from '../../common/Colors';
import TerrainComponent from '../../common/components/TerrainComponent';
import Util from '../../util/Util';
import './Sidebar.less';

const ExpandIcon = require('./../../../images/icon_expand_12x12.svg?name=ExpandIcon');
const linkHeight = 36; // Coordinate with Sidebar.less

export interface ILink
{
  icon: any;
  text: string;
  route: string;
}

export interface Props
{
  links: ILink[];
  selectedIndex: number;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}

export class Sidebar extends TerrainComponent<Props>
{
  public render()
  {
    return (
      <div
        className={classNames({
          'sidebar-container': true,
          'sidebar-container-expanded': this.props.expanded,
        })}
        style={backgroundColor(Colors().sideBar.base)}
      >
        <div
          className='sidebar-selected-square'
          style={{
            top: (this.props.selectedIndex * linkHeight) + 'px',
            backgroundColor: Colors().sideBar.selectedSquare,
          }}
        />
        {
          this.props.links.map((link, index) =>
            <Link
              to={link.route}
              key={index}
            >
              <div
                className={Util.objToClassname({
                  'sidebar-link': true,
                  'sidebar-link-selected': index === this.props.selectedIndex,
                })}
              >
                <div className='sidebar-link-inner'>
                  {
                    link.icon
                  }
                  <div className='sidebar-link-text'>
                    {
                      link.text
                    }
                  </div>
                </div>
              </div>
            </Link>,
          )
        }
        {
          this.props.expandable ?
            (
              <div className='sidebar-expand' onClick={this.props.onExpand}>
                <div className='dead-center'>
                  <ExpandIcon />
                </div>
              </div>
            )
            : null
        }
      </div>
    );
  }
}
export default Sidebar;
