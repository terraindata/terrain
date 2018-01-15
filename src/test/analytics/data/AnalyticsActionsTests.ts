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

import * as Immutable from 'immutable';
import { _LibraryState, LibraryState } from 'library/LibraryTypes';
import * as LibraryTypes from 'library/LibraryTypes';
import { _SchemaState, SchemaState } from 'schema/SchemaTypes';
import AnalyticsHelper from 'test-helpers/AnalyticsHelper';
import { Ajax, createMockStore } from 'test-helpers/helpers';

const MIDWAY_BASE_URL = `${MIDWAY_HOST}/midway/v1`;

const serverResponseMock = AnalyticsHelper.mockServerResponses();

const mockStore = createMockStore();

describe('AnalyticsActions', () =>
{
  const analytics = AnalyticsHelper.mockState().getState();
  const schema: SchemaState = _SchemaState({
    servers: Immutable.Map({
      'My ElasticSearch Instance': {
        id: 'My ElasticSearch Instance',
        type: 'server',
        name: 'My ElasticSearch Instance',
        connectionId: 1,
        isAnalytics: true,
        analyticsIndex: 'terrain-analytics',
        analyticsType: 'events',
      },
    }),
  });

  const algorithmId = '1';
  const metric = 'impressions';
  const intervalId = 'day';
  const dateRangeId = 2;
  const connectionName = 'My ElasticSearch Instance';

  describe('#fetch', () =>
  {
    const start = new Date(2015, 5, 2);
    const end = new Date(2015, 5, 20);

    Ajax.getServerTime = (
      onLoad: (response: any) => void,
      onError?: (ev: Event) => void,
    ) => onLoad(serverResponseMock.serverTime());

    describe('when fetch is successful', () =>
    {
      it('should create a analytics.fetchSuccess action after the algorithm analytics have been fetched', (done) =>
      {
        Ajax.getAnalytics = (
          connectionId: number,
          algorithmIds: ID[],
          startParam: Date,
          endParam: Date,
          metricParam: string,
          intervalIdParam: string,
          agg: string,
          onLoad: (response: any) => void,
          onError?: (ev: Event) => void,
        ) => onLoad(serverResponseMock.success());

        const expectedActions = [
          {
            type: ActionTypes.fetchStart,
          },
          {
            type: ActionTypes.fetchSuccess,
            payload: {
              analytics: serverResponseMock.success(),
              dateRangeDomain: {
                start: (new Date(serverResponseMock.serverTime().serverTime)).getTime(),
                end: (new Date(serverResponseMock.serverTime().serverTime)).getTime(),
              },
            },
          },
        ];

        const algorithm = LibraryTypes._Algorithm();
        algorithm.set('deployedName', 'terrain_1');
        const library: LibraryState = _LibraryState({
          algorithms: Immutable.Map<number, LibraryTypes.Algorithm>({ 1: algorithm }),
        });

        const store = mockStore(Immutable.Map({ analytics, schema, library }));

        store.dispatch(
          Actions.fetch(
            connectionName,
            [algorithmId],
            metric,
            intervalId,
            dateRangeId,
            (analyticsResponseParam) =>
            {
              expect(store.getActions()).toEqual(expectedActions);
              done();
            },
          ),
        );
      });
    });

    describe('when fetch fails', () =>
    {
      it('should create an analytics.fetchFailure action', (done) =>
      {
        Ajax.getAnalytics = (
          connectionId: number,
          algorithmIds: ID[],
          startParam: Date,
          endParam: Date,
          metricParam: string,
          intervalIdParam: string,
          agg: string,
          onLoad: (response: any) => void,
          onError?: (error: any) => void,
        ) => onError(JSON.stringify(serverResponseMock.error()));

        const errorMessages = serverResponseMock.error().errors.map((error) => error.detail);
        const expectedActions = [
          {
            type: ActionTypes.fetchStart,
          },
          {
            type: ActionTypes.fetchFailure,
            payload: { errors: errorMessages },
          },
        ];

        const algorithm = LibraryTypes._Algorithm();
        algorithm.set('deployedName', 'terrain_1');
        const library: LibraryState = _LibraryState({
          algorithms: Immutable.Map<number, LibraryTypes.Algorithm>({ 1: algorithm }),
        });
        const store = mockStore(Immutable.Map({ analytics, schema, library }));

        store.dispatch(
          Actions.fetch(
            connectionName,
            [algorithmId],
            metric,
            intervalId,
            dateRangeId,
            () => { return; },
            (error) =>
            {
              expect(store.getActions()).toEqual(expectedActions);
              done();
            },
          ),
        );
      });
    });
  });

  describe('#selectMetric', () =>
  {
    it('should create an analytics.selectMetric action', () =>
    {
      const expectedActions = [
        {
          type: ActionTypes.selectMetric,
          payload: { metric },
        },
      ];

      const store = mockStore(Immutable.Map({ analytics, schema }));

      store.dispatch(Actions.selectMetric(metric));
      expect(store.getActions()).toEqual(expectedActions);
    });
  });

  describe('#selectInterval', () =>
  {
    it('should create an analytics.selectInterval action', () =>
    {
      const expectedActions = [
        {
          type: ActionTypes.selectInterval,
          payload: { intervalId },
        },
      ];

      const store = mockStore(Immutable.Map({ analytics, schema }));

      store.dispatch(Actions.selectInterval(intervalId));
      expect(store.getActions()).toEqual(expectedActions);
    });
  });

  describe('#selectDateRange', () =>
  {
    it('should create an analytics.selectDateRange action', () =>
    {
      const expectedActions = [
        {
          type: ActionTypes.selectDateRange,
          payload: { dateRangeId },
        },
      ];

      const store = mockStore(Immutable.Map({ analytics, schema }));

      store.dispatch(Actions.selectDateRange(dateRangeId));
      expect(store.getActions()).toEqual(expectedActions);
    });
  });

  describe('#pinAlgorithm', () =>
  {
    it('should create an analytics.pinAlgorithm action', () =>
    {
      const expectedActions = [
        {
          type: ActionTypes.pinAlgorithm,
          payload: { algorithmId },
        },
      ];

      const store = mockStore(Immutable.Map({ analytics, schema }));

      store.dispatch(Actions.pinAlgorithm(algorithmId));
      expect(store.getActions()).toEqual(expectedActions);
    });
  });

  describe('#fetchAvailableMetrics', () =>
  {
    Ajax.getAvailableMetrics = (
      onLoad: (response: any) => void,
      onError?: (ev: Event) => void,
    ) => onLoad(serverResponseMock.available());

    describe('when fetch is successful', () =>
    {
      it('should create a analytics.fetchAvailableMetricsSuccess action after the algorithm analytics have been fetched', (done) =>
      {
        const expectedActions = [
          {
            type: ActionTypes.fetchAvailableMetricsStart,
          },
          {
            type: ActionTypes.fetchAvailableMetricsSuccess,
            payload: { availableMetrics: serverResponseMock.available() },
          },
        ];

        const store = mockStore(Immutable.Map({ analytics }));

        store.dispatch(Actions.fetchAvailableMetrics(
          ((availableMetrics) =>
          {
            expect(store.getActions()).toEqual(expectedActions);
            done();
          }),
        ));
      });
    });
  });
});
