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
import JobsApi from 'jobs/JobsApi';
import
{
  _JobConfig,
  _JobsState,
  JobConfig,
  JobsState,
} from 'jobs/JobsTypes';
import * as _ from 'lodash';
import XHR from 'util/XHR';
const { List, Map } = Immutable;
import Util from 'util/Util';

export interface JobActionTypes
{
  getJobs?: {
    actionType: 'getJobs';
  };
  getJobsStart: {
    actionType: 'getJobsStart';
  };
  getJobsSuccess: {
    actionType: 'getJobsSuccess';
    jobs: JobConfig[];
  };
  getJobsFailed: {
    actionType: 'getJobsFailed';
    error: string;
  };

  getJobLogs?: {
    actionType: 'getJobLogs';
    jobId: ID;
  };
}

class JobRedux extends TerrainRedux<JobActionTypes, JobsState>
{
  public namespace: string = 'jobs';
  public api: JobsApi = new JobsApi(XHR.getInstance());

  public reducers: ConstrainedMap<JobActionTypes, JobsState> =
    {
      getJobsStart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      getJobsSuccess: (state, action) =>
      {
        const jobs: Immutable.Map<ID, JobConfig> = Util.arrayToImmutableMap(
          action.payload.jobs,
          'id',
          _JobConfig,
        );

        return state
          .set('loading', false)
          .set('jobs', jobs);
      },

      getJobsFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },
    };

  public getJobs(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'getJobsStart',
    });

    return this.api.getJobs()
      .then((response) =>
      {
        const jobs = response.data;

        directDispatch({
          actionType: 'getJobsSuccess',
          jobs,
        });

        return Promise.resolve(jobs);
      });
  }

  public getJobLogs(action, dispatch)
  {
    return this.api.getJobLogs(action.jobId)
      .then((response) =>
      {
        const jobLogs = response.data;

        return Promise.resolve(jobLogs);
      });
  }

  public overrideAct(action: Unroll<JobActionTypes>)
  {
    const asyncActions = [
      'getJobs',
      'getJobLogs',
    ];

    if (asyncActions.indexOf(action.actionType) > -1)
    {
      return this[action.actionType].bind(this, action);
    }
  }
}

const ReduxInstance = new JobRedux();
export const JobsActions = ReduxInstance._actionsForExport();
export const JobsReducers = ReduxInstance._reducersForExport(_JobsState);
export const JobsActionTypes = ReduxInstance._actionTypesForExport();
export declare type JobActionType<K extends keyof JobActionTypes> = GetType<K, JobActionTypes>;
