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

import { ConstrainedMap, GetType, TerrainRedux, Unroll } from 'app/store/TerrainRedux';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import SchedulerApi from 'scheduler/SchedulerApi';
import
{
  _SchedulerConfig,
  _SchedulerState,
  SchedulerConfig,
  SchedulerState,
} from 'scheduler/SchedulerTypes';
import XHR from 'util/XHR';
const { List, Map } = Immutable;
import Util from 'util/Util';

export interface SchedulerActionTypes
{
  getSchedules?: {
    actionType: 'getSchedules';
  };
  getSchedulesStart: {
    actionType: 'getSchedulesStart';
  };
  getSchedulesSuccess: {
    actionType: 'getSchedulesSuccess';
    schedules: Immutable.Map<ID, SchedulerConfig>;
  };
  getSchedulesFailed: {
    actionType: 'getSchedulesFailed';
    error: string;
  };

  createSchedule?: {
    actionType: 'createSchedule';
    schedule: SchedulerConfig;
  };
  createScheduleStart: {
    actionType: 'createScheduleStart';
  };
  createScheduleSuccess: {
    actionType: 'createScheduleSuccess';
    schedule: SchedulerConfig;
  };
  createScheduleFailed: {
    actionType: 'createScheduleFailed';
    error: string;
  };

  updateSchedule?: {
    actionType: 'updateSchedule';
    schedule: SchedulerConfig;
  };
  updateScheduleStart: {
    actionType: 'updateScheduleStart';
  };
  updateScheduleSuccess: {
    actionType: 'updateScheduleSuccess';
    schedule: SchedulerConfig;
  };
  updateScheduleFailed: {
    actionType: 'updateScheduleFailed';
    error: string;
  };

  deleteSchedule?: {
    actionType: 'deleteSchedule';
    scheduleId: ID;
  };
  deleteScheduleStart: {
    actionType: 'deleteScheduleStart';
  };
  deleteScheduleSuccess: {
    actionType: 'deleteScheduleSuccess';
    scheduleId: ID;
  };
  deleteScheduleFailed: {
    actionType: 'deleteScheduleFailed';
    error: string;
  };

  duplicateSchedule?: {
    actionType: 'duplicateSchedule';
    scheduleId: ID;
  };
  duplicateScheduleStart: {
    actionType: 'duplicateScheduleStart';
  };
  duplicateScheduleSuccess: {
    actionType: 'duplicateScheduleSuccess';
    schedule: SchedulerConfig;
  };
  duplicateScheduleFailed: {
    actionType: 'duplicateScheduleFailed';
    error: string;
  };

  pauseSchedule?: {
    actionType: 'pauseSchedule';
    scheduleId: ID;
  };

  unpauseSchedule?: {
    actionType: 'unpauseSchedule';
    scheduleId: ID;
  };

  runSchedule?: {
    actionType: 'runSchedule';
    scheduleId: ID;
  };
}

class SchedulerRedux extends TerrainRedux<SchedulerActionTypes, SchedulerState>
{
  public namespace: string = 'scheduler';
  public api: SchedulerApi = new SchedulerApi(XHR.getInstance());

  public reducers: ConstrainedMap<SchedulerActionTypes, SchedulerState> =
    {
      getSchedulesStart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      getSchedulesSuccess: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('schedules', action.payload.schedules);
      },

      getSchedulesFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },

      createScheduleStart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      createScheduleSuccess: (state, action) =>
      {
        const { schedule } = action.payload;
        return state
          .set('loading', false)
          .setIn(['schedules', schedule.id], schedule);
      },

      createScheduleFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },

      updateScheduleStart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      updateScheduleSuccess: (state, action) =>
      {
        const { schedule } = action.payload;
        return state
          .set('loading', false)
          .setIn(['schedules', schedule.id], schedule);
      },

      updateScheduleFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },

      deleteScheduleStart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      deleteScheduleSuccess: (state, action) =>
      {
        const { scheduleId } = action.payload;
        return state
          .set('loading', false)
          .deleteIn(['schedules', scheduleId]);
      },

      deleteScheduleFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },

      duplicateScheduleStart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      duplicateScheduleSuccess: (state, action) =>
      {
        const { schedule } = action.payload;
        return state
          .set('loading', false)
          .setIn(['schedules', schedule.id], schedule);
      },

      duplicateScheduleFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },
    };

  public getSchedules(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'getSchedulesStart',
    });

    return this.api.getSchedules()
      .then((response) =>
      {
        const schedules: Immutable.Map<ID, SchedulerConfig> = Util.arrayToImmutableMap(
          response.data,
          'id',
          _SchedulerConfig,
        );
        directDispatch({
          actionType: 'getSchedulesSuccess',
          schedules,
        });

        return Promise.resolve(schedules);
      });
  }

  public createSchedule(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'createScheduleStart',
    });

    return this.api.createSchedule(action.schedule)
      .then((response) =>
      {
        const schedule: SchedulerConfig = _SchedulerConfig(response.data[0]);
        directDispatch({
          actionType: 'createScheduleSuccess',
          schedule,
        });

        return Promise.resolve(schedule);
      });
  }

  public updateSchedule(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'updateScheduleStart',
    });

    const { schedule: scheduleChanges } = action;

    return this.api.updateSchedule(scheduleChanges.id, scheduleChanges)
      .then((response) =>
      {
        const schedule: SchedulerConfig = _SchedulerConfig(response.data[0]);
        directDispatch({
          actionType: 'updateScheduleSuccess',
          schedule,
        });

        return Promise.resolve(schedule);
      });
  }

  public deleteSchedule(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'deleteScheduleStart',
    });

    return this.api.deleteSchedule(action.scheduleId)
      .then((response) =>
      {
        const schedule: SchedulerConfig = response.data[0];
        directDispatch({
          actionType: 'deleteScheduleSuccess',
          scheduleId: action.scheduleId,
        });

        return Promise.resolve(schedule);
      });
  }

  public duplicateSchedule(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'duplicateScheduleStart',
    });

    return this.api.duplicateSchedule(action.scheduleId)
      .then((response) =>
      {
        const schedule: SchedulerConfig = response.data[0];
        directDispatch({
          actionType: 'duplicateScheduleSuccess',
          schedule,
        });

        return Promise.resolve(schedule);
      });
  }

  public pauseSchedule(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'updateScheduleStart',
    });

    return this.api.pauseSchedule(action.scheduleId)
      .then((response) =>
      {
        const schedule: SchedulerConfig = response.data[0];
        directDispatch({
          actionType: 'updateScheduleSuccess',
          schedule,
        });

        return Promise.resolve(schedule);
      });
  }

  public unpauseSchedule(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'updateScheduleStart',
    });

    return this.api.unpauseSchedule(action.scheduleId)
      .then((response) =>
      {
        const schedule: SchedulerConfig = response.data[0];
        directDispatch({
          actionType: 'updateScheduleSuccess',
          schedule,
        });

        return Promise.resolve(schedule);
      });
  }

  public runSchedule(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'updateScheduleStart',
    });

    return this.api.runSchedule(action.scheduleId)
      .then((response) =>
      {
        const schedule: SchedulerConfig = response.data[0];
        directDispatch({
          actionType: 'updateScheduleSuccess',
          schedule,
        });

        return Promise.resolve(schedule);
      });
  }

  public overrideAct(action: Unroll<SchedulerActionTypes>)
  {
    const asyncActions = [
      'getSchedules',
      'createSchedule',
      'updateSchedule',
      'deleteSchedule',
      'duplicateSchedule',
      'pauseSchedule',
      'unpauseSchedule',
      'runSchedule',
    ];

    if (asyncActions.indexOf(action.actionType) > -1)
    {
      return this[action.actionType].bind(this, action);
    }
  }
}

const ReduxInstance = new SchedulerRedux();
export const SchedulerActions = ReduxInstance._actionsForExport();
export const SchedulerReducers = ReduxInstance._reducersForExport(_SchedulerState);
export const SchedulerActionTypes = ReduxInstance._actionTypesForExport();
export declare type SchedulerActionType<K extends keyof SchedulerActionTypes> = GetType<K, SchedulerActionTypes>;
