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

import * as React from 'react';
import * as _ from 'underscore';

// Make sure to import default styles.
// This only needs to be done once; probably during your application's bootstrapping process.
import 'react-virtualized/styles.css';
require('./Table.less');

let { AutoSizer, Grid, ScrollSync, CellMeasurer } = require('react-virtualized');
let scrollbarSize = require('dom-helpers/util/scrollbarSize');
import * as classNames from 'classnames';
import Classs from './Classs.tsx';
import Util from '../../util/Util.tsx';
import {Menu, MenuOption} from '../../common/components/Menu.tsx';

const LEFT_COLOR_FROM = hexToRgb('#a2af93')
const LEFT_COLOR_TO = hexToRgb('#828c76')
const TOP_COLOR_FROM = hexToRgb('#565d4e')
const TOP_COLOR_TO = hexToRgb('#3e3c3c')

interface Props
{
  getKey: (col: number) => string;
  getValue: (i: number, col: number) => string | El;
  rowCount: number;
  colCount: number;
  pinnedCols?: number;
  random?: number;
  hardRandom?: number;
  onCellClick?: (r: number, c: number) => void;
  menuOptions?: List<MenuOption>;
}

const HEADER_ROW_HEIGHT = 35;
const MAX_INIT_HEIGHT = 40;
const MAX_INIT_WIDTH = 300;

export default class ResultsTable extends Classs<Props>
{
  state: {
    columnWidth: number;  
    overscanColumnCount: number;
    overscanRowCount: number;
  } = {
    columnWidth: 75,
    overscanColumnCount: 0,
    overscanRowCount: 5,
  };
  
  constructor(props:Props)
  {
    super(props);
    this.resetGridMeasurements = _.debounce(this.resetGridMeasurements, 150);
  }
  
  _columnWidthMeasurerRef: any;
  
  componentWillReceiveProps(nextProps)
  {
    if(this.props.random !== nextProps.random)
    {
      this.resetGridMeasurements();
    }
  }

  _resetMeasurements: () => void;
  resetGridMeasurements()
  {
    this._resetMeasurements && this._resetMeasurements(); // TODO confirm this is good here
    this.gridRefs.map(ref => ref && typeof ref.recomputeGridSize === 'function' && ref.recomputeGridSize());
  }
  
  
  gridRefs = [];
  setRef(ref)
  {
    if(this.gridRefs.indexOf(ref) === -1)
    {
      this.gridRefs.push(ref);
    }
  }
  
  _oldWidth: number = null;
  _newWidth: number = null;
  componentDidUpdate()
  {
    let {_newWidth, _oldWidth} = this;
    if(_newWidth !== _oldWidth && _oldWidth !== null)
    {
      // div sized changed, force recomputation of column sizes
      this.resetGridMeasurements();
    }
    this._oldWidth = _newWidth;
  }
  
