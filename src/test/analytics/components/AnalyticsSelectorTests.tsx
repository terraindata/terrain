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
import { _AnalyticsState, AnalyticsState } from 'analytics/data/AnalyticsStore';
import { shallow } from 'enzyme';
import * as Immutable from 'immutable';
import * as React from 'react';
import configureStore from 'redux-mock-store';
import { _Server } from 'schema/SchemaTypes';

describe('AnalyticsSelector', () =>
{
  const analytics: AnalyticsState = _AnalyticsState({
    loaded: false,
    data: Immutable.Map({}),
    selectedMetric: [1],
    availableMetrics: Immutable.List([
      { events: 'impressions', label: 'Impressions' },
    ]),
  });

  const server1 = 'My ElasticSearch Instance';
  const server2 = 'Zazzle ES 1';
  const servers = Immutable.Map({
    [server1]: _Server({
      name: server1,
      connectionId: 1,
      isAnalytics: true,
      analyticsIndex: 'terrain-analytics',
      analyticsType: 'events',
    }),
    [server2]: _Server({
      name: server2,
      connectionId: 2,
      isAnalytics: false,
    }),
  });

  const analyticsActions = {
    fetchAvailableMetrics: jest.fn(),
  };

  const analyticsConnection = 'My ElasticSearch Instance';

  let analyticsComponent = null;

  const onMetricSelect = (value) => null;
  const onIntervalSelect = (value) => null;
  const onDateRangeSelect = (value) => null;
  const onConnectionChange = (value) => null;

  beforeEach(() =>
  {
    analyticsComponent = shallow(
      <AnalyticsSelector
        analytics={analytics}
        analyticsActions={analyticsActions}
        servers={servers}
        analyticsConnection={analyticsConnection}
        onMetricSelect={onMetricSelect}
        onIntervalSelect={onIntervalSelect}
        onDateRangeSelect={onDateRangeSelect}
        onConnectionChange={onConnectionChange}
      />,
    );
  });

  describe('#render', () =>
  {
    it('should have 3 MultiSwitch components', () =>
    {
      const connectionDropdown = analyticsComponent.find('Dropdown');
      const multiswitchs = analyticsComponent.find('MultiSwitch');

      expect(connectionDropdown).toHaveLength(1);
      expect(multiswitchs).toHaveLength(3);
      expect(multiswitchs.nodes[0].props.onChange).toEqual(onMetricSelect);
      expect(multiswitchs.nodes[1].props.onChange).toEqual(onIntervalSelect);
      expect(multiswitchs.nodes[2].props.onChange).toEqual(onDateRangeSelect);
    });
  });

  describe('#getConnectionOptions', () =>
  {
    it('should return the list of servers with analytics', () =>
    {
      const connectionOptions = analyticsComponent.instance().getConnectionOptions();

      expect(connectionOptions.count()).toEqual(1);
      expect(connectionOptions.first()).toEqual(server1);
    });
  });

  describe('#getMetricOptions', () =>
  {
    it('should return the list of available metrics', () =>
    {
      const { availableMetrics } = analytics;
      const metricOptions = analyticsComponent.instance().getMetricOptions();

      expect(metricOptions.count()).toEqual(1);
      expect(metricOptions.first().value).toEqual(availableMetrics.first().events);
      expect(metricOptions.first().label).toEqual(availableMetrics.first().label);
    });
  });
});
