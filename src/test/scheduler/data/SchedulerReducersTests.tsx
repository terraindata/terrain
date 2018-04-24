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
import * as Immutable from 'immutable';
import { SchedulerActionTypes, SchedulerReducers as reducer } from 'scheduler/data/SchedulerRedux';
import { _SchedulerState, SchedulerState } from 'scheduler/SchedulerTypes';
import SchedulerHelper from 'test-helpers/SchedulerHelper';

describe('SchedulerReducers', () =>
{
  let scheduler = null;

  beforeEach(() =>
  {
    scheduler = SchedulerHelper.mockState().getState();
  });

  it('should return the inital state', () =>
  {
    expect(reducer(undefined, {})).toEqual(_SchedulerState());
  });

  describe('#getSchedulesStart', () =>
  {
    it('should set loading to true', () =>
    {
      scheduler = SchedulerHelper.mockState()
        .loading(false)
        .getState();

      const nextState = reducer(scheduler, {
        type: SchedulerActionTypes.getSchedulesStart,
      });

      expect(nextState.loading).toBe(true);
    });
  });

  describe('#getSchedulesSuccess', () =>
  {
    it('should set loading to false and write schedules on the store', () =>
    {
      const schedules = Immutable.Map({
        1: { id: 1, name: 'Schedule 1' },
        2: { id: 2, name: 'Schedule 2' },
      });

      const nextState = reducer(scheduler, {
        type: SchedulerActionTypes.getSchedulesSuccess,
        payload: { schedules },
      });

      expect(nextState.loading).toBe(false);
      expect(nextState.schedules).toEqual(schedules);
    });
  });

  describe('#getSchedulesFailed', () =>
  {
    it('should set loading to false', () =>
    {
      const error = 'Error Message';
      const nextState = reducer(scheduler, {
        type: SchedulerActionTypes.getSchedulesFailed,
        payload: { error },
      });

      expect(nextState.loading).toBe(false);
      expect(nextState.error).toEqual(error);
    });
  });

  describe('#createScheduleSuccess', () =>
  {
    it('should set loading to false and add the new schedule to the store', () =>
    {
      const scheduleParams = { id: 2, name: 'Schedule 2' };

      const nextState = reducer(scheduler, {
        type: SchedulerActionTypes.createScheduleSuccess,
        payload: { schedule: scheduleParams },
      });

      expect(nextState.loading).toBe(false);
      expect(nextState.schedules).toEqual(scheduler.schedules.set(scheduleParams.id, scheduleParams));
    });
  });

  describe('#updateScheduleSuccess', () =>
  {
    it('should set loading to false and update the specified schedule in the store', () =>
    {
      const existingSchedule = { id: 1, name: 'Schedule 1' };
      scheduler = SchedulerHelper.mockState()
        .addSchedule(existingSchedule)
        .getState();

      const updatedSchedule = { id: 1, name: 'Schedule 1 modified' }

      const nextState = reducer(scheduler, {
        type: SchedulerActionTypes.updateScheduleSuccess,
        payload: { schedule: updatedSchedule },
      });

      expect(nextState.loading).toBe(false);
      expect(nextState.schedules.get(1).name).toEqual('Schedule 1 modified');
    });
  });

  describe('#deleteScheduleSuccess', () =>
  {
    it('should set loading to false and delete the specified schedule from the store', () =>
    {
      const existingSchedule = { id: 1, name: 'Schedule 1' };
      scheduler = SchedulerHelper.mockState()
        .addSchedule(existingSchedule)
        .getState();

      const nextState = reducer(scheduler, {
        type: SchedulerActionTypes.deleteScheduleSuccess,
        payload: { scheduleId: existingSchedule.id },
      });

      expect(nextState.loading).toBe(false);
      expect(nextState.schedules).toEqual(scheduler.schedules.delete(existingSchedule.id));
    });
  });
});
