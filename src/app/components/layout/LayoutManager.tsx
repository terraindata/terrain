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

require('./LayoutManager.less');
import * as React from 'react';
var $ = require('jquery');
var _ = require('underscore');

// Coordinate these classNames with layout_manager.css/less
var lmClass = 'layout-manager';
var colClass = 'layout-manager-column';
var rowClass = 'layout-manager-row';
var cellClass = 'layout-manager-cell';
var fullHeightClass = 'layout-manager-full-height';

interface Style {
	left?: number | string,
	top?: number,
	width?: number | string,
	height?: number,
  display?: string,
  position?: string,
}

var LayoutManager = React.createClass<any, any>({
	propTypes: 
	{
		layout: React.PropTypes.object.isRequired, // TODO move to TS, describe different keys allowed
    moveTo: React.PropTypes.func,
	},

	getInitialState() {
		return {
			shiftedIndices: [],
			shiftedHeight: 0,
			shiftedWidth: 0,
		};
	},

	updateDimensions()
	{
		this.setState({ rand: Math.random() });
	},

	componentDidMount()
	{
    window.addEventListener("resize", this.updateDimensions);
  },

  componentWillUnmount()
  {
    window.removeEventListener("resize", this.updateDimensions);
  },

	sumColsThroughIndex(index)
	{
		var sum = 0;
		if(this.props.layout.rows) {
			sum = this.props.layout.rows.reduce((sum, row, i) => (
				((i < index || index === -1) && (row.rowSpan || 1)) + sum
			), 0);
		} else if(this.props.layout.columns) {
			sum = this.props.layout.columns.reduce((sum, col, i) => (
				col.width !== undefined ? sum : ((i < index || index === -1) && (col.colSpan || 1)) + sum
			), 0);
		}
		return sum;
	},

	computeShiftedIndicesSingleAxis(index, coords)
	{
		var clientRect = this.refs[index].getBoundingClientRect();
		var indicesToShift = [];

		var curY:any = 0; // current Y position to compare, either the top edge (if dragged up) or bottom (if dragged down)
		var curX:any = 0; // current X position to compare, either the left edge (if dragged left) or the right (if dragged right)
		var compareIndices = (refIndex) => false; // is the given neighbor index applicable?
		var getRefMidpointY:any = (refClientRect) => 0; // MidpointY of the neighbor to compare
		var getRefMidpointX:any = (refClientRect) => 0; // MidpointX of the neighbor to compare
		var compareRefMidpointY = (refMidpointY) => false; // given an applicable neighbor's MidpointY, should we shift?
		var compareRefMidpointX = (refMidpointX) => false; // given an applicable neighbor's MidpointX, should we shift?
		var heightAmplifier = 0; // shift our neighbor by heightAmplifier * our height
		var widthAmplifier = 0; // ditto, for width

		if(this.props.layout.rows)
		{
			// dragged up
			if(coords.dy < 0) 
			{
				var curY = clientRect.top + coords.dy;
				var compareIndices = (refIndex) => refIndex < index;
				var getRefMidpointY:any = (refClientRect) => refClientRect.bottom - refClientRect.height / 2;
				var compareRefMidpointY = (refMidpointY) => curY < refMidpointY;
				var heightAmplifier = 1;
				var widthAmplifier = 0;
			}

			// dragged down
			if(coords.dy > 0) 
			{
				var curY = clientRect.bottom + coords.dy;
				var compareIndices = (refIndex) => refIndex > index;
				var getRefMidpointY:any = (refClientRect) => refClientRect.top + refClientRect.height / 2;
				var compareRefMidpointY = (refMidpointY) => curY > refMidpointY;
				var heightAmplifier = -1;
				var widthAmplifier = 0;
			}
		}	

		if(this.props.layout.columns)
		{
			// dragged left
			if(coords.dx < 0) 
			{
				var curX = clientRect.left + coords.dx;
				var compareIndices = (refIndex) => refIndex < index;
				var getRefMidpointX:any = (refClientRect) => refClientRect.right - refClientRect.width / 2;
				var compareRefMidpointX = (refMidpointX) => curX < refMidpointX;
				var heightAmplifier = 0;
				var widthAmplifier = 1;
			}
			// dragged down
			if(coords.dx > 0) 
			{
				var curX = clientRect.right + coords.dx;
				var compareIndices = (refIndex) => refIndex > index;
				var getRefMidpointX:any = (refClientRect) => refClientRect.left + refClientRect.width / 2;
				var compareRefMidpointX = (refMidpointX) => curX > refMidpointX;
				var heightAmplifier = 0;
				var widthAmplifier = -1;
			}	
		}

		$.each(this.refs, (refIndex, refObj) => 
		{
			if(compareIndices(refIndex))
			{
				var refClientRect = refObj.getBoundingClientRect();
				var refMidpointY = getRefMidpointY(refClientRect);
				var refMidpointX = getRefMidpointX(refClientRect);
				if(compareRefMidpointY(refMidpointY) || compareRefMidpointX(refMidpointX))
				{
 					indicesToShift.push(+refIndex);
				}
			}
		});

		return indicesToShift;
	},

	computeShiftedIndicesCells(index, coords, originalCoords)
	{
		// Find which index the mouse is in
		var mx = originalCoords.x + coords.dx;
		var my = originalCoords.y + coords.dy;
		var destinationIndex = -1;

		$.each(this.refs, (refIndex, refObj) =>
		{
			if(refIndex === 'layoutManagerDiv')
			{
				return;
			}

			var cr = refObj.getBoundingClientRect();
			if(mx >= cr.left && mx <= cr.right && my >= cr.top && my <= cr.bottom)
			{
				destinationIndex = parseInt(refIndex, 10);
			}
		});

		if(destinationIndex !== -1)
		{
			if(index < destinationIndex)
			{
				return _.range(index + 1, destinationIndex + 1); // _.range's domain is [first, second)
			}
			return _.range(destinationIndex, index);
		}

		return [];
	},

	computeShiftedIndices(index, coords, originalCoords)
	{
		if(this.props.layout.rows || this.props.layout.columns)
		{
			return this.computeShiftedIndicesSingleAxis(index, coords);
		}
		
		if(this.props.layout.cells)
		{
			return this.computeShiftedIndicesCells(index, coords, originalCoords);
		}

		return [];
	},

	onDragFactory(index)
	{
		return (coords, originalCoords) => 
		{
			this.setState({dragging: true, draggingIndex: index});

			var clientRect = this.refs[index].getBoundingClientRect();
			var indicesToShift = this.computeShiftedIndices(index, coords, originalCoords);

			var heightAmplifier = 0;
			var widthAmplifier = 0;

			// dragged up/down
			if(this.props.layout.rows)
			{
				heightAmplifier = 1;
				if(coords.dy > 0)
					heightAmplifier = -1;
			}

			// dragged left/right
			if(this.props.layout.columns)
			{
				widthAmplifier = 1;
				if(coords.dx > 0)
					widthAmplifier = -1;
			}

			if(this.props.layout.cells)
			{
				// handled in this.renderObj
				widthAmplifier = 1;
				heightAmplifier = 1;
			}

			this.setState({
				shiftedIndices: indicesToShift,
				shiftedHeight: clientRect.height * heightAmplifier,
				shiftedWidth: clientRect.width * widthAmplifier,
			});
		}
	},

	onDropFactory(index)
	{
		return (coords, originalCoords) => 
		{
			this.setState({draggingIndex: -1, dragging: false});

			var shiftedIndices = this.computeShiftedIndices(index, coords, originalCoords);
			
			if(shiftedIndices.length === 0)
				return;

			var fn = Math.max;
				
			if(shiftedIndices.length && shiftedIndices[0] < index)
			{
				fn = Math.min;
			}

			var indexToMoveTo = fn.apply(null, shiftedIndices);

			if(indexToMoveTo !== null && this.props.moveTo)
			{
				this.props.moveTo(index, indexToMoveTo);
			}

			this.setState({
				shiftedIndices: [],
				shiftedHeight: 0,
				shiftedWidth: 0,
			});
		}
	},

	renderObj(obj, className, index, style) 
	{
		if(obj.content)
		{
			// if obj.content is null or undef, then React.cloneElement will error and cause the whole app to break

			var props:any = { 
				onDrag: this.onDragFactory(index),
				onDrop: this.onDropFactory(index),
				parentNode: this.refs.layoutManagerDiv,
			};
      
			if(this.state.dragging && this.state.draggingIndex !== index)
			{
				props.neighborDragging = true;
			}

			if(this.state.shiftedIndices.indexOf(index) !== -1)
			{
				props.dy = this.state.shiftedHeight;
				props.dx = this.state.shiftedWidth;

				if(this.props.layout.cells)
				{
					if(index < this.state.draggingIndex)
					{
						// should shift forward and down
						props.dx = this.state.shiftedWidth;
						props.dy = 0;
						if((index + 1) % this.getNumCellsInRow() === 0)
						{
							props.dx = -1 * this.state.shiftedWidth * (this.getNumCellsInRow() - 1);
							props.dy = this.state.shiftedHeight;
						}
					}

					if(index > this.state.draggingIndex)
					{
						// should shift backward and up
						props.dx = -1 * this.state.shiftedWidth;
						props.dy = 0;
						if(index % this.getNumCellsInRow() === 0)
						{
							props.dx = this.state.shiftedWidth * (this.getNumCellsInRow() - 1);
							props.dy = -1 * this.state.shiftedHeight;
						}
					}
				}
			}

			var content:any = React.cloneElement(obj.content, props);
		}

		// check for a nested layout
		if(obj.columns || obj.rows || obj.cells)
		{
			content = <LayoutManager layout={obj} ref={index} moveTo={obj.moveTo} />
		}
		
		return (
			<div className={className} style={style} key={obj.key !== undefined ? obj.key : index} ref={index}>
				{content}
			</div>);
	},

	renderRow(row, index) 
	{
		var style = {};
		// TODO fix this, it's breaking
    if(this.props.layout.rowHeight === 'fill') 
    {
			var total = this.sumColsThroughIndex(-1), sum = this.sumColsThroughIndex(index);
			style = {
				top: (sum / total) * 100 + '%',
				height: ((row.rowSpan || 1) / total) * 100 + '%',
				position: 'absolute'
			};
		}

		return this.renderObj(row, rowClass, index, style);
	},

	calcColumnLeft(column, index)
	{
		var left = this.props.layout.columns.reduce((sum, col, i) => {
			if(i >= index)
			{
				return sum;
			}

			var widthValues = this.calcColumnWidthValues(col, i);
			return {
				percentage: sum.percentage + widthValues.percentage,
				offset: sum.offset + widthValues.offset + this.paddingForColAtIndex(index),
			};
		}, {
			percentage: 0,
			offset: 0,
		});
		
		return 'calc(' + left.percentage + '% + ' + left.offset + 'px)';
	},

	sumColumnWidthsThroughIndex(index)
	{
		return this.props.layout.columns.reduce((sum, column, i) => (sum + 
			(index === -1 || i <= index ? (column.width || 0) : 0) +
			(this.props.layout.colPadding && i !== 0 ? this.props.layout.colPadding : 0)
		), 0);
	},

	paddingForColAtIndex(index: number): number
	{
		return this.props.layout.colPadding && index !== 0 ? this.props.layout.colPadding : 0;
	},

	calcColumnWidthValues(column, index): {percentage: number, offset: number}
	{
		var colPadding = this.paddingForColAtIndex(index);

		if(column.width !== undefined)
		{
			return {
				percentage: 0,
				offset: column.width, // + colPadding,
			};
		}

		var setWidth = this.sumColumnWidthsThroughIndex(-1);
		var totalCols = this.sumColsThroughIndex(-1);
		var sumCols = this.sumColsThroughIndex(index);
		var percentWidth = (column.colSpan || 1) / totalCols;
		var portionOfSetWidth = percentWidth * setWidth; // - colPadding;
		// console.log(portionOfSetWidth, colPadding);
		// portionOfSetWidth -= colPadding;

		return {
			percentage: percentWidth * 100,
			offset: portionOfSetWidth * -1,
		};
	},

	calcColumnWidth(column, index)
	{
		var widthValues = this.calcColumnWidthValues(column, index);
		var finalWidth = 'calc(' + widthValues.percentage + '% + ' + widthValues.offset + 'px)';

		return finalWidth;
	},

	renderColumn(column, index) 
	{
		var classToPass = colClass;
		var style: Style =
		{
			left: this.calcColumnLeft(column, index),
			width: this.calcColumnWidth(column, index),
		};
    
    if(this.props.layout.compact)
    {
       style =
       {
         display: 'inline-block',
         position: 'relative',
         left: '0px',
         width: 'auto',
       } ;
    }

    if(this.props.layout.stackAt && this.props.layout.stackAt > $(window).width()) {
      classToPass = "";
      style = {};
    }

		return this.renderObj(column, classToPass, index, style);
	},

	getNumCellsInRow()
	{
		var widthObj = this.props.layout.cellWidth;
		if(typeof widthObj !== 'object')
			return 1;

		// parse the object
		var docWidth = $(window).width(), curMax = -1;
		$.each(widthObj, function(key, val) {
			var curWidth = parseInt(key, 10);
			// find the largest key smaller than docWidth
			if(docWidth > curWidth && curWidth > curMax)
				curMax = key;
		});
		return widthObj[curMax];
	},

	getCellWidth()
	{
		var width = this.props.layout.cellWidth;
		
		if(typeof width === 'object') {
			width = (100 / this.getNumCellsInRow()) + '%';
		}

		return width;
	},

	getCellHeight()
	{
		return this.props.layout.cellHeight;
	},

	renderCell(cell, index) 
	{
		// todo consider moving this to somehwere not in a loop
		var height = this.getCellHeight();
		if(typeof height !== 'string')
			height += 'px'; // necessary?

		var width = this.getCellWidth();

		var style = {
			height: height,
			width: width
		}

		return this.renderObj(cell, cellClass, index, style);
	},

	render() 
	{
		var layoutSum = (this.props.layout.rows ? 1 : 0) + (this.props.layout.columns ? 1 : 0) + (this.props.layout.cells ? 1 : 0);
		if(layoutSum !== 1) {
			// TODO write test for this
			return (
				<div className='error'>
					Error: Must pass one and only one of [cells, rows, columns] to the same level of a LayoutManager. Passed <b>{layoutSum}</b>.
					<pre>{JSON.stringify(this.props.layout)}</pre>
				</div>
				);
		}

		var lmClasses = [lmClass];
		if(this.props.layout.fullHeight)
		{
			lmClasses.unshift(fullHeightClass);
		}
		var lmClassString = lmClasses.join(" ");

		return (
			<div className={lmClassString} ref='layoutManagerDiv'>
				{ this.props.layout.columns && this.props.layout.columns.map(this.renderColumn) }
				{ this.props.layout.rows && this.props.layout.rows.map(this.renderRow) }
				{ this.props.layout.cells && this.props.layout.cells.map(this.renderCell) }
			</div>
			);
	},
});

export default LayoutManager;