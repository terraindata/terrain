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
  private runningSchedules: Map<number, Job>;
  private schedulerTable: Tasty.Table;

  constructor()
  {
    this.runningSchedules = new Map<number, Job>();
    this.schedulerTable = new Tasty.Table(
      'schedules',
      ['id'],
      [
        'interval',
        'lastRun',
        'meta',
        'name',
        'pausedFilename',
        'priority',
        'running',
        'shouldRunNext',
        'tasks',
        'templateId',
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

  public async get(id?: number, running?: boolean): Promise<SchedulerConfig[]>
  {
    return this._select([], { id, running });
  }

  public async getAvailableSchedules(): Promise<number[]>
  {
    return new Promise<number[]>(async (resolve, reject) =>
    {
      const scheduleIds: number[] = [];
      const schedules: SchedulerConfig[] = await this._select([], { running: true }) as SchedulerConfig[];
      schedules.forEach((schedule) =>
      {
        scheduleIds.push(schedule.id);
      });
      resolve(scheduleIds);
    });
  }

  public async upsert(user: UserConfig, schedule: SchedulerConfig): Promise<SchedulerConfig[]>
  {
    return App.DB.upsert(this.schedulerTable, schedule) as Promise<SchedulerConfig[]>;
  }

  public async setRunning(id: number, running: boolean): Promise<void>
  {
    const schedules: SchedulerConfig[] = await this.get(id);
    if (schedules.length !== 0)
    {
      schedules[0].running = running;
      await App.DB.upsert(this.schedulerTable, schedules[0]);
    }
  }

  private async _checkSchedulerTable(): Promise<void>
  {
    // TODO check the scheduler for unlocked rows and detect which schedules should run next
    const availableSchedules: number[] = await this.getAvailableSchedules();
    availableSchedules.forEach((scheduleId) =>
    {
      this.checkSchedulerTableHelper(scheduleId);
    });
    setTimeout(this._checkSchedulerTable.bind(this), 60000 - new Date().getTime() % 60000);
  }

  private async _checkSchedulerTableHelper(scheduleId: number): Promise<void>
  {
    const result: taskOutputConfig | string = await _runSchedule(scheduleId);
    if (typeof result === 'string')
    {
      winston.warn(result as string);
    }
    else if ((result as TaskOutputConfig).exit === true)
    {
      winston.info('Schedule ' + scheduleId.toString() as string + ' successfully completed');
    }
  }

  private async _runSchedule(id: number): Promise<TaskOutputConfig | string>
  {
    return new Promise<TaskOutputConfig | string>(async (resolve, reject) =>
    {
      if (this.runningSchedules.get(id) !== undefined)
      {
        return resolve('Schedule is already running.');
      }
      await this.setRunning(id, true);
      this.runningSchedules.set(id, new Job());
      const schedules: SchedulerConfig[] = await this.get(id);
      if (schedules.length === 0)
      {
        return reject('Schedule not found.');
      }
      const schedule: SchedulerConfig = schedules[0];
      let taskConfig: TaskConfig[] = [];
      try
      {
        taskConfig = JSON.parse(schedule.tasks);
      }
      catch (e)
      {
        return reject(e);
      }
      if (Array.isArray(taskConfig) === false)
      {
        return reject('Tasks are in an incorrect format');
      }
      const filename: string = 'Task_' + (id.toString() as string) + '_' + new Date().toISOString() + '.bin';
      const jobCreateStatus: boolean | string = await this.runningSchedules.get(id).create(taskConfig, filename);
      if (typeof jobCreateStatus === 'string')
      {
        return reject(jobCreateStatus as string);
      }
      const result: TaskOutputConfig = await this.runningSchedules.get(id).run();
      await this.setRunning(id, false);
      this.runningSchedules.delete(id);
      // TODO: unlock row
      return resolve(result as TaskOutputConfig);
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
}

export default Scheduler;
