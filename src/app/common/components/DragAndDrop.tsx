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

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import TerrainComponent from './TerrainComponent';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface DraggableItem
{
  content: any;
  key: string | number;
  draggable: boolean;
  dragHandle?: El; // If they want to have a custom drag handle
}

export interface Props
{
  draggableItems: List<DraggableItem>; 
}

const grid = 8;

class DragAndDrop extends TerrainComponent<Props>
{
  public state: {
    items: any;
  } = {
    items: this.props.draggableItems,
  };

  public constructor(props)
  {
    super(props);
    this.onDragEnd = this.onDragEnd.bind(this);
  }

  public componentWillReceiveProps(nextProps)
  {
    if (nextProps.draggableItems !== this.props.draggableItems)
    {
      this.setState({
        items: nextProps.draggableItems,
      })
    }
  }

  // Add styling got dragging items
  public getItemStyle(draggableStyle, isDragging) 
  {
    return ({
      ...draggableStyle,
    })
  }

  public reorder(list, startIndex, endIndex) 
  {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  }

  public getItems(count)
  {
    return Array.from({ length: count }, (v, k) => k).map(k => ({
      id: `item-${k}`,
      content: `item ${k}`,
    }))
  };

  // TODO ADD PROP FOR ON DRAG END AND ON DRAG START
  public onDragEnd(result)
  {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const items = this.reorder(
      this.state.items,
      result.source.index,
      result.destination.index
    );

    this.setState({
      items,
    });
  }

  public renderItem(item: DraggableItem, provided, snapshot)
  {
    if (item.dragHandle !== undefined)
    {
      return (
        <div
          ref={provided.innerRef}
          style={this.getItemStyle(
            provided.draggableStyle,
            snapshot.isDragging)}
        >
          <div
            {...provided.dragHandleProps}
          >
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
         { ...provided.dragHandleProps}
        >
        {item.content}
        </div>
      );
  }

  public render()
  {
    return (
      <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
            >
              {this.state.items.map(item => (
                <Draggable 
                  key={item.key}
                  draggableId={item.key}
                  isDragDisabled={!item.draggable}
                >
                  {(provided, snapshot) => (
                    <div>
                      {this.renderItem(item, provided, snapshot)}
                      {provided.placeholder}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  }
}

export default DragAndDrop;
