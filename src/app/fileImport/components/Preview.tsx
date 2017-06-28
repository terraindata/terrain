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
import * as classNames from 'classnames';
import * as $ from 'jquery';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as _ from 'underscore';
import Util from '../../util/Util';
import Classs from './../../common/components/Classs';
import { IColumn, Table } from './../../common/components/Table';
import PreviewColumn from './PreviewColumn';
import PreviewRow from './PreviewRow';
import FileImportTypes from '../FileImportTypes';
import './Preview.less';

export interface Props
{
  previewRows: object[];
  rowsCount: number;
  columnsCount: number;
  columnsToInclude: Map<string, boolean>;
  columnNames: Map<string, string>;
  columnTypes: Map<string, number>;
}

const DATATYPES = Immutable.List(['text', 'number', 'date']);

class Preview extends Classs<Props>
{
  // assume no row modification?
  public shouldComponentUpdate(nextProps: Props)
  {
    const { previewRows, columnsToInclude, columnNames, columnTypes } = this.props;
    const update = previewRows !== nextProps.previewRows || columnsToInclude !== nextProps.columnsToInclude || columnNames !== nextProps.columnNames || columnTypes !== nextProps.columnTypes;
    return update;
  }

  public render()
  {
    console.log('preview');
    // const previewCols = Object.keys(this.props.previewRows[0]).map((key) =>
    //   <PreviewColumn
    //     key={key}
    //     id={key}
    //     isIncluded={this.props.columnsToInclude.get(key)}
    //     name={this.props.columnNames.get(key)}
    //     typeIndex={this.props.columnTypes.get(key)}
    //     types={DATATYPES}
    //     canSelectType={true}
    //     canSelectColumn={true}
    //   />
    // );

    console.log('columnNames: ', this.props.columnNames);
    const previewCols = [];
    this.props.columnNames.forEach((value, key) =>
    {
      previewCols.push(
        <PreviewColumn
          key={key}
          id={key}
          isIncluded={this.props.columnsToInclude.get(key)}
          name={this.props.columnNames.get(key)}
          typeIndex={this.props.columnTypes.get(key)}
          types={DATATYPES}
          canSelectType={true}
          canSelectColumn={true}
        />
      );
    });
    console.log('previewCols: ', previewCols);

    const previewRows = Object.keys(this.props.previewRows).map((key) =>
      <PreviewRow
        key={key}
        items={this.props.previewRows[key]}
      />
    );

    return (
      <table>
        <thead>
          <tr>
            {previewCols}
          </tr>
        </thead>
        <tbody>
          {previewRows}
        </tbody>
      </table>
    );
  }
}

export default Preview;
