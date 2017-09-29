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
import Actions from 'analytics/data/AnalyticsActions';
import ActionTypes from 'analytics/data/AnalyticsActionTypes';
import { _AnalyticsState, AnalyticsState } from 'analytics/data/AnalyticsStore';
import * as Immutable from 'immutable';
import { Ajax, createMockStore } from '../../helpers';

const MIDWAY_BASE_URL = `${MIDWAY_HOST}/midway/v1`;

const analyticsResponse = [
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
];

const mockStore = createMockStore();

describe('AnalyticsActions', () =>
{
  const analytics: AnalyticsState = _AnalyticsState({});
  const metricId = 1;

  describe('#fetch', () =>
  {
    const variantId = 1;
    const accessToken = 'valid-access-token';
    const start = new Date(2015, 5, 2);
    const end = new Date(2015, 5, 20);

    it('should create a analytics.fetch action after the variant analytics have been fetched', (done) =>
    {
      Ajax.getAnalytics = (
        variantIds: ID[],
        start: Date,
        end: Date,
        metricId: number,
        onLoad: (response: any) => void,
        onError?: (ev: Event) => void
      ) => onLoad(analyticsResponse);

      const expectedActions = [
        {
          type: ActionTypes.fetch,
          payload: { analytics: analyticsResponse },
        },
      ];

      const store = mockStore({ analytics });

      store.dispatch(
        Actions.fetch([variantId], metricId, (analyticsResponseParam) =>
        {
          expect(store.getActions()).toEqual(expectedActions);
          done();
        }),
      );
    });
  });

  describe('#selectMetric', () =>
  {
    it('should create a analytics.selectMetric', () =>
    {
      const expectedActions = [
        {
          type: ActionTypes.selectMetric,
          payload: { metricId },
        },
      ];

      const store = mockStore({ analytics });

      store.dispatch(Actions.selectMetric(metricId));
      expect(store.getActions()).toEqual(expectedActions);
    });
  });
});
