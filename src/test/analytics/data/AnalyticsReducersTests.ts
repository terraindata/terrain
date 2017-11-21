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
import ActionTypes from 'analytics/data/AnalyticsActionTypes';
import reducer from 'analytics/data/AnalyticsReducer';
import { _AnalyticsState, AnalyticsState } from 'analytics/data/AnalyticsStore';
import * as Immutable from 'immutable';

describe('AnalyticsReducer', () =>
{
  let analytics: AnalyticsState = _AnalyticsState({});

  const analyticsResponse = {
    1: [
      {
        key_as_string: '2015-06-02T00:00:00.000Z',
        key: 1433203200000,
        doc_count: 10320,
      },
      {
        key_as_string: '2015-06-03T00:00:00.000Z',
        key: 1433289600000,
        doc_count: 12582,
      },
      {
        key_as_string: '2015-06-04T00:00:00.000Z',
        key: 1433376000000,
        doc_count: 12279,
      },
      {
        key_as_string: '2015-06-05T00:00:00.000Z',
        key: 1433462400000,
        doc_count: 6187,
      },
      {
        key_as_string: '2015-06-06T00:00:00.000Z',
        key: 1433548800000,
        doc_count: 937,
      },
    ],
  };

  const variantId = 1;

  const availableMetrics = [
    {
      database: 1,
      events: 'impression',
      id: 2,
      label: 'Impressions',
    },
    {
      database: 1,
      events: 'click',
      id: 3,
      label: 'Clicks\n',
    },
    {
      database: 1,
      events: 'conversion',
      id: 4,
      label: 'Conversions',
    },
    {
      database: 1,
      events: 'click,impression',
      id: 5,
      label: 'Click Through Rate',
    },
    {
      database: 1,
      events: 'conversion,impression',
      id: 6,
      label: 'Conversion Rate',
    },
  ];

  beforeEach(() =>
  {
    analytics = _AnalyticsState({});
  });

  it('should return the inital state', () =>
  {
    expect(reducer(undefined, {})).toEqual(analytics);
  });

  describe('#fetchStart', () =>
  {
    it('should handle analytics.fetchStart and clear errors', () =>
    {
      analytics = analytics.set('errors', ['error 1']);

      const nextState = reducer(analytics, {
        type: ActionTypes.fetchStart,
      });

      expect(
        nextState,
      ).toEqual(
        analytics
          .set('loaded', false)
          .set('errors', []),
      );
    });
  });

  describe('#fetchSuccess', () =>
  {
    const start = new Date(2015, 5, 2);
    const end = new Date(2015, 5, 20);

    it('should handle analytics.fetchSuccess and clear errors', () =>
    {
      analytics = analytics.set('errors', ['error 1']);
      const dateRangeDomain = {
        start: start.getTime(),
        end: end.getTime(),
      };

      const nextState = reducer(analytics, {
        type: ActionTypes.fetchSuccess,
        payload: {
          analytics: analyticsResponse,
          dateRangeDomain,
        },
      });

      expect(
        nextState,
      ).toEqual(
        analytics
          .set('loaded', true)
          .setIn(['data', '1'], analyticsResponse[1])
          .set('selectedDateRangeDomain', dateRangeDomain)
          .set('errors', []),
      );
    });
  });

  describe('#fetchFailure', () =>
  {
    it('should handle analytics.fetchFailure', () =>
    {
      const errorMessages = ['error 1', 'error 2'];
      const nextState = reducer(analytics, {
        type: ActionTypes.fetchFailure,
        payload: {
          errors: errorMessages,
        },
      });

      expect(
        nextState,
      ).toEqual(
        analytics
          .set('loaded', true)
          .set('errors', errorMessages),
      );
    });
  });

  describe('#selectMetric', () =>
  {
    it('should handle analytics.selectMetric', () =>
    {
      const nextState = reducer(analytics, {
        type: ActionTypes.selectMetric,
        payload: {
          metric: [100],
        },
      });

      expect(
        nextState.selectedMetric,
      ).toEqual(
        [100],
      );
    });
  });

  describe('#selectInterval', () =>
  {
    it('should handle analytics.selectInterval', () =>
    {
      const nextState = reducer(analytics, {
        type: ActionTypes.selectInterval,
        payload: {
          intervalId: 'day',
        },
      });

      expect(
        nextState.selectedInterval,
      ).toEqual(
        'day',
      );
    });
  });

  describe('#selectDateRange', () =>
  {
    it('should handle analytics.selectDateRange', () =>
    {
      const nextState = reducer(analytics, {
        type: ActionTypes.selectDateRange,
        payload: {
          dateRangeId: '2',
        },
      });

      expect(
        nextState.selectedDateRange,
      ).toEqual(
        '2',
      );
    });
  });

  describe('#pinVariant', () =>
  {
    it('should handle analytics.pinVariant', () =>
    {
      let nextState = reducer(analytics, {
        type: ActionTypes.pinVariant,
        payload: {
          variantId,
        },
      });

      expect(nextState.pinnedVariants.get(variantId)).toEqual(true);

      nextState = reducer(nextState, {
        type: ActionTypes.pinVariant,
        payload: {
          variantId,
        },
      });

      expect(nextState.pinnedVariants.get(variantId)).toEqual(false);
    });
  });

  describe('#fetchAvailableMetricsSuccess', () =>
  {
    describe('when availableMetrics is empty', () =>
    {
      it('should store the available metrics in the availableMetrics key', () =>
      {
        const nextState = reducer(analytics, {
          type: ActionTypes.fetchAvailableMetricsSuccess,
          payload: {
            availableMetrics,
          },
        });

        expect(nextState.availableMetrics).toEqual(
          analytics.availableMetrics.concat(availableMetrics),
        );
      });
    });

    describe('when availableMetrics has been loaded previously', () =>
    {
      it('should clean availableMetrics key and then store the new fetched metrics', () =>
      {
        const analyticsWithAvailableMetrics = analytics.set(
          'availableMetrics',
          analytics.availableMetrics.push(availableMetrics[0]),
        );

        const nextState = reducer(analyticsWithAvailableMetrics, {
          type: ActionTypes.fetchAvailableMetricsSuccess,
          payload: {
            availableMetrics,
          },
        });

        expect(nextState.availableMetrics.count()).toEqual(5);
        expect(nextState.availableMetrics).toEqual(
          analytics.availableMetrics.concat(availableMetrics),
        );
      });
    });
  });
});
