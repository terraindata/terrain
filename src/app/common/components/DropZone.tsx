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

import { backgroundColor, Colors } from 'app/colors/Colors';
import TerrainComponent from 'app/common/components/TerrainComponent';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
const { List, Map } = Immutable;
import { DropTarget } from 'react-dnd';
import './DragDropStyle.less';

interface DropProps
{
  keyPath: KeyPath;
  onDrop: (keyPath: List<number>, dropKeyPath: List<number>) => void;
  style?: any;
  // injected props
  isOver: boolean;
  connectDropTarget: (El) => El;
}

const dropTarget = {
  drop(props, monitor)
  {
    props.onDrop(monitor.getItem().keyPath, props.keyPath);
  },
  canDrop(props, monitor)
  {
    // don't show adjacent drop zones
    const adjacent = props.keyPath.equals(monitor.getItem().keyPath) ||
      props.keyPath.set(props.keyPath.size - 1, props.keyPath.last() - 1)
        .equals(monitor.getItem().keyPath);
    return !adjacent;
  },
  // hover(props, monitor, component) {
  //   component.setState({height: 100});
  // }
};

function collect(connect, monitor)
{
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver() && monitor.canDrop(),
  };
}

class DropZoneComponent extends TerrainComponent<DropProps>
{
  public render()
  {
    const style = _.extend({},
      {
        height: this.props.isOver ? 52 : 0,
      },
      backgroundColor(this.props.isOver ? Colors().blockOutline : ''),
    );
    const wrapperStyle = _.extend({},
      {
        height: this.props.isOver ? 87 : 35,
      },
      this.props.style,
    );
    return (
      this.props.connectDropTarget(
        <div
          className='drop'
          style={wrapperStyle}
        >
          <div
            style={style}
            className='drop-area'
          >
          </div>
        </div>
        ,
      )
    );
  }
}

const DropZone = DropTarget(['ITEM', 'GROUP'], dropTarget, collect)(DropZoneComponent);
export default DropZone;
