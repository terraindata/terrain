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

import { JobConfig } from 'shared/types/jobs/JobConfig';
import { TaskConfig } from 'shared/types/jobs/TaskConfig';
import { TaskOutputConfig } from 'shared/types/jobs/TaskOutputConfig';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import CredentialConfig from '../credentials/CredentialConfig';
import Credentials from '../credentials/Credentials';
import { Sources } from '../io/sources/Sources';
import { Job } from '../jobs/Job';
import SchedulerConfig from './SchedulerConfig';

export const credentials: Credentials = new Credentials();
const sources = new Sources();

export class Scheduler
{
  private runningSchedules: Map<number, Job>;
  private schedulerTable: Tasty.Table;

  constructor()
  {
    this.runningSchedules = new Map<number, Job>();
    this.schedulerTable = new Tasty.Table(
      'schedules',
      ['id'],
      [
        'createdAt',
        'cron',
        'lastModified',
        'lastRun',
        'meta',
        'name',
        'priority',
        'running',
        'shouldRunNext',
        'tasks',
        'workerId',
      ],
    );
  }

  public async initializeScheduler(): Promise<void>
  {
    setTimeout(this._checkSchedulerTable.bind(this), 60000 - new Date().getTime() % 60000);
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

  public async delete(id: number): Promise<SchedulerConfig[] | string>
  {
    return App.DB.delete(this.schedulerTable, { id }) as Promise<SchedulerConfig[]>;
  }

  public async duplicate(id: number): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      const schedules: SchedulerConfig[] = await this.get(id);
      if (schedules.length !== 0)
      {
        delete schedules[0].id;
        schedules[0].name = schedules[0].name + ' - Copy';
        resolve(await App.DB.upsert(this.schedulerTable, schedules[0]) as SchedulerConfig[]);
      }
    });
  }

  public async get(id?: number, running?: boolean): Promise<SchedulerConfig[]>
  {
    return this._select([], { id, running });
  }

  public async getLog(id?: number): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      // TODO add extensive logging support
      resolve([{}]);
    });
  }

  public async runSchedule(id: number, runNow?: boolean): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (this.runningSchedules.get(id) !== undefined)
      {
        return resolve('Schedule is already running.');
      }
      const schedules: SchedulerConfig[] = await this.get(id);
      if (schedules.length === 0)
      {
        return reject('Schedule not found.');
      }
      const schedule: SchedulerConfig = schedules[0];
      const jobFilename: string = 'Task_' + (id.toString() as string) + '_' + new Date().toISOString() + '.bin';
      const jobType: string = runNow === true ? 'Scheduled ad-hoc' : 'Scheduled';
      const jobConfig: JobConfig =
        {
          meta: '',
          name: '', // TODO give this a name if you want
          pausedFilename: jobFilename,
          priority: 1,
          scheduleId: id,
          tasks: schedule.tasks,
          type: jobType,
          workerId: 1, // TODO change this for clustering support
        };
      await this._setRunning(id, true);
      const jobCreateStatus: JobConfig[] | string = await App.JobQ.create(jobConfig);
      if (typeof jobCreateStatus === 'string')
      {
        return reject(jobCreateStatus as string);
      }
      // const result: TaskOutputConfig = await this.runningSchedules.get(id).run();
      await this._setRunning(id, false);
      this.runningSchedules.delete(id);
      // TODO: unlock row
      return resolve('Running schedule ' + ((id as number).toString() as string));
    });
  }

  public pause(id: number): boolean
  {
    if (this.runningSchedules[id] !== undefined)
    {
      this.runningSchedules[id].pause();
      // TODO: unlock row
      return true;
    }
    return false;
  }

  public async setStatus(id: number, status: boolean): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      if (typeof status !== 'boolean' || status === undefined)
      {
        return reject(false);
      }
      return this._setStatus(id, status);
    });
  }

  public async unpause(id: number): Promise<boolean>
  {
    if (this.runningSchedules[id] !== undefined)
    {
      await this.runningSchedules[id].unpause();
      // TODO: unlock row
      return true;
    }
    return false;
  }

  public async upsert(schedule: SchedulerConfig): Promise<SchedulerConfig[]>
  {
    const creationDate: Date = new Date();
    if (schedule.id === undefined) // create
    {
      if (schedule.name === undefined || schedule.cron === undefined)
      {
        return Promise.reject('Schedule name and cron must be provided.');
      }
      schedule.createdAt = creationDate;
      schedule.lastModified = creationDate;
      schedule.lastRun = new Date(0); // beginning of epoch time
      schedule.meta = schedule.meta !== undefined ? schedule.meta : '';
      schedule.priority = schedule.priority !== undefined ? schedule.priority : 1;
      schedule.running = schedule.running !== undefined ? schedule.running : false;
      schedule.shouldRunNext = schedule.shouldRunNext !== undefined ? schedule.shouldRunNext : true;
      schedule.tasks = schedule.tasks !== undefined ? JSON.stringify(schedule.tasks) : JSON.stringify([]);
      schedule.workerId = schedule.workerId !== undefined ? schedule.workerId : 1;
    }
    else
    {
      const existingSchedules: SchedulerConfig[] = await this.get(schedule.id);
      if (existingSchedules.length === 0)
      {
        return Promise.reject('Schedule ' + ((schedule.id as any).toString() as string) + ' does not exist.');
      }
      schedule.lastModified = creationDate;
      Object.keys(existingSchedules[0]).forEach((key) =>
      {
        if (schedule[key] === undefined)
        {
          schedule[key] = existingSchedules[0][key];
        }
      });
      if (typeof schedule.tasks !== 'string')
      {
        schedule.tasks = JSON.stringify(schedule.tasks);
      }
    }
    return App.DB.upsert(this.schedulerTable, schedule) as Promise<SchedulerConfig[]>;
  }

  private async _checkSchedulerTable(): Promise<void>
  {
    // TODO check the scheduler for unlocked rows and detect which schedules should run next
    const availableSchedules: number[] = await this._getAvailableSchedules();
    availableSchedules.forEach((scheduleId) =>
    {
      this._checkSchedulerTableHelper(scheduleId).catch((err) =>
      {
        winston.warn(err.toString() as string);
      });
    });
    setTimeout(this._checkSchedulerTable.bind(this), 60000 - new Date().getTime() % 60000);
  }

  private async _checkSchedulerTableHelper(scheduleId: number): Promise<void>
  {
    const result: string = await this.runSchedule(scheduleId);
    winston.info(result as string);
  }

  private async _getAvailableSchedules(): Promise<number[]>
  {
    return new Promise<number[]>(async (resolve, reject) =>
    {
      const scheduleIds: number[] = [];
      const schedules: SchedulerConfig[] = await this._select([], { running: false }) as SchedulerConfig[];
      schedules.forEach((schedule) =>
      {
        scheduleIds.push(schedule.id);
      });
      resolve(scheduleIds);
    });
  }

  private async _select(columns: string[], filter: object, locked?: boolean): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
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
    });
  }

  private async _setRunning(id: number, running: boolean): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const schedules: SchedulerConfig[] = await this.get(id);
      if (schedules.length !== 0)
      {
        schedules[0].running = running;
        const result: SchedulerConfig[] = await App.DB.upsert(this.schedulerTable, schedules[0]) as SchedulerConfig[];
        if (Array.isArray(result) && result.length > 0)
        {
          return resolve(true);
        }
        else
        {
          return resolve(false);
        }
      }
    });
  }

  private async _setStatus(id: number, status: boolean): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const schedules: SchedulerConfig[] = await this.get(id);
      if (schedules.length !== 0)
      {
        schedules[0].shouldRunNext = status;
        const result: SchedulerConfig[] = await App.DB.upsert(this.schedulerTable, schedules[0]) as SchedulerConfig[];
        if (Array.isArray(result) && result.length > 0)
        {
          return resolve(true);
        }
        else
        {
          return resolve(false);
        }
      }
    });
  }
}

export default Scheduler;
