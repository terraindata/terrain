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

// NB: this file should never be exposed directly via API routes except to localhost!
// It must only be called from inside midway and exposed via those routes, or exposed
// via /credentials to localhost for testing purposes

import aesjs = require('aes-js');
import * as _ from 'lodash';
import sha1 = require('sha1');
import * as winston from 'winston';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import * as Util from '../AppUtil';
import SchedulerLogConfig from './SchedulerLogConfig';

export class SchedulerLogs
{
  private schedulerLogTable: Tasty.Table;
  private MAX_LINES_SAVED: number;

  constructor()
  {
    this.schedulerLogTable = new Tasty.Table(
      'SchedulerLogs',
      ['id'],
      [
        'lastFailure',
        'lastRun',
        'lastSuccess',
        'meta',
        'numberOfRuns',
        'scheduleId',
        'status',
      ],
    );
    this.MAX_LINES_SAVED = 30;
  }

  public async get(id?: number): Promise<SchedulerLogConfig[]>
  {
    return new Promise<SchedulerLogConfig[]>(async (resolve, reject) =>
    {
      let rawResults;
      rawResults = await App.DB.select(this.schedulerLogTable, [], { id });
      const schedulerLogs: SchedulerLogConfig[] = rawResults.map((result: object) => new SchedulerLogConfig(result));
      return resolve(schedulerLogs);
    });
  }

  public async getByScheduleId(scheduleId?: number): Promise<SchedulerLogConfig[]>
  {
    return new Promise<SchedulerLogConfig[]>(async (resolve, reject) =>
    {
      let rawResults;
      let scheduleIdAsNumber: number | undefined = scheduleId;
      if (scheduleId !== undefined && typeof scheduleId === 'string')
      {
        scheduleIdAsNumber = parseInt(scheduleId, 10);
      }
      rawResults = await App.DB.select(this.schedulerLogTable, [], { scheduleId: scheduleIdAsNumber });
      const schedulerLogs: SchedulerLogConfig[] = rawResults.map((result: object) => new SchedulerLogConfig(result));
      return resolve(schedulerLogs);
    });
  }

  public async upsertStatusSchedule(scheduleId: number, success: boolean, meta?: string): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      const schedulerLogs: SchedulerLogConfig[] = await this.getByScheduleId(scheduleId);
      if (schedulerLogs.length > 1)
      {
        return reject('Returned too many scheduler logs with that schedule ID.');
      }
      let schedulerLog: SchedulerLogConfig =
        {
          lastFailure: null,
          lastRun: null,
          lastSuccess: null,
          meta: '',
          numberOfRuns: 0,
          scheduleId,
          status: '',
        };
      if (schedulerLogs.length > 0)
      {
        schedulerLog = schedulerLogs[0] as SchedulerLogConfig;
      }
      const currDateTime: Date = new Date(Date.now());
      schedulerLog.lastRun = currDateTime;
      schedulerLog.numberOfRuns = schedulerLog.numberOfRuns + 1;

      if (meta !== undefined)
      {
        const metaLines: string[] = schedulerLog.meta.split('\n');
        schedulerLog.meta = _.takeRight(metaLines, this.MAX_LINES_SAVED).join('\n'); // trim to last MAX_LINES_SAVED
        schedulerLog.meta += '[' + currDateTime.toISOString() + ']: ' + meta + '\n';
      }
      if (success)
      {
        schedulerLog.lastSuccess = currDateTime;
        schedulerLog.status = 'Success';
      }
      else
      {
        schedulerLog.lastFailure = currDateTime;
        schedulerLog.status = 'Failure';
      }
      const upsertedSchedulerLog: SchedulerLogConfig | string
        = await this._upsert(schedulerLog) as SchedulerLogConfig | string;
      if (typeof upsertedSchedulerLog === 'string')
      {
        return reject(upsertedSchedulerLog as string);
      }
      else
      {
        return resolve('Success');
      }
    });
  }

  private async _upsert(schedulerLog: SchedulerLogConfig): Promise<SchedulerLogConfig | string>
  {
    return new Promise<SchedulerLogConfig | string>(async (resolve, reject) =>
    {
      let rawResults;
      // if modifying existing scheduler log, check for existence
      if (schedulerLog['id'] !== undefined)
      {
        const existingSchedules: SchedulerLogConfig[] = await this.getByScheduleId(schedulerLog.scheduleId) as SchedulerLogConfig[];
        if (existingSchedules.length !== 1)
        {
          return resolve('Schedule log not found.');
        }
        else if (existingSchedules.length === 1 && existingSchedules[0]['id'] !== schedulerLog['id'])
        {
          return resolve('Schedule log ID does not match existing schedule log\'s ID.');
        }
      }
      else
      {
        const existingSchedules = await this.getByScheduleId(schedulerLog.scheduleId);
        if (existingSchedules.length !== 0)
        {
          return resolve('Schedule log with that scheduleId exists.');
        }
      }
      winston.info(JSON.stringify(schedulerLog as object));
      rawResults = await App.DB.upsert(this.schedulerLogTable, schedulerLog);
      const newSchedulerLogObj: SchedulerLogConfig[] = rawResults.map((result: object) => new SchedulerLogConfig(result));
      return resolve(newSchedulerLogObj[0] as SchedulerLogConfig);
    });
  }
}

export default SchedulerLogs;
