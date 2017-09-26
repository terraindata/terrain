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

import * as nodeScheduler from 'node-schedule';
import * as Client from 'ssh2-sftp-client';
import * as stream from 'stream';
import * as winston from 'winston';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import { ExportConfig, Import } from '../import/Import';

export const imprt: Import = new Import();

const sftp = new Client();

const sftpconfig: object =
  {
    host: '10.1.1.103',
    port: 22,
    username: 'testuser',
    password: 'Terrain123!',
  };

export interface SchedulerConfig
{
  id?: number;
  jobId?: number;
  jobType?: string;
  params?: object;
  paramsArr?: any[];
  schedule: string;
  sort?: string;
  transport?: object;
}

export class Scheduler
{
  private jobMap: object;
  private scheduleMap: object;
  private schedulerTable: Tasty.Table;

  constructor()
  {
    this.jobMap = {};
    this.scheduleMap = {};
    Promise.resolve(this.createJobs());

    this.schedulerTable = new Tasty.Table(
      'schedules',
      ['id'],
      [
        'jobId',
        'jobType',
        'params',
        'schedule',
        'sort',
        'transport',
      ],
    );
  }

  public async cancelJob(jobID: number): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const schedules: any[] = await App.DB.select(this.schedulerTable, [], { jobId: jobID }) as any[];
      if (schedules.length === 0)
      {
        return resolve(false);
      }
      for (const schedule of schedules)
      {
        if (schedules.hasOwnProperty(schedule))
        {
          this.scheduleMap[schedule['id']].cancel();
        }
      }
      return resolve(true);
    });
  }

  public async createJobs(): Promise<void>
  {
    // 0: import via sftp
    // 1: export via sftp
    return new Promise<void>(async (resolve, reject) =>
    {
      await this.createJob(async (fields: object, path: string, encoding?: string | null) => // import with sftp
      {
        return new Promise<any>(async (resolveJob, rejectJob) =>
        {
          encoding = (encoding !== undefined ? (encoding === 'binary' ? null : encoding) : 'utf8');
          const wth = await sftp.connect(sftpconfig);
          winston.info(path.substring(0, path.lastIndexOf('/') + 1));
          const checkIfDirectoryExists = await sftp.list(path.substring(0, path.lastIndexOf('/') + 1));
          const CheckIfFileExists: object[] = checkIfDirectoryExists.filter((filename) =>
          {
            return filename['name'] === path.substring(path.lastIndexOf('/') + 1);
          });
          if (checkIfDirectoryExists.length > 0 && CheckIfFileExists.length !== 0) // TODO: add permissions checking
          {
            winston.info('Starting import with sftp');
            const readStream: stream.Readable = await sftp.get(path, false, encoding);
            const result = await imprt.upsert(readStream, fields, true);
            resolveJob('Success');
          }
        });
      });

      await this.createJob(async (fields: object, path: string, encoding?: string | null) => // export with sftp
      {
        return new Promise<any>(async (resolveJob, rejectJob) =>
        {
          encoding = (encoding !== undefined ? (encoding === 'binary' ? null : encoding) : 'utf8');
          const wth = await sftp.connect(sftpconfig);
          const checkIfDirectoryExists = await sftp.list(path.substring(0, path.lastIndexOf('/') + 1));
          if (checkIfDirectoryExists.length > 0) // TODO: add permissions checking
          {
            winston.info('Starting export with sftp');
            const readStream: stream.Readable = await sftp.put(await imprt.export(fields as ExportConfig, true), path, false, encoding);
            resolveJob('Success');
          }
        });
      });
    });
  }

  public async createJob(job: (...argss) => any): Promise<number>
  {
    return new Promise<number>(async (resolve, reject) =>
    {
      let lastKey: number = Number(Object.keys(this.jobMap).sort().reverse()[0]);
      if (lastKey === undefined || isNaN(lastKey))
      {
        lastKey = -1;
      }
      lastKey += 1;
      this.jobMap[lastKey] = job;
      resolve(lastKey);
    });
  }

  public async createCustomSchedule(req: SchedulerConfig): Promise<SchedulerConfig>
  {
    return new Promise<SchedulerConfig>(async (resolve, reject) =>
    {
      let jobId: number = -1;
      let argsV: any[] = [];

      if (req['jobType'] === 'import' && req['transport'] !== undefined && (req['transport'] as any)['type'] === 'sftp')
      {
        jobId = 0;
        argsV = [req['params'], (req['transport'] as any)['filename'], 'utf8'];
      }
      else if (req['jobType'] === 'export' && req['transport'] !== undefined && (req['transport'] as any)['type'] === 'sftp')
      {
        jobId = 1;
        argsV = [req['params'], (req['transport'] as any)['filename'], 'utf8'];
      }

      let lastKey: number = Number(Object.keys(this.scheduleMap).sort().reverse()[0]);
      if (lastKey === undefined || isNaN(lastKey))
      {
        lastKey = -1;
      }
      lastKey += 1;

      const job: any = nodeScheduler.scheduleJob(req.schedule,
        function callJob(unwrappedParams) { this.jobMap[jobId](...unwrappedParams); }.bind(this, argsV));
      const result: SchedulerConfig = await this.upsert(req);
      const resultJobId: string = result['id'] !== undefined ? (result['id'] as number).toString() : '-1';
      this.scheduleMap[resultJobId] = job;
      return resolve(result);
    });
  }

  public async createStandardSchedule(req: SchedulerConfig): Promise<SchedulerConfig | null>
  {
    return new Promise<SchedulerConfig | null>(async (resolve, reject) =>
    {
      if (req['jobId'] !== undefined && Object.keys(this.jobMap).indexOf((req['jobId'] as number).toString()) !== -1)
      {
        return resolve(await this.upsert(req));
      }
      resolve(null);
    });
  }

  public async get(id?: number): Promise<SchedulerConfig[]>
  {
    if (id !== undefined)
    {
      return App.DB.select(this.schedulerTable, [], { id }) as any;
    }
    return App.DB.select(this.schedulerTable, [], {}) as any;
  }

  public async updateSchedule(req: SchedulerConfig): Promise<string> // TODO
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (req.id === undefined || Object.keys(this.scheduleMap).indexOf(req.id.toString()) === -1)
      {
        return reject('ID does not exist in schedules.');
      }
      if (req.id === undefined)
      {
        return reject('ID must be a parameter.');
      }
      if (req['jobId'] === undefined)
      {
        return reject('Job ID cannot be undefined.');
      }

      if (req['jobId'] !== undefined && Object.keys(this.jobMap).indexOf((req['jobId'] as number).toString()) === -1)
      {
        return reject('Job ID does not exist in jobs.');
      }
      this.scheduleMap[req.id].cancel();
      delete this.scheduleMap[req.id];
      const args: any[] | undefined = req['paramsArr'] !== undefined ? req['paramsArr'] : [];
      const job: any = nodeScheduler.scheduleJob(req.schedule, this.jobMap[(req['jobId'] as number)](args));
      this.scheduleMap[req.id] = { id: req.id, job, jobId: req.jobId, schedule: req.schedule };
      resolve(JSON.stringify(this.scheduleMap[req.id]));
    });
  }

  public async upsert(schedule: SchedulerConfig): Promise<SchedulerConfig>
  {
    // TODO: cancel job if it's currently running
    return App.DB.upsert(this.schedulerTable, schedule) as Promise<SchedulerConfig>;
  }

  public async delete(id: number): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      // TODO: cancel job if it's currently running
      if (id !== undefined && (await this.get(id)).length !== 0)
      {
        return resolve(await App.DB.delete(this.schedulerTable, { id } as object) as SchedulerConfig[]);
      }
      return reject('Schedule ID not found.');
    });
  }
}

export default Scheduler;
