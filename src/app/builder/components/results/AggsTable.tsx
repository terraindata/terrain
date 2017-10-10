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

// tslint:disable:strict-boolean-expressions no-console

import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';

import './AggsTable.less';

import * as ReactDataGrid from 'react-data-grid';
import { ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import InfoArea from '../../../common/components/InfoArea';
import { Table, TableColumn } from '../../../common/components/Table';
import TerrainComponent from '../../../common/components/TerrainComponent';
const Dimensions = require('react-dimensions');

export interface Props
{
  tableData: any;
  containerWidth?: number;
}

@Radium
export default class AggsTableComponent extends TerrainComponent<Props>
{
  public state: {
    rows: any;
  } = {
    rows: [],
  };

  public componentDidMount()
  {
    const dataFields = _.values(this.props.tableData);
    this.setState({
      rows: _.values(this.props.tableData.buckets),
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.tableData !== this.props.tableData)
    {
      // force the table to update
      const dataFields = _.values(nextProps.tableData);
      this.setState({
        rows: _.values(this.props.tableData.buckets),
      });
    }
  }

  public getColumns(): List<any>
  {
    return List([{ key: 'key', name: 'key', resizable: true }, { key: 'doc_count', name: 'doc_count', resizable: true }]);
  }

  public getRow(i: number): object
  {
    return this.state.rows[i];
  }

  public handleGridSort(sortColumn, sortDirection)
  {
    const comparer = (aa, bb) =>
    {
      const a = aa[sortColumn];
      const b = bb[sortColumn];

      if (sortDirection === 'ASC')
      {
        return (a > b) ? 1 : -1;
      }
      else if (sortDirection === 'DESC')
      {
        return (a < b) ? 1 : -1;
      }
      else
      {
        return 0;
      }
    };

    let rows;
    if (sortDirection === 'NONE')
    {
      rows = this.state.rows;
    }
    else
    {
      rows = this.state.rows.sort(comparer);
    }

    this.setState({
      rows,
    });
  }

  public render()
  {
    return (
      <ReactDataGrid
        columns={this.getColumns().toJS()}
        rowGetter={this.getRow}
        rowsCount={this.state.rows.length}
        //minHeight={((Number(this.state.rows.length) + 1) * 35)} // add scroll bar size ~ 20
        onGridSort={this.handleGridSort}
        maxHeight={200}
        minWidth={this.props.containerWidth}
      />
    );
  }
}

export const AggsTable = Dimensions({
  elementResize: true,
  containerStyle: {
    height: '100%',
  },
})(AggsTableComponent);

export default AggsTable;
