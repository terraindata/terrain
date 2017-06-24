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
import FileImportTypes from '../FileImportTypes';

type PreviewMap = FileImportTypes.PreviewMap;
export interface Props
{
  rowsCount: number;
  previewRows: object[];
  previewMaps: List<PreviewMap>;
}

const DATATYPES = Immutable.List(['text', 'number', 'date']);

class Preview extends Classs<Props>
{
  public state: {
    columnsCount?: number;
  } = {
  };

  public getColumns(props: Props): List<IColumn>
  {
    const { previewRows } = props;
    const cols: IColumn[] = [];

    let colsCount = 0;
    for (const property in previewRows[0])
    {
      colsCount++;
      if (previewRows[0].hasOwnProperty(property))
      {
        cols.push({
          key: property,
          name: property,
        });
      }
    }
    this.setState({
      columnsCount: colsCount,
    });
    return Immutable.List(cols);
  }

  public getRow(i: number): Object
  {
    return this.props.previewRows[i];
  }

  public render()
  {
    console.log("rowsCount: ", this.props.rowsCount);
    console.log("rows: ", this.props.previewRows);
    console.log("columns: ", this.getColumns(this.props));

    // const previewCols = [];
    // for (let i = 0; i < this.state.columnsCount; i++)
    // {
    //   previewCols.push(
    //     <PreviewColumn
    //       id={i}
    //       previewMaps={this.props.previewMaps}
    //       datatypes={DATATYPES}
    //       canSelectDatatype={true}
    //       canSelectColumn={true}
    //     />
    //   )
    // }

    return (
      <div>
        <Table
          columns={this.getColumns(this.props)}
          rowGetter={this.getRow}
          rowsCount={this.props.rowsCount}
          rowKey={'id'}
        />
      </div>
    );
  }
}

export default Preview;
