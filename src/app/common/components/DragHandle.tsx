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
import Util from '../../util/Util';
import { Colors, getStyle } from '../../colors/Colors';
import { ColorsActions } from './../../colors/data/ColorsRedux';
import TerrainComponent from './../../common/components/TerrainComponent';
import './DragHandleStyle.less';

const Handle = require('./../../../images/icon_drag_1.svg');

export interface Props
{
  id?: number;
  hiddenByDefault?: boolean;
  showWhenHoveringClassName?: string;
  useAltColor?: boolean;
  connectDragSource?: (el: El) => El;
  colorsActions: typeof ColorsActions;
}

@Radium
class DragHandle extends TerrainComponent<Props>
{
  public componentWillMount()
  {
    const hoveringClassName = this.props.showWhenHoveringClassName + ':hover .drag-icon';
    
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.drag-icon',
      style: { fill: this.props.useAltColor ? Colors().altText2 : Colors().iconColor },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.drag-icon:hover',
      style: { fill: Colors().inactiveHover },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.drag-icon:active',
      style: { fill: Colors().active },
    });
    this.props.colorsActions({
      actionType: 'setStyle',
      selector: '.' + hoveringClassName,
      style: { opacity: '0.85 !important' as any },
    });
  }

  public renderHandle()
  {
    return (
      <div
        key={this.props.id}
        style={{
          'opacity': this.props.hiddenByDefault ? 0 : 0.85,
          ':hover': {
            opacity: 0.85,
          },
        }}
      >
        <Handle className='drag-icon' />
      </div>
    );
  }

  public render()
  {
    return (
      (
        this.props.connectDragSource !== undefined ?
          this.props.connectDragSource(this.renderHandle()) :
          this.renderHandle()
      )
    );
  }
}

export default Util.createContainer(
  DragHandle,
  [],
  {
    colorsActions: ColorsActions
  },
);
