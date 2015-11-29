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
var Util = require('../../util/Util.js');
var $ = require('jquery');

var Panel = {
	propTypes: 
	{
		drag_x: React.PropTypes.bool,
		drag_y: React.PropTypes.bool,
		drag_xy: React.PropTypes.bool,
		onDrop: React.PropTypes.func,
		fill: React.PropTypes.bool,
		reorderOnDrag: React.PropTypes.bool,
		neighborDragging: React.PropTypes.bool,
		handleRef: React.PropTypes.string,
	},

	getInitialState() {
		return {
			dragging: false,
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
			});
			return true;
		}
		return false;
	},

	dragTo(x, y) 
	{
		var draggedTo = { x: 0, y: 0 };

		if(this.canDrag('x')) 
		{
			this.setState({
				dx: x - this.state.ox
			});
			draggedTo.dx = this.state.dx;
		}

		if(this.canDrag('y')) 
		{
			this.setState({
				dy: y - this.state.oy
			});
			draggedTo.dy = this.state.dy;
		}

		if(this.props.onDrag) 
		{
			this.props.onDrag(draggedTo, { 
				x: this.state.ox,
				y: this.state.oy,
			});
		}
	},

	stopDrag(x, y) {
		this.setState({ dragging: false });

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
		console.log(event);
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
	},

	move(event) 
	{
		this.dragTo(event.pageX, event.pageY);
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