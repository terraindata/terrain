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

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-var-requires no-unused-expression forin no-shadowed-variable

// somebody please rescue this or kill this

// tslint:disable:no-invalid-this

import './LayoutManager.less';
const Dimensions = require('react-dimensions');
import createReactClass = require('create-react-class');
import * as PropTypes from 'prop-types';
import * as React from 'react';
const shallowCompare = require('react-addons-shallow-compare');
const $ = require('jquery');
import * as _ from 'lodash';

// Coordinate these classNames with layout_manager.css/less
const lmClass = 'layout-manager';
const colClass = 'layout-manager-column';
const rowClass = 'layout-manager-row';
const cellClass = 'layout-manager-cell';
const fullHeightClass = 'layout-manager-full-height';
const CARD_TOP_THRESHOLD = 15;

// var LT = 0;
// var WT = 0;
// var ST = 0;

interface Adjustment
{
  x: number;
  y: number;
}

const LayoutManager = createReactClass<any, any>({
  propTypes:
    {
      layout: PropTypes.object.isRequired, // TODO move to TS, describe different keys allowed
      moveTo: PropTypes.func,
      containerWidth: PropTypes.number.isRequired,
      containerHeight: PropTypes.number.isRequired,
    },

  shouldComponentUpdate(nextProps, nextState)
  {
    for (const k in this.props.layout)
    {
      if (this.props.layout[k] !== nextProps.layout[k])
      {
        return true;
      }
    }
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

  getAdjustments(adjustments: Adjustment[], containerWidth: number)
  {
    if (adjustments)
    {
      // check to make sure that none of the col sizes are too big for us
      const { columns, minColWidth } = this.props.layout;
      if (columns && minColWidth)
      {
        const numColumns = columns.length;

        // Code that could potentially help but doesn't fully work
        //  because after one pass a column at the end can take width from
        //  one before it

        const colWidth = containerWidth / numColumns;
        let adjustmentsChanged = false;
        const newAdjustments = JSON.parse(JSON.stringify(adjustments));
        _.map(newAdjustments, (adjustment: Adjustment, index: number) =>
        {
          const column = columns[index];
          if (column)
          {
            const { minWidth } = column;
            const colSize = colWidth + adjustment.x;
            if (colSize < minWidth)
            {
              adjustmentsChanged = true;
              const difference = minWidth - colSize;

              // get magnitude of all adjustments
              const totalAdjustment = _.reduce(newAdjustments,
                (sum: number, adjustment: Adjustment) =>
                {
                  return sum + Math.max(adjustment.x, 0);
                }
                , 0);

              if (difference >= totalAdjustment)
              {
                // not enough space in the window, reset all
                _.map(newAdjustments, (adjustment: Adjustment) => adjustment.x = 0);
              }
              else
              {
                adjustment.x += difference;
                // ratio by which to reduce adjustments
                const ratio = (totalAdjustment - difference) / totalAdjustment;
                _.map(newAdjustments,
                  (adjustment: Adjustment) => adjustment.x > 0 && (adjustment.x *= ratio),
                );
              }
            }
          }
        });

        if (adjustmentsChanged)
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
    window.addEventListener('resize', this.updateDimensions);
    // this.setState({
    //   // triggers a re-render, this time with the window widths available,
    //   // so that cells etc. can render with the correct width
    //   mounted: true,
    // });
  },

  componentWillUnmount()
  {
    window.removeEventListener('resize', this.updateDimensions);
  },

  componentWillReceiveProps(newProps)
  {
    let { sizeAdjustments } = this.state;
    let sizeAdjustmentsChanged = false;
    let windowResized = false;

    if (newProps.layout.columns && this.props.layout.columns)
    {
      // if using hidden:
      // var hfn = (sum, col) => sum + (col.hidden ? 1 : 0)
      if (newProps.layout.columns.length !== this.props.layout.columns.length)
      {
        // number of columns has changed, reset offsets
        sizeAdjustments = JSON.parse(JSON.stringify(this.state.sizeAdjustments));
        for (const index in sizeAdjustments)
        {
          sizeAdjustments[index] = { x: 0, y: 0 };
        }
        sizeAdjustmentsChanged = true;
      }
    }

    if (newProps.containerWidth !== this.props.containerWidth)
    {
      sizeAdjustments = this.getAdjustments(sizeAdjustments, newProps.containerWidth);
      sizeAdjustmentsChanged = true;
      windowResized = true;
    }

    if (sizeAdjustmentsChanged)
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
    let sum = 0;
    if (this.props.layout.rows)
    {
      sum = this.props.layout.rows.reduce((sum, row, i) => (
        ((i < index || index === -1) && (row.rowSpan || 1) && (!row.hidden)) + sum
      ), 0);
    } else if (this.props.layout.columns)
    {
      sum = this.props.layout.columns.reduce((sum, col, i) => (
        col.width !== undefined || col.hidden ? sum : ((i < index || index === -1) && (col.colSpan || 1)) + sum
      ), 0);
    }
    return sum;
  },

  lessThanComp: (refIndex: number, index: number) => refIndex < index,
  greaterThanComp: (refIndex: number, index: number) => refIndex > index,
  noComp: (refIndex: number, index: number) => false,

  computeShiftedIndicesSingleAxis(index, coords)
  {
    const clientRect = this.refs[index].getBoundingClientRect();
    const indicesToShift = [];

    let curY: any = 0; // current Y position to compare, either the top edge (if dragged up) or bottom (if dragged down)
    let curX: any = 0; // current X position to compare, either the left edge (if dragged left) or the right (if dragged right)
    let compareIndices = this.noComp; // is the given neighbor index applicable?
    let getRefMidpointY = (refClientRect) => 0; // MidpointY of the neighbor to compare
    let getRefMidpointX = (refClientRect) => 0; // MidpointX of the neighbor to compare
    let compareRefMidpointY = (refMidpointY) => false; // given an applicable neighbor's MidpointY, should we shift?
    let compareRefMidpointX = (refMidpointX) => false; // given an applicable neighbor's MidpointX, should we shift?
    let heightAmplifier = 0; // shift our neighbor by heightAmplifier * our height
    let widthAmplifier = 0; // ditto, for width

    if (this.props.layout.rows)
    {
      // dragged up
      if (coords.dy < 0)
      {
        curY = clientRect.top + coords.dy;
        compareIndices = this.lessThanComp;
        getRefMidpointY = (refClientRect) => refClientRect.bottom - refClientRect.height / 2;
        compareRefMidpointY = (refMidpointY) => curY < refMidpointY;
        heightAmplifier = 1;
        widthAmplifier = 0;
      }

      // dragged down
      if (coords.dy > 0)
      {
        curY = clientRect.bottom + coords.dy;
        compareIndices = this.greaterThanComp;
        getRefMidpointY = (refClientRect) => refClientRect.top + refClientRect.height / 2;
        compareRefMidpointY = (refMidpointY) => curY > refMidpointY;
        heightAmplifier = -1;
        widthAmplifier = 0;
      }
    }

    if (this.props.layout.columns)
    {
      // dragged left
      if (coords.dx < 0)
      {
        curX = clientRect.left + coords.dx;
        compareIndices = this.lessThanComp;
        getRefMidpointX = (refClientRect) => refClientRect.right - refClientRect.width / 2;
        compareRefMidpointX = (refMidpointX) => curX < refMidpointX;
        heightAmplifier = 0;
        widthAmplifier = 1;
      }
      // dragged down
      if (coords.dx > 0)
      {
        curX = clientRect.right + coords.dx;
        compareIndices = this.greaterThanComp;
        getRefMidpointX = (refClientRect) => refClientRect.left + refClientRect.width / 2;
        compareRefMidpointX = (refMidpointX) => curX > refMidpointX;
        heightAmplifier = 0;
        widthAmplifier = -1;
      }
    }

    $.each(this.refs, (refIndex, refObj) =>
    {
      if (compareIndices(+refIndex, +index))
      {
        const refClientRect = refObj.getBoundingClientRect();
        const refMidpointY = getRefMidpointY(refClientRect);
        const refMidpointX = getRefMidpointX(refClientRect);
        if (compareRefMidpointY(refMidpointY) || compareRefMidpointX(refMidpointX))
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
    const mx = originalCoords.x + coords.dx;
    const my = originalCoords.y + coords.dy;
    let destinationIndex = -1;

    $.each(this.refs, (refIndex, refObj) =>
    {
      if (refIndex === 'layoutManagerDiv')
      {
        return;
      }

      const cr = refObj.getBoundingClientRect();
      if (mx >= cr.left && mx <= cr.right && my >= cr.top && my <= cr.bottom)
      {
        destinationIndex = parseInt(refIndex, 10);
      }
    });

    if (destinationIndex !== -1)
    {
      if (index < destinationIndex)
      {
        return _.range(index + 1, destinationIndex + 1); // _.range's domain is [first, second)
      }
      return _.range(destinationIndex, index);
    }

    return [];
  },

  computeShiftedIndices(index, coords, originalCoords)
  {
    if (this.props.layout.rows || this.props.layout.columns)
    {
      return this.computeShiftedIndicesSingleAxis(index, coords);
    }

    if (this.props.layout.cells)
    {
      return this.computeShiftedIndicesCells(index, coords, originalCoords);
    }

    return [];
  },

  onPanelDrag(index, coords, originalCoords)
  {
    this.setState({
      dragging: true,
      draggingIndex: index,
    });

    const clientRect = this.refs[index].getBoundingClientRect();
    const indicesToShift = this.computeShiftedIndices(index, coords, originalCoords);

    let heightAmplifier = 0;
    let widthAmplifier = 0;

    // dragged up/down
    if (this.props.layout.rows)
    {
      heightAmplifier = 1;
      if (coords.dy > 0)
      {
        heightAmplifier = -1;
      }
    }

    // dragged left/right
    if (this.props.layout.columns)
    {
      widthAmplifier = 1;
      if (coords.dx > 0)
      {
        widthAmplifier = -1;
      }
    }

    if (this.props.layout.cells)
    {
      // handled in this.renderObj
      widthAmplifier = 1;
      heightAmplifier = 1;
    }

    const lcr = this.refs.layoutManagerDiv.getBoundingClientRect();
    const y = coords.y;
    let draggingInside: boolean;

    if (coords.y >= lcr.top && coords.y <= lcr.bottom)
    {
      draggingInside = true;
    }

    this.setState({
      shiftedIndices: indicesToShift,
      shiftedHeight: clientRect.height * heightAmplifier,
      shiftedWidth: clientRect.width * widthAmplifier,
      draggingInside: !!draggingInside,
      draggingOutside: !draggingInside,
    });
  },

  panelIsOutside(coords, originalCoords)
  {
    const cr = this.refs.layoutManagerDiv.getBoundingClientRect();
    const y = coords.dy + originalCoords.y;
    const x = coords.dx + originalCoords.x;
    if (y < cr.top || y > cr.bottom || x < cr.left || x > cr.right)
    {
      // TOOD may want to adapt boundaries above
      return true;
    }

    return false;
  },

  getKeyForIndex(index)
  {
    const arr = this.props.layout.rows || this.props.layout.columns || this.props.layout.cells;
    return arr[index].key;
  },

  onPanelDrop(index, coords, originalCoords)
  {
    this.setState({
      draggingIndex: -1,
      dragging: false,
    });

    const shiftedIndices = this.computeShiftedIndices(index, coords, originalCoords);

    if (shiftedIndices.length === 0)
    {
      return;
    }

    let fn = Math.max;

    if (shiftedIndices.length && shiftedIndices[0] < index)
    {
      fn = Math.min;
    }

    const indexToMoveTo = fn.apply(null, shiftedIndices);

    if (indexToMoveTo !== null && this.props.moveTo)
    {
      this.props.moveTo(index, indexToMoveTo);

      if (this.state.sizeAdjustments)
      {
        const adjustments = JSON.parse(JSON.stringify(this.state.sizeAdjustments));
        // TODO not right
        const a = adjustments[index];
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
    const prevIndex = index - 1;

    const startX = event.pageX;
    const startSAX = this.state.sizeAdjustments[index].x;
    const startPrevSAX = this.state.sizeAdjustments[prevIndex].x;
    this.setState({
      resizingIndex: index,
    });

    const arr = this.props.layout.rows || this.props.layout.columns || this.props.layout.cells;
    const minWidth = arr[index].minWidth || 0;
    const startWidth = this.refs[index].getBoundingClientRect().width;

    const minPrevWidth = arr[index - 1] ? arr[index - 1].minWidth || 0 : 0;
    const startPrevWidth = arr[index - 1] ? this.refs[index - 1].getBoundingClientRect().width : null;
    $('body').addClass('resizing');
    const target = event.target;
    $(target).addClass('active');

    const move = function(event)
    {
      let diffX = startX - event.pageX;
      const newWidth = startWidth + diffX;
      if (newWidth < minWidth)
      {
        diffX += minWidth - newWidth;
      }

      const newPrevWidth = startPrevWidth - diffX;
      if (minPrevWidth !== null && newPrevWidth < minPrevWidth)
      {
        diffX -= minPrevWidth - newPrevWidth;
      }

      const sa = JSON.parse(JSON.stringify(this.state.sizeAdjustments));
      sa[index].x = startSAX + diffX;
      sa[prevIndex].x = startPrevSAX - diffX;

      this.setState({
        sizeAdjustments: sa,
      });
    }.bind(this);

    const endMove = () =>
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
    };

    $(document).on('mousemove', move);
    $(document).on('touchmove', move);
    $(document).on('mouseup', endMove);
    $(document).on('touchend', endMove);
  },

  renderObj(obj, className, index, style)
  {
    if (!this.state.sizeAdjustments[index])
    {
      this.state.sizeAdjustments[index] = { x: 0, y: 0 };
    }

    let content: any;

    if (obj.content)
    {
      // if obj.content is null or undef, then React.cloneElement will error and cause the whole app to break
      let props: any;
      if (obj.noProps)
      {
        props = {};
      }
      else
      {
        props = {
          index,
          onPanelDrag: this.onPanelDrag,
          onPanelDrop: this.onPanelDrop,
          dy: 0,
          dx: 0,
        };

        if (this.state.dragging && this.state.draggingIndex !== index)
        {
          props.neighborDragging = true;
        }

        if (this.state.shiftedIndices.indexOf(index) !== -1 && !this.props.layout.useDropZones)
        {
          props.dy = this.state.shiftedHeight;
          props.dx = this.state.shiftedWidth;

          if (this.props.layout.cells)
          {
            const numCells = this.getNumCellsInRow();
            if (index < this.state.draggingIndex)
            {
              // should shift forward and down
              props.dx = this.state.shiftedWidth;
              props.dy = 0;
              if ((index + 1) % numCells === 0)
              {
                props.dx = -1 * this.state.shiftedWidth * (numCells - 1);
                props.dy = this.state.shiftedHeight;
              }
            }

            if (index > this.state.draggingIndex)
            {
              // should shift backward and up
              props.dx = -1 * this.state.shiftedWidth;
              props.dy = 0;
              if (index % numCells === 0)
              {
                props.dx = this.state.shiftedWidth * (numCells - 1);
                props.dy = -1 * this.state.shiftedHeight;
              }
            }
          }
        }

        if (obj.resizeable)
        {
          props.mouseDownRef = obj.resizeHandleRef;
          props.onMouseDown = this.onResize;
        }
      }

      content = React.cloneElement(obj.content, props);
    }

    // check for a nested layout
    if (obj.columns || obj.rows || obj.cells)
    {
      content = <LayoutManager layout={obj} ref={index} moveTo={obj.moveTo} />;
    }

    className += this.state.resizingIndex ? ' no-transition' : '';
    return (
      <div className={className} style={style} key={obj.key !== undefined ? obj.key : index} ref={index}>
        {
          content
        }
      </div>);
  },

  renderRow(row, index)
  {
    const style: React.CSSProperties = {};
    return this.renderObj(row, rowClass, index, style);
  },

  calcColumnLeft(column, index)
  {
    // var t = (new Date()).getTime();
    const left = this.props.layout.columns.reduce((sum, col, i) =>
    {
      if (i >= index)
      {
        return sum;
      }

      const widthValues = this.calcColumnWidthValues(col, i);
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
      if (column.hidden)
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

  calcColumnWidthValues(column, index): { percentage: number, offset: number }
  {
    if (this.props.layout.columns[index].hidden)
    {
      return {
        percentage: 0,
        offset: 0,
      };
    }

    const colPadding = this.paddingForColAtIndex(index);
    let widthAdjustment = 0;
    let values;

    if (this.state.sizeAdjustments[index])
    {
      widthAdjustment += this.state.sizeAdjustments[index].x;
    }

    if (column.width !== undefined)
    {
      values = {
        percentage: 0,
        offset: column.width + widthAdjustment, // + colPadding,
      };
    }
    else
    {
      const setWidth = this.sumColumnWidthsThroughIndex(-1);
      const totalCols = this.sumColsThroughIndex(-1);
      const sumCols = this.sumColsThroughIndex(index);
      const percentWidth = (column.colSpan || 1) / totalCols;
      const portionOfSetWidth = percentWidth * setWidth;

      values = {
        percentage: percentWidth * 100,
        offset: portionOfSetWidth * -1 + widthAdjustment,
      };
    }

    return values;
  },

  calcColumnWidth(column, index)
  {
    const widthValues = this.calcColumnWidthValues(column, index);
    const finalWidth = 'calc(' + widthValues.percentage + '% + ' + widthValues.offset + 'px)';
    return finalWidth;
  },

  renderColumn(column, index)
  {
    const classToPass = colClass;
    let style: React.CSSProperties;

    if (this.props.layout.compact)
    {
      style =
        {
          display: 'inline-block',
          position: 'relative',
          left: '0px',
          width: 'auto',
        };
    }
    else
    {
      style =
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
    let height = this.props.layout.cellHeight;
    if (typeof height !== 'string')
    {
      height += 'px'; // necessary?
    }

    const style = {
      height,
      minWidth: this.props.layout.minCellWidth,
    };

    return this.renderObj(cell, cellClass, index, style);
  },

  renderBlankCell(cell, index)
  {
    return <div
      style={{ minWidth: this.props.layout.minCellWidth }}
      key={'blank-' + index}
      className={cellClass}
    />;
  },

  getNumCellsInRow()
  {
    // TODO change how cell drag and drop works, and remove this crap
    let count = 1;
    const children = this.refs['layoutManagerDiv'].children;
    if (children[0])
    {
      const y = children[0].getBoundingClientRect().top;
      while (children[count] && children[count].getBoundingClientRect().top === y)
      {
        count++;
      }
      return count;
    }

    return 1;
  },

  componentDidUpdate()
  {
    if (this.state.windowResized)
    {
      this.setState({
        windowResized: false,
      });
    }
  },

  render()
  {
    const layoutSum = (this.props.layout.rows ? 1 : 0) + (this.props.layout.columns ? 1 : 0) + (this.props.layout.cells ? 1 : 0);
    if (layoutSum !== 1)
    {
      // TODO write test for this
      return (
        <div className='error'>
          Error: Must pass one and only one of [cells, rows, columns] to the same level of a LayoutManager. Passed <b>{layoutSum}</b>.
          <pre>{JSON.stringify(this.props.layout)}</pre>
        </div>
      );
    }

    const lmClasses = [lmClass];
    if (this.props.layout.fullHeight)
    {
      lmClasses.unshift(fullHeightClass);
    }
    if (this.state.windowResized)
    {
      lmClasses.unshift('lm-window-resized');
    }
    const lmTerrainComponenttring = lmClasses.join(' ');

    return (
      <div className={lmTerrainComponenttring} ref='layoutManagerDiv'>
        {this.props.layout.columns && this.props.layout.columns.map(this.renderColumn)}
        {this.props.layout.rows && this.props.layout.rows.map(this.renderRow)}
        {this.props.layout.cells && this.props.layout.cells.map(this.renderCell)}
        {this.props.layout.cells && this.props.layout.cells.map(this.renderBlankCell)}
      </div>
    );
  },
});

export default Dimensions({ onResize: true })(LayoutManager);
