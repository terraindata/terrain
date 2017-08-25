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
import * as React from 'react';
import { Colors, getStyle } from '../../common/Colors';
import StyleTag from '../../common/components/StyleTag';
import TerrainComponent from './../../common/components/TerrainComponent';
import './DragHandleStyle.less';

const Handle = require('./../../../images/icon_drag.svg');

export interface Props
{
  hiddenByDefault?: boolean;
  showWhenHoveringClassName?: string;
  useAltColor?: boolean;
  connectDragSource?: (el: El) => El;
}

class DragHandle extends TerrainComponent<Props>
{
  public renderHandle(dragHandleStyle)
  {
    return (
      <div>
        <Handle
          className={classNames({
            'drag-icon': true,

          })}
        />
        <StyleTag style={dragHandleStyle} />
      </div>
    );
  }

  public render()
  {
    const hoveringClassName = this.props.showWhenHoveringClassName + ':hover .drag-icon';
    const dragHandleStyle = {
      '.drag-icon': {
        opacity: this.props.hiddenByDefault ? 0 : '1 !important' as any,
      },
      '.drag-icon .cls-1': {
        fill: this.props.useAltColor ? Colors().altText2 : Colors().text2,
      },
      '.drag-icon:hover .cls-1': {
        fill: Colors().inactiveHover,
        opacity: 0.85,
      },
      '.drag-icon:active .cls-1': {
        fill: Colors().active,
        opacity: 0.85,
      },
      ['.' + hoveringClassName]: {
        opacity: '1 !important' as any,
      },
    };

    return (
      (
        this.props.connectDragSource !== undefined ?
          this.props.connectDragSource(this.renderHandle(dragHandleStyle)) :
          this.renderHandle(dragHandleStyle)
      )
    );

  }

}

export default DragHandle;
