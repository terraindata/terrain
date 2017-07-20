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

import * as winston from 'winston';
import * as App from '../App';
import * as Util from '../Util';

export interface SchedulerConfig
{
  id?: number;
  name?: string;
  schedule?: string;
  job?: any;
}

export class Scheduler
{
  private jobMap: object;
  private scheduleMap: object;

  constructor()
  {
    this.jobMap = {};
    this.scheduleMap = {};
    this.createJobs();
  }

  public createJobs(): void
  {
    this.createJob(async () =>
    {
      winston.info('test function');
    });
  }

  public createJob(job: () => void): number
  {
    let lastKey: number = Number(Object.keys(this.scheduleMap).sort().reverse()[0]);
    if (lastKey === undefined || isNaN(lastKey))
    {
      lastKey = -1;
    }
    lastKey += 1;
    this.jobMap[lastKey] = job;
    return lastKey;
  }

  public async createSchedule(req: SchedulerConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (req.name === undefined || Object.keys(this.scheduleMap).indexOf(req.name) !== -1)
      {
        return reject('Name already exists in schedule');
      }
      if (req.id === undefined || Object.keys(this.jobMap).indexOf(req.id.toString()) === -1)
      {
        return reject('ID does not exist in jobs');
      }
      const job: any = App.scheduler.scheduleJob(req.schedule, this.jobMap[req.id]);
      this.scheduleMap[req.name] = { id: req.id, schedule: req.schedule, job };
      resolve('Success');
    });
  }

  public async deleteSchedule(req: SchedulerConfig): Promise<string> // TODO
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (req.name === undefined || Object.keys(this.scheduleMap).indexOf(req.name) === -1)
      {
        return reject('Name does not exist in schedule');
      }
      this.scheduleMap[req.name]['job'].cancel();
      delete this.scheduleMap[req.name];
      resolve('Success');
    });
  }

  public async getSchedule(req: SchedulerConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (req.name !== undefined && Object.keys(this.scheduleMap).indexOf(req.name.toString()) !== -1)
      {
        return resolve(JSON.stringify(this.scheduleMap[req.name]));
      }
      if (req.name === undefined || Object.keys(this.scheduleMap).indexOf(req.name.toString()) === -1)
      {
        return resolve('Name does not exist in schedule');
      }
      resolve(JSON.stringify(this.scheduleMap));
    });
  }

  public async updateSchedule(req: SchedulerConfig): Promise<string> // TODO
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (req.name === undefined || Object.keys(this.scheduleMap).indexOf(req.name) === -1)
      {
        return reject('Name does not exist in schedule');
      }
      if (req.id === undefined)
      {
        return reject('ID must be a parameter');
      }
      this.scheduleMap[req.name]['job'].cancel();
      delete this.scheduleMap[req.name];
      const job: any = App.scheduler.scheduleJob(req.schedule, this.jobMap[req.id]);
      this.scheduleMap[req.name] = { id: req.id, schedule: req.schedule, job };
      resolve('Success');
    });
  }
}

export default Scheduler;