  render()
  {
    let { columnWidth, overscanColumnCount, overscanRowCount } = this.state;
    let { colCount, rowCount, pinnedCols } = this.props;
    
    return (
      <AutoSizer random={this.props.random}>
        {({ height, width }) => 
          <ScrollSync random={this.props.random}>
            {({ clientHeight, clientWidth, onScroll, scrollHeight, scrollLeft, scrollTop, scrollWidth }) => {
              let divWidth = width;
              this._newWidth = divWidth;
              const x = scrollLeft / (scrollWidth - clientWidth)
              const y = scrollTop / (scrollHeight - clientHeight)

              const leftBackgroundColor = mixColors(LEFT_COLOR_FROM, LEFT_COLOR_TO, y)
              const leftColor = '#ffffff'
              const topBackgroundColor = mixColors(TOP_COLOR_FROM, TOP_COLOR_TO, x)
              const topColor = '#ffffff'
              const middleBackgroundColor = mixColors(leftBackgroundColor, topBackgroundColor, 0.5)
              const middleColor = '#ffffff'
              
              return (
                <CellMeasurer
                  cellRenderer={this._genericCellRenderer}
                  columnCount={colCount}
                  rowCount={rowCount + 1}
                  ref={(ref) => {
                    this._columnWidthMeasurerRef = ref
                  }}
                  random={this.props.random}
                >
                {(fns) => {
                  this._resetMeasurements = fns.resetMeasurements;
                  let extraLastCellWidth = Math.max(width - _.range(0, colCount).reduce(
                    (sum, index) => sum + Math.min(MAX_INIT_WIDTH, fns.getColumnWidth({ index })), 0
                  ), 0);
                  
                  let getColumnWidth =  ({ index }): number => 
                    Math.min(MAX_INIT_WIDTH, fns.getColumnWidth({ index })) + (index === colCount - 1 ? extraLastCellWidth : 0);
                  let getRowHeight = ({ index }): number => Math.min(MAX_INIT_HEIGHT, fns.getRowHeight({ index }));
                  let getBodyColumnWidth =  ({ index }): number => getColumnWidth({ index: index + pinnedCols});
                  let getBodyRowHeight = ({ index }) => getRowHeight({ index: index + 1});
                  let pinnedColOffset = !pinnedCols ? 0 : _.range(0, pinnedCols).reduce(
                    (sum, index) => sum + getColumnWidth({ index }), 0);
                  
                  return (
                    <div className="terra-GridRow">
                      {
                        // Pinned Columns: top left header cells
                        !pinnedCols ? null :
                          <div
                            className="terra-LeftSideGridContainer"
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              color: leftColor,
                              backgroundColor: `rgb(${topBackgroundColor.r},${topBackgroundColor.g},${topBackgroundColor.b})`
                            }}
                          >
                            <Grid
                              cellRenderer={this._renderHeaderCell}
                              className="terra-HeaderGrid"
                              width={pinnedColOffset}
                              height={HEADER_ROW_HEIGHT}
                              rowHeight={HEADER_ROW_HEIGHT}
                              columnWidth={getColumnWidth}
                              rowCount={1}
                              columnCount={pinnedCols}
                              random={this.props.random}
                              ref={this.setRef}
                              rel={0}
                            />
                          </div>
                      }
                      {
                        // Pinned Columns: left value 
                        !pinnedCols ? null :
                          <div
                            className="terra-LeftSideGridContainer"
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: HEADER_ROW_HEIGHT,
                              color: leftColor,
                              backgroundColor: `rgb(${leftBackgroundColor.r},${leftBackgroundColor.g},${leftBackgroundColor.b})`
                            }}
                          >
                            <Grid
                              overscanColumnCount={overscanColumnCount}
                              overscanRowCount={overscanRowCount}
                              cellRenderer={this._renderLeftSideCell}
                              columnWidth={getColumnWidth}
                              columnCount={pinnedCols}
                              className="terra-LeftSideGrid"
                              height={height - scrollbarSize() - HEADER_ROW_HEIGHT}
                              rowHeight={getBodyRowHeight} //ROW_HEIGHT}
                              rowCount={rowCount}
                              scrollTop={scrollTop}
                              width={pinnedColOffset}
                              random={this.props.random} //this.props.random}
                              ref={this.setRef}
                              rel={1}
                            />
                          </div>
                      }
                      <div className="terra-GridColumn">
                        <AutoSizer disableHeight random={this.props.random}>
                          {({ width }) => (
                            <div>
                              <div style={{
                                backgroundColor: `rgb(${topBackgroundColor.r},${topBackgroundColor.g},${topBackgroundColor.b})`,
                                color: topColor,
                                height: HEADER_ROW_HEIGHT,
                                width: divWidth - scrollbarSize()
                              }}>
                                <Grid
                                  className="terra-HeaderGrid"
                                  columnWidth={getColumnWidth}
                                  columnCount={colCount}
                                  height={HEADER_ROW_HEIGHT}
                                  overscanColumnCount={overscanColumnCount}
                                  cellRenderer={this._renderHeaderCell}
                                  rowHeight={HEADER_ROW_HEIGHT}
                                  rowCount={1}
                                  scrollLeft={scrollLeft}
                                  width={divWidth - scrollbarSize()}
                                  random={this.props.random} //this.props.random}
                                  ref={this.setRef}
                                  rel={2}
                                />
                              </div>
                              <div
                                style={{
                                  backgroundColor: '#fff', // `rgb(${middleBackgroundColor.r},${middleBackgroundColor.g},${middleBackgroundColor.b})`,
                                  color: middleColor,
                                  height,
                                  width: divWidth
                                }}
                              >
                                <Grid
                                  className="terra-BodyGrid"
                                  columnWidth={getBodyColumnWidth}
                                  columnCount={colCount - pinnedCols}
                                  height={height - HEADER_ROW_HEIGHT}
                                  onScroll={onScroll}
                                  overscanColumnCount={overscanColumnCount}
                                  overscanRowCount={overscanRowCount}
                                  cellRenderer={this._renderBodyCell}
                                  rowHeight={getBodyRowHeight}
                                  rowCount={rowCount}
                                  width={divWidth - pinnedColOffset}
                                  style={{
                                    left: pinnedColOffset,
                                  }}
                                  random={this.props.random} //this.props.random}
                                  ref={this.setRef}
                                  rel={3}
                                />
                              </div>
                            </div>
                          )}
                        </AutoSizer>
                      </div>
                    </div>
                  )
                }}
              </CellMeasurer>
            )}}
          </ScrollSync>
        }
      </AutoSizer>
    );
  }
  
  handleDoubleClick(event)
  {
    let {target} = event;
    this.props.onCellClick && this.props.onCellClick(
      + Util.attr(target, 'data-row'),
      + Util.attr(target, 'data-col')
    );
  }
  
  _genericCellRenderer ({ columnIndex, rowIndex }) {
    const rowClass = 
      rowIndex % 2 === 0 ? 'terra-evenRow' : 'terra-oddRow';

    return (
      <div className='terra-cell-wrapper'>
        <div className={classNames({
          [rowClass]: true,
          'terra-cell': true,
          'terra-bodyCell': true,
        })}> G-
          {
            rowIndex === 0 ?
              this.props.getKey(columnIndex)
            :
              this.props.getValue(rowIndex - 1, columnIndex)
          }
        </div>
      </div>
    );
  }

  _renderBodyCell ({ columnIndex, rowIndex }) {
    let colIndex = columnIndex + this.props.pinnedCols;
    
    const rowClass = 
      rowIndex % 2 === 0 ? 'terra-evenRow' : 'terra-oddRow';

    let {menuOptions} = this.props;

    return (
      <div
        className={classNames({
          [rowClass]: true,
          'terra-cell': true,
          'terra-bodyCell': true,
          'terra-menuCell': columnIndex === 0 && menuOptions && menuOptions.size > 0,
        })}
        onDoubleClick={this.handleDoubleClick}
        data-row={rowIndex}
        data-col={colIndex}
      >
        <div
          className='terra-cell-inner'
        >
          {
            columnIndex === 0 &&
              <Menu
                options={menuOptions}
                id={rowIndex + '-' + colIndex}
              />
          }
          {
            this.props.getValue(rowIndex, colIndex)
          }
        </div>
      </div>
    );
  }

  _renderHeaderCell ({ columnIndex, rowIndex }) {
    return (
      <div className="terra-headerCell">
        {
          this.props.getKey(columnIndex)
        }
      </div>
    );
  }

  // _renderLeftHeaderCell ({ columnIndex, rowIndex }) {
  //   return (
  //     <div className="headerCell">
  //       {`C${columnIndex}`}
  //     </div>
  //   )
  // }

  _renderLeftSideCell ({ columnIndex, rowIndex }) {
    const rowClass = rowIndex % 2 === 0 ?'terra-evenRow' : 'terra-oddRow';
    let {menuOptions} = this.props;
    
    return (
      <div
        className={classNames({
          [rowClass]: true,
          'terra-cell': true,
          'terra-leftCell': true,
          'terra-menuCell': columnIndex === 0 && menuOptions && menuOptions.size > 0,
        })}
        onDoubleClick={this.handleDoubleClick}
        data-row={rowIndex}
        data-col={columnIndex}
      >
        <div
          className='terra-cell-inner'
        >
          {
            columnIndex === 0 &&
              <Menu
                options={this.props.menuOptions}
                id={rowIndex + '-' + columnIndex}
              />
          }
          {
            this.props.getValue(rowIndex, columnIndex)
          }
        </div>
      </div>
    )
  }
}

function hexToRgb (hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Ported from sass implementation in C
 * https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209
 */
function mixColors (color1, color2, amount) {
  const weight1 = amount
  const weight2 = 1 - amount

  const r = Math.round(weight1 * color1.r + weight2 * color2.r)
  const g = Math.round(weight1 * color1.g + weight2 * color2.g)
  const b = Math.round(weight1 * color1.b + weight2 * color2.b)

  return { r, g, b }
}