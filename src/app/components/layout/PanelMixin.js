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

require('./panel.less');
var React = require('react');
var _ = require('underscore');
var ReactDOM = require('react-dom');
var Util = require('../../util/Util.js');
var $ = require('jquery');

// TODO clean up the scroll acceleration code
var SCROLL_ACCELERATION = 20;
var MAX_SCROLL_VELOCITY = 20;
var SCROLL_INTERVAL = 25;

var Panel = {
	propTypes: 
	{
		drag_x: React.PropTypes.bool,
		drag_y: React.PropTypes.bool,
		drag_xy: React.PropTypes.bool,
		dragInsideOnly: React.PropTypes.bool,

		onDrop: React.PropTypes.func,

		fill: React.PropTypes.bool,
		reorderOnDrag: React.PropTypes.bool,
		neighborDragging: React.PropTypes.bool,
		handleRef: React.PropTypes.string,
	},

	getInitialState() {
		return {
			dragging: false,
			scrollingParentUp: false,
			scrollInterval: null,
			scrollVelocity: 0,
			moved: false,
		}
	},

	isPanel() {
		return true;
	},

	// Returns true if this is draggable in the 'x', 'y', or (default) either directions
	canDrag() {
		if(arguments.length) {
			if(arguments[0] === 'x')
				return this.props.drag_x || this.props.drag_xy;
			if(arguments[0] === 'y')
				return this.props.drag_y || this.props.drag_xy;
		}
		return this.props.drag_x || this.props.drag_y || this.props.drag_xy;
	},                     

	componentWillMount()
	{
		setInterval(this.scrollParentUp, SCROLL_INTERVAL);
	},

	scrollParentUp()
	{
		if(!this.state.scrollingParentUp && !this.state.scrollingParentDown && !this.state.scrollVelocity)
		{
			// fast break
			// this.setState({
			// 	scrollVelocity: 0,
			// 	draggedTo: null,
			// });
			return;
		}

		if(this.state.scrollingParentUp)
		{
			this.setState({
				scrollVelocity: -1 * MAX_SCROLL_VELOCITY, // Math.max(this.state.scrollVelocity - SCROLL_ACCELERATION, -1 * MAX_SCROLL_VELOCITY),
			});
		}
		else if(this.state.scrollingParentDown)
		{
			this.setState({
				scrollVelocity: MAX_SCROLL_VELOCITY, // Math.min(this.state.scrollVelocity + SCROLL_ACCELERATION, MAX_SCROLL_VELOCITY),
			});
		}

		var maxScrollPosition = this.state.oParentHeight;
		var scrollPosition = this.parentNode().scrollTop + this.state.scrollVelocity;
		scrollPosition = Util.valueMinMax(scrollPosition, 0, maxScrollPosition);

		this.parentNode().scrollTop = scrollPosition;

		if(this.state.draggedTo && this.state.scrollVelocity !== 0 && scrollPosition > 0 && scrollPosition < maxScrollPosition)
		{
			this.dragTo(this.state.draggedTo.x, this.state.draggedTo.y);
		}
	},

	startScrollingParentUp()
	{
		this.setState({
			scrollingParentUp: true,
			scrollingParentDown: false,
		});
	},

	startScrollingParentDown()
	{
		this.setState({
			scrollingParentUp: false,
			scrollingParentDown: true,
		});
	},

	stopScrollingParent()
	{
		this.setState({
			scrollingParentUp: false,
			scrollingParentDown: false,
			scrollVelocity: 0,
		});
	},

	startDrag(x, y) 
	{
		if(this.canDrag()) 
		{
			this.setState({ 
				dragging: true, 
				ox: x, 
				oy: y, 
				dx: 0, 
				dy: 0,
				ocr: ReactDOM.findDOMNode(this).getBoundingClientRect(),
			});

			if(this.parentNode())
			{
				var maxYPosition = _.max(_.map(this.parentNode().childNodes).map((node) => node.getBoundingClientRect().bottom));
				maxYPosition += this.parentNode().scrollTop;
				maxYPosition -= this.parentNode().getBoundingClientRect().height;
				this.setState({
					oScrollTop: this.parentNode().scrollTop,
					oParentHeight: maxYPosition,
				});
			}
			
			return true;
		}
		return false;
	},

	parentNode()
	{
		return this.props.parentNode;
	},

	dragTo(x, y) 
	{
		var draggedTo = { x: 0, y: 0 };

		$('input').blur();

		if(this.props.dragInsideOnly)
		{
			y = Util.valueMinMax(y,
					this.parentNode().getBoundingClientRect().top + this.state.oy - this.state.ocr.top,
					this.parentNode().getBoundingClientRect().bottom + this.state.oy - this.state.ocr.bottom);
			x = Util.valueMinMax(x,
					this.parentNode().getBoundingClientRect().left + this.state.ox - this.state.ocr.left,
					this.parentNode().getBoundingClientRect().right + this.state.ox - this.state.ocr.right);
		}

		if(this.canDrag('x')) 
		{
			this.setState({
				dx: x - this.state.ox
			});
			draggedTo.x = x;
			draggedTo.dx = this.state.dx;
		}

		if(this.canDrag('y')) 
		{
			var scrollOffset = this.parentNode() ? (this.state.oScrollTop - this.parentNode().scrollTop) : 0;
			this.setState({
				dy: y - this.state.oy - scrollOffset,
			});
			draggedTo.y = y;
			draggedTo.dy = this.state.dy + scrollOffset;
		}

		this.setState({
			draggedTo: draggedTo,
		})

		if(this.props.onDrag) 
		{
			this.props.onDrag(draggedTo, { 
				x: this.state.ox,
				y: this.state.oy,
			});
		}

		if(y < 30)
		{
			this.startScrollingParentUp();
		}
		else if(y > this.parentNode().getBoundingClientRect().height - 30)
		{
			this.startScrollingParentDown();
		}
		else
		{
			this.stopScrollingParent();
		}
	},

	stopDrag(x, y) {
		this.setState({ dragging: false });
		this.stopScrollingParent();

		if(this.props.onDrop)
		{
			this.props.onDrop({
				dx: x - this.state.ox,
				dy: y - this.state.oy,
			}, { 
				x: this.state.ox,
				y: this.state.oy,
			});
		}
	},


	// Section: Mouse Events

	down(event) 
	{
		if(this.props.handleRef)
		{
			if(event.target != this.refs[this.props.handleRef])
			{
				// a handleRef is set, so only respond to mouse events on our handle
				return;
			}
		}

		if(this.startDrag(event.pageX, event.pageY)) {
			event.stopPropagation();
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
		this.stopDrag(event.pageX, event.pageY);
		$(document).off('mousemove', this.move);
		$(document).off('touchmove', this.move);
		$(document).off('mouseup', this.up);
		$(document).off('touchend', this.up);
	},


	renderPanel(content) {
		// Coordinate these classNames with panel.css/less
		var panelClass = 'panel';

		var style = {};

		if(this.props.dx) 
		{
			style.left = this.props.dx + 'px';
		}

		if(this.props.dy) 
		{
			style.top = this.props.dy + 'px';
		}

		if(this.state.dragging) 
		{
			style.left = this.state.dx + 'px';
			style.top = this.state.dy + 'px';
			style.zIndex = 99999999;
			panelClass += ' panel-dragging';
		}

		if(this.props.neighborDragging)
		{
			panelClass += ' neighbor-dragging';
		}

		if(this.props.fill) 
		{
			style.width = '100%';
			style.height = '100%';
		}

		return (
			<div 
				className={panelClass} 
				style={style} 
				onMouseDown={this.down} 
				onTouchStart={this.down}>
				{content}
			</div>
			);
	},
};

module.exports = Panel;