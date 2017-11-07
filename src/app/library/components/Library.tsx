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
import * as _ from 'lodash';
import * as React from 'react';
import { browserHistory } from 'react-router';
import MultipleAreaChart from '../../charts/components/MultipleAreaChart';
import TerrainComponent from './../../common/components/TerrainComponent';
import RolesActions from './../../roles/data/RolesActions';
import { LibraryState } from './../data/LibraryStore';
import * as LibraryTypes from './../LibraryTypes';
import AlgorithmsColumn from './AlgorithmsColumn';
import GroupsColumn from './GroupsColumn';
import './Library.less';
import LibraryInfoColumn from './LibraryInfoColumn';
import VariantsColumn from './VariantsColumn';

export interface Props
{
  params?: any;
  location?: any;
  router?: any;
  route?: any;
  canPinVariants?: boolean;
  basePath: string;
}

export interface State
{
  libraryState: LibraryState;
}

class Library extends TerrainComponent<any>
{
  public static defaultProps: Partial<Props> = {
    params: {},
    location: {},
    router: {},
    route: {},
    canPinVariants: false,
  };

  public cancelSubscription = null;

  public state: State = {
    libraryState: null,
  };

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

    if ((!this.props.params || !this.props.params.groupId))
    {
      // no path given, redirect to last library path
      const path = this.getLastPath();
      if (path != null)
      {
        browserHistory.replace(path);
      }
    }
  }

  public componentDidMount()
  {
    this.props.roleActions.fetch();
    this.props.userActions.fetch();
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
      pinnedVariants,
    } = analytics;

    const {
      selectedAnalyticsConnection: nextSelectedAnalyticsConnection,
      selectedMetric: nextSelectedMetric,
      selectedInterval: nextSelectedInterval,
      selectedDateRange: nextSelectedDateRange,
      pinnedVariants: nextPinnedVariants,
    } = nextAnalytics;

    const analyticsFilterChanged = (selectedMetric !== nextSelectedMetric) ||
      (selectedAnalyticsConnection !== nextSelectedAnalyticsConnection) ||
      (selectedInterval !== nextSelectedInterval) ||
      (selectedDateRange !== nextSelectedDateRange) ||
      (pinnedVariants !== nextPinnedVariants);

    if (analyticsFilterChanged)
    {
      this.fetchAnalytics(nextProps);
    }
  }

  public getData(variantId: ID)
  {
    const { analytics } = this.props;

    // Remove when analytics mock up have valid variant ids.
    let data = [];

    const analyticsData = analytics.data.get(variantId);
    if (analyticsData !== undefined)
    {
      data = analyticsData;
    }

    return data;
  }

  public getDatasets()
  {
    const { library: libraryState, analytics } = this.props;
    const { variants, selectedVariant } = libraryState;

    const datasets = variants
      .filter((variant) =>
      {
        return selectedVariant === variant.id ||
          analytics.pinnedVariants.get(variant.id, false);
      })
      .map((variant) =>
      {
        return { id: variant.id, label: variant.name, data: this.getData(variant.id) };
      });

    return datasets.toMap();
  }

  public getLastPath()
  {
    const { basePath } = this.props;

    const lastPath = basePath === 'library' ? 'lastLibraryPath' : 'lastAnalyticsPath';
    // no path given, redirect to last library path
    return localStorage.getItem(lastPath);
  }

  public setLastPath()
  {
    const { location, basePath } = this.props;

    const lastPath = basePath === 'library' ? 'lastLibraryPath' : 'lastAnalyticsPath';
    localStorage.setItem(lastPath, location.pathname);
  }

  public fetchAnalytics(props)
  {
    const { analytics, library } = props;
    const { selectedVariant } = library;
    const { pinnedVariants } = analytics;

    const variantIds = pinnedVariants.keySeq().toJS();
    if (selectedVariant !== null && selectedVariant !== undefined)
    {
      variantIds.push(selectedVariant);
    }

    if (variantIds.length > 0)
    {
      this.props.analyticsActions.fetch(
        analytics.selectedAnalyticsConnection,
        variantIds,
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
      let numericOptionValue = null;
      if (optionValue.indexOf(',') > -1)
      {
        numericOptionValue = optionValue.split(',').map((o) => parseInt(o, 10));
      } else
      {
        numericOptionValue = [parseInt(optionValue, 10)];
      }

      this.props.analyticsActions.selectMetric(numericOptionValue);
    }
  }

  public handleIntervalRadioButtonClick(optionValue)
  {
    const { analytics } = this.props;

    if (analytics.selectedAnalyticsConnection !== null)
    {
      const numericOptionValue = parseInt(optionValue, 10);
      this.props.analyticsActions.selectInterval(numericOptionValue);
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
    this.props.analyticsActions.pinVariant(datasetId);
  }

  public render()
  {
    const { library: libraryState, analytics, schema } = this.props;
    const {
      dbs,
      groups,
      algorithms,
      variants,
      selectedVariant,
      groupsOrder,
    } = libraryState;

    const {
      selectedMetric,
      selectedInterval,
      selectedDateRange,
      pinnedVariants,
    } = analytics;

    const hasPinnedVariants = pinnedVariants.valueSeq().includes(true);

    const { router, basePath, canPinVariants } = this.props;
    const { params } = router;

    const datasets = this.getDatasets();

    const groupId = params.groupId ? +params.groupId : null;
    const algorithmId = params.algorithmId ? +params.algorithmId : null;
    const variantIds = params.variantId ? params.variantId.split(',') : null;

    let group: LibraryTypes.Group;
    let algorithm: LibraryTypes.Algorithm;
    let variant: LibraryTypes.Variant;
    let algorithmsOrder: List<ID>;
    let variantsOrder: List<ID>;

    if (groupId !== null)
    {
      group = groups.get(groupId);

      if (group !== undefined)
      {
        algorithmsOrder = group.algorithmsOrder;

        if (algorithmId !== null)
        {
          algorithm = algorithms.get(algorithmId);

          if (algorithm !== undefined)
          {
            variantsOrder = algorithm.variantsOrder;

            if (variantIds !== null)
            {
              if (variantIds.length === 0)
              {
                browserHistory.replace(`/${basePath}/${groupId}/${algorithmId}`);
              } else if (variantIds.length === 1)
              {
                variant = variants.get(+variantIds[0]);
              }
            }
          } else
          {
            // !algorithm
            browserHistory.replace(`/${basePath}/${groupId}`);
          }
        }
      }
      else
      {
        // !group
        browserHistory.replace(`/${basePath}`);
      }
    }

    if (!!this.props.location.pathname)
    {
      this.setLastPath();
    }

    return (
      <div className='library library-layout-horizontal'>
        <div className='library-top'>
          <GroupsColumn
            {...{
              groups,
              groupsOrder,
              params,
              basePath,
              groupActions: this.props.libraryGroupActions,
              variants,
            }}
            isFocused={algorithm === undefined}
          />
          <AlgorithmsColumn
            {...{
              dbs,
              groups,
              algorithms,
              variants,
              algorithmsOrder,
              groupId,
              params,
              basePath,
              algorithmActions: this.props.libraryAlgorithmActions,
            }}
            isFocused={variantIds === null}
          />
          <VariantsColumn
            {...{
              variants,
              selectedVariant,
              variantsOrder,
              groupId,
              algorithmId,
              params,
              canPinItems: canPinVariants,
              basePath,
              router,
              variantActions: this.props.libraryVariantActions,
              analytics,
              analyticsActions: this.props.analyticsActions,
              algorithms,
            }}
          />
          {!canPinVariants ?
            <LibraryInfoColumn
              {...{
                dbs,
                group,
                algorithm,
                variant,
                groupActions: this.props.libraryGroupActions,
                algorithmActions: this.props.libraryAlgorithmActions,
                variantActions: this.props.libraryVariantActions,
                libraryActions: this.props.libraryActions,
                roleActions: this.props.roleActions,
              }}
            /> : null}
        </div>
        {canPinVariants && (selectedVariant !== null || hasPinnedVariants) ?
          <div className='library-bottom'>
            <div className='library-analytics-chart-wrapper'>
              {analytics.loaded ?
                (analytics.errors.length === 0 ?
                  <MultipleAreaChart
                    datasets={datasets}
                    xDataKey={'key'}
                    yDataKey={'doc_count'}
                    onLegendClick={this.handleLegendClick}
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
