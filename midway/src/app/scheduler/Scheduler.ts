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

import * as stream from 'stream';
import * as winston from 'winston';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import CredentialConfig from '../credentials/CredentialConfig';
import Credentials from '../credentials/Credentials';
import { Sources } from '../io/sources/Sources';
import UserConfig from '../users/UserConfig';
import { Job } from './Job';
import SchedulerConfig from './SchedulerConfig';
import { TaskConfig, TaskOutputConfig } from './TaskConfig';

export const credentials: Credentials = new Credentials();
const sources = new Sources();

export class Scheduler
{
  private schedulerTable: Tasty.Table;

  constructor()
  {
    this.runningSchedules = {};
    this.schedulerTable = new Tasty.Table(
      'schedules',
      ['id'],
      [
        'interval',
        'lastRun',
        'meta',
        'name',
        'priority',
        'shouldRunNext',
        'tasks',
        'templateId',
      ],
    );
  }

  public cancel(id: number): boolean
  {
    if (this.runningSchedules[id] !== undefined)
    {
      this.runningSchedules[id].cancel();
      // TODO: unlock row
      return true;
    }
    return false;
  }

  public async get(id?: number, locked?: boolean): Promise<SchedulerConfig[]>
  {
    if (id !== undefined)
    {
      return this._select([], { id }, locked);
    }
    return this._select([], {}, locked);
  }

  public async upsert(user: UserConfig, schedule: SchedulerConfig): Promise<SchedulerConfig[]>
  {
    // TODO: cancel job if it's currently running
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      /*
      schedule.paramsScheduleStr = Array.isArray(schedule.paramsScheduleArr) ?
        JSON.stringify(schedule.paramsScheduleArr) : schedule.paramsScheduleStr;
      if (schedule.transportStr === undefined)
      {
        try
        {
          if (schedule.transport !== undefined)
          {
            schedule.transportStr = JSON.stringify(schedule.transport as object);
          }
          else
          {
            return reject('Transport is not defined.');
          }
        }
        catch (e)
        {
          return reject('Transport is not a valid object.');
        }
      }

      if (schedule.jobId === undefined)
      {
        return reject('Cannot upsert without a JobID.');
      }
      schedule.jobType = schedule.jobType === undefined ? '' : schedule.jobType;
      schedule.name = schedule.name === undefined ? '' : schedule.name;
      schedule.sort = schedule.sort === undefined ? '' : schedule.sort;
      if (schedule.schedule === undefined)
      {
        return reject('Must provide a schedule in cronjob format.');
      }
      if (schedule.id !== undefined) // update existing schedule
      {
        const schedules: SchedulerConfig[] = await this.get(schedule.id) as SchedulerConfig[];
        if (schedules.length !== 0)
        {
          for (const scheduleObj of schedules)
          {
            if (scheduleObj.archived === true)
            {
              return reject('Cannot upsert on an archived schedule.');
            }
            this.scheduleMap[(scheduleObj['id'] as number)].cancel();
            if (scheduleObj.active === true)
            {
              const resultJobId: string = schedule.id !== undefined ? (schedule['id'] as number).toString() : '-1';
              const appendedParamsArr: any[] = [schedule.paramsScheduleArr];
              const job: any = nodeScheduler.scheduleJob(schedule.schedule,
                function callJob(unwrappedParams)
                {
                  this.jobMap[(schedule['jobId'] as number)](...unwrappedParams);
                }.bind(this, appendedParamsArr));
              this.scheduleMap[resultJobId] = job;
            }
          }
          // insert a version to save the past state of this schedule
          await versions.create(user, 'schedules', schedules[0].id as number, schedules[0]);
        }
      }
      else
      {
        schedule.active = schedule.active !== undefined ? schedule.active : false;
        schedule.archived = false;
        schedule.currentlyRunning = false;
      }
      */
      return resolve(await App.DB.upsert(this.schedulerTable, schedule) as SchedulerConfig[]);
    });
  }

  private async _runSchedule(id: number): Promise<TaskOutputConfig | string>
  {
    return new Promise<TaskOutputConfig | string>(async (resolve, reject) =>
    {
      if (this.runningSchedules[id] !== undefined)
      {
        return resolve('Schedule is already running.');
      }
      // TODO: lock row
      this.runningSchedules[id] = new Job();
      const schedules: SchedulerConfig[] = this.get(id);
      if (schedules.length === 0)
      {
        return reject('Schedule not found.');
      }
      const schedule: SchedulerConfig = schedules[0];
      try
      {
        const taskConfig: TaskConfig[] = JSON.parse(schedule.tasks);
      }
      catch (e)
      {
        return reject(e);
      }
      const jobCreateStatus: boolean | string = await this.runningSchedules[id].create(taskConfig);
      if (typeof jobCreateStatus === 'string')
      {
        return reject(jobCreateStatus as string);
      }
      const result: TaskOutputConfig = await this.runningSchedules[id].run();
      delete this.runningSchedules[id];
      // TODO: unlock row
      return resolve(result);
    });
  }

  private async _select(columns: string[], filter: object, locked?: boolean): Promise<SchedulerConfig[]>
  {
    let rawResults: object[] = [];
    if (locked === undefined) // all
    {
      rawResults = await App.DB.select(this.schedulerTable, columns, filter);
    }
    else if (locked === true) // currently running
    {
      // TODO
    }
    else // currently not running
    {
      // TODO
    }

    const results: SchedulerConfig[] = rawResults.map((result: object) => new SchedulerConfig(result));
    resolve(results);
  }
}

export default Scheduler;
