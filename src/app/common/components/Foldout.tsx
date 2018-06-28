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
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, Colors, fontColor, getStyle } from '../../colors/Colors';
import { ColorsActions } from '../../colors/data/ColorsRedux';
import TerrainComponent from '../../common/components/TerrainComponent';
import Util from '../../util/Util';
import './Foldout.less';

const ExpandIcon = require('./../../../images/icon_expand_12x12.svg?name=ExpandIcon');

const expandButtonWidth = 36; // coordinate with LESS

export interface Props
{
  colorsActions: typeof ColorsActions;
  // expandable?: boolean;
  // expanded?: boolean;
  // onExpand?: () => void;
  direction: 'right'; // in the future: 'left' | 'right';
  width: number;
  children?: any;
}

@Radium
export class Foldout extends TerrainComponent<Props>
{
  public state: {
    expanded: boolean,
  } =
    {
      expanded: true,
    };

  public componentWillMount()
  {
    // this.props.colorsActions({
    //   actionType: 'setStyle',
    //   selector: '.foldout-expand-icon',
    //   style: { fill: Colors().text2 },
    // });
    // this.props.colorsActions({
    //   actionType: 'setStyle',
    //   selector: '.foldout-expand:hover .foldout-expand-icon',
    //   style: { fill: Colors().text1 },
    // });
  }

  public componentWillReceiveProps(nextProps)
  {
    // if (nextProps.expanded !== this.props.expanded)
    // {
    //    TODO someday, if we want props control
    // }
  }

  public render()
  {
    const { props, state } = this;

    return (
      <div
        className={classNames({
          'foldout-container': true,
          // 'foldout-left': props.direction === 'left',
          'foldout-right': props.direction === 'right',
          'foldout-container-expanded': state.expanded,
        })}
        style={[
          backgroundColor(Colors().sidebarBg),
          getStyle('min-width', state.expanded ? props.width : expandButtonWidth),
        ]}
      >
        <div
          className='foldout-expand'
          onClick={this._toggle('expanded')}
          key='foldout-expand'
          style={[
            getStyle('width', expandButtonWidth),
            getStyle('left', 0),
            fontColor(Colors().text2, Colors().active),
          ]}
        >
          <div className='dead-center'>
            <ExpandIcon
              className='foldout-expand-icon'
            />
          </div>
        </div>
        <div
          className='foldout-content'
          style={[
            getStyle('width', props.width - expandButtonWidth),
            getStyle('left', expandButtonWidth),
          ]}
        >
          {
            props.children
          }
        </div>
      </div>
    );
  }
}

export default Util.createContainer(
  Foldout,
  [],
  {
    colorsActions: ColorsActions,
  },
);
