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

// tslint:disable:no-invalid-this no-var-requires restrict-plus-operands strict-boolean-expressions

import * as PropTypes from 'prop-types';
import * as React from 'react';
import './panel.less';
const shallowCompare = require('react-addons-shallow-compare');
import * as ReactDOM from 'react-dom';
import Util from '../../../util/Util';
const $ = require('jquery');

const Panel = {
  // shouldComponentUpdate(nextProps, nextState) {
  //   return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  // },

  propTypes:
    {
      index: PropTypes.number,

      drag_x: PropTypes.bool,
      drag_y: PropTypes.bool,
      drag_xy: PropTypes.bool,
      dragInsideOnly: PropTypes.bool,

      onPanelDrop: PropTypes.func,

      onMouseDown: PropTypes.func,
      mouseDownRef: PropTypes.string,

      fill: PropTypes.bool,
      reorderonPanelDrag: PropTypes.bool,
      neighborDragging: PropTypes.bool,
      handleRef: PropTypes.string,
      dragHandleRef: PropTypes.string,
    },

  getInitialState()
  {
    return {
      dragging: false,
      moved: false,
    };
  },

  isPanel()
  {
    return true;
  },

  // Returns true if this is draggable in the 'x', 'y', or (default) either directions
  canDrag()
  {
    if (arguments.length)
    {
      if (arguments[0] === 'x')
      {
        return this.props.drag_x || this.props.drag_xy;
      }
      if (arguments[0] === 'y')
      {
        return this.props.drag_y || this.props.drag_xy;
      }
    }
    return this.props.drag_x || this.props.drag_y || this.props.drag_xy;
  },

  startDrag(x, y)
  {
    if (this.canDrag())
    {
      const cr = ReactDOM.findDOMNode(this).getBoundingClientRect();

      this.setState({
        ox: x,
        oy: y,
        dx: 0,
        dy: 0,
        ocr: cr,
      });

      if (this.props.dragHandleRef)
      {
        const dragHandle = this.refs[this.props.dragHandleRef];
        dragHandle.style.left = (x - cr.left - dragHandle.getBoundingClientRect().width / 2) + 'px';
        dragHandle.style.top = (y - cr.top - dragHandle.getBoundingClientRect().height / 2) + 'px';
      }

      return true;
    }
    return false;
  },

  dragTo(x, y)
  {
    const draggedTo: any = { x: 0, y: 0 };
    $('input').blur();

    // if(this.props.dragInsideOnly)
    // {
    //     var cr = Util.parentNode(this)['getBoundingClientRect']();
    //     console.log(cr);
    // 	var minY = cr.top + this.state.oy - this.state.ocr.top;
    // 	var maxY = cr.bottom + this.state.oy - this.state.ocr.bottom;
    // 	y = Util.valueMinMax(y, minY, maxY);

    // 	var minX = cr.left + this.state.ox - this.state.ocr.left;
    // 	var maxX = cr.right + this.state.ox - this.state.ocr.right;
    // 	x = Util.valueMinMax(x,minX, maxX);
    // }

    if (this.canDrag('x'))
    {
      this.setState({
        dx: x - this.state.ox,
      });
      draggedTo.x = x;
      draggedTo.dx = this.state.dx;
    }

    if (this.canDrag('y'))
    {
      this.setState({
        dy: y - this.state.oy,
      });
      draggedTo.y = y;
      draggedTo.dy = this.state.dy;
    }

    if (this.props.onPanelDrag)
    {
      this.props.onPanelDrag(this.props.index, draggedTo, {
        x: this.state.ox,
        y: this.state.oy,
      });
    }

    this.setState({
      draggedTo,
      dragging: true,
      // ^ this is here, and not in the startDrag method, so that we don't see
      //    the dragging styles until we've actually moved the thing
    });
  },

  stopDrag(x, y)
  {
    this.setState({
      dragging: false,
    });

    if (this.props.onPanelDrop)
    {
      this.props.onPanelDrop(this.props.index, {
        dx: x - this.state.ox,
        dy: y - this.state.oy,
      }, {
          x: this.state.ox,
          y: this.state.oy,
        });
    }

    if (this.props.dragHandleRef)
    {
      const dragHandle = this.refs[this.props.dragHandleRef];
      dragHandle.style.left = '0px';
      dragHandle.style.top = '0px';
    }

  },

  // Section: Mouse Events

  down(event)
  {
    if (this.props.onMouseDown)
    {
      if (!this.props.mouseDownRef || event.target === this.refs[this.props.mouseDownRef])
      {
        this.props.onMouseDown(this.props.index, event);
      }
    }

    if (this.props.handleRef)
    {
      const checkParent = (parentNode: Node) =>
      {
        return parentNode === this.refs[this.props.handleRef];
      };

      if (event.target !== this.refs[this.props.handleRef] && Util.findParentNode(event.target, checkParent, 4) === null)
      {
        // a handleRef is set, so only respond to mouse events on our handle
        return;
      }
    }

    if (this.startDrag(event.pageX, event.pageY))
    {
      // event.stopPropagation();
      $(document).on('mousemove', this.move);
      $(document).on('touchmove', this.move);
      $(document).on('mouseup', this.up);
      $(document).on('touchend', this.up);
    }

    // we reset the moved state here, and not on the 'up' event,
    //  because the 'up' event handler gets called before any click event listeners
    //  the parent may have set
    //  I think reseting the state here should be equivalent, but if you find a bug or
    //  know a better way, implement it
    this.setState({
      moved: false,
    });
  },

  move(event)
  {
    this.dragTo(event.pageX, event.pageY);
    event.preventDefault();
    this.setState({
      moved: true,
    });
  },

  up(event)
  {
    $(document).off('mousemove', this.move);
    $(document).off('touchmove', this.move);
    $(document).off('mouseup', this.up);
    $(document).off('touchend', this.up);
    this.stopDrag(event.pageX, event.pageY);
  },

  renderPanel(content, className)
  {
    // Coordinate these classNames with panel.css/less
    let panelClass = 'panel ' + (className || '');

    const style: React.CSSProperties = {};

    if (this.props.dx && this.canDrag())
    {
      style.left = this.props.dx + 'px';
    }

    if (this.props.dy && this.canDrag())
    {
      style.top = this.props.dy + 'px';
    }

    if (this.state.dragging)
    {
      panelClass += ' panel-dragging';

      style.left = this.state.dx + 'px';
      style.top = this.state.dy + 'px';
    }

    if (this.props.neighborDragging)
    {
      panelClass += ' neighbor-dragging';
    }

    if (this.props.fill)
    {
      style.width = '100%';
      style.height = '100%';
    }

    return (
      <div
        className={panelClass}
        style={style}
        onMouseDown={this.down}
        ref='panel'
        onTouchStart={this.down}>
        {content}
      </div>
    );
  },
};

export default Panel;
