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

// tslint:disable:no-var-requires strict-boolean-expressions no-unused-expression

import * as Immutable from 'immutable';
import * as $ from 'jquery';
import * as React from 'react';
import './LibraryItem.less';
const { List } = Immutable;
import * as classNames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
import { Link } from 'react-router';
import { backgroundColor, Colors, fontColor } from '../../colors/Colors';
import ColorsActions from './../../colors/data/ColorsActions';
import Menu from './../../common/components/Menu';
import TerrainComponent from './../../common/components/TerrainComponent';

const StarIcon = require('../../../images/icon_star.svg?name=StarIcon');

export interface Props
{
  index: number;
  fadeIndex: number;
  name: string;
  onDuplicate: (id: ID) => void;
  onArchive: (id: ID) => void;
  onUnarchive: (id: ID) => void;
  canArchive: boolean;
  canDuplicate: boolean;
  canUnarchive: boolean;
  icon: any;
  to?: string;
  type: string;
  onNameChange: (id: ID, name: string) => void;
  id: ID;
  rendered: boolean;
  canEdit: boolean;
  canDrag: boolean;
  canCreate: boolean;

  onHover: (index: number, type: string, id: ID) => void;
  // ^ called on target
  onDropped: (id: ID, targetType: string, targetItem: any, shiftKey: boolean) => void;
  // ^ called on dragged element
  onDragFinish: () => void;
  // ^ called on target even if no drop occurs

  draggingItemIndex: number;
  draggingOverIndex: number;

  // partially-optional. need to be provided if available.
  groupId?: ID;
  algorithmId?: ID;
  variantId?: ID;

  // optional
  className?: string;
  onSelect?: (id: ID) => void;
  onDoubleClick?: (id: ID) => void;
  isStarred?: boolean;

  // populated by DnD code
  connectDropTarget?: (html: any) => JSX.Element;
  connectDragSource?: (html: any) => JSX.Element;
  draggingItemId?: ID;
  isOver?: boolean;
  dragItemType?: string;
  isDragging?: boolean;
  isSelected: boolean;
  isFocused: boolean; // is this the last thing focused / selected?
}

class LibraryItem extends TerrainComponent<Props>
{
  public state = {
    nameEditing: false,
    focusField: false,
    mounted: false,
    timeout: null,
  };

  public menuOptions =
  {
    none: List([]),
    duplicate:
    List([
      {
        text: 'Duplicate',
        // icon: '',
        onClick: this.handleDuplicate,
      },
      {
        text: 'Rename',
        onClick: this.showTextfield,
      },
    ]),
    archive:
    List([
      {
        text: 'Rename',
        onClick: this.showTextfield,
      },
      {
        text: 'Archive',
        onClick: this.handleArchive,
      },
    ]),
    unarchive:
    List([
      {
        text: 'Rename',
        onClick: this.showTextfield,
      },
      {
        text: 'Unarchive',
        onClick: this.handleUnarchive,
      },
    ]),
    duplicateArchive:
    List([
      {
        text: 'Duplicate',
        // icon: '',
        onClick: this.handleDuplicate,
      },
      {
        text: 'Rename',
        onClick: this.showTextfield,
      },
      {
        text: 'Archive',
        onClick: this.handleArchive,
      },
    ]),
  };

  public componentWillMount()
  {
    ColorsActions.setStyle('.library-item .library-item-title-bar .library-item-icon svg, .cls-1 ', { fill: Colors().altBg1 });
  }

  public componentDidMount()
  {
    this.setState({
      timeout:
      setTimeout(() =>
      {
        this.setState({
          mounted: true,
        });
      }, this.props.rendered ? 0 : Math.min(this.props.fadeIndex * 100, 1000)), // re-add this when we get real indexes
    });

    if (!this.props.name.length)
    {
      this.showTextfield();
    }
  }

  public componentWillUnmount()
  {
    if (this.state.timeout)
    {
      clearTimeout(this.state.timeout);
    }
  }

  public handleDuplicate()
  {
    this.props.onDuplicate(this.props.id);
  }

  public handleArchive()
  {
    this.props.onArchive(this.props.id);
  }

  public handleUnarchive()
  {
    this.props.onUnarchive(this.props.id);
  }

  public handleKeyDown(event)
  {
    if (event.keyCode === 13)
    {
      event.target.blur();
    }
  }

  public showTextfield()
  {
    if (!this.props.canEdit)
    {
      return;
    }

    this.setState({
      nameEditing: true,
      focusField: true,
    });
  }

  public componentDidUpdate()
  {
    if (this.state.focusField)
    {
      this.refs['input']['focus']();
      this.setState({
        focusField: false,
      });
    }
  }

  public hideTextfield(event)
  {
    this.props.onNameChange(this.props.id, event.target.value);
    this.setState({
      nameEditing: false,
    });
  }

  public handleClick(event)
  {
    if (this.props.onSelect)
    {
      event.preventDefault();
      event.stopPropagation();

      const { id } = this.props;

      this.props.onSelect(id);
    }
  }

  public handleDoubleClick(event)
  {
    event.preventDefault();
    event.stopPropagation();
    if (this.state.nameEditing)
    {
      this.props.onNameChange(this.props.id, this.refs['input']['value']);
    }
    this.props.onDoubleClick && this.props.onDoubleClick(this.props.id);
  }

  public handleFocus(event)
  {
    event.target.select();
  }

