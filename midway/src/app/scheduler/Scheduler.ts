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

import * as naturalSort from 'javascript-natural-sort';
import * as nodeScheduler from 'node-schedule';
import * as Client from 'ssh2-sftp-client';
import * as stream from 'stream';
import * as winston from 'winston';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import { CredentialConfig, Credentials } from '../credentials/Credentials';
import { ExportConfig, Import } from '../import/Import';
import { UserConfig } from '../users/Users';
import { versions } from '../versions/VersionRouter';

export const imprt: Import = new Import();
export const credentials: Credentials = new Credentials();

// const sftpconfig: object =
//   {
//     host: '10.1.1.103',
//     port: 22,
//     username: 'testuser',
//     password: 'Terrain123!',
//   };

export interface SchedulerConfig
{
  active?: number;                   // whether the schedule is running (different from currentlyRunning)
  archived?: number;                 // whether the schedule has been archived (deleted) or not
  currentlyRunning?: number;         // whether the job is currently running
  id?: number;                       // schedule ID
  jobId?: number;                    // corresponds to job ID
  jobType?: string;                  // import or export etc.
  paramsJob?: object;                // parameters passed for the job, excluding info like filename
  paramsScheduleArr?: any[];         // parameters passed for the schedule
  paramsScheduleStr?: string;        // JSON stringified representation of paramsScheduleArr
  schedule: string;                  // cronjob format for when the schedule should run
  sort?: string;                     // for regex expression file matching, which end of the list should be used
  transport?: object;                // sftp and relevant parameters, https, local filesystem, etc.
  transportStr?: string;             // JSON stringified representation of transport
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

