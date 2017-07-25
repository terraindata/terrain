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

import * as Immutable from 'immutable';
import * as React from 'react';
import * as _ from 'underscore';
import { _ResultsConfig, ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import InfoArea from '../../../common/components/InfoArea';
import { MenuOption } from '../../../common/components/Menu';
import { IColumn, Table } from '../../../common/components/Table';
import TerrainComponent from '../../../common/components/TerrainComponent';
import ColorManager from '../../../util/ColorManager';
import { spotlightAction, SpotlightState, SpotlightStore } from '../../data/SpotlightStore';
import { getResultFields, getResultName, getResultValue } from './Result';
import { MAX_RESULTS, Results } from './ResultTypes';

export interface Props
{
  results: Results;
  resultsConfig?: ResultsConfig;
  onExpand: (index: number) => void;
  resultsLoading: boolean;
}

export default class ResultsTable extends TerrainComponent<Props>
{
  public state: {
    random: number;
    spotlightState: SpotlightState;
    columns: List<IColumn>;
  } = {
    random: 0,
    spotlightState: null,
    columns: this.getColumns(this.props),
  };

  public menuOptions: List<MenuOption> = Immutable.List([
    {
      text: 'Spotlight',
      onClick: this.spotlight,
    },
  ]);

  public componentWillReceiveProps(nextProps: Props)
  {
    if (nextProps.results !== this.props.results || nextProps.resultsConfig !== this.props.resultsConfig)
    {
      // force the table to update
      this.setState({
        random: Math.random(),
        columns: this.getColumns(nextProps),
      });
    }
  }

  public getColumns(props: Props): List<IColumn>
  {
    const { resultsConfig } = props;
    let cols: IColumn[] = [];

    if (resultsConfig.enabled)
    {
      if (resultsConfig.name)
      {
        cols.push({
          key: resultsConfig.name,
          name: resultsConfig.name,
          resizable: true,
        });
      }

      if (resultsConfig.score)
      {
        cols.push({
          key: resultsConfig.score,
          name: resultsConfig.score,
          resizable: true,
        });
      }
    }

    if (resultsConfig.enabled && resultsConfig.fields && resultsConfig.fields.size)
    {
      resultsConfig.fields.map(
        (field) =>
          cols.push({
            key: field,
            name: field,
            resizable: true,
          }),
      );
    }
    else
    {
      const resultFields = props.results.size ? props.results.get(0).fields : Immutable.Map({});
      resultFields.map(
        (value, field) =>
          cols.push({
            key: field,
            name: field,
            resizable: true,
            width: 120,
          }),
      );
    }

    // NOTE: Passing any empty cols array will cause our table library to crashhhh
    if (cols.length === 0)
    {
      if (this.props.resultsLoading)
      {
        cols = [
          {
            key: 'loading',
            name: 'Loading...',
          },
        ];
      }
      else
      {
        cols = [
          {
            key: 'none',
            name: 'No results',
          },
        ];
      }
    }

    return Immutable.List(cols);
  }

  public componentDidMount()
  {
    this._subscribe(SpotlightStore, {
      isMounted: true,
      stateKey: 'spotlightState',
    });
  }

  // getKey(col: number): string
  // {
  //   let config = this.state.resultsConfig;
  //   let hasName = this.hasName();
  //   let hasScore = this.hasScore();

  //   if(col === 0 && hasName)
  //   {
  //     return config.name;
  //   }
  //   if(col === 0 && hasScore)
  //   {
  //     return config.score;
  //   }
  //   if(col === 1 && hasName && hasScore)
  //   {
  //     return config.score;
  //   }

  //   let offset = (hasName ? 1 : 0) + (hasScore ? 1 : 0);
  //   let fieldIndex = col - offset;
  //   return config.fields.get(fieldIndex);
  // }

  public getRow(i: number): object
  {
    // TODO
    return this.props.results.get(i).fields.toJS();
    // let field = this.getKey(col);
    // let {results} = this.props;
    // let {resultsConfig} = this.state;
    // let primaryKey = getPrimaryKeyFor(results && results.get(i), resultsConfig);
    // let spotlight = col === 0
    //   && this.state.spotlightState
    //   && this.state.spotlightState.getIn(['spotlights', primaryKey]);

    // return (
    //   <div>
    //     {
    //       spotlight &&
    //         <div
    //           className='result-spotlight'
    //           style={{
    //             background: spotlight.color,
    //           }}
    //         />
    //     }
    //     {
    //       getResultValue(results && results.get(i), field, resultsConfig)
    //     }
    //   </div>
    // );
  }

  // hasScore(): boolean
  // {
  //   return this.state.resultsConfig.score !== "";
  // }

  // hasName(): boolean
  // {
  //   return this.state.resultsConfig.name !== "";
  // }

  public handleCellClick(r: number, c: number)
  {
    this.props.onExpand(r);
  }

  public spotlight(menuIndex: number, rc: string)
  {
    // TODO
    const row = rc.split('-')[0];
    const col = rc.split('-')[1];
    const result = this.props.results && this.props.results.get(+row);
    const id = result.primaryKey;
    const spotlightColor = ColorManager.colorForKey(id);

    const spotlightData = _.extend({}, result);
    spotlightData['name'] = getResultName(result, this.props.resultsConfig);
    spotlightData['color'] = spotlightColor;
    spotlightData['id'] = id;
    spotlightAction(id, spotlightData);
  }

  public render()
  {
    if (!this.props.results)
    {
      return <InfoArea large='Loading...' />;
    }

    // let pinnedCols = (this.hasName() ? 1 : 0) + (this.hasScore() ? 1 : 0);
    // let fieldCount = this.state.resultsConfig.fields.size + pinnedCols;

    // if(!fieldCount && this.props.results.size)
    // {
    //   fieldCount = this.props.results.get(0).fields.size;
    // }
    console.log(this.state.columns);
    return (
      <Table
        columns={this.state.columns}
        rowGetter={this.getRow}
        rowsCount={this.props.results.size}
        random={this.state.random}
        onCellClick={this.handleCellClick}
        menuOptions={this.menuOptions}
        rowKey={'id' /*TODO*/}
      />
    );
  }
}
