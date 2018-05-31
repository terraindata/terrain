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
// tslint:disable:object-literal-shorthand only-arrow-functions
import * as Immutable from 'immutable';
import { SchedulerActions, SchedulerActionTypes } from 'scheduler/data/SchedulerRedux';
import SchedulerApi from 'scheduler/SchedulerApi';
import { SchedulerConfig } from 'scheduler/SchedulerTypes';
import { createMockStore } from 'test-helpers/helpers';
import SchedulerHelper from 'test-helpers/SchedulerHelper';

jest.mock('scheduler/SchedulerApi', () =>
{
  return {
    default: function()
    {
      return {
        getSchedules: () =>
        {
          return new Promise(
            (resolve, reject) => resolve({
              data: [{ id: 1, name: 'Schedule 1' }, { id: 2, name: 'Schedule 2' }],
            }),
          );
        },

        createSchedule: (schedule) =>
        {
          return new Promise(
            (resolve, reject) => resolve({
              data: [{ id: 2, name: 'Schedule 2' }],
            }),
          );
        },

        updateSchedule: (schedule) =>
        {
          return new Promise(
            (resolve, reject) => resolve({
              data: [{ id: 1, name: 'Schedule 1 modified' }],
            }),
          );
        },

        deleteSchedule: (id) =>
        {
          return new Promise(
            (resolve, reject) => resolve({
              data: [],
            }),
          );
        },

        duplicateSchedule: (id) =>
        {
          return new Promise(
            (resolve, reject) => resolve({
              data: [{ id: 2, name: 'Schedule 2 duplicated' }],
            }),
          );
        },

        pauseSchedule: (id) =>
        {
          return new Promise(
            (resolve, reject) => resolve({
              data: [{ id: 2, name: 'Schedule 2 paused' }],
            }),
          );
        },

        unpauseSchedule: (id) =>
        {
          return new Promise(
            (resolve, reject) => resolve({
              data: [{ id: 2, name: 'Schedule 2 unpaused' }],
            }),
          );
        },

        runSchedule: (id) =>
        {
          return new Promise(
            (resolve, reject) => resolve({
              data: [{ id: 2, name: 'Schedule 2 running' }],
            }),
          );
        },
      };
    },
  };
});

const mockStore = createMockStore();

