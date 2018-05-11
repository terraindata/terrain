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
import { List } from 'immutable';
import * as Immutable from 'immutable';
import * as React from 'react';

import './SimpleTable.less';

import TerrainComponent from './TerrainComponent';

export interface SimpleTableColumn
{
  columnKey: string;
  columnLabel: string;
  columnRelativeSize?: number; // works sort of as css flex property
  component?: JSX.Element; // a component to wrap the column value with
}

export interface Props
{
  columnsConfig: { [colKey: string]: SimpleTableColumn };
  data: Immutable.Map<ID, any>;
}

export class SimpleTable extends TerrainComponent<Props>
{
  public state: {};
  public columnWidths = this.calculateColumnWidhts();

  public calculateColumnWidhts()
  {
    const { columnsConfig } = this.props;
    const columnKeys = Object.keys(columnsConfig);
    // By default, each column takes an equal portion of the 100% width
    const defaultSize = 100 / columnKeys.length;

    const columnWidths = {};
    columnKeys.map((colKey) =>
    {
      const columnRelativeSize = columnsConfig[colKey].columnRelativeSize !== undefined ?
        columnsConfig[colKey].columnRelativeSize : 1;

      columnWidths[colKey] = columnRelativeSize * defaultSize;
    });

    return columnWidths;
  }

  public renderValue(colKey, rowData)
  {
    const { columnsConfig } = this.props;

    let processedValue = rowData[colKey];

    const component = columnsConfig[colKey].component;
    if (component !== undefined)
    {
      processedValue = React.cloneElement(component, { colKey, rowData });
    }

    return processedValue;
  }

  public render()
  {
    const { columnsConfig, data } = this.props;

    const columnKeys = Object.keys(columnsConfig);
    const dataValues = data.valueSeq();

    return (
      <table className='simple-table'>
        <thead className='simple-table-header'>
          <tr className='simple-table-row'>
            {
              columnKeys.map((colKey) =>
              {
                const column = columnsConfig[colKey];
                return (
                  <th
                    key={column.columnKey}
                    className='simple-table-cell'
                    style={{ width: `${this.columnWidths[colKey]}%` }}
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
            dataValues.count() > 0 ?
              dataValues.map((entry) =>
              {
                return (
                  <tr key={entry.id} className='simple-table-row'>
                    {
                      columnKeys.map((colKey, index) =>
                      {
                        return (
                          <td
                            key={colKey}
                            className='simple-table-cell'
                            style={{ width: `${this.columnWidths[colKey]}%` }}
                          >
                            {this.renderValue(colKey, entry)}
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
