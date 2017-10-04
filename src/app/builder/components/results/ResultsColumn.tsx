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

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions

import * as Immutable from 'immutable';
import './ResultsArea.less';
const { Map, List } = Immutable;
import * as classNames from 'classnames';
import * as _ from 'lodash';
import * as React from 'react';

import BackendInstance from '../../../../database/types/BackendInstance';
import Query from '../../../../items/types/Query';
import Ajax from '../../../util/Ajax';
import Actions from '../../data/BuilderActions';
import ResultsArea from './ResultsArea';
import Radium = require('radium');

import InfiniteScroll from '../../../common/components/InfiniteScroll';
import TerrainComponent from '../../../common/components/TerrainComponent';

const RESULTS_PAGE_SIZE = 20;

export interface Props
{
  resultsState: ResultsState;
  exportState?: FileImportState;
  db: BackendInstance;
  query: Query;
  canEdit: boolean;
  variantName: string;
  showExport: boolean;
  showCustomizeView: boolean;
  allowSpotlights: boolean;
  onNavigationException: () => void;
}

const TAB_NAMES = ['Hits', 'Aggregations', 'Raw'];

@Radium
class ResultsColumn extends TerrainComponent<Props>
{

  public state: {
    selectedTab: number,
  } = {
    selectedTab: 0,
  };

  public setSelectedTab(index)
  {
    this.setState({
      selectedTab: index,
    });
  }

  public renderTabBar()
  {
    return ( <div className='results-column-tabs'>
        { TAB_NAMES.map((name, index) => 
          <div 
            className={classNames({
              'results-column-tab': true,
              'results-column-tab-selected': index === this.state.selectedTab,
            })}
            key={index}
            onClick={()=>{this.setSelectedTab(index)}}
          >
          {name}
          </div>
      )}
      </div>
    );
  }


  public renderContent()
  {
    switch (this.state.selectedTab)
    {
      case 0: 
        return (
          <ResultsArea
            query={this.props.query}
            canEdit={this.props.canEdit}
            db={this.props.db}
            variantName={this.props.variantName}
            onNavigationException={this.props.onNavigationException}
            resultsState={this.props.resultsState}
            showExport={this.props.showExport}
            showCustomizeView={this.props.showCustomizeView}
            allowSpotlights={this.props.allowSpotlights}
            exportState={this.props.exportState}
          />
        );
      case 1:
        return <div>Aggregations</div>
      case 2: 
        return <div>Raw results</div>
      default:
        return <div>No information</div>
    }
  }

  public render()
  {
    return (
      <div className='results-column-wrapper'>
        { this.renderTabBar() }
        { this.renderContent() }
    </div>);
  }
}

export default ResultsColumn;
