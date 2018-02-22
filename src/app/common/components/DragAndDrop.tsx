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

import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
const { List, Map } = Immutable;
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import TerrainComponent from './TerrainComponent';

export interface DraggableItem
{
  content: any;
  key: string | number;
  draggable: boolean;
  dragHandle?: El; // If they want to have a custom drag handle
}

export interface Props
{
  draggableItems: List<DraggableItem>;
  onDrop: (items) => void;
  onDragStart?: () => void;
  className: string; // used for selection of this list
}

const grid = 8;

class DragAndDrop extends TerrainComponent<Props>
{
  public constructor(props)
  {
    super(props);
  }

  // Add styling got dragging items
  public getItemStyle(draggableStyle, isDragging)
  {
    return ({
      ...draggableStyle,
    });
  }

  public reorder(list, startIndex, endIndex)
  {
    let result = List(list);
    const moved = result.get(startIndex);
    result = result.delete(startIndex).insert(endIndex, moved);
    return result;
  }

  public onDragEnd(result)
  {
    // dropped outside the list
    if (!result.destination)
    {
      return;
    }

    const items = this.reorder(
      this.props.draggableItems,
      result.source.index,
      result.destination.index,
    );

    if (this.props.onDrop !== undefined)
    {
      this.props.onDrop(items);
    }
  }

  public onDragStart(initial)
  {
    // blur all inputs (if an input is focused during drag it will cause issues)
    const inputs = $('.' + this.props.className + ' input');
    inputs.map((i, input) =>
    {
      (input as any).blur();
    });
    if (this.props.onDragStart !== undefined)
    {
      this.props.onDragStart();
    }
  }

  public renderItem(item: DraggableItem, provided, snapshot)
  {
    if (item.dragHandle !== undefined)
    {
      return (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div {...provided.dragHandleProps}>
            {item.dragHandle}
          </div>
          {item.content}
        </div>
      );
    }
    return (
      <div
        ref={provided.innerRef}
        style={this.getItemStyle(
          provided.draggableStyle,
          snapshot.isDragging)}
        {...provided.dragHandleProps}
      >
        {item.content}
      </div>
    );
  }

  public render()
  {
    const draggableItems = this.props.draggableItems.map((i) => Object.assign({}, i, { key: i.key.toString() }));

    return (
      <div className={this.props.className}>
        <DragDropContext
          onDragEnd={this.onDragEnd}
          onDragStart={this.onDragStart}
        >
          <Droppable droppableId={'droppable_' + this.props.className}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
              >
                {draggableItems.map((item, index) => (
                  <Draggable
                    key={item.key}
                    draggableId={item.key}
                    isDragDisabled={!item.draggable}
                    // index={index}
                  >
                    {(provided2, snapshot2) => (
                      <div>
                        {this.renderItem(item, provided2, snapshot2)}
                        {provided2.placeholder}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  }
}

export default DragAndDrop;
