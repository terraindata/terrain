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
import { DragDropContext, DragSource, DropTarget } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

export interface Props
{
  pathfinderContext: PathfinderContext;
  filterGroup: FilterGroup;
  keyPath: KeyPath;
  step?: PathfinderSteps;
  onStepChange?: (oldStep: PathfinderSteps) => void;
}

const ItemTypes = {
  BAR: 'bar',
  GROUP: 'group',
};

// @Radium
class PathfinderFilterSection extends TerrainComponent<Props>
{

  public keyPaths: IMMap<string, List<number>> = Map<string, List<number>>({});
  public state:
  {
    bars: List<any>,
  } =
  {
  //  bars: List(['red', 'orange', 'yellow', 'green', 'purple', 'pink']),
     //bars: List([List(['red']), List(['orange']), List(['yellow'])]),
      bars: List(['red', 'orange', List(['yellow', 'green', List(['blue'])]), List(['purple', 'pink'])]),
  }

  public componentWillMount()
  {
    this.createKeyPaths(this.state.bars);
  }

  public createKeyPaths(bars: List<any>, currKeyPath?: List<number>)
  {
    bars.map((bar, index) =>
    {
      const keyPath: List<number> = currKeyPath !== undefined ? currKeyPath.push(index) : List([index]);
      if (typeof bar === 'string')
      {
        this.keyPaths = this.keyPaths.set(bar, keyPath);
      }
      else
      {
        this.createKeyPaths(bar, keyPath);
      }
    })
  }

  public insertIn(items, keyPath, item): List<any>
  {
    // If key path is just a single value, do a normal insert

    if (keyPath.size === 1)
    {
      return items.insert(keyPath.get(0), item);
    }
    // get the sub-list that item will be inserted into
    let listToInsert = items.getIn(keyPath.butLast());
    // Insert the item int othe list at the position that is the last value of keypath
    listToInsert = listToInsert.insert(keyPath.last(), item);

    // Update the whole list of items to have the inserted list
    return items.setIn(keyPath.butLast(), listToInsert);
  }

  public movedDown(oldKeyPath, newKeyPath): boolean
  {

    let i = 0;
    while (i < oldKeyPath.size && i < newKeyPath.size)
    {
      if (oldKeyPath.get(i) < newKeyPath.get(i))
      {
        return true;
      }
      if (oldKeyPath.get(i) > newKeyPath.get(i))
      {
        return false;
      }
      i++;
    }
  }

  public handleDrop(itemKeyPath, dropKeyPath)
  {
    // If the item did not move up or down, do nothing
    if (itemKeyPath.equals(dropKeyPath))
    {
      return;
    }
    let bars = this.state.bars;
    const item = bars.getIn(itemKeyPath);

    // If the item moved down, insert it and then remove it
    if (this.movedDown(itemKeyPath, dropKeyPath))
    {
      bars = this.insertIn(bars, dropKeyPath, item);
      bars = bars.removeIn(itemKeyPath);
      const oldGroup = bars.getIn(itemKeyPath.butLast());
      if (oldGroup.size === 0)
      {
        bars = bars.removeIn(itemKeyPath.butLast());
      }
    }
    // If it moved up, remove it and then insert it
    else
    {
      bars = bars.removeIn(itemKeyPath);
      const oldGroup = bars.getIn(itemKeyPath.butLast());
      if (oldGroup.size === 0)
      {
        bars = bars.removeIn(itemKeyPath.butLast());
      }
      bars = this.insertIn(bars, dropKeyPath, item);
    }
    this.setState({
      bars,
    });
  }

  public handleGroupDrop(dropKeyPath, dragKeyPath)
  {
    if (dropKeyPath.equals(dragKeyPath))
    {
      return;
    }
    const droppedInto = this.state.bars.getIn(dropKeyPath);
    const dropped = this.state.bars.getIn(dragKeyPath);
    // if you dropped into a group, just do a normal "Reordering" because a new group isn't being created
    if (List.isList(droppedInto))
    {
      // act as if it was dropped into the last slot of droppedInto
      this.handleDrop(dragKeyPath, dropKeyPath.push(droppedInto.size));
      return;
    }
    // See if dropped was already in droppedInto, and if it was, remove it
    let group;
    if (typeof dropped === 'string' && typeof droppedInto === 'string')
    {
      group = List([droppedInto, dropped]);
    }
    else
    {
      group = dropped.insert(0, droppedInto);
    }
    let newBars;
    if (this.movedDown(dragKeyPath, dropKeyPath))
    {
      newBars = this.state.bars.setIn(dropKeyPath, group).deleteIn(dragKeyPath);
      const oldGroup = newBars.getIn(dragKeyPath.butLast());
      if (oldGroup.size === 0)
      {
        newBars = newBars.removeIn(dragKeyPath.butLast());
      }
    }
    else
    {
      newBars = this.state.bars.deleteIn(dragKeyPath);
      const oldGroup = newBars.getIn(dragKeyPath.butLast());
      if (oldGroup.size === 0)
      {
        newBars = newBars.removeIn(dragKeyPath.butLast());
      }
      newBars = newBars.setIn(dropKeyPath, group);
    }
    // Look for the thing that you dropped, if it is somewhere other than keyPath, remove it

    this.setState({
      bars: newBars.asImmutable(),
    });
  }

