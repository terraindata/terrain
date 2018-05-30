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

import AnalyticsSelector from 'analytics/components/AnalyticsSelector';
import Loading from 'common/components/Loading';
import RadioButtons from 'common/components/RadioButtons';
import * as Immutable from 'immutable';
import { loadLastRoute, saveLastRoute } from 'library/helpers/LibraryRoutesHelper';
import * as _ from 'lodash';
import * as React from 'react';
import MultipleAreaChart from '../../charts/components/MultipleAreaChart';
import TerrainComponent from './../../common/components/TerrainComponent';
import RolesActions from './../../roles/data/RolesActions';
import { LibraryState } from './../LibraryTypes';
import * as LibraryTypes from './../LibraryTypes';
import AlgorithmsColumn from './AlgorithmsColumn';
import CategoriesColumn from './CategoriesColumn';
import GroupsColumn from './GroupsColumn';
import './Library.less';
import LibraryInfoColumn from './LibraryInfoColumn';

export interface Props
{
  params?: any;
  location?: any;
  router?: any;
  route?: any;
  canPinAlgorithms?: boolean;
  basePath: string;
  singleColumn?: boolean;
}

class Library extends TerrainComponent<any>
{
  // Give names to each of the library columns
  public static CATEGORIES__COLUMN = 'categories';
  public static GROUPS_COLUMN = 'groups';
  public static ALGORITHMS_COLUMN = 'algorithms';

  public static defaultProps: Partial<Props> = {
    params: {},
    location: {},
    router: {},
    route: {},
    canPinAlgorithms: false,
    singleColumn: false,
  };

  public cancelSubscription = null;

  public componentWillMount()
  {
    const { basePath, analytics, schema } = this.props;

    if (analytics.selectedAnalyticsConnection === '')
    {
      const analyticsConnection = null;

      const lastAnalyticsConnection = localStorage.getItem('analyticsConnection');
      if (lastAnalyticsConnection !== null)
      {
        this.props.analyticsActions.selectAnalyticsConnection(
          lastAnalyticsConnection,
        );
      }
      else
      {
        const firstServerWithAnalytics = schema.servers.find(
          (value, key) => value.isAnalytics,
        );
        if (firstServerWithAnalytics !== undefined)
        {
          this.props.analyticsActions.selectAnalyticsConnection(
            firstServerWithAnalytics.name,
          );
          localStorage.setItem('analyticsConnection', firstServerWithAnalytics.name);
        }
      }
    }

    if ((!this.props.params || !this.props.params.categoryId))
    {
      loadLastRoute(basePath);
    }
  }

  public componentDidMount()
  {
    this.props.roleActions.fetch();
    this.props.userActions({
      actionType: 'fetch',
    });
  }

  public componentWillReceiveProps(nextProps)
  {
    const { analytics } = this.props;
    const { analytics: nextAnalytics } = nextProps;
    const {
      selectedAnalyticsConnection,
      selectedMetric,
      selectedInterval,
      selectedDateRange,
      pinnedAlgorithms,
    } = analytics;

    const {
      selectedAnalyticsConnection: nextSelectedAnalyticsConnection,
      selectedMetric: nextSelectedMetric,
      selectedInterval: nextSelectedInterval,
      selectedDateRange: nextSelectedDateRange,
      pinnedAlgorithms: nextPinnedAlgorithms,
    } = nextAnalytics;

    const analyticsFilterChanged = (selectedMetric !== nextSelectedMetric) ||
      (selectedAnalyticsConnection !== nextSelectedAnalyticsConnection) ||
      (selectedInterval !== nextSelectedInterval) ||
      (selectedDateRange !== nextSelectedDateRange) ||
      (pinnedAlgorithms !== nextPinnedAlgorithms);

    if (analyticsFilterChanged)
    {
      this.fetchAnalytics(nextProps);
    }
  }

  public componentWillUnmount()
  {
    this.props.libraryAlgorithmActions.unselect();
  }

  public getData(algorithmId: ID)
  {
    const { analytics } = this.props;

    // Remove when analytics mock up have valid algorithm ids.
    let data = [];

    const analyticsData = analytics.data.get(algorithmId);
    if (analyticsData !== undefined)
    {
      data = analyticsData;
    }

    return data;
  }

