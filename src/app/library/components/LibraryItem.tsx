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

require('./LibraryItem.less');
import * as React from 'react';
import * as $ from 'jquery';
import * as Immutable from 'immutable';
const {List} = Immutable;
import Classs from './../../common/components/Classs';
import Menu from './../../common/components/Menu';
import { Link } from 'react-router';
import * as classNames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';

const StarIcon = require('../../../images/icon_star.svg?name=StarIcon');

interface Props
{
  index: number;
  fadeIndex: number;
  name: string;
  onDuplicate: (id: ID) => void;
  onArchive: (id: ID) => void;
  canArchive: boolean;
  canDuplicate: boolean;
  icon: any;
  color: string;
  to: string;
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
  
  draggingItemIndex: number;
  draggingOverIndex: number;
  
  // partially-optional. need to be provided if available.
  groupId?: ID;
  algorithmId?: ID;
  variantId?: ID;
  
  // optional
  className?: string;
  onDoubleClick?: (id:ID) => void;
  isStarred?: boolean;
  
  // populated by DnD code
  connectDropTarget?: (html: any) => JSX.Element;
  connectDragSource?: (html: any) => JSX.Element;
  draggingItemId?: ID;
  isOver?: boolean;
  dragItemType? : string;
  isDragging?: boolean;
}

class LibraryItem extends Classs<Props>
{
  state = {
    nameEditing: false,
    focusField: false,
    mounted: false,
    timeout: null,
  }
  
  menuOptions =
  {
    none: List([]),
    duplicate: 
    List([
      {
        text: 'Duplicate',
        // icon: '',
        onClick: this.handleDuplicate,
      },
    ]),
    archive:
    List([
      {
        text: 'Archive',
        onClick: this.handleArchive,
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
        text: 'Archive',
        onClick: this.handleArchive,
      },
    ]),
  }
  
  componentDidMount()
  {
    this.setState({
      timeout: 
        setTimeout(() =>
        {
          this.setState({
            mounted: true,
          })
        }, this.props.rendered ? 0 : Math.min(this.props.fadeIndex * 100, 1000)), // re-add this when we get real indexes
    })
    
    if(!this.props.name.length)
    {
      this.showTextfield();
    }
  }
  
  componentWillUnmount()
  {
    if(this.state.timeout)
    {
      clearTimeout(this.state.timeout);
    }
  }
  
  handleDuplicate()
  {
    this.props.onDuplicate(this.props.id);
  }
  
  handleArchive()
  {
    this.props.onArchive(this.props.id);
  }
  
  handleKeyDown(event)
  {
    if(event.keyCode === 13)
    {
      event.target.blur();
    }
  }
  
  showTextfield(event?)
  {
    if(!this.props.canEdit)
    {
      return;
    }
    
    this.setState({
      nameEditing: true,
      focusField: true,
    });
    event && event.preventDefault();
    event && event.stopPropagation();
  }
  
  componentDidUpdate()
  {
    if(this.state.focusField)
    {
      this.refs['input']['focus']();
      this.setState({
        focusField: false,
      });
    }
  }
  
  hideTextfield(event)
  {
    this.props.onNameChange(this.props.id, event.target.value);
    this.setState({
      nameEditing: false,
    })
  }
  
  handleDoubleClick(event)
  {
    event.preventDefault();
    event.stopPropagation();
    if(this.state.nameEditing)
    {
      this.props.onNameChange(this.props.id, this.refs['input']['value']);
    }
    this.props.onDoubleClick && this.props.onDoubleClick(this.props.id);
  }
  
  handleFocus(event)
  {
    event.target.select();
  }
  
  render()
  {
    let { connectDropTarget, connectDragSource, isOver, dragItemType, draggingItemId, isDragging } = this.props;
    let draggingOver = isOver && dragItemType !== this.props.type;
    
    let {canArchive, canDuplicate} = this.props;
    let menuOptions =
      (canArchive && canDuplicate) ? this.menuOptions.duplicateArchive :
      (
        canArchive ? this.menuOptions.archive :
        (
          canDuplicate ? this.menuOptions.duplicate : this.menuOptions.none
        )
      );
    
    if(this.props.draggingOverIndex !== -1)
    {
      // could be shifted
      if(this.props.index > this.props.draggingItemIndex && this.props.index == this.props.draggingOverIndex)
      {
        var shiftedUp = true;
      }
      if(this.props.index < this.props.draggingItemIndex && this.props.index == this.props.draggingOverIndex)
      {
        var shiftedDown = true;
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
        >
          <div
            className={classNames({
              'library-item-wrapper': true,
              'library-item-wrapper-shifted': shifted,
              'library-item-wrapper-mounted': this.state.mounted,
              'library-item-wrapper-dragging': draggingItemId === this.props.id,
              'library-item-wrapper-drag-over': draggingOver,
            })}
            style={{
              borderColor:this.props.color
            }}
          >
            { connectDragSource(
              <div
                className={'library-item ' + this.props.className}
                style={{
                  background:this.props.color
                }}
              >
                <div
                  className={classNames({
                    'library-item-title-bar': true,
                    'library-item-title-bar-editing': this.state.nameEditing,
                  })}
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
                    onDoubleClick={this.showTextfield}
                  >
                    { 
                      this.props.name.length ? this.props.name : <em>Untitled</em> 
                    }
                  </div>
                  <input
                    className='library-item-name-input'
                    defaultValue={ this.props.name }
                    placeholder={this.props.type.substr(0, 1).toUpperCase() + this.props.type.substr(1) + ' name'}
                    onBlur={ this.hideTextfield }
                    onFocus={this.handleFocus}
                    onKeyDown={ this.handleKeyDown }
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
              </div>
            )}
          </div>
        </Link>
      </div>
    ));
  }
}


// DnD stuff

var shifted = false;
$(document).on('dragover dragend', function(e){shifted = e.shiftKey; return true;} );
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
    if(!monitor.didDrop())
    {
      return;
    }
    const item = monitor.getItem();
    const { type, targetItem } = monitor.getDropResult();
    props.onDropped(item.id, type, targetItem, shifted);
  }
}

const dragCollect = (connect, monitor) =>
({
  connectDragSource: connect.dragSource(),
  draggingItemId: monitor.getItem() && monitor.getItem().id,
  isDragging: monitor.isDragging(),
  // built-in `isDragging` unreliable if the component is being inserted into other parts of the app during drag
});


let canDrop = (props, monitor) =>
{
  if(!props.canCreate)
  {
    return false;
  }
  
  let itemType = monitor.getItem().type;
  let targetType = props.type;
  switch(itemType)
  {
    case 'variant':
      return targetType === 'variant' || targetType === 'algorithm';
    case 'algorithm':
      return targetType === 'algorithm' || targetType === 'group';
    case 'group':
      return targetType === 'group';
  }
  return false;
};
const target = 
{
  canDrop,
  
  hover(props, monitor, component)
  {
    if(canDrop(props, monitor))
    {
      let item = monitor.getItem();
      props.onHover(props.index, item.type, item.id);
    }
  },
  
  drop(props, monitor, component)
  {
    if(monitor.isOver({ shallow: true}))
    {
      return {
        targetItem: props.item,
        type: props.type,
      };
    }
  }
}

const dropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver() && monitor.canDrop(),
  dragItemType: monitor.getItem() && monitor.getItem().type,
});

export default DropTarget('BROWSER', target, dropCollect)(DragSource('BROWSER', source, dragCollect)(LibraryItem));