  public render()
  {
    const { connectDropTarget, connectDragSource, isOver, dragItemType, draggingItemId, isDragging, isSelected } = this.props;
    const draggingOver = isOver && dragItemType !== this.props.type;

    const { canArchive, canDuplicate, canUnarchive } = this.props;
    const menuOptions =
      (canArchive && canDuplicate) ? this.menuOptions.duplicateArchive :
        (
          canArchive ? this.menuOptions.archive :
            (
              canUnarchive ? this.menuOptions.unarchive :
                (
                  canDuplicate ? this.menuOptions.duplicate : this.menuOptions.none
                )
            )
        );

    let shiftedUp: boolean;
    let shiftedDown: boolean;

    if (this.props.draggingOverIndex !== -1)
    {
      // could be shifted
      if (this.props.index > this.props.draggingItemIndex && this.props.index === this.props.draggingOverIndex)
      {
        shiftedUp = true;
      }
      if (this.props.index < this.props.draggingItemIndex && this.props.index === this.props.draggingOverIndex)
      {
        shiftedDown = true;
      }
    }

    return connectDropTarget((
      <div
        className={classNames({
          'library-item-shifted-up': shiftedUp,
          'library-item-shifted-down': shiftedDown,
          'library-item-dragging': this.props.isDragging,
          'library-item-dragging-hidden': this.props.isDragging && this.props.draggingOverIndex !== this.props.index,
        })}
      >
        <Link
          to={this.props.to}
          className='library-item-link'
          activeClassName='library-item-active'
          onDoubleClick={this.handleDoubleClick}
          onClick={this.handleClick}
        >
          <div
            className={classNames({
              'library-item-wrapper': true,
              'library-item-wrapper-shifted': shifted,
              'library-item-wrapper-mounted': this.state.mounted,
              'library-item-wrapper-dragging': draggingItemId === this.props.id,
              'library-item-wrapper-drag-over': draggingOver,
            })}
            style={
              isSelected && this.props.isFocused ?
                {
                  borderColor: Colors().active,
                }
                : {}
            }
          >
            {connectDragSource(
              <div
                className={'library-item ' + this.props.className}
                style={
                  isSelected ? backgroundColor(Colors().active) :
                    backgroundColor(Colors().bg3, Colors().inactiveHover)
                }
              >
                <div
                  className={classNames({
                    'library-item-title-bar': true,
                    'library-item-title-bar-editing': this.state.nameEditing,
                  })}
                  style={
                    isSelected ? backgroundColor(Colors().active) :
                      backgroundColor(Colors().bg2, Colors().inactiveHover)
                  }
                >
                  <div
                    className='library-item-icon'
                  >
                    {
                      this.props.icon
                    }
                  </div>
                  <div
                    className='library-item-name'
                    style={fontColor(Colors().text1)}
                  >
                    {
                      this.props.name.length ? this.props.name : <em>Untitled</em>
                    }
                  </div>
                  <input
                    className='library-item-name-input'
                    defaultValue={this.props.name}
                    placeholder={this.props.type.substr(0, 1).toUpperCase() + this.props.type.substr(1) + ' name'}
                    onBlur={this.hideTextfield}
                    onFocus={this.handleFocus}
                    onKeyDown={this.handleKeyDown}
                    ref='input'
                  />
                  {
                    this.props.isStarred &&
                    <div
                      className='library-item-star'
                    >
                      <StarIcon />
                    </div>
                  }
                  <Menu
                    options={menuOptions}
                  />
                </div>
                <div className='library-item-content'>
                  {
                    this.props['children']
                  }
                </div>
              </div>,
            )}
          </div>
        </Link>
      </div>
    ));
  }
}

// DnD stuff

let shifted = false;
$(document).on('dragover dragend', (e) => { shifted = e.shiftKey; return true; });
// http://stackoverflow.com/questions/3781142/jquery-or-javascript-how-determine-if-shift-key-being-pressed-while-clicking-an

const source =
  {
    canDrag(props, monitor)
    {
      return props.canDrag;
    },

    beginDrag(props)
    {
      const item = {
        id: props.id,
        type: props.type,
        index: props.index,
      };
      return item;
    },

    endDrag(props, monitor, component)
    {
      props.onDragFinish();
      if (!monitor.didDrop())
      {
        return;
      }
      const item = monitor.getItem();
      const { type, targetItem } = monitor.getDropResult();
      props.onDropped(item.id, type, targetItem, shifted);
    },
  };

const dragCollect = (connect, monitor) =>
  ({
    connectDragSource: connect.dragSource(),
    draggingItemId: monitor.getItem() && monitor.getItem().id,
    isDragging: monitor.isDragging(),
    // built-in `isDragging` unreliable if the component is being inserted into other parts of the app during drag
  });

const canDrop = (props, monitor) =>
{
  if (!props.canCreate)
  {
    return false;
  }

  const itemType = monitor.getItem().type;
  const targetType = props.type;

  // can only drag and drop within the same column / type
  return itemType === targetType;
};
const target =
  {
    canDrop,

    hover(props, monitor, component)
    {
      if (canDrop(props, monitor))
      {
        const item = monitor.getItem();
        props.onHover(props.index, item.type, item.id);
      }
    },

    drop(props, monitor, component)
    {
      if (monitor.isOver({ shallow: true }))
      {
        return {
          targetItem: props.item,
          type: props.type,
        };
      }
    },
  };

const dropCollect = (connect, monitor) =>
  ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver() && monitor.canDrop(),
    dragItemType: monitor.getItem() && monitor.getItem().type,
  });

const LI = DropTarget('BROWSER', target, dropCollect)(DragSource('BROWSER', source, dragCollect)(LibraryItem)) as any;

export default LI;