  public getDatasets()
  {
    const { library: libraryState, analytics } = this.props;
    const { algorithms, selectedAlgorithm } = libraryState;

    const datasets = algorithms
      .filter((algorithm) =>
      {
        return selectedAlgorithm === algorithm.id ||
          analytics.pinnedAlgorithms.get(algorithm.id, false);
      })
      .map((algorithm) =>
      {
        const data = this.getData(algorithm.deployedName);
        return {
          id: algorithm.id,
          label: algorithm.name,
          data,
          isPinned: analytics.pinnedAlgorithms.get(algorithm.id, false),
          hasData: data.length > 0,
        };
      });

    return datasets.toMap();
  }

  public fetchAnalytics(props)
  {
    const { analytics, library } = props;
    const { selectedAlgorithm } = library;
    const { pinnedAlgorithms } = analytics;

    const algorithmIds = pinnedAlgorithms.keySeq().toJS();
    if (selectedAlgorithm !== null && selectedAlgorithm !== undefined)
    {
      algorithmIds.push(selectedAlgorithm);
    }

    if (algorithmIds.length > 0)
    {
      this.props.analyticsActions.fetch(
        analytics.selectedAnalyticsConnection,
        algorithmIds,
        analytics.selectedMetric,
        analytics.selectedInterval,
        analytics.selectedDateRange,
      );
    }
  }

  public handleMetricRadioButtonClick(optionValue)
  {
    const { analytics } = this.props;

    if (analytics.selectedAnalyticsConnection !== null)
    {
      this.props.analyticsActions.selectMetric(optionValue);
    }
  }

  public handleIntervalRadioButtonClick(optionValue)
  {
    const { analytics } = this.props;

    if (analytics.selectedAnalyticsConnection !== null)
    {
      this.props.analyticsActions.selectInterval(optionValue);
    }
  }

  public handleDateRangeRadioButtonClick(optionValue)
  {
    const { analytics } = this.props;

    if (analytics.selectedAnalyticsConnection !== null)
    {
      const numericOptionValue = parseInt(optionValue, 10);

      this.props.analyticsActions.selectDateRange(numericOptionValue);
    }
  }

  public handleConnectionChange(connectionName)
  {
    const { analytics, schema } = this.props;

    this.props.analyticsActions.selectAnalyticsConnection(connectionName);
    localStorage.setItem('analyticsConnection', connectionName);
  }

  public handleLegendClick(datasetId)
  {
    this.props.analyticsActions.pinAlgorithm(datasetId);
  }

  public isColumnVisible(columnName)
  {
    const { singleColumn, router } = this.props;
    const params = router !== undefined && router.params !== undefined ? router.params : {};
    const { categoryId, groupId, algorithmId } = params;

    return !singleColumn ||
      (categoryId === undefined &&
        groupId === undefined &&
        algorithmId === undefined &&
        columnName === Library.CATEGORIES__COLUMN
      ) ||
      (categoryId !== undefined &&
        groupId === undefined &&
        algorithmId === undefined &&
        columnName === Library.GROUPS_COLUMN
      ) ||
      (categoryId !== undefined &&
        groupId !== undefined &&
        columnName === Library.ALGORITHMS_COLUMN
      );
  }

