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

// tslint:disable:no-var-requires strict-boolean-expressions

import BadgeColumn from 'common/components/simple-table/BadgeColumn';
import ButtonColumn from 'common/components/simple-table/ButtonColumn';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import Pagination from 'react-js-pagination';

import './SimpleTable.less';

import TerrainComponent from './TerrainComponent';

export interface SimpleTableColumn
{
  columnKey: string;
  columnLabel: string;
  columnRelativeSize?: number; // works sort of as css flex property
  component?: JSX.Element; // a component to wrap the column value with
  formatter?: (item: any) => string;
}

export interface Props
{
  columnsConfig: SimpleTableColumn[];
  data: Immutable.Map<ID, any>;
  defaultOrder?: { columnKey: string, direction: 'asc' | 'desc' };
  displayRowCount?: number;
}

export interface State
{
  activePage: number;
  orderedData: Immutable.List<any>;
}

export class SimpleTable extends TerrainComponent<Props>
{
  public static defaultProps = {
    displayRowCount: 10,
    defaultOrder: {},
  };
  public state: State = null;
  public columnWidths = this.calculateColumnWidths();

  public constructor(props)
  {
    super(props);

    const { data, defaultOrder } = props;

    this.state = {
      activePage: 1,
      orderedData: this.orderData(
        data,
        defaultOrder.columnKey,
        defaultOrder.direction,
      ),
    };
  }

  public componentWillReceiveProps(nextProps)
  {
    const {
      displayRowCount,
      defaultOrder: nextDefaultOrder,
      data: nextData,
    } = nextProps;

    const { defaultOrder, data } = this.props;

    const defaultOrderChanged = nextDefaultOrder.columnKey !== defaultOrder.columnKey ||
      nextDefaultOrder.direction !== defaultOrder.direction;
    if (defaultOrderChanged || nextData !== data)
    {
      this.setState({
        orderedData: this.orderData(
          nextData,
          defaultOrder.columnKey,
          defaultOrder.direction,
        ),
      });
    }
  }

  public calculateColumnWidths()
  {
    const { columnsConfig } = this.props;
    // By default, each column takes an equal portion of the 100% width
    const defaultSize = 100 / columnsConfig.length;
    const totalRelativeSize = columnsConfig
      .reduce((total, column) =>
      {
        const relativeSize = column.columnRelativeSize ? column.columnRelativeSize : 1;
        return total + relativeSize;
      }, 0);

    const columnWidths = {};
    columnsConfig.map((column) =>
    {
      const columnRelativeSize = column.columnRelativeSize !== undefined ?
        column.columnRelativeSize : 1;

      columnWidths[column.columnKey] = _.round(columnRelativeSize * 100 / totalRelativeSize, 2);
    });

    return columnWidths;
  }

  public handlePageChange(pageNumber: number)
  {
    const { displayRowCount, data } = this.props;
    const dataValuesCount = data.valueSeq().count();
    this.setState({ activePage: pageNumber });
  }

  public renderValue(colKey, rowData)
  {
    const { columnsConfig } = this.props;

    let processedValue = rowData[colKey];

    const column = columnsConfig.find((col) => col.columnKey === colKey);

    if (column !== undefined)
    {
      if (column.formatter !== undefined)
      {
        processedValue = column.formatter(rowData);
      }

      if (column.component !== undefined)
      {
        processedValue = React.cloneElement(column.component, { key: colKey, colKey, rowData });
      }
    }

    return processedValue;
  }

  public orderData(data: Immutable.Map<ID, any>, columnKey: string, direction: 'asc' | 'desc' = 'asc')
  {
    let orderedData = data.toList();
    if (columnKey !== undefined)
    {
      orderedData = orderedData.sortBy((entry) => entry[columnKey]).toList();

      if (direction === 'desc')
      {
        orderedData = orderedData.reverse().toList();
      }
    }

    return orderedData;
  }

  public render()
  {
    const { displayRowCount, columnsConfig } = this.props;
    const { activePage, orderedData } = this.state;

    const columnKeys = columnsConfig.map((config) => config.columnKey);
    const visibleDataValues = orderedData.slice((activePage - 1) * displayRowCount, activePage * displayRowCount);

    return (
      <table className='simple-table'>
        <thead className='simple-table-header'>
          <tr className='simple-table-row'>
            {
              columnsConfig.map((column) =>
              {
                return (
                  <th
                    key={column.columnKey}
                    className='simple-table-cell'
                    style={{ width: `${this.columnWidths[column.columnKey]}%` }}
                  >
                    {column.columnLabel}
                  </th>
                );
              })
            }
          </tr>
        </thead>
        <tbody className='simple-table-body'>
          {
            visibleDataValues.count() > 0 ?
              visibleDataValues.map((entry, key) =>
              {
                return (
                  <tr key={key} className='simple-table-row'>
                    {
                      columnsConfig.map((column) =>
                      {
                        return (
                          <td
                            key={column.columnKey}
                            className='simple-table-cell'
                            style={{ width: `${this.columnWidths[column.columnKey]}%` }}
                          >
                            {this.renderValue(column.columnKey, entry)}
                          </td>
                        );
                      })
                    }
                  </tr>
                );
              })
              : (
                <tr>
                  <td colSpan={columnKeys.length} className='simple-table-cell'>
                    No results
                  </td>
                </tr>
              )
          }
          {
            orderedData.count() > displayRowCount ?
              <tr style={{ align: 'right' }} className='simple-table-row'>
                <td colSpan={columnKeys.length} className='simple-table-cell'>
                  <Pagination
                    prevPageText='prev'
                    nextPageText='next'
                    firstPageText='first'
                    lastPageText='last'
                    activePage={this.state.activePage}
                    itemsCountPerPage={displayRowCount}
                    totalItemsCount={orderedData.count()}
                    pageRangeDisplayed={5}
                    onChange={this.handlePageChange}
                  />
                </td>
              </tr> : null
          }
        </tbody>
      </table>
    );
  }
}

export
{
  BadgeColumn,
  ButtonColumn,
};
export default SimpleTable;
