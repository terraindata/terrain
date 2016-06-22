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

import * as _ from 'underscore';
import * as React from 'react';
import * as classNames from 'classnames';
import {Config, ResultsConfig} from "../results/ResultsConfig.tsx";
import Classs from './../../../common/components/Classs.tsx';
// import * as FixedDataTable from 'fixed-data-table';
let FixedDataTable = require('fixed-data-table');
let {Table, Column, Cell} = FixedDataTable;
require('../../../common/components/FixedDataTable.less');
require('../../../common/components/FixedDataTableCustom.less');
let Dimensions = require('react-dimensions');

interface Props
{
  results: any[];
  resultsWithAllFields: any[];
  resultsConfig: Config;
  
  containerWidth?: number;
  containerHeight?: number;
}

class ResultsTable extends Classs<Props>
{
  state: {
    widths: {[field: string]: number};
  } = {
    widths: {},
  }
  
  handleColumnResize(width: number, field: string)
  {
    this.setState({
      widths: 
        _.extend({}, this.state.widths,
        {
          [field]: width,
        }),
    });
  }
  
  renderCol(field:string, index?: number)
  {
    if(!field || !field.length)
    {
      return null;
    }
    
    return (
      <Column
        header={
          <Cell>{field}</Cell>
        }
        cell={
          <TextCell
            data={this.props.resultsWithAllFields}
            field={field}
          />
        }
        width={this.state.widths[field] || 110}
        key={index}
        isResizable={true}
        columnKey={field}
      />
    );
  }

	render()
  {
    let {results, resultsWithAllFields} = this.props;
    let config = this.props.resultsConfig.fields && this.props.resultsConfig.fields.length ?
      this.props.resultsConfig : 
      {
        name: null,
        score: null,
        fields: !this.props.results.length ? null :
          _.keys(this.props.results[0]).concat(
            resultsWithAllFields && resultsWithAllFields.length ? _.keys(resultsWithAllFields[0]) : []
          ),
      };
    
    return (
      <div className='results-table-wrapper'>
        <Table
          rowsCount={resultsWithAllFields ? resultsWithAllFields.length : 0}
          rowHeight={35}
          headerHeight={35}
          width={this.props.containerWidth}
          height={this.props.containerHeight}
          onColumnResizeEndCallback={this.handleColumnResize}
          isColumnResizing={false}
        >
          {
            this.renderCol(config.name)
          }
          {
            this.renderCol(config.score)
          }
          {
            config.fields.map(this.renderCol)
          }
        </Table>
      </div>
    );
	}
}

interface TextCellProps
{
  rowIndex?: number;
  field: string;
  data: {[field: string]: any}[];  
}

class TextCell extends Classs<TextCellProps> {
  render() {
    let {rowIndex, field, data} = this.props;
    var value = data && data[rowIndex] ? data[rowIndex][field] : 'Loading';
    var italics = false;
    if(typeof value === 'boolean')
    {
      value = value ? 'true' : 'false';
      italics = true;
    }
    if(value === null)
    {
      value = 'null';
      italics = true;
    }
    if(value === undefined)
    {
      value = 'undefined';
      italics = true;
    }
    if(value === '')
    {
      value = 'blank';
      italics = true;
    }
    
    return (
      <Cell {...this.props} data="">
        <div className={classNames({
          'text-cell': true,
          'text-cell-number': typeof value === 'number',
          'text-cell-italics': italics,
        })}>
          {
            value
          }
        </div>
      </Cell>
    );
  }
}

export default Dimensions()(ResultsTable);