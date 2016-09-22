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
import PureClasss from '../../../common/components/PureClasss.tsx';
import Table from '../../../common/components/Table.tsx';
import InfoArea from '../../../common/components/InfoArea.tsx';
import {IResultsConfig, ResultsConfig} from "../results/ResultsConfig.tsx";
import {ResultFormatValue} from './Result.tsx';

interface Props
{
  results: any[];
  resultsWithAllFields: any[];
  resultsConfig: IResultsConfig;
  onExpand: (index:number) => void;
}

export default class ResultsTable extends PureClasss<Props>
{
  state: {
    random: number;
  } = {
    random: 0,
  };
  
  getKey(col: number): string
  {
    let config = this.props.resultsConfig;
    let hasName = this.hasName();
    let hasScore = this.hasScore();
    
    if(col === 0 && hasName)
    {
      return config.name;
    }
    if(col === 0 && hasScore)
    {
      return config.score;
    }
    if(col === 1 && hasName && hasScore)
    {
      return config.score;
    }
    
    let offset = (hasName ? 1 : 0) + (hasScore ? 1 : 0);
    return config.fields[col - offset];
  }
  
  getValue(i: number, col: number): string
  {
    let field = this.getKey(col);
    let {results, resultsWithAllFields, resultsConfig} = this.props;

    let value =
      (resultsWithAllFields && resultsWithAllFields[i] && resultsWithAllFields[i][field])
      || (results && results[i] && results[i][field]);
    
    return ResultFormatValue(field, value, resultsConfig);
  }
  
  hasScore(): boolean
  {
    return this.props.resultsConfig.score !== "";
  }
  
  hasName(): boolean
  {
    return this.props.resultsConfig.name !== "";
  }
  
  handleCellClick(r: number, c: number)
  {
    this.props.onExpand(r);
  }
  
  render()
  {
    if(!this.props.results || !this.props.resultsWithAllFields)
    {
      return <InfoArea large='Loading...' />;
    }
    
    let pinnedCols = (this.hasName() ? 1 : 0) + (this.hasScore() ? 1 : 0);
    let fieldCount = this.props.resultsConfig.fields.size + pinnedCols;
    
    return (
      <Table
        getKey={this.getKey}
        getValue={this.getValue}
        colCount={fieldCount}
        rowCount={this.props.results.length}
        pinnedCols={pinnedCols}
        random={this.state.random}
        onCellClick={this.handleCellClick}
      />
    );
  }
}