    this.schedulerTable = new Tasty.Table(
      'schedules',
      ['id'],
      [
        'active',
        'archived',
        'currentlyRunning',
        'jobId',
        'jobType',
        'paramsScheduleStr',
        'schedule',
        'sort',
        'transportStr',
      ],
    );
  }

  public async archive(user: UserConfig, id: number): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      // TODO: cancel job if it's currently running
      if (id !== undefined)
      {
        const schedules: SchedulerConfig[] = await this.get(id) as SchedulerConfig[];
        if (schedules.length !== 0)
        {
          for (const schedule of schedules)
          {
            schedule.archived = 1;
            return resolve(await App.DB.upsert(this.schedulerTable, schedule as object) as SchedulerConfig[]);
          }
        }
      }
      return reject('Schedule ID not found.');
    });
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
          this.scheduleMap[schedule['id']].cancelNext();
        }
      }
      return resolve(true);
    });
  }

  public async changeActiveStatus(user: UserConfig, id: number, status: number): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      // TODO: cancel job if it's currently running
      if (id !== undefined)
      {
        const schedules: SchedulerConfig[] = await this.get(id) as SchedulerConfig[];
        if (schedules.length !== 0)
        {
          for (const schedule of schedules)
          {
            schedule.active = status;
            return resolve(await App.DB.upsert(this.schedulerTable, schedule as object) as SchedulerConfig[]);
          }
        }
      }
      return reject('Schedule ID not found.');
    });
  }

  public async createCustomSchedule(user: UserConfig, req: SchedulerConfig): Promise<SchedulerConfig>
  {
    return new Promise<SchedulerConfig>(async (resolve, reject) =>
    {
      if (req.id !== undefined)
      {
        return reject('Cannot create a custom schedule with a passed ID.');
      }
      if (req.jobId !== undefined)
      {
        return reject('Cannot create a custom schedule with a passed job ID.');
      }
      let jobId: number = -1;
      let packedParamsSchedule: any[] = [];
      req['sort'] = req['sort'] === undefined ? 'asc' : req['sort'];

      if (req['jobType'] === 'import' && req['transport'] !== undefined && (req['transport'] as any)['type'] === 'sftp')
      {
        jobId = 0;
        packedParamsSchedule = [req['paramsJob'], req['transport'], req['sort'], 'utf8'];
      }
      else if (req['jobType'] === 'export' && req['transport'] !== undefined && (req['transport'] as any)['type'] === 'sftp')
      {
        jobId = 1;
        packedParamsSchedule = [req['paramsJob'], req['transport'], req['sort'], 'utf8'];
      }
      req.active = 1;
      req.archived = 0;
      req.jobId = jobId;
      req.paramsScheduleArr = packedParamsSchedule;
      const newScheduledJob: SchedulerConfig[] = await this.upsert(user, req);
      const resultJobId: string = newScheduledJob[0]['id'] !== undefined ? (newScheduledJob[0]['id'] as any).toString() : '-1';
      packedParamsSchedule = [resultJobId].concat(packedParamsSchedule);
      const job: any = nodeScheduler.scheduleJob(req.schedule,
        function callJob(unwrappedParams) { this.jobMap[jobId](...unwrappedParams); }.bind(this, packedParamsSchedule));
      this.scheduleMap[resultJobId] = job;
      return resolve(newScheduledJob[0]);
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

  public async createStandardSchedule(user: UserConfig, req: SchedulerConfig): Promise<SchedulerConfig | null>
  {
    return new Promise<SchedulerConfig | null>(async (resolve, reject) =>
    {
      if (req['jobId'] !== undefined && Object.keys(this.jobMap).indexOf((req['jobId'] as number).toString()) !== -1)
      {
        req.active = 1;
        req.archived = 0;
        const newScheduledJob: SchedulerConfig[] = await this.upsert(user, req);
        const resultJobId: string = newScheduledJob[0]['id'] !== undefined ? (newScheduledJob[0]['id'] as any).toString() : '-1';
        const job: any = nodeScheduler.scheduleJob(req.schedule, this.jobMap[resultJobId]);
        this.scheduleMap[resultJobId] = job;
        return resolve(newScheduledJob[0]);
      }
      resolve(null);
    });
  }

  public async get(id?: number, archived?: boolean): Promise<SchedulerConfig[]>
  {
    const archivedInt: number = archived === true ? 1 : 0;
    if (id !== undefined)
    {
      return App.DB.select(this.schedulerTable, [], { id, archived: archivedInt }) as any;
    }
    return App.DB.select(this.schedulerTable, [], { archived: archivedInt }) as any;
  }

  public async initializeJobs(): Promise<void>
  {
    // 0: import via sftp
    // 1: export via sftp
    await this.createJob(async (scheduleID: number, fields: object,
      transport: object, sort: string, encoding?: string | null): Promise<any> => // import with sftp
    {
      return new Promise<any>(async (resolveJob, rejectJob) =>
      {
        const sftp = new Client();
        let sftpconfig: object = {};
        try
        {
          await this.setJobStatus(scheduleID, 1);
          const path: string = transport['filename'];
          const creds: CredentialConfig[] = await credentials.get(transport['id'], transport['type']);
          if (creds.length === 0)
          {
            return rejectJob('No SFTP credentials matched parameters.');
          }
          try
          {
            sftpconfig = JSON.parse(creds[0].meta);
          }
          catch (e)
          {
            return rejectJob(e.message);
          }
          encoding = (encoding !== undefined ? (encoding === 'binary' ? null : encoding) : 'utf8');
          await sftp.connect(sftpconfig);
          const checkIfDirectoryExists: object[] = await sftp.list(path.substring(0, path.lastIndexOf('/') + 1));
          let importFilename: string = path;
          let matches: string[] = [];
          const CheckIfFileExists: object[] = checkIfDirectoryExists.filter((filename) =>
          {
            if (filename['type'] !== '-')
            {
              return;
            }
            const match = filename['name'].match(path.substring(path.lastIndexOf('/') + 1).replace(/\*/g, '.*'));
            if (match !== null && match.length > 0)
            {
              matches = matches.concat(match[0]);
              return filename['name'];
            }
          });
          matches.sort(naturalSort);
          if (matches.length !== 0)
          {
            importFilename = sort.toLowerCase() === 'asc' ? path.substring(0, path.lastIndexOf('/') + 1) + matches[matches.length - 1]
              : path.substring(0, path.lastIndexOf('/') + 1) + matches[0];
          }
          if (importFilename.indexOf('*') !== -1)
          {
            winston.info('Schedule ' + scheduleID.toString() + ': Detected wildcard(s) in filename, but could not find matching file.');
          }
          if (checkIfDirectoryExists.length > 0 && CheckIfFileExists.length !== 0 && importFilename !== '')
          {
            let readStream: stream.Readable;
            try
            {
              readStream = await sftp.get(importFilename, false, encoding);
              winston.info('Schedule ' + scheduleID.toString() + ': Starting import with sftp');
              const result = await imprt.upsert(readStream, fields, true);
              await this.setJobStatus(scheduleID, 0);
              await sftp.end();
              winston.info('Schedule ' + scheduleID.toString() + ': Successfully completed scheduled import with sftp.');
              return resolveJob('Successfully completed scheduled import with sftp.');
            }
            catch (e)
            {
              winston.info('Schedule ' + scheduleID.toString() + ': Error while trying to read file. Do you have read permission?');
            }
            return rejectJob('Failure to import.');
          }
          else
          {
            winston.info('Schedule ' + scheduleID.toString() + ': Failed to complete scheduled import with sftp.');
          }
          await this.setJobStatus(scheduleID, 0);
          return rejectJob('Failed to import.');
        }
        catch (e)
        {
          winston.info('Schedule ' + scheduleID.toString() + ': Exception caught: ' + (e.toString() as string));
          await this.setJobStatus(scheduleID, 0);
          await sftp.end();
          return rejectJob(e.toString());
        }
      });
    });

    await this.createJob(async (scheduleID: number, fields: object, transport: object,
      sort: string, encoding?: string | null) => // export with sftp
    {
      return new Promise<any>(async (resolveJob, rejectJob) =>
      {
        const sftp = new Client();
        let sftpconfig: object = {};
        try
        {
          await this.setJobStatus(scheduleID, 1);
          const path: string = transport['filename'];
          const creds: CredentialConfig[] = await credentials.get(transport['id'], transport['type']);
          if (creds.length === 0)
          {
            return rejectJob('No SFTP credentials matched parameters.');
          }
          try
          {
            sftpconfig = JSON.parse(creds[0].meta);
          }
          catch (e)
          {
            return rejectJob(e.message);
          }
          encoding = (encoding !== undefined ? (encoding === 'binary' ? null : encoding) : 'utf8');
          await sftp.connect(sftpconfig);
          const checkIfDirectoryExists = await sftp.list(path.substring(0, path.lastIndexOf('/') + 1));
          if (checkIfDirectoryExists.length !== 0)
          {
            winston.info('Schedule ' + scheduleID.toString() + ': Starting export with sftp');
            let writeStream: stream.Readable = new stream.Readable();
            try
            {
              writeStream = await imprt.export(fields as ExportConfig, true) as stream.Readable;
            }
            catch (e)
            {
              winston.info('Schedule ' + scheduleID.toString() + ': Error while exporting: ' + ((e as any).toString() as string));
              await this.setJobStatus(scheduleID, 0);
              return rejectJob('Failed to export.');
            }
            let readStream: stream.Readable;
            try
            {
              readStream = await sftp.put(writeStream, path, false, encoding);
              await sftp.end();
              winston.info('Schedule ' + scheduleID.toString() + ': Successfully completed scheduled export with sftp.');
              return resolveJob('Successfully completed scheduled export with sftp.');
            }
            catch (e)
            {
              winston.info('Schedule ' + scheduleID.toString() +
                ': Error while trying to write file. Do you have write permission?');
            }
            await this.setJobStatus(scheduleID, 0);
            return rejectJob('Failed to export.');
          }
        }
        catch (e)
        {
          winston.info('Schedule ' + scheduleID.toString() + ': Exception caught: ' + (e.toString() as string));
          await this.setJobStatus(scheduleID, 0);
          await sftp.end();
          return rejectJob(e.toString());
        }
      });
    });
  }

  public async initializeSchedules(): Promise<void>
  {
    const schedules: SchedulerConfig[] = await this.get() as SchedulerConfig[];
    for (const scheduleInd in schedules)
    {
      if (schedules[scheduleInd].active !== undefined && schedules[scheduleInd].active === 1) // only start active schedules
      {
        const schedule: SchedulerConfig = schedules[scheduleInd];
        const scheduleJobId: string = schedule['id'] !== undefined ? (schedule['id'] as number).toString() : '-1';
        try
        {
          if (schedule.paramsScheduleStr !== undefined)
          {
            schedule.paramsScheduleArr = JSON.parse(schedule.paramsScheduleStr as string);
          }
          else
          {
            winston.info('Schedule ' + ((schedule['id'] as any).toString() as string) + ' does not have a valid schedule params object.');
          }
        }
        catch (e)
        {
          winston.info('Schedule ' + ((schedule['id'] as any).toString() as string) + ' does not have a valid schedule params object.');
        }

        try
        {
          if (schedule.paramsScheduleStr !== undefined)
          {
            schedule.transport = JSON.parse(schedule.transportStr as string);
          }
          else
          {
            winston.info('Schedule ' + ((schedule['id'] as any).toString() as string) + ' does not have a valid transport object.');
          }
        }
        catch (e)
        {
          winston.info('Schedule ' + ((schedule['id'] as any).toString() as string) + ' does not have a valid transport object.');
        }
        const appendedParamsArr: any[] = [scheduleJobId].concat(JSON.parse(schedule.paramsScheduleStr as string));
        const job: any = nodeScheduler.scheduleJob(schedule.schedule,
          function callJob(unwrappedParams)
          {
            this.jobMap[(schedule['jobId'] as number)](...unwrappedParams);
          }.bind(this, appendedParamsArr));
        this.scheduleMap[scheduleJobId] = job;
      }
    }
  }

  public async setJobStatus(scheduleID: number, status: number): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const schedules: SchedulerConfig[] = await this.get(scheduleID) as SchedulerConfig[];
      if (schedules.length !== 0)
      {
        const schedule: SchedulerConfig = schedules[0];
        schedule.currentlyRunning = status;
        return resolve(true);
      }
      return resolve(false);
    });
  }

  public async upsert(user: UserConfig, schedule: SchedulerConfig): Promise<SchedulerConfig[]>
  {
    // TODO: cancel job if it's currently running
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
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
            if (scheduleObj.archived !== undefined && scheduleObj.archived === 1)
            {
              return reject('Cannot upsert on an archived schedule.');
            }
            if (scheduleObj.currentlyRunning !== undefined && scheduleObj.currentlyRunning === 1)
            {
              this.scheduleMap[(scheduleObj['id'] as number)].cancelNext();
              if (scheduleObj.active === 1)
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
          }
          // insert a version to save the past state of this schedule
          await versions.create(user, 'schedules', schedule.id, schedule);
        }
      }
      else
      {
        schedule.active = schedule.active !== undefined ? schedule.active : 0;
        schedule.archived = 0;
        schedule.currentlyRunning = 0;
      }
      return resolve(await App.DB.upsert(this.schedulerTable, schedule) as SchedulerConfig[]);
    });
  }
}

export default Scheduler;
