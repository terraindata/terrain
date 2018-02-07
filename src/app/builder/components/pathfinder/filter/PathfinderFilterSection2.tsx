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

import * as classNames from 'classnames';
import * as Radium from 'radium';
import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as _ from 'lodash';
import * as React from 'react';
import { altStyle, backgroundColor, borderColor, Colors, fontColor } from '../../../../colors/Colors';
import TerrainComponent from './../../../../common/components/TerrainComponent';
const { List, Map } = Immutable;
import PathfinderText from 'app/builder/components/pathfinder/PathfinderText';
import BuilderActions from 'app/builder/data/BuilderActions';
import BuilderStore from 'app/builder/data/BuilderStore';
import DragAndDrop from 'app/common/components/DragAndDrop';
import DragHandle from 'app/common/components/DragHandle';
import { FilterGroup, FilterLine, Path, PathfinderContext, PathfinderSteps, Source } from '../PathfinderTypes';
import PathfinderFilterCreate from './PathfinderFilterCreate';
import PathfinderFilterGroup from './PathfinderFilterGroup';
import PathfinderFilterLine from './PathfinderFilterLine2';
import Util from 'app/util/Util';

export interface Props
{
  pathfinderContext: PathfinderContext;
  filterGroup: FilterGroup;
  keyPath: KeyPath;
  step?: PathfinderSteps;
  onStepChange?: (oldStep: PathfinderSteps) => void;
}

interface IMoveState
{
  moving: boolean;
  originalMouseY?: number;
  originalElTop?: number;
  originalElBottom?: number;
  elHeight?: number;
  dY?: number;
  minDY?: number;
  maxDY?: number;
  midpoints?: number[];
  tops?: number[];
  movedTo?: number;
  movingIndex?: number;
  movingRef?: string;
}

const DefaultMoveState: IMoveState =
  {
    moving: false,
    movedTo: null,
  };


@Radium
class PathfinderFilterSection extends TerrainComponent<Props>
{
  public state: IMoveState = DefaultMoveState;
  public bars = List(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']);

  public handleMouseDown(index: number, name: string, event: MEvent)
  {
    $('body').on('mousemove', this.handleMouseMove);
    $('body').on('mouseup', this.handleMouseUp);
    $('body').on('mouseleave', this.handleMouseUp);

    const parent = this.refs['all'];

    const cr = this.refs[name]['getBoundingClientRect']();
    const parentCr = parent['getBoundingClientRect']();

    const minDY = parentCr.top - cr.top;
    const maxDY = parentCr.bottom - cr.bottom;

    const siblings = Util.siblings(this.refs[name]);
    const midpoints = [];
    const tops = [];
    _.range(0, siblings.length).map((i) =>
    {
      const sibCr = siblings[i]['getBoundingClientRect']();
      midpoints.push((sibCr.top + sibCr.bottom) / 2); // - (i > this.props.index ? cr.height /**/ : 0));
      tops.push(sibCr.top);
    });

    this.setState({
      moving: true,
      originalMouseY: event.pageY,
      originalElTop: cr.top,
      originalElBottom: cr.bottom,
      elHeight: cr.height,
      dY: 0,
      minDY,
      maxDY,
      midpoints,
      tops,
      movingIndex: index,
      movingRef: name,
    });
  }

  public shiftSiblings(evt, shiftSelf: boolean): ({ dY: number, index: number })
  {
    const dY = Util.valueMinMax(evt.pageY - this.state.originalMouseY, this.state.minDY, this.state.maxDY);

    let index: number;

    // TODO search from the bottom up if dragging downwards
    if (dY < 0)
    {
      // if dragged up, search from top down
      for (
        index = 0;
        this.state.midpoints[index] < this.state.originalElTop + dY;
        index++
      )
      {

      }
    }
    else
    {
      for (
        index = this.state.midpoints.length - 1;
        this.state.midpoints[index] > this.state.originalElBottom + dY;
        index--
      )
      {

      }
    }

    const sibs = Util.siblings(this.refs[this.state.movingRef]);
    _.range(0, sibs.length).map((i) =>
    {
      const el = sibs[i];
      if (i === this.state.movingIndex)
      {
      //  $(el).removeClass('card-field-wrapper-moving');
        return;
      }

      let shift = 0;
      if (index < this.state.movingIndex)
      {
        // move things down
        if (i < this.state.movingIndex && i >= index)
        {
          shift = 1;
        }
      }
      else
      {
        // move up
        if (i > this.state.movingIndex && i <= index)
        {
          shift = -1;
        }
      }
      console.log('Shift is ', shift);
      console.log('Height is', this.state.elHeight);
      el['style'].top = shift * this.state.elHeight;
     // $(el).addClass('card-field-wrapper-moving');
    });
    // console.log('Shift siblings', dY);
    // console.log('Index ', index);
    return {
      dY,
      index,
    };
  }

  public handleMouseMove(evt)
  {
    const dY = this.shiftSiblings(evt, false).dY;
    this.setState({
      dY,
    });
    evt.preventDefault();
    evt.stopPropagation();
  }

  public move()
  {
    console.log('move');
   // $('.card-field-wrapper-moving').removeClass('card-field-wrapper-moving');
  }

  public handleMouseUp(evt)
  {
    $('body').off('mousemove', this.handleMouseMove);
    $('body').off('mouseup', this.handleMouseUp);
    $('body').off('mouseleave', this.handleMouseUp);

    const { index } = this.shiftSiblings(evt, true);

    setTimeout(this.move, 150);

    this.setState({
      movedTo: index,
    });
  }

  public render()
  {
    return (
      <div
        className='pf-section'
        ref='all'
      >
         {
           this.bars.map((bar, i) =>
              <div
                style={[{height: 30,}, {width: 300}, {backgroundColor: bar}, {position: 'relative'}]}
                ref={bar}
                onMouseDown={this._fn(this.handleMouseDown, i, bar)}
                key={bar}
              >
             </div>
          )
         }
      </div>
    );
  }
}

export default PathfinderFilterSection;
