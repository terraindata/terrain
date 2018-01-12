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

// tslint:disable:no-var-requires

import { List, Map, Set } from 'immutable';
import * as _ from 'lodash';
import * as Radium from 'radium';
import * as React from 'react';
import * as ReactDataGrid from 'react-data-grid';
import { ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import InfoArea from '../../../common/components/InfoArea';
import TerrainComponent from '../../../common/components/TerrainComponent';
import './AggregationsTable.less';
const Dimensions = require('react-dimensions');

export interface Props
{
  tableData: any;
  containerWidth?: number;
  containerHeight?: number;
  useBuckets?: boolean;
}

@Radium
export class AggregationsTableComponent extends TerrainComponent<Props>
{
  public state: {
    rows: any;
  } = {
      rows: [],
    };

  public componentDidMount()
  {
    this.populateRows(this.props.tableData, this.props.useBuckets);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.tableData !== this.props.tableData)
    {
      this.populateRows(nextProps.tableData, nextProps.useBuckets);
    }
  }

  public populateRows(tableData, useBuckets)
  {
    let rows = [];
    if (useBuckets)
    {
      rows = tableData.map((bucket) =>
      {
        return this.flatten(bucket);
      });
    }
    else
    {
      const flatJson = this.flatten(tableData);
      rows = _.keys(flatJson).map((key) =>
      {
        if (flatJson[key] === null)
        {
          flatJson[key] = 0;
        }
        return { key, value: flatJson[key] };
      });
    }
    this.setState({
      rows,
    });
  }

  public flatten(data)
  {
    const result = {};
    const recurse = (current, property: string) =>
    {
      // non-object/array
      if (Object(current) !== current)
      {
        result[property] = current;
      }
      // array
      else if (Array.isArray(current))
      {
        current.map((value, i) =>
        {
          recurse(value, property + '[' + String(i) + ']');
        });
      }
      // object
      else
      {
        _.keys(current).map((key: string) =>
        {
          if (property === 'values')
          {
            property = '';
          }
          recurse(current[key], (property !== '' && property !== undefined) ? property + '.' + key : key);
        });
      }
    };
    recurse(data, '');
    return result;
  }

  public getColumns(): List<any>
  {
    if (this.props.useBuckets)
    {
      const data = _.values(this.props.tableData);
      let keys = Set([]);
      data.map((d) =>
      {
        d = this.flatten(d);
        _.keys(d).map((key) =>
        {
          keys = keys.add(key);
        });
      });
      // Order columns so that score, bg_count, and doc_count are at the end...
      keys = keys.sortBy((key) =>
      {
        if (key === 'doc_count' || key === 'bg_count' || key === 'score')
        {
          return 3;
        }
        if (key === 'to' || key === 'to_as_string')
        {
          return 2;
        }
        return 1;
      }).toSet();
      const cols = List(keys.map((key) =>
      {
        return { key, name: key, resizable: true };
      }));
      return cols;
    }
    else
    {
      return List([{ key: 'key', name: 'key', resizable: true }, { key: 'value', name: 'value', resizable: true }]);
    }
  }

  public getRow(i: number): object
  {
    return this.state.rows[i];
  }

  public render()
  {
    const actualHeight = ((Number(this.state.rows.length) + 1) * 35 + 20);
    return (
      <ReactDataGrid
        columns={this.getColumns().toJS()}
        rowGetter={this.getRow}
        rowsCount={this.state.rows.length}
        minHeight={(actualHeight < 385) ? actualHeight : 385} // add scroll bar size ~ 20
        minWidth={this.props.containerWidth}
      />
    );
  }
}

export const AggregationsTable = Dimensions({
  elementResize: true,
  containerStyle: {
    height: 'auto',

  },
})(AggregationsTableComponent);

export default AggregationsTable;
