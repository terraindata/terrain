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

// tslint:disable:no-shadowed-variable strict-boolean-expressions no-unused-expression

import * as Immutable from 'immutable';

import ActionTypes from 'analytics/data/AnalyticsActionTypes';
import LibraryStore from 'library/data/LibraryStore';
import Util from 'util/Util';
import BackendInstance from '../../../database/types/BackendInstance';
import { ItemStatus } from '../../../items/types/Item';

import Ajax from './../../util/Ajax';

function calculateDateRange(api, dateRangeId: number, callback)
{
  let start = null;
  let end = null;

  api.getServerTime(
    (serverTimeResponse) =>
    {
      const { serverTime } = serverTimeResponse;
      const serverTimeDate = new Date(serverTime);
      const serverTimeTimestamp = serverTimeDate.getTime();

      end = serverTimeDate.toISOString(); // Today at current time
      switch (dateRangeId)
      {
        case 1: // Today
          start = new Date(Date.UTC(
            serverTimeDate.getUTCFullYear(),
            serverTimeDate.getUTCMonth(),
            serverTimeDate.getUTCDate()));
          start = start.toISOString(); // Today at 0:00 UTC
          break;
        case 2:
          start = new Date(Date.UTC(
            serverTimeDate.getUTCFullYear(),
            serverTimeDate.getUTCMonth(),
            serverTimeDate.getUTCDate()) - (7 * 86400000))
            .toISOString(); // 7 days since today
          break;
        case 3:
          start = new Date(Date.UTC(
            serverTimeDate.getUTCFullYear(),
            serverTimeDate.getUTCMonth(),
            serverTimeDate.getUTCDate()) - (30 * 86400000))
            .toISOString(); // 7 days since today
          break;
        default:
          start = new Date(Date.UTC(
            serverTimeDate.getUTCFullYear(),
            serverTimeDate.getUTCMonth(),
            serverTimeDate.getUTCDate()))
            .toISOString(); // Fetch today's analytics by default
          break;
      }

      callback({ start, end });
    },
  );
}

const Actions =
  {
    fetch: (
      connectionName: string,
      variantIds: ID[],
      metric,
      intervalId,
      dateRangeId,
      callback?: (analyticsVariants: any) => void,
      errorCallback?: (response) => void,
    ) => (dispatch, getState, api) =>
      {
        dispatch({ type: ActionTypes.fetchStart });

        const connection = getState().get('schema').servers.get(connectionName);
        const connectionId = connection !== undefined ?
          connection.connectionId : 1; // TODO: choose a suitable default connection

        const numericDateRangeId = parseInt(dateRangeId, 10);
        calculateDateRange(
          api,
          numericDateRangeId,
          (dateRange) =>
          {
            const start = dateRange.start;
            const end = dateRange.end;

            let aggregation = '';

            if (metric === 'click,impression' || metric === 'conversion,impression')
            {
              aggregation = 'rate';
            } else
            {
              aggregation = 'histogram';
            }

            const variants = LibraryStore.getState().variants;
            const deployedVariantNames = variantIds.map((id) =>
            {
              return variants.get(id).deployedName;
            });

            return api.getAnalytics(
              connectionId,
              deployedVariantNames,
              start,
              end,
              metric,
              intervalId,
              aggregation,
              (variantAnalytics) =>
              {
                dispatch({
                  type: ActionTypes.fetchSuccess,
                  payload: {
                    analytics: variantAnalytics,
                  },
                });
                callback && callback(variantAnalytics);
              },
              (errorResponse) =>
              {
                const error = JSON.parse(errorResponse);
                dispatch({
                  type: ActionTypes.fetchFailure,
                  payload: {
                    errors: error.errors.map((e) => e.detail),
                  },
                });
                errorCallback && errorCallback(error);
              },
            );
          },
        );
      },

    selectMetric: (metric) =>
    {
      return {
        type: ActionTypes.selectMetric,
        payload: { metric },
      };
    },

    selectInterval: (intervalId) =>
    {
      return {
        type: ActionTypes.selectInterval,
        payload: { intervalId },
      };
    },

    selectDateRange: (dateRangeId) =>
    {
      return {
        type: ActionTypes.selectDateRange,
        payload: { dateRangeId },
      };
    },

    selectAnalyticsConnection: (connectionName) =>
    {
      return {
        type: ActionTypes.selectAnalyticsConnection,
        payload: { connectionName },
      };
    },

    pinVariant: (variantId) =>
    {
      return {
        type: ActionTypes.pinVariant,
        payload: { variantId },
      };
    },

    fetchAvailableMetrics: (
      callback?: (analyticsVariants: any) => void,
    ) => (dispatch, getState, api) =>
      {
        dispatch({
          type: ActionTypes.fetchAvailableMetricsStart,
        });
        return api.getAvailableMetrics(
          (availableMetrics) =>
          {
            dispatch({
              type: ActionTypes.fetchAvailableMetricsSuccess,
              payload: {
                availableMetrics,
              },
            });
            callback && callback(availableMetrics);
          },
        );
      },
  };

export default Actions;
