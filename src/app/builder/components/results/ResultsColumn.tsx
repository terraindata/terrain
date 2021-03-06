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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import './ResultsColumnStyle.less';

import BuilderActions from 'builder/data/BuilderActions';
import * as classNames from 'classnames';
import { Map } from 'immutable';
import * as _ from 'lodash';
import Radium = require('radium');
import * as React from 'react';
import TQLEditor from 'tql/components/TQLEditor';
import TerrainTools from 'util/TerrainTools';
import Util from 'util/Util';
import BackendInstance from '../../../../database/types/BackendInstance';
import Query from '../../../../items/types/Query';
import { backgroundColor, Colors, fontColor, getStyle } from '../../../colors/Colors';
import InfoArea from '../../../common/components/InfoArea';
import TerrainComponent from '../../../common/components/TerrainComponent';
import AggregationsArea from './AggregationsArea';
import HitsArea from './HitsArea';
import { MAX_HITS, ResultsState } from './ResultTypes';

const RESULTS_PAGE_SIZE = 20;
const ClipboardIcon = require('images/icon_clipboard.svg');

export interface Props
{
  resultsState: ResultsState;
  db: BackendInstance;
  query: Query;
  canEdit: boolean;
  algorithmId: ID;
  showExport: boolean;
  showCustomizeView: boolean;
  allowSpotlights: boolean;
  onIncrementHitsPage: (hitsPage: number) => void;
  onNavigationException: () => void;
  builderActions?: typeof BuilderActions;
}

const TAB_NAMES = ['Hits', 'Aggregations', 'Raw'];

@Radium
class ResultsColumn extends TerrainComponent<Props>
{

  public state: {
    selectedTab: number,
    highlightedTabs: any,
  } = {
      selectedTab: 0,
      highlightedTabs: Map({ hits: false, aggregations: false }),
    };

  public componentWillMount()
  {
    this.setState({
      selectedTab: TAB_NAMES.indexOf(this.props.query.resultsViewMode),
    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.resultsState.hits !== undefined && nextProps.resultsState.hits !== undefined &&
      !this.props.resultsState.hits.equals(nextProps.resultsState.hits) && this.state.selectedTab !== 0)
    {
      this.setState({
        highlightedTabs: this.state.highlightedTabs.set('hits', true),
      });
    }
    if (!_.isEqual(this.props.resultsState.aggregations, nextProps.resultsState.aggregations) && this.state.selectedTab !== 1)
    {
      this.setState({
        highlightedTabs: this.state.highlightedTabs.set('aggregations', true),
      });

    }
    if (this.props.query.resultsViewMode !== nextProps.query.resultsViewMode)
    {
      this.setState({
        selectedTab: TAB_NAMES.indexOf(nextProps.query.resultsViewMode),
      });
    }
  }

  public setSelectedTab(name, index)
  {
    this.props.builderActions.changeQuery(this.props.query.set('resultsViewMode', name));

    this.setState({
      selectedTab: index,
      highlightedTabs: this.state.highlightedTabs.set(name.toLowerCase(), false),
    });
  }

  public renderTabBar()
  {
    return (
      <div
        className='results-column-tabs'
        style={[backgroundColor(Colors().emptyBg)]}
      >
        {TAB_NAMES.map((name, index) =>
          <div
            className={classNames({
              'results-column-tab': true,
              'results-column-tab-selected': index === this.state.selectedTab,
            })}
            key={index}
            onClick={() => { this.setSelectedTab(name, index); }}
            style={index === this.state.selectedTab ? ACTIVE_TAB_STYLE : INACTIVE_TAB_STYLE}
          >
            <div className='results-column-tab-name' style={fontColor(Colors().text1)}>{name}</div>
            {
              (name.toLowerCase() !== 'raw') ?
                <div
                  className='results-column-tab-number'
                  style={this.state.highlightedTabs.get(name.toLowerCase()) ? ACTIVE_TAB_NUMBER_STYLE : INACTIVE_TAB_NUMBER_STYLE}
                >
                  {this.getNumberOf(name)}
                </div>
                :
                <div
                  className='results-column-tab-number'
                />
            }
          </div>,
        )}
      </div>
    );
  }

  public getNumberOf(name: string): string
  {
    switch (name)
    {
      case 'Hits':
        const hits = this.props.resultsState.hits;
        const size = hits === undefined ? 0 : hits.size;
        if (size < MAX_HITS)
        {
          return String(size);
        }
        return String(MAX_HITS) + '+';
      case 'Aggregations':
        const aggs = this.props.resultsState.aggregations;
        return String(_.keys(aggs).length);
      case 'Suggestions':
      default:
        return '';
    }
  }

  public renderRawResult()
  {
    const { resultsState } = this.props;
    const { hits } = resultsState;

    if (resultsState.hasError)
    {
      let detailMessage = resultsState.errorMessage;
      if (detailMessage.startsWith('Route'))
      {
        if (resultsState.subErrorMessage)
        {
          detailMessage += ` (details: "${resultsState.subErrorMessage}")`;
        }
      }
      return (
        <InfoArea
          large='There was an error with your query.'
          small={detailMessage}
        />
      );
    }

    if (resultsState.loading)
    {
      return <InfoArea
        large='Querying results...'
      />;
    }

    const formatted = JSON.stringify(resultsState.rawResult, null, 2);
    return (
      <div className='results-column-raw-results'>
        <TQLEditor
          language={'application/json'}
          tql={formatted}
          canEdit={false}
        />
      </div>
    );
  }

  public renderContent()
  {
    switch (this.state.selectedTab)
    {
      case 0:
        return (
          <HitsArea
            query={this.props.query}
            canEdit={this.props.canEdit}
            db={this.props.db}
            algorithmId={this.props.algorithmId}
            onNavigationException={this.props.onNavigationException}
            resultsState={this.props.resultsState}
            showExport={this.props.showExport}
            showCustomizeView={this.props.showCustomizeView}
            allowSpotlights={this.props.allowSpotlights}
            onIncrementHitsPage={this.props.onIncrementHitsPage}
          />
        );
      case 1:
        return (
          <AggregationsArea
            query={this.props.query}
            db={this.props.db}
            resultsState={this.props.resultsState}
          />
        );
      case 2:
        return this.renderRawResult();
      default:
        return <div>No information</div>;
    }
  }

  public render()
  {
    return (
      <div className='results-column-wrapper'>
        {TerrainTools.isFeatureEnabled(TerrainTools.ADVANCED_RESULTS) && this.renderTabBar()}
        {this.renderContent()}
      </div>);
  }
}

const ACTIVE_TAB_STYLE = _.extend({}, getStyle('borderBottomColor', Colors().active), backgroundColor(Colors().bg3));
const INACTIVE_TAB_STYLE = _.extend({}, getStyle('borderBottomColor', Colors().bg3), backgroundColor(Colors().bg2));
const ACTIVE_TAB_NUMBER_STYLE = _.extend({}, fontColor('#fff'), backgroundColor(Colors().active));
const INACTIVE_TAB_NUMBER_STYLE = _.extend({},
  fontColor(Colors().altText1), backgroundColor((localStorage.getItem('theme') === 'DARK') ? Colors().altBg1 : Colors().bg1));

export default Util.createTypedContainer(
  ResultsColumn,
  [],
  { builderActions: BuilderActions },
);
