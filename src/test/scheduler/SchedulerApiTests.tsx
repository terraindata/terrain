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
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import SchedulerApi from 'scheduler/SchedulerApi';

const axiosMock = new MockAdapter(axios);

describe('SchedulerApi', () =>
{
  let schedulerApi: SchedulerApi;
  beforeEach(() =>
  {
    schedulerApi = new SchedulerApi(axios);
  });

  describe('#createSchedule', () =>
  {
    it('should make a POST request to /scheduler', () =>
    {
      axiosMock.onPost('/scheduler').reply(
        200,
        { id: 1, name: 'schedule' },
      );

      return schedulerApi.createSchedule({ name: 'schedule' })
        .then((response) =>
        {
          expect(response.data).toEqual(
            { id: 1, name: 'schedule' },
          );
        },
      );
    });
  });

  describe('#getSchedules', () =>
  {
    it('should make a GET request to /scheduler', () =>
    {
      axiosMock.onGet('/scheduler').reply(
        200,
        [{ id: 1 }, { id: 2 }],
      );

      return schedulerApi.getSchedules()
        .then((response) =>
        {
          expect(response.data).toEqual(
            [{ id: 1 }, { id: 2 }],
          );
        },
      );
    });
  });

  describe('#getSchedule', () =>
  {
    it('should make a GET request to /scheduler/:id', () =>
    {
      axiosMock.onGet('/scheduler/1').reply(
        200,
        { id: 1 },
      );

      return schedulerApi.getSchedule(1)
        .then((response) =>
        {
          expect(response.data).toEqual(
            { id: 1 },
          );
        },
      );
    });
  });

  describe('#updateSchedule', () =>
  {
    it('should make a POST request to /scheduler/:id', () =>
    {
      axiosMock.onPost('/scheduler/1', { body: { name: 'modified' } }).reply(
        200,
        { id: 1, name: 'modified' },
      );

      return schedulerApi.updateSchedule(1, { name: 'modified' })
        .then((response) =>
        {
          expect(response.data).toEqual(
            { id: 1, name: 'modified' },
          );
        },
      );
    });
  });

  describe('#deleteSchedule', () =>
  {
    it('should make a POST request to /scheduler/delete/:id', () =>
    {
      axiosMock.onPost('/scheduler/delete/1').reply(
        200,
        { id: 1 },
      );

      return schedulerApi.deleteSchedule(1)
        .then((response) =>
        {
          expect(response.data).toEqual(
            { id: 1 },
          );
        },
      );
    });
  });

  describe('#duplicateSchedule', () =>
  {
    it('should make a POST request to /scheduler/duplicate/:id', () =>
    {
      axiosMock.onPost('/scheduler/duplicate/1').reply(
        200,
        { id: 2 },
      );

      return schedulerApi.duplicateSchedule(1)
        .then((response) =>
        {
          expect(response.data).toEqual(
            { id: 2 },
          );
        },
      );
    });
  });

  describe('#getScheduleLog', () =>
  {
    it('should make a GET request to /scheduler/log/:id', () =>
    {
      axiosMock.onGet('/scheduler/log/1').reply(
        200,
        [{ id: 1 }],
      );

      return schedulerApi.getScheduleLog(1)
        .then((response) =>
        {
          expect(response.data).toEqual(
            [{ id: 1 }],
          );
        },
      );
    });
  });

  describe('#pauseSchedule', () =>
  {
    it('should make a POST request to /scheduler/pause/:id', () =>
    {
      axiosMock.onPost('/scheduler/pause/1').reply(
        200,
        { id: 1 },
      );

      return schedulerApi.pauseSchedule(1)
        .then((response) =>
        {
          expect(response.data).toEqual(
            { id: 1 },
          );
        },
      );
    });
  });

  describe('#unpauseSchedule', () =>
  {
    it('should make a POST request to /scheduler/unpause/:id', () =>
    {
      axiosMock.onPost('/scheduler/unpause/1').reply(
        200,
        { id: 1 },
      );

      return schedulerApi.unpauseSchedule(1)
        .then((response) =>
        {
          expect(response.data).toEqual(
            { id: 1 },
          );
        },
      );
    });
  });

  describe('#runSchedule', () =>
  {
    it('should make a POST request to /scheduler/run/:id', () =>
    {
      axiosMock.onPost('/scheduler/run/1').reply(
        200,
        { id: 1 },
      );

      return schedulerApi.runSchedule(1)
        .then((response) =>
        {
          expect(response.data).toEqual(
            { id: 1 },
          );
        },
      );
    });
  });

  describe('#setScheduleStatus', () =>
  {
    it('should make a POST request to /scheduler/status/:id', () =>
    {
      axiosMock.onPost('/scheduler/status/1').reply(
        200,
        { id: 1, shouldRunNext: false },
      );

      return schedulerApi.setScheduleStatus(1, false)
        .then((response) =>
        {
          expect(response.data).toEqual(
            { id: 1, shouldRunNext: false },
          );
        },
      );
    });
  });
});
