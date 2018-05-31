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

// tslint:disable:variable-name max-classes-per-file strict-boolean-expressions no-shadowed-variable

import { Record } from 'immutable';
import { createRecordType } from 'shared/util/Classes';

// equivalent of SchedulerConfig defined in miday/src/app/scheduler/SchedulerConfig.ts
class SchedulerConfigC
{
  public id: ID = -1;
  public name: string = '';                      // name of the schedule
  public active?: boolean = false;               // whether the schedule is running (different from currentlyRunning)
  public archived?: boolean = false;             // whether the schedule has been archived (deleted) or not
  public currentlyRunning?: boolean = false;     // whether the job is currently running
  public jobId?: number = -1;                    // corresponds to job ID
  public jobType?: string = '';                  // import or export etc.
  public paramsJob?: object = {};                // parameters passed for the job, excluding info like filename
  public paramsScheduleArr?: any[] = [];         // parameters passed for the schedule
  public paramsScheduleStr?: string = '';        // JSON stringified representation of paramsScheduleArr
  public schedule: string = '';                  // cronjob format for when the schedule should run
  public sort?: string = 'asc';                  // for regex expression file matching, which end of the list should be used
  public transport?: object = {};                // sftp and relevant parameters, https, local filesystem, etc.
  public transportStr?: string = '';             // JSON stringified representation of transport
}

const SchedulerConfig_Record = createRecordType(new SchedulerConfigC(), 'SchedulerConfigC');
export interface SchedulerConfig extends SchedulerConfigC, IRecord<SchedulerConfig> { }
export const _SchedulerConfig =
  (config: {
    id: ID;
    name: string;
    active?: boolean;
    archived?: boolean;
    currentlyRunning?: boolean;
    jobId?: number;
    jobType?: string;
    paramsJob?: object;
    paramsScheduleArr?: any[];
    paramsScheduleStr?: string;
    schedule: string;
    sort?: string;
    transport?: object;
    transportStr?: string;
  }) =>
  {
    return new SchedulerConfig_Record(config) as any as SchedulerConfig;
  };

class CredentialConfigC
{
  public id: ID = -1;
  public createdBy: number = 0;
  public meta: string = '';
  public name: string = '';
  public permissions?: number = 0;
  public type: string = '';
}

const CredentialConfig_Record = createRecordType(new CredentialConfigC(), 'CredentialConfigC');
export interface CredentialConfig extends CredentialConfigC, IRecord<CredentialConfig> { }
export const _CredentialConfig =
  (config: {
    id: ID;
    createdBy: number;
    meta: string;
    name: string;
    permissions?: number;
    type: string;
  }) =>
  {
    return new CredentialConfig_Record(config) as any as CredentialConfig;
  };
