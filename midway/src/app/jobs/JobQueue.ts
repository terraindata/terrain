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

import pq = require('priorityqueue_native');

import * as _ from 'lodash';
import * as runQueue from 'run-queue';
import * as winston from 'winston';

import JobConfig from 'shared/types/jobs/JobConfig';
import { TaskConfig, TaskOutputConfig, TaskTreeConfig } from 'shared/types/jobs/TaskConfig';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import { Job } from './Job';
import { Task } from './Task';
import { TaskTree } from './TaskTree';

export class JobQueue
{
  private jobs: Map<number, Job>;
  private jobTable: Tasty.Table;
  private priorityQueue: pq.PriorityQueue;

  constructor()
  {
    this.jobs = new Map<number, Job>();
    this.priorityQueue = new pq.PriorityQueue();
    this.jobTable = new Tasty.Table(
      'jobs',
      ['id'],
      [
        'createdAt',
        'meta',
        'name',
        'pausedFilename',
        'priority',
        'running',
        'status',
        'tasks',
        'type',
        'workerId',
      ],
    );
  }

  public cancel(id: number): boolean
  {
    try
    {
      this.jobs.get(id).cancel();
      return true;
    }
    catch (e)
    {
      // do nothing, job was not found
    }
    return false;
  }

  public create(args: TaskConfig[], filename: string): boolean | string
  {
    if (args === undefined || (Array.isArray(args) && args.length === 0))
    {
      return false;
    }
    this.tasks = args;
    const taskTreeConfig: TaskTreeConfig =
      {
        cancel: false,
        filename,
        jobStatus: 0,
        paused: -1,
      };
    return this.taskTree.create(args, taskTreeConfig);
  }

  public async get(id?: number, running?: boolean): Promise<JobConfig[]>
  {
    return this._select([], { id, running });
  }

  public pause(): void
  {
    if (this.taskTree.isCancelled() === false)
    {
      this.taskTree.pause();
    }
  }

  public async unpause(): Promise<void>
  {
    if (this.taskTree.isCancelled() === true)
    {
      await this.run();
    }
  }

  public async printTree(): Promise<void>
  {
    await this.taskTree.printTree();
  }

  public async run(): Promise<TaskOutputConfig>
  {
    return this.taskTree.visit();
  }

  private async _getAvailableJobs(): Promise<number[]>
  {
    return new Promise<number[]>(async (resolve, reject) =>
    {
      const jobIds: number[] = [];
      const jobs: JobQueueConfig[] = await this._select([], { running: true }) as JobQueueConfig[];
      jobs.forEach((job) =>
      {
        jobIds.push(job.id);
      });
      resolve(jobIds);
    });
  }

  private async _jobLoop(): Promise<void>
  {
    // TODO check the job queue for unlocked rows and detect which jobs should run next
    const availableSchedules: number[] = await this._getAvailableJobs();
    availableSchedules.forEach((jobId) =>
    {
      this._checkJobQueueTable(jobId).catch((err) =>
      {
        winston.warn(err.toString() as string);
      });
    });
    setTimeout(this._checkJobQueueTable.bind(this), 60000 - new Date().getTime() % 60000);
  }

  private async _select(columns: string[], filter: object, locked?: boolean): Promise<JobConfig[]>
  {
    return new Promise<JobConfig[]>(async (resolve, reject) =>
    {
      let rawResults: object[] = [];
      if (locked === undefined) // all
      {
        rawResults = await App.DB.select(this.jobTable, columns, filter);
      }
      else if (locked === true) // currently running
      {
        // TODO
      }
      else // currently not running
      {
        // TODO
      }

      const results: JobConfig[] = rawResults.map((result: object) => new JobConfig(result));
      resolve(results);
    });
  }
}

export default JobQueue;