  public render()
  {
    const {
      library: libraryState,
      analytics,
      schema,
      router,
      basePath,
      canPinAlgorithms,
      singleColumn,
    } = this.props;

    const {
      dbs,
      categories,
      groups,
      algorithms,
      selectedAlgorithm,
      categoriesOrder,
    } = libraryState;

    const {
      selectedMetric,
      selectedInterval,
      selectedDateRange,
      selectedDateRangeDomain,
      pinnedAlgorithms,
    } = analytics;

    const hasPinnedAlgorithms = pinnedAlgorithms.valueSeq().includes(true);
    const { params } = router;
    const datasets = this.getDatasets();

    const categoryId = params.categoryId ? +params.categoryId : null;
    let groupId = params.groupId ? +params.groupId : null;
    if (groupId === null)
    {
      groupId = categories.get(categoryId).groupsOrder.first() ?
        +categories.get(categoryId).groupsOrder.first() : null;
      params['groupId'] = groupId;
    }
    const algorithmId = params.algorithmId ? +params.algorithmId : null;
    const category: LibraryTypes.Category = categoryId !== null ? categories.get(categoryId) : undefined;
    const group: LibraryTypes.Group = groupId !== null ? groups.get(groupId) : undefined;
    const algorithm: LibraryTypes.Algorithm = algorithmId !== null ? algorithms.get(algorithmId) : undefined;
    const groupsOrder: List<ID> = category !== undefined ? category.groupsOrder : undefined;
    const algorithmsOrder: List<ID> = group !== undefined ? group.algorithmsOrder : undefined;
    if (!!this.props.location.pathname)
    {
      saveLastRoute(basePath, this.props.location);
    }

    const groupsReferrer = singleColumn && category !== undefined ?
      {
        label: category.name,
        path: `/${basePath}`,
      } : null;

    const algorithmsReferrer = singleColumn && group !== undefined ?
      {
        label: group.name,
        path: `/${basePath}/${categoryId}`,
      } : null;

    const selectedMetricObject = analytics.availableMetrics.find((metric) =>
    {
      return metric.events === selectedMetric;
    });

    return (
      <div className='library library-layout-horizontal'>
        <div className='library-top'>
          {this.isColumnVisible(Library.CATEGORIES__COLUMN) ?
            <CategoriesColumn
              {...{
                categories,
                categoriesOrder,
                params,
                basePath,
                categoryActions: this.props.libraryCategoryActions,
                algorithms,
                algorithmActions: this.props.libraryAlgorithmActions,
              }}
              isFocused={group === undefined}
            /> : null
          }
          {this.isColumnVisible(Library.GROUPS_COLUMN) ?
            <GroupsColumn
              {...{
                dbs,
                categories,
                groups,
                algorithms,
                groupsOrder,
                categoryId,
                params,
                basePath,
                groupActions: this.props.libraryGroupActions,
                referrer: groupsReferrer,
                algorithmActions: this.props.libraryAlgorithmActions,
              }}
              isFocused={algorithmId === null}
            /> : null
          }
          {this.isColumnVisible(Library.ALGORITHMS_COLUMN) ?
            <AlgorithmsColumn
              {...{
                algorithms,
                selectedAlgorithm,
                algorithmsOrder,
                categoryId,
                groupId,
                params,
                canPinItems: canPinAlgorithms,
                basePath,
                router,
                algorithmActions: this.props.libraryAlgorithmActions,
                analytics,
                analyticsActions: this.props.analyticsActions,
                groups,
                referrer: algorithmsReferrer,
              }}
            /> : null
          }
          {!canPinAlgorithms ?
            <LibraryInfoColumn
              {...{
                dbs,
                category,
                group,
                algorithm,
                categoryActions: this.props.libraryCategoryActions,
                groupActions: this.props.libraryGroupActions,
                algorithmActions: this.props.libraryAlgorithmActions,
                libraryActions: this.props.libraryActions,
                roleActions: this.props.roleActions,
              }}
            /> : null}
        </div>
        {canPinAlgorithms && (selectedAlgorithm !== null || hasPinnedAlgorithms) ?
          <div className='library-bottom'>
            <div className='library-analytics-chart-wrapper'>
              {analytics.loaded ?
                (analytics.errors.length === 0 ?
                  <MultipleAreaChart
                    datasets={datasets}
                    xDataKey={'key'}
                    yDataKey={'doc_count'}
                    onLegendClick={this.handleLegendClick}
                    legendTitle={selectedMetricObject !== undefined ?
                      selectedMetricObject.label : ''
                    }
                    domain={selectedDateRangeDomain}
                    dateFormat={
                      analytics.selectedInterval === 'hour' ?
                        'MM/DD/YYYY ha' : 'MM/DD/YYYY'
                    }
                  /> : (
                    <div className='library-analytics-error'>
                      <p>An error occurred while fetching the analytics data</p>
                      <ul>{analytics.errors.map((e, i) => <li key={i}>* {e}</li>)}</ul>
                    </div>)
                ) :
                <Loading
                  width={150}
                  height={150}
                  loading={true}
                  loaded={false}
                />
              }
            </div>
            <div className='library-analytics-selector-wrapper'>
              <AnalyticsSelector
                analytics={analytics}
                analyticsActions={this.props.analyticsActions}
                servers={schema.servers}
                analyticsConnection={analytics.selectedAnalyticsConnection}
                onMetricSelect={this.handleMetricRadioButtonClick}
                onIntervalSelect={this.handleIntervalRadioButtonClick}
                onDateRangeSelect={this.handleDateRangeRadioButtonClick}
                onConnectionChange={this.handleConnectionChange}
              />
            </div>
          </div> : null
        }
      </div>
    );
  }
}

export default Library;