describe('SchedulerActions', () =>
{
  let scheduler = null;

  beforeEach(() =>
  {
    scheduler = SchedulerHelper.mockState().getState();
  });

  describe('#getSchedules', () =>
  {
    describe('when the schedules are successfully returned', () =>
    {
      it('should dispatch a getSchedulesStart action followed by a getSchedulesSuccess action', () =>
      {
        const schedules = [{ id: 1, name: 'Schedule 1' }, { id: 2, name: 'Schedule 2' }];

        const expectedActions = [
          {
            type: SchedulerActionTypes.getSchedulesStart,
            payload: { actionType: 'getSchedulesStart' },
          },
          {
            type: SchedulerActionTypes.getSchedulesSuccess,
            payload: { actionType: 'getSchedulesSuccess', schedules },
          },
        ];

        const store = mockStore({ scheduler });

        return store.dispatch(SchedulerActions({ actionType: 'getSchedules' }))
          .then((response) =>
          {
            expect(store.getActions()).toEqual(expectedActions);
          });
      });
    });
  });

  describe('#createSchedule', () =>
  {
    describe('when the schedule is successfully created', () =>
    {
      it('should dispatch a createScheduleStart action followed by a createScheduleSuccess action', () =>
      {
        const scheduleParams = { name: 'Schedule 2' };
        const newSchedule = { id: 2, name: 'Schedule 2' };

        const expectedActions = [
          {
            type: SchedulerActionTypes.createScheduleStart,
            payload: { actionType: 'createScheduleStart' },
          },
          {
            type: SchedulerActionTypes.createScheduleSuccess,
            payload: { actionType: 'createScheduleSuccess', schedule: newSchedule },
          },
        ];

        const store = mockStore({ scheduler });

        return store.dispatch(SchedulerActions({ actionType: 'createSchedule', schedule: scheduleParams as SchedulerConfig }))
          .then((response) =>
          {
            expect(store.getActions()).toEqual(expectedActions);
          });
      });
    });
  });

  describe('#updateSchedule', () =>
  {
    describe('when the schedule is successfully updated', () =>
    {
      it('should dispatch a updateScheduleStart action followed by a updateScheduleSuccess action', () =>
      {
        const scheduleParams = { id: 1, name: 'Schedule 1 modified' };
        const updatedSchedule = { id: 1, name: 'Schedule 1 modified' };

        const expectedActions = [
          {
            type: SchedulerActionTypes.updateScheduleStart,
            payload: { actionType: 'updateScheduleStart' },
          },
          {
            type: SchedulerActionTypes.updateScheduleSuccess,
            payload: { actionType: 'updateScheduleSuccess', schedule: updatedSchedule },
          },
        ];

        const store = mockStore({ scheduler });

        return store.dispatch(SchedulerActions({
          actionType: 'updateSchedule',
          schedule: scheduleParams as SchedulerConfig,
        }))
          .then((response) =>
          {
            expect(store.getActions()).toEqual(expectedActions);
          });
      });
    });
  });

  describe('#deleteSchedule', () =>
  {
    describe('when the schedule is successfully deleted', () =>
    {
      it('should dispatch a deleteScheduleStart action followed by a deleteScheduleSuccess action', () =>
      {
        const existingSchedule = { id: 1, name: 'Schedule 1' };

        const expectedActions = [
          {
            type: SchedulerActionTypes.deleteScheduleStart,
            payload: { actionType: 'deleteScheduleStart' },
          },
          {
            type: SchedulerActionTypes.deleteScheduleSuccess,
            payload: { actionType: 'deleteScheduleSuccess', scheduleId: existingSchedule.id },
          },
        ];

        const store = mockStore({ scheduler });

        return store.dispatch(SchedulerActions({ actionType: 'deleteSchedule', scheduleId: existingSchedule.id }))
          .then((response) =>
          {
            expect(store.getActions()).toEqual(expectedActions);
          });
      });
    });
  });

  describe('#duplicateSchedule', () =>
  {
    describe('when the schedule is successfully duplicated', () =>
    {
      it('should dispatch a createScheduleStart action followed by a createScheduleSuccess action', () =>
      {
        const duplicatedSchedule = { id: 2, name: 'Schedule 2 duplicated' };

        const expectedActions = [
          {
            type: SchedulerActionTypes.createScheduleStart,
            payload: { actionType: 'createScheduleStart' },
          },
          {
            type: SchedulerActionTypes.createScheduleSuccess,
            payload: {
              actionType: 'createScheduleSuccess',
              schedule: duplicatedSchedule,
            },
          },
        ];

        const store = mockStore({ scheduler });

        return store.dispatch(SchedulerActions({
          actionType: 'duplicateSchedule',
          scheduleId: duplicatedSchedule.id,
        }))
          .then((response) =>
          {
            expect(store.getActions()).toEqual(expectedActions);
          });
      });
    });
  });

  describe('#pauseSchedule', () =>
  {
    describe('when the schedule is successfully paused', () =>
    {
      it('should dispatch a updateScheduleStart action followed by a updateScheduleSuccess action', () =>
      {
        const pausedSchedule = { id: 2, name: 'Schedule 2 paused' };

        const expectedActions = [
          {
            type: SchedulerActionTypes.updateScheduleStart,
            payload: { actionType: 'updateScheduleStart' },
          },
          {
            type: SchedulerActionTypes.updateScheduleSuccess,
            payload: {
              actionType: 'updateScheduleSuccess',
              schedule: pausedSchedule,
            },
          },
        ];

        const store = mockStore({ scheduler });

        return store.dispatch(SchedulerActions({
          actionType: 'pauseSchedule',
          scheduleId: pausedSchedule.id,
        }))
          .then((response) =>
          {
            expect(store.getActions()).toEqual(expectedActions);
          });
      });
    });
  });

  describe('#unpauseSchedule', () =>
  {
    describe('when the schedule is successfully unpaused', () =>
    {
      it('should dispatch a updateScheduleStart action followed by a updateScheduleSuccess action', () =>
      {
        const unpausedSchedule = { id: 2, name: 'Schedule 2 unpaused' };

        const expectedActions = [
          {
            type: SchedulerActionTypes.updateScheduleStart,
            payload: { actionType: 'updateScheduleStart' },
          },
          {
            type: SchedulerActionTypes.updateScheduleSuccess,
            payload: {
              actionType: 'updateScheduleSuccess',
              schedule: unpausedSchedule,
            },
          },
        ];

        const store = mockStore({ scheduler });

        return store.dispatch(SchedulerActions({
          actionType: 'unpauseSchedule',
          scheduleId: unpausedSchedule.id,
        }))
          .then((response) =>
          {
            expect(store.getActions()).toEqual(expectedActions);
          });
      });
    });
  });

  describe('#runSchedule', () =>
  {
    describe('when the schedule is successfully run', () =>
    {
      it('should dispatch a updateScheduleStart action followed by a updateScheduleSuccess action', () =>
      {
        const runningSchedule = { id: 2, name: 'Schedule 2 running' };

        const expectedActions = [
          {
            type: SchedulerActionTypes.updateScheduleStart,
            payload: { actionType: 'updateScheduleStart' },
          },
          {
            type: SchedulerActionTypes.updateScheduleSuccess,
            payload: {
              actionType: 'updateScheduleSuccess',
              schedule: runningSchedule,
            },
          },
        ];

        const store = mockStore({ scheduler });

        return store.dispatch(SchedulerActions({
          actionType: 'runSchedule',
          scheduleId: runningSchedule.id,
        }))
          .then((response) =>
          {
            expect(store.getActions()).toEqual(expectedActions);
          });
      });
    });
  });
});
