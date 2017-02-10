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

// somebody please rescue this or kill this

require('./LayoutManager.less');
const Dimensions = require('react-dimensions');
import * as React from 'react';
var shallowCompare = require('react-addons-shallow-compare');
var $ = require('jquery');
var _ = require('underscore');

// Coordinate these classNames with layout_manager.css/less
var lmClass = 'layout-manager';
var colClass = 'layout-manager-column';
var rowClass = 'layout-manager-row';
var cellClass = 'layout-manager-cell';
var fullHeightClass = 'layout-manager-full-height';
var CARD_TOP_THRESHOLD = 15;

// var LT = 0;
// var WT = 0;
// var ST = 0;

interface Adjustment
{
  x: number;
  y: number;
}

var LayoutManager = React.createClass<any, any>({
	propTypes: 
	{
		layout: React.PropTypes.object.isRequired, // TODO move to TS, describe different keys allowed
    moveTo: React.PropTypes.func,
    containerWidth: React.PropTypes.number.isRequired,
    containerHeight: React.PropTypes.number.isRequired,
	},
  
  shouldComponentUpdate(nextProps, nextState)
  {
    return !_.isEqual(this.props.layout, nextProps.layout)
      || !_.isEqual(this.state, nextState)
      || this.state.sizeAdjustments !== nextState.sizeAdjustments;
  },

	getInitialState()
  {
		return {
			shiftedIndices: [],
			shiftedHeight: 0,
			shiftedWidth: 0,
      sizeAdjustments: this.getAdjustments(this.props.layout.initialColSizes, this.props.containerWidth),
		};
	},
  
  componentWillMount()
  {
    // this.onPanelDrag = _.throttle(this.onPanelDrag, 500);
  },
  
  getAdjustments(adjustments, containerWidth: number)
  {
    if(adjustments)
    {
      // check to make sure that none of the col sizes are too big for us
      let {columns, minColWidth} = this.props.layout;
      if(columns && minColWidth)
      {
        let numColumns = columns.length;
        
        // Code that could potentially help but doesn't fully work
        //  because after one pass a column at the end can take width from
        //  one before it 
        
        let colWidth = containerWidth / numColumns;
        let adjustmentsChanged = false;
        let newAdjustments = JSON.parse(JSON.stringify(adjustments));
        _.map(newAdjustments, (adjustment, index) =>
        {
          let column = columns[index];
          if(column)
          {
            let {minWidth} = column;
            let colSize = colWidth + adjustment.x;
            if(colSize < minWidth)
            {
              adjustmentsChanged = true;
              let difference = minWidth - colSize;
              
              // get magnitude of all adjustments
              let totalAdjustment = _.reduce(newAdjustments, 
                (sum, adjustment) => 
                {
                  return sum + Math.max(adjustment.x, 0);
                }
                , 0);
              
              if(difference >= totalAdjustment)
              {
                // not enough space in the window, reset all
                _.map(newAdjustments, adjustment => adjustment.x = 0);
              }
              else 
              {
                adjustment.x += difference;
                // ratio by which to reduce adjustments
                let ratio = (totalAdjustment - difference) / totalAdjustment;
                _.map(newAdjustments, 
                  adjustment => adjustment.x > 0 && (adjustment.x *= ratio)
                );
              }
            }
          }
        });
        
        if(adjustmentsChanged)
        {
          return newAdjustments;
        }
      }
    }
    
    return adjustments || [];
  },

	updateDimensions()
	{
		// this.setState({ rand: Math.random() });
	},

	componentDidMount()
	{
    window.addEventListener("resize", this.updateDimensions);
    // this.setState({
    //   // triggers a re-render, this time with the window widths available,
    //   // so that cells etc. can render with the correct width
    //   mounted: true,
    // });
  },

  componentWillUnmount()
  {
    window.removeEventListener("resize", this.updateDimensions);
  },
  
  componentWillReceiveProps(newProps)
  {
    let {sizeAdjustments} = this.state;
    let sizeAdjustmentsChanged = false;
    let windowResized = false;
    
    if(newProps.layout.columns && this.props.layout.columns)
    {
      // if using hidden:
      // var hfn = (sum, col) => sum + (col.hidden ? 1 : 0)
      if(newProps.layout.columns.length !== this.props.layout.columns.length)
      {
        // number of columns has changed, reset offsets
        sizeAdjustments = JSON.parse(JSON.stringify(this.state.sizeAdjustments));
        for(var index in sizeAdjustments)
        {
          sizeAdjustments[index] = {x: 0, y: 0};
        }
        sizeAdjustmentsChanged = true;
      }
    }
    
    if(newProps.containerWidth !== this.props.containerWidth)
    {
      sizeAdjustments = this.getAdjustments(sizeAdjustments, newProps.containerWidth);
      sizeAdjustmentsChanged = true;
      windowResized = true;
    }
    
    if(sizeAdjustmentsChanged)
    {
      this.setState({
        sizeAdjustments,
        windowResized,
      });
      
      this.props.layout.onColSizeChange &&
        this.props.layout.onColSizeChange(sizeAdjustments);
    }
  },

	sumColsThroughIndex(index)
	{
		var sum = 0;
		if(this.props.layout.rows) {
			sum = this.props.layout.rows.reduce((sum, row, i) => (
				((i < index || index === -1) && (row.rowSpan || 1) && (!row.hidden)) + sum
			), 0);
		} else if(this.props.layout.columns) {
			sum = this.props.layout.columns.reduce((sum, col, i) => (
				col.width !== undefined || col.hidden ? sum : ((i < index || index === -1) && (col.colSpan || 1)) + sum
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

	onPanelDrag(index, coords, originalCoords)
	{
    this.setState({
      dragging: true,
      draggingIndex: index
    });

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
    
    var lcr = this.refs.layoutManagerDiv.getBoundingClientRect();
    var y = coords.y;
    if(coords.y >= lcr.top && coords.y <= lcr.bottom)
    {
      var draggingInside = true;
    }

		this.setState({
			shiftedIndices: indicesToShift,
			shiftedHeight: clientRect.height * heightAmplifier,
			shiftedWidth: clientRect.width * widthAmplifier,
      draggingInside: !! draggingInside,
      draggingOutside: ! draggingInside,
		});
	},
  
  panelIsOutside(coords, originalCoords)
  {
    var cr = this.refs.layoutManagerDiv.getBoundingClientRect();
    var y = coords.dy + originalCoords.y;
    var x = coords.dx + originalCoords.x;
    if(y < cr.top || y > cr.bottom || x < cr.left || x > cr.right)
    {
      // TOOD may want to adapt boundaries above
      return true;
    }
    
    return false;
  },
  
  getKeyForIndex(index)
  {
    var arr = this.props.layout.rows || this.props.layout.columns || this.props.layout.cells;
    return arr[index].key;
  },

  onPanelDrop(index, coords, originalCoords)
  {
    this.setState({
      draggingIndex: -1,
      dragging: false
    });
    
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
      
      if(this.state.sizeAdjustments)
      {
        let adjustments = JSON.parse(JSON.stringify(this.state.sizeAdjustments));
        // TODO not right
        let a = adjustments[index];
        adjustments.splice(index, 1);
        adjustments.splice(indexToMoveTo, 0, a);
        this.setState({
          sizeAdjustments: adjustments,
        });
        
        this.props.layout.onColSizeChange &&
          this.props.layout.onColSizeChange(this.state.sizeAdjustments);
      }
		}

		this.setState({
			shiftedIndices: [],
			shiftedHeight: 0,
			shiftedWidth: 0,
      draggingInside: 0,
      draggingOutside: 0,
		});
	},
  
  onResize(index, event)
  {
    var prevIndex = index - 1;
    
    var startX = event.pageX;
    var startSAX = this.state.sizeAdjustments[index].x;
    var startPrevSAX = this.state.sizeAdjustments[prevIndex].x;
    this.setState({
      resizingIndex: index,
    });
    
    var arr = this.props.layout.rows || this.props.layout.columns || this.props.layout.cells;
    var minWidth = arr[index].minWidth || 0;
    var startWidth = this.refs[index].getBoundingClientRect().width;
    
    var minPrevWidth = arr[index - 1] ? arr[index - 1].minWidth || 0 : 0;
    var startPrevWidth = arr[index - 1] ? this.refs[index - 1].getBoundingClientRect().width : null;
    $('body').addClass('resizing');
    var target = event.target;
    $(target).addClass('active');
    
    var move = function(event)
    {
      var diffX = startX - event.pageX;
      var newWidth = startWidth + diffX;
      if(newWidth < minWidth)
      {
        diffX += minWidth - newWidth;
      }
      
      var newPrevWidth = startPrevWidth - diffX;
      if(minPrevWidth !== null && newPrevWidth < minPrevWidth)
      {
        diffX -= minPrevWidth - newPrevWidth;
      }
      
      var sa = JSON.parse(JSON.stringify(this.state.sizeAdjustments));
      sa[index].x = startSAX + diffX;
      sa[prevIndex].x = startPrevSAX - diffX;
      
      this.setState({
        sizeAdjustments: sa,
      });
    }.bind(this);
    
    var endMove = () => 
    {
      this.setState({
        resizingIndex: null,
      });
      $('body').removeClass('resizing');
      $(target).removeClass('active');
      $(document).off('mousemove', move);
      $(document).off('touchmove', move);
      $(document).off('mouseup', endMove);
      $(document).off('touchend', endMove);  
      
      this.props.layout.onColSizeChange &&
        this.props.layout.onColSizeChange(this.state.sizeAdjustments);
    }
    
    $(document).on('mousemove', move);
    $(document).on('touchmove', move);
    $(document).on('mouseup', endMove);
    $(document).on('touchend', endMove);
  },

	renderObj(obj, className, index, style) 
	{
    if(!this.state.sizeAdjustments[index])
    {
      this.state.sizeAdjustments[index] = {x: 0, y: 0};
    }
    
		if(obj.content)
		{
			// if obj.content is null or undef, then React.cloneElement will error and cause the whole app to break
      let props: any;
      if(obj.noProps)
      {
        props = {}
      }
      else
      {
        props = { 
          index: index,
          onPanelDrag: this.onPanelDrag,
          onPanelDrop: this.onPanelDrop,
          dy: 0,
          dx: 0,
        };

        if(this.state.dragging && this.state.draggingIndex !== index)
        {
          props.neighborDragging = true;
        }

        if(this.state.shiftedIndices.indexOf(index) !== -1 && !this.props.layout.useDropZones)
        {
          props.dy = this.state.shiftedHeight;
          props.dx = this.state.shiftedWidth;

          if(this.props.layout.cells)
          {
            var numCells = this.getNumCellsInRow();
            if(index < this.state.draggingIndex)
            {
              // should shift forward and down
              props.dx = this.state.shiftedWidth;
              props.dy = 0;
              if((index + 1) % numCells === 0)
              {
                props.dx = -1 * this.state.shiftedWidth * (numCells - 1);
                props.dy = this.state.shiftedHeight;
              }
            }

            if(index > this.state.draggingIndex)
            {
              // should shift backward and up
              props.dx = -1 * this.state.shiftedWidth;
              props.dy = 0;
              if(index % numCells === 0)
              {
                props.dx = this.state.shiftedWidth * (numCells - 1);
                props.dy = -1 * this.state.shiftedHeight;
              }
            }
          }
        }
        
        if(obj.resizeable)
        {
          props.mouseDownRef = obj.resizeHandleRef;
          props.onMouseDown = this.onResize;
        }
      }


			var content:any = React.cloneElement(obj.content, props);
		}

		// check for a nested layout
		if(obj.columns || obj.rows || obj.cells)
		{
			content = <LayoutManager layout={obj} ref={index} moveTo={obj.moveTo} />
		}
    
    className += this.state.resizingIndex ? ' no-transition' : '';
		return (
			<div className={className} style={style} key={obj.key !== undefined ? obj.key : index} ref={index}>
				{content}
			</div>);
	},

	renderRow(row, index) 
	{
		var style: React.CSSProperties = {};
		return this.renderObj(row, rowClass, index, style);
	},

	calcColumnLeft(column, index)
	{
    // var t = (new Date()).getTime();
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
		return this.props.layout.columns.reduce((sum, column, i) =>
    {
      if(column.hidden)
      {
        return sum;
      }
      
      sum += (index === -1 || i <= index ? (column.width || 0) : 0);
  	  sum += (this.props.layout.colPadding && i !== 0 ? this.props.layout.colPadding : 0);
		
      return sum;
    }, 0);
	},

	paddingForColAtIndex(index: number): number
	{
		return this.props.layout.colPadding && index !== 0 ? this.props.layout.colPadding : 0;
	},

	calcColumnWidthValues(column, index): {percentage: number, offset: number}
	{
    if(this.props.layout.columns[index].hidden)
    {
      return {
        percentage: 0,
        offset: 0,
      };
    }
    
		var colPadding = this.paddingForColAtIndex(index);
    var widthAdjustment = 0;
    var values;
    
    if(this.state.sizeAdjustments[index])
    {
      widthAdjustment += this.state.sizeAdjustments[index].x;
    }

    if(column.width !== undefined)
    {
      values = {
        percentage: 0,
        offset: column.width + widthAdjustment, // + colPadding,
      };
    }
    else
    {
      var setWidth = this.sumColumnWidthsThroughIndex(-1);
      var totalCols = this.sumColsThroughIndex(-1);
      var sumCols = this.sumColsThroughIndex(index);
      var percentWidth = (column.colSpan || 1) / totalCols;
      var portionOfSetWidth = percentWidth * setWidth;

    	values = {
    		percentage: percentWidth * 100,
    		offset: portionOfSetWidth * -1 + widthAdjustment,
    	};
    }
    
    return values;
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
    
    if(this.props.layout.compact)
    {
       var style: React.CSSProperties =
       {
         display: 'inline-block',
         position: 'relative',
         left: '0px',
         width: 'auto',
       } ;
    }
    else
    {
      var style: React.CSSProperties =
      {
        left: this.calcColumnLeft(column, index),
        width: this.calcColumnWidth(column, index),
      };
    }
    
		return this.renderObj(column, classToPass, index, style);
	},

	renderCell(cell, index) 
	{
		// todo consider moving this to somehwere not in a loop
		var height = this.props.layout.cellHeight;
		if(typeof height !== 'string')
			height += 'px'; // necessary?

		var style = {
			height: height,
			minWidth: this.props.layout.minCellWidth,
		}

		return this.renderObj(cell, cellClass, index, style);
	},
  
  renderBlankCell(cell, index)
  {
    return <div
      style={{minWidth: this.props.layout.minCellWidth}}
      key={'blank-' + index}
      className={cellClass}
    />;
  },
  
  getNumCellsInRow()
  {
    // TODO change how cell drag and drop works, and remove this crap
    var count = 1;
    var children = this.refs['layoutManagerDiv'].children;
    if(children[0])
    {
      var y = children[0].getBoundingClientRect().top;
      while(children[count] && children[count].getBoundingClientRect().top === y)
      {
        count ++;
      }
      return count;
    }
    
    return 1;
  },
  
  componentDidUpdate()
  {
    if(this.state.windowResized)
    {
      this.setState({
        windowResized: false,
      });
    }
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
    if(this.state.windowResized)
    {
      lmClasses.unshift('lm-window-resized');
    }
		var lmClassString = lmClasses.join(" ");

    return (
      <div className={lmClassString} ref='layoutManagerDiv'>
        { this.props.layout.columns && this.props.layout.columns.map(this.renderColumn) }
        { this.props.layout.rows && this.props.layout.rows.map(this.renderRow) }
        { this.props.layout.cells && this.props.layout.cells.map(this.renderCell) }
        { this.props.layout.cells && this.props.layout.cells.map(this.renderBlankCell) }
			</div>
			);
	},
});

export default Dimensions({ onResize: true })(LayoutManager);