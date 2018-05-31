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
import { JobsActionTypes, JobsReducers as reducer } from 'jobs/data/JobsRedux';
import { _JobConfig, _JobsState, JobsState } from 'jobs/JobsTypes';
import JobsHelper from 'test-helpers/JobsHelper';
import Util from 'util/Util';

describe('JobsReducers', () =>
{
  let jobs = null;

  beforeEach(() =>
  {
    jobs = JobsHelper.mockState().getState();
  });

  it('should return the inital state', () =>
  {
    expect(reducer(undefined, {})).toEqual(_JobsState());
  });

  describe('#getJobsStart', () =>
  {
    it('should set loading to true', () =>
    {
      jobs = JobsHelper.mockState()
        .loading(false)
        .getState();

      const nextState = reducer(jobs, {
        type: JobsActionTypes.getJobsStart,
      });

      expect(nextState.loading).toBe(true);
    });
  });

  describe('#getJobsSuccess', () =>
  {
    it('should set loading to false and write jobs on the store', () =>
    {
      const fetchedJobs = [
        { id: 1, name: 'Job 1' },
        { id: 2, name: 'Job 2' },
      ];

      const nextState = reducer(jobs, {
        type: JobsActionTypes.getJobsSuccess,
        payload: { jobs: fetchedJobs },
      });

      expect(nextState.loading).toBe(false);
      expect(nextState.jobs).toEqual(Util.arrayToImmutableMap(fetchedJobs, 'id', _JobConfig));
    });
  });

  describe('#getJobsFailed', () =>
  {
    it('should set loading to false', () =>
    {
      const error = 'Error Message';
      const nextState = reducer(jobs, {
        type: JobsActionTypes.getJobsFailed,
        payload: { error },
      });

      expect(nextState.loading).toBe(false);
      expect(nextState.error).toEqual(error);
    });
  });
});