  public render()
  {
    const { bars} = this.state;
    console.log(bars.toJS());
    return (
      <div
        className='pf-section'
        ref='all'
      >
        <DropZone
          keyPath={List([0])}
          onDrop={this.handleDrop}
        />
         {
           bars.map((bar, i) =>
            <div key={i}>
              {
                typeof bar === 'string' ?
                <Bar
                  data={bar}
                  keyPath={List([i])}
                  key={'bar' + String(i)}
                  onDrop={this.handleGroupDrop}
                  canDrop={true}
               />
               :
               <Group
                  bars={bar}
                  onDrop={this.handleGroupDrop}
                  key={'group' + String(i)}
                  keyPath={List([i])}
                  onReorder={this.handleDrop}
               />
                }
                {
                 (typeof bar === 'string' || bar.size > 0) &&
                 <DropZone
                   key={'drop' + String(i)}
                   keyPath={List([i + 1])}
                   onDrop={this.handleDrop}
                 />
                }
             </div>
           )
         }
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(PathfinderFilterSection);

interface GroupProps
{
  bars: List<any>;
  onDrop: (dropIndex: List<number>, dragIndex: List<number>) => void;
  onReorder: (itemKeyPath: List<number>, dropKeyPath: List<number>) => void;
  isDragging: boolean;
  isOver: boolean;
  connectDragSource: (El) => El;
  connectDropTarget: (El) => El;
  keyPath: List<number>;
}

const groupSource = {
  beginDrag(props) {
    return {keyPath: props.keyPath}
  }
};

function groupDragCollect(connect, monitor)
{
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  }
}

const groupDropTarget = {
  drop(props, monitor) {
    // If the item was actually dropped on a child of the group, just return
    if (monitor.didDrop())
    {
      return;
    }
    props.onDrop(props.keyPath, monitor.getItem().keyPath);
  }
};

function groupDropCollect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  };
}

class GroupComponent extends TerrainComponent<GroupProps>
{
  public renderGroup()
  {
    return (
      <div
        className='bar-group'
        style={this.props.isOver ? {borderColor: 'lime'} : {}}
      >
        <DropZone
          keyPath={this.props.keyPath.push(0)}
          onDrop={this.props.onReorder}
         />
        {
          this.props.bars.map((bar, i) =>
            <div key={i}>
             {
               typeof bar === 'string' ?
                <Bar
                   data={bar}
                   keyPath={this.props.keyPath.push(i)}
                   onDrop={this.props.onDrop}
                   canDrop={false} // filters nested in groups aren't droppable?
                 />
                 :
                 <Group
                   bars={bar}
                   keyPath={this.props.keyPath.push(i)}
                   onDrop={this.props.onDrop}
                   onReorder={this.props.onReorder}
                 />
                }
                <DropZone
                  keyPath={this.props.keyPath.push(i + 1)}
                  onDrop={this.props.onReorder}
                />
              </div>
          )
        }
      </div>
    );
  }

  public render()
  {
    return (
      this.props.connectDropTarget(
        this.props.connectDragSource(
         this.renderGroup()
      )
     )
    );
  }
}

const Group = DropTarget([ItemTypes.BAR, ItemTypes.GROUP], groupDropTarget, groupDropCollect)(
              DragSource(ItemTypes.GROUP, groupSource, groupDragCollect)
                (GroupComponent));

interface BarProps
{
  data: string;
  keyPath: List<number>;
  connectDragSource: (El) => El;
  isDragging: boolean;
  isOver: boolean;
  connectDropTarget: (El) => El;
  onDrop: (dropIndex: List<number>, dragIndex: List<number>) => void;
  canDrop?: boolean;
}

const barSource = {
  beginDrag(props) {
    return {keyPath: props.keyPath};
  }
};

function collect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }
}

const barDropTarget = {
  drop(props, monitor) {
    props.onDrop(props.keyPath, monitor.getItem().keyPath);
  }
};

function collect3(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  };
}

class BarComponent extends TerrainComponent<BarProps>
{
  public render()
  {
    const draggable = this.props.connectDragSource(
      <div
        style={_.extend({},
          {backgroundColor: this.props.isOver ? 'gray' : this.props.data},
          {opacity: this.props.isDragging ? 0.5 : 1})}
        className='bar'
       />
    );
    if (this.props.canDrop)
    {
      return this.props.connectDropTarget(draggable);
    }
    return draggable;
    );
  }
}

const Bar = DropTarget([ItemTypes.BAR, ItemTypes.GROUP], barDropTarget, collect3)(
              DragSource(ItemTypes.BAR, barSource, collect)
                (BarComponent));

interface DropProps {
  keyPath: List<number>;
  isOver: boolean;
  connectDropTarget: (El) => El;
  onDrop: (keyPath: List<number>, dropKeyPath: List<number>) => void;
}

const dropTarget = {
  drop(props, monitor) {
    props.onDrop(monitor.getItem().keyPath, props.keyPath);
  }
};

function collect2(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  };
}

class DropZoneComponent extends TerrainComponent<DropProps>
{
  public render()
  {
    return (
      this.props.connectDropTarget(
        <div
          className='drop'
          style={{backgroundColor: this.props.isOver ? 'gray' : 'white'}}
        />
      )
    );
  }
}

const DropZone = DropTarget([ItemTypes.BAR, ItemTypes.GROUP], dropTarget, collect2)(DropZoneComponent);
