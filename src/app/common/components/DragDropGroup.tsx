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

import { backgroundColor, borderColor, Colors } from 'app/colors/Colors';
import TerrainComponent from 'app/common/components/TerrainComponent';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
const { List, Map } = Immutable;
import DragDropItem from 'app/common/components/DragDropItem';
import DropZone from 'app/common/components/DropZone';
import FadeInOut from 'app/common/components/FadeInOut';
import { DragSource, DropTarget } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import './DragDropStyle.less';

interface GroupProps
{
  data: any; // meta-data that the group itself contains
  items: List<any>;
  keyPath: KeyPath;
  renderHeader: (data, keyPath?) => El; // render the group header, given it's info and keyPath
  isGroup: (item: any) => boolean; // function to distinguish items from groups
  keyPathStarter?: List<any>; // key path to get children in, and to append to any created key paths
  renderChildren: (data, keyPath?) => El; // given data about the children, return the child elements
  setCollapsed: (keyPath, value: boolean) => void; // set something as collapsed, or not
  depth?: number;
  hoverHeader?: El;
  // Injected drag drop props
  onDrop: (dropIndex: List<number>, dragIndex: List<number>) => void;
  onReorder: (itemKeyPath: List<number>, dropKeyPath: List<number>) => void;
  isDragging: boolean;
  isOver: boolean;
  connectDragSource: (El) => El;
  connectDropTarget: (El) => El;
  connectDragPreview: (El, options?) => El;
}

const groupSource = {
  beginDrag(props, monitor, component)
  {
    props.setCollapsed(props.keyPath, true);
    // need to figure out what the width is for the custom drag layer
    const boundingRect = component.refs['group']['getBoundingClientRect']();
    return { keyPath: props.keyPath, data: props.data, width: boundingRect.width };
  },
};

function groupDragCollect(connect, monitor)
{
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
    connectDragPreview: connect.dragPreview(),
  };
}

const groupDropTarget = {
  drop(props, monitor)
  {
    // If the item was actually dropped on a child of the group, just return
    if (monitor.didDrop())
    {
      return;
    }
    props.onDrop(props.keyPath, monitor.getItem().keyPath);
  },
};

function groupDropCollect(connect, monitor)
{
  return {
    connectDropTarget: connect.dropTarget(),
    // make sure it is over them, not their children
    isOver: monitor.isOver({ shallow: true }),
  };
}

class GroupComponent extends TerrainComponent<GroupProps>
{

  public componentDidMount()
  {
    // Use empty image as a drag preview so browsers don't draw it
    // and we can draw whatever we want on the custom drag layer instead.
    this.props.connectDragPreview(getEmptyImage(), {
      captureDraggingState: true,
    });
  }

  public renderGroupChildren(items, newKeyPath)
  {
    const { keyPathStarter, onReorder, onDrop, isGroup, renderChildren, depth } = this.props;
    return (
      <div>
        <DropZone
          keyPath={newKeyPath.push(0)}
          onDrop={onReorder}
        />
        {
          items.map((item, i: number) =>
            <div key={i}>
              {
                !(isGroup(item)) ?
                  <DragDropItem
                    children={renderChildren(item, newKeyPath.push(i))}
                    keyPath={newKeyPath.push(i)}
                    onDrop={onDrop}
                    canDrop={true}
                    data={item}
                    hoverHeader={this.props.hoverHeader}
                  />
                  :
                  <DragDropGroup
                    {...this.props}
                    items={keyPathStarter ? item.getIn(keyPathStarter) : item}
                    keyPath={newKeyPath.push(i)}
                    data={keyPathStarter ? item.getIn(keyPathStarter.butLast()) : item}
                    depth={depth !== undefined ? depth + 1 : 1}
                  />
              }
              <DropZone
                keyPath={newKeyPath.push(i + 1)}
                onDrop={onReorder}
              />
            </div>,
          )
        }
      </div>
    );
  }

  public renderGroup()
  {
    const { data, renderHeader, isDragging, items, keyPath, keyPathStarter, onReorder, isOver, depth } = this.props;
    const newKeyPath = keyPathStarter ? keyPath.concat(keyPathStarter).toList() : keyPath;
    // Note: Radium causes issues when combined with drag drop library, which is why we don't use it here for styling
    const draggingStyle = isDragging ? { opacity: 0.3, height: 30 } : {};
    const droppingStyle = isOver ? borderColor(Colors().active) : {};
    return (
      <div
        className={classNames({
          'drag-drop-group': true,
          'drag-drop-group-collapsed': data.collapsed,
        })}
        style={_.extend(
          {},
          backgroundColor(Colors().blockBg),
          draggingStyle,
          droppingStyle,
          { width: depth !== undefined ? `calc(100% - 12px)` : '100%' },
        )}
      >
        <div
          ref='group'
        >
          <div>{renderHeader(data, newKeyPath.butLast())}</div>
          <FadeInOut
            open={!data.collapsed}
          >
            {this.renderGroupChildren(items, newKeyPath)}
          </FadeInOut>
        </div>
      </div>
    );
  }

  public render()
  {
    return (
      this.props.connectDropTarget(
        this.props.connectDragSource(
          this.renderGroup(),
        ),
      )
    );
  }
}

const DragDropGroup = DropTarget(['ITEM', 'GROUP'], groupDropTarget, groupDropCollect)(
  DragSource('GROUP', groupSource, groupDragCollect)
    (GroupComponent));

export default DragDropGroup;
