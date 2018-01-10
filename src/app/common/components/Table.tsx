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

import { List } from 'immutable';
import * as React from 'react';
import * as ReactDataGrid from 'react-data-grid';

import './Table.less';

import { MenuOption } from '../../common/components/Menu';
import TerrainComponent from './TerrainComponent';
const Dimensions = require('react-dimensions');

const LEFT_COLOR_FROM = hexToRgb('#a2af93');
const LEFT_COLOR_TO = hexToRgb('#828c76');
const TOP_COLOR_FROM = hexToRgb('#565d4e');
const TOP_COLOR_TO = hexToRgb('#3e3c3c');

const TOOLBAR_HEIGHT = 32; // The react-data-grid toolbar is 32px high, by default

export interface TableColumn
{
  key: string;
  name: string;
  resizable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
}

export interface Props
{
  columns: List<TableColumn>;
  onGridSort: (sortColumn, sortDirection) => void;
  rows: List<any>;
  rowSelection?: object;
  rowGetter: (index: number) => object;
  rowsCount: number;
  // rows: List<Map<any, any>>;
  random?: number;
  onCellClick?: (r: number, c: number) => void;
  menuOptions?: List<MenuOption>;
  rowKey: string;
  rowHeight?: number;
  toolbar?: object;
  onAddFilter?: (filter: object) => void;
  onClearFilters?: () => void;

  containerWidth?: number;
  containerHeight?: number;
}

export class TableComponent extends TerrainComponent<Props>
{
  public state: {
    rows: List<any>;
  } = {
      rows: List([]),
    };

  constructor(props: Props)
  {
    super(props);
  }

  public render()
  {
    return (
      <ReactDataGrid
        {...this.props}
        columns={this.props.columns.toJS()}
        minHeight={this.props.containerHeight - TOOLBAR_HEIGHT}
        minWidth={this.props.containerWidth}
      />
    );
  }
}

export const Table = Dimensions({
  elementResize: true,
  containerStyle: {
    height: '100%',
  },
})(TableComponent);

function hexToRgb(hex)
{
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * Ported from sass implementation in C
 * https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209
 */
function mixColors(color1, color2, amount)
{
  const weight1 = amount;
  const weight2 = 1 - amount;

  const r = Math.round(weight1 * color1.r + weight2 * color2.r);
  const g = Math.round(weight1 * color1.g + weight2 * color2.g);
  const b = Math.round(weight1 * color1.b + weight2 * color2.b);

  return { r, g, b };
}

export default Table;
