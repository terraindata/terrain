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

import * as Immutable from 'immutable';
import './AggregationsArea.less';
const { Map, List } = Immutable;
import * as classNames from 'classnames';
import * as _ from 'lodash';
import * as React from 'react';
// import * as moment from 'moment';
const moment = require('moment');
const ReactModal = require('react-modal');

import Radium = require('radium');
import { ResultsConfig } from '../../../../../shared/results/types/ResultsConfig';
import BackendInstance from '../../../../database/types/BackendInstance';
import Query from '../../../../items/types/Query';
import InfoArea from '../../../common/components/InfoArea';
import Modal from '../../../common/components/Modal';
import Ajax from '../../../util/Ajax';
import Actions from '../../data/BuilderActions';
import Aggregation from '../results/Aggregation';
import { ResultsState } from './ResultTypes';

import { backgroundColor, borderColor, Colors, fontColor, getStyle, link } from '../../../colors/colors';
import InfiniteScroll from '../../../common/components/InfiniteScroll';
import Switch from '../../../common/components/Switch';
import TerrainComponent from '../../../common/components/TerrainComponent';

const RESULTS_PAGE_SIZE = 20;

export interface Props
{
  resultsState: ResultsState;
  db: BackendInstance;
  query: Query;
  onNavigationException: () => void;
}

@Radium
class AggregationsArea extends TerrainComponent<Props>
{

  public isQueryEmpty(): boolean
  {
    const { query } = this.props;
    return !query || (!query.tql && !query.cards.size);
  }

  public componentWillMount()
  {
    Actions.change(List(this._keyPath('query', 'aggregationList')),
      this.parseAggs(this.props.resultsState.aggregations, this.props.query), true);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (!_.isEqual(this.props.resultsState.aggregations, nextProps.resultsState.aggregations))
    {
      Actions.change(List(this._keyPath('query', 'aggregationList')),
        this.parseAggs(nextProps.resultsState.aggregations, nextProps.query), true);
    }
  }

  public parseAggs(aggregations, query)
  {
    if (query === undefined || aggregations === undefined)
    {
      return Map({});
    }
    let aggsList = query.aggregationList !== undefined ? query.aggregationList : Map({});
    _.keys(aggregations).forEach((name) =>
    {
      if (aggsList.get(name) === undefined)
      {
        const aggInfo = { displayType: 'None', expanded: true };
        aggsList = aggsList.set(name, aggInfo);
      }
    });
    _.keys(aggsList).forEach((name) =>
    {
      if (aggregations.name === undefined)
      {
        aggsList = aggsList.delete(name);
      }
    });
    return aggsList;
  }

  public handleRequestMoreAggregations(onResultsLoaded: (unchanged?: boolean) => void)
  {
    onResultsLoaded(true);
  }

  public renderAggregations()
  {
    const { resultsState } = this.props;
    const aggs = resultsState.aggregations;
    let aggregations = Immutable.List([]);
    _.keys(aggs).forEach((key) =>
    {
      aggregations = aggregations.push({ [key]: aggs[key] });
    });

    let infoAreaContent: any = null;
    let resultsContent: any = null;
    let resultsAreOutdated: boolean = false;
    if (this.isDatabaseEmpty())
    {
      resultsAreOutdated = true;
      infoAreaContent = <InfoArea
        large='The database is empty, please select the database.'
      />;
    }
    else if (this.isQueryEmpty())
    {
      resultsAreOutdated = true;
      infoAreaContent = <InfoArea
        large='Results will display here as you build your query.'
      />;
    }
    else if (resultsState.hasError)
    {
      resultsAreOutdated = true;
      infoAreaContent = <InfoArea
        large='There was an error with your query.'
        small={resultsState.errorMessage}
      />;
    }

    else if (aggregations)
    {
      if (aggregations.size === 0)
      {
        resultsContent = <InfoArea
          large='There are no aggregations for your query.'
        />;
      }
      else
      {
        resultsContent = (
          <InfiniteScroll
            className='aggregations-area-aggs'
            onRequestMoreItems={this.handleRequestMoreAggregations}
          >
            {
              aggregations.map((agg, index) =>
              {
                return (
                  <Aggregation
                    aggregation={agg}
                    index={index}
                    key={index}
                    name={_.keys(agg)[0]}
                    query={this.props.query}
                  />
                );
              })
            }
          </InfiniteScroll>
        );

      }
    }
    return (
      <div>
        {
          resultsContent
        }
        {
          infoAreaContent
        }
      </div>
    );
  }

  public render()
  {
    return (
      <div className='aggregations-area'>
        {this.renderAggregations()}
      </div>
    );
  }

  private isDatabaseEmpty(): boolean
  {
    return !this.props.db || !this.props.db.id;
  }
}

export default AggregationsArea;
