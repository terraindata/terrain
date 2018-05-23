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

import * as cronParser from 'cron-parser';
import * as stream from 'stream';
import * as winston from 'winston';

import { JobConfig } from 'shared/types/jobs/JobConfig';
import { TaskConfig } from 'shared/types/jobs/TaskConfig';
import { TaskOutputConfig } from 'shared/types/jobs/TaskOutputConfig';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import IntegrationConfig from '../integrations/IntegrationConfig';
import Integrations from '../integrations/Integrations';
import { Sources } from '../io/sources/Sources';
import { Job } from '../jobs/Job';
import { UserConfig } from '../users/UserConfig';
import SchedulerConfig from './SchedulerConfig';

export const integrations: Integrations = new Integrations();
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
        'createdBy',
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
    // reset all schedules that are currently running back to not running
    await this._resetAllRunningSchedules();
    setTimeout(this._checkSchedulerTable.bind(this), 60000 - new Date().getTime() % 60000);
  }

  public cancel(id: number): Promise<SchedulerConfig[]>
  {
    if (this.runningSchedules.get(id) !== undefined)
    {
      this.runningSchedules.get(id).cancel();
      // TODO: unlock row
      return this.get(id) as Promise<SchedulerConfig[]>;
    }
    return Promise.reject(new Error('Schedule not found.'));
  }

  public async delete(id: number): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      const deletedSchedules: SchedulerConfig[] = await this.get(id);
      if (deletedSchedules.length === 0)
      {
        return reject(new Error('Schedule does not exist.'));
      }
      await App.DB.delete(this.schedulerTable, { id });
      return resolve(deletedSchedules as SchedulerConfig[]);
    });
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

  public async getByTemplate(templateId: string): Promise<SchedulerConfig[]>
  {
    return (await this._select([], { shouldRunNext: true })).filter((schedule) =>
    {
      const tasks: any[] = JSON.parse(schedule.tasks);
      return tasks.some((task) =>
      {
        return task.params && task.params.options && task.params.options.templateId &&
          task.params.options.templateId.toString() === templateId;
      });
    });
  }

  public async getLog(id?: number): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      // TODO add extensive logging support
      resolve([{}]);
    });
  }

  public async runSchedule(id: number, runNow?: boolean, userId?: number): Promise<SchedulerConfig[] | string>
  {
    return new Promise<SchedulerConfig[] | string>(async (resolve, reject) =>
    {
      if (this.runningSchedules.get(id) !== undefined)
      {
        return reject(new Error('Schedule is already running.'));
      }
      const schedules: SchedulerConfig[] = await this.get(id);
      if (schedules.length === 0)
      {
        return reject(new Error('Schedule not found.'));
      }
      const schedule: SchedulerConfig = schedules[0];
      if (schedule.running === true)
      {
        return reject(new Error('Schedule ' + (id.toString() as string) + ' is already running.'));
      }
      const jobFilename: string = 'Job_' + (id.toString() as string) + '_' + new Date().toISOString() + '.bin';
      const jobType: string = runNow === true ? 'Scheduled ad-hoc' : 'Scheduled';
      const jobConfig: JobConfig =
        {
          createdAt: null,
          createdBy: schedule.createdBy,
          id: null,
          logId: null,
          meta: '',
          name: schedule.name,
          pausedFilename: jobFilename,
          priority: 1,
          running: null,
          runNowPriority: null,
          scheduleId: id,
          status: '',
          tasks: schedule.tasks,
          type: jobType,
          workerId: 1, // TODO change this for clustering support
        };
      await this.setRunning(id, true);
      const jobCreateStatus: JobConfig[] | string = await App.JobQ.create(jobConfig, runNow, userId);
      if (typeof jobCreateStatus === 'string')
      {
        return reject(new Error(jobCreateStatus as string));
      }
      this.runningSchedules.delete(id);
      return resolve(await this.get(id) as SchedulerConfig[]);
    });
  }

  public pause(id: number): Promise<SchedulerConfig[] | string>
  {
    if (this.runningSchedules.get(id) !== undefined)
    {
      this.runningSchedules.get(id).pause();
      return this.get(id) as Promise<SchedulerConfig[]>;
    }
    return Promise.reject(new Error('Schedule not found.'));
  }

  public async setRunning(id: number, running: boolean): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      const schedules: SchedulerConfig[] = await this.get(id);
      if (schedules.length !== 0)
      {
        if (running === true)
        {
          const currDate = new Date();
          // if (schedules[0].lastRun.valueOf() < currDate)
          // {
          schedules[0].lastRun = currDate;
          // }
        }
        schedules[0].running = running;
        return resolve(await App.DB.upsert(this.schedulerTable, schedules[0]) as SchedulerConfig[]);
      }
    });
  }

  public async setStatus(id: number, status: boolean): Promise<SchedulerConfig[]>
  {
    if (typeof status !== 'boolean' || status === undefined)
    {
      return Promise.resolve([] as SchedulerConfig[]);
    }
    return this._setStatus(id, status) as Promise<SchedulerConfig[]>;
  }

  public async unpause(id: number): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      if (this.runningSchedules.get(id) !== undefined)
      {
        await this.runningSchedules.get(id).unpause();
        // wait for the unpause to resolve first
        return resolve(await this.get(id) as SchedulerConfig[]);
      }
      return resolve([] as SchedulerConfig[]);
    });
  }

  public async upsert(schedule: SchedulerConfig, user?: UserConfig): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      const creationDate: Date = new Date();
      if (schedule.id === undefined) // create
      {
        if (schedule.name === undefined || schedule.cron === undefined)
        {
          return reject(new Error('Schedule name and cron must be provided.'));
        }
        const currIntervalCronDate = cronParser.parseExpression(schedule.cron);

        schedule.createdAt = creationDate;
        schedule.createdBy = user !== undefined ? user.id : -1;
        schedule.lastModified = creationDate;
        schedule.lastRun = new Date(currIntervalCronDate.prev().toDate().valueOf() + 1000);
        schedule.meta = (schedule.meta !== undefined && schedule.meta !== null) ? schedule.meta : '';
        schedule.priority = (schedule.priority !== undefined && schedule.priority !== null) ? schedule.priority : 1;
        schedule.running = (schedule.running !== undefined && schedule.running !== null) ? schedule.running : false;
        schedule.shouldRunNext = (schedule.shouldRunNext !== undefined && schedule.shouldRunNext !== null)
          ? schedule.shouldRunNext : true;
        schedule.tasks = (schedule.tasks !== undefined && schedule.tasks !== null) ? JSON.stringify(schedule.tasks) : JSON.stringify([]);
        schedule.workerId = (schedule.workerId !== undefined && schedule.workerId !== null) ? schedule.workerId : 1;
      }
      else
      {
        const existingSchedules: SchedulerConfig[] = await this.get(schedule.id);
        if (existingSchedules.length === 0)
        {
          return reject(new Error('Schedule ' + ((schedule.id as any).toString() as string) + ' does not exist.'));
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
      return resolve(await App.DB.upsert(this.schedulerTable, schedule) as SchedulerConfig[]);
    });
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
    const result: SchedulerConfig[] | string = await this.runSchedule(scheduleId);
    if (typeof result === 'string')
    {
      winston.info(result as string);
    }
  }

  private async _getAvailableSchedules(): Promise<number[]>
  {
    return new Promise<number[]>(async (resolve, reject) =>
    {
      const scheduleIds: number[] = [];
      const schedules: SchedulerConfig[] = await this._select([], { running: false }) as SchedulerConfig[];
      schedules.forEach((schedule) =>
      {
        try
        {
          const lastRun = new Date(schedule.lastRun);
          const currTime = new Date(new Date().valueOf() + 1000);
          const currIntervalCronDate = cronParser.parseExpression(schedule.cron);
          const prevInterval = currIntervalCronDate.prev().toDate();

          if (prevInterval.valueOf() > lastRun.valueOf() && currTime.valueOf() > lastRun.valueOf()
            && schedule.shouldRunNext === true)
          {
            scheduleIds.push(schedule.id);
          }
        }
        catch (e)
        {
          winston.warn('Error while trying to parse scheduler cron: ' + ((e as any).toString() as string));
        }
      });
      resolve(scheduleIds);
    });
  }

  private async _resetAllRunningSchedules(): Promise<void>
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      const runningSchedules: SchedulerConfig[] = await this._select([], { running: true }) as SchedulerConfig[];
      runningSchedules.forEach(async (val) =>
      {
        val.running = false;
        const updatedSchedule: SchedulerConfig[] = await App.DB.upsert(this.schedulerTable, val) as SchedulerConfig[];
      });
      resolve();
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

      const results: SchedulerConfig[] = rawResults.map((result: object) => new SchedulerConfig(result as SchedulerConfig));
      resolve(results);
    });
  }

  private async _setStatus(id: number, status: boolean): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      const schedules: SchedulerConfig[] = await this.get(id);
      if (schedules.length !== 0)
      {
        schedules[0].shouldRunNext = status;
        return resolve(await App.DB.upsert(this.schedulerTable, schedules[0]) as SchedulerConfig[]);
      }
      else
      {
        return resolve([] as SchedulerConfig[]);
      }
    });
  }
}

export default Scheduler;
