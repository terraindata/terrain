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

import * as fs from 'fs';
import * as naturalSort from 'javascript-natural-sort';
import * as nodeScheduler from 'node-schedule';
import * as request from 'request';
import * as Client from 'ssh2-sftp-client';
import * as stream from 'stream';
import * as winston from 'winston';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import CredentialConfig from '../credentials/CredentialConfig';
import Credentials from '../credentials/Credentials';
import DatabaseConfig from '../database/DatabaseConfig';
import { Export, ExportConfig } from '../io/Export';
import { Import } from '../io/Import';
import UserConfig from '../users/UserConfig';
import { versions } from '../versions/VersionRouter';
import SchedulerConfig from './SchedulerConfig';

export const exprt: Export = new Export();
export const imprt: Import = new Import();
export const credentials: Credentials = new Credentials();

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
        'name',
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
      if (id !== undefined)
      {
        const schedules: SchedulerConfig[] = await this.get(id) as SchedulerConfig[];
        if (schedules.length !== 0)
        {
          for (const schedule of schedules)
          {
            schedule.archived = true;
            await this.cancelJob(schedule.id);
            return resolve(await App.DB.upsert(this.schedulerTable, schedule as object) as SchedulerConfig[]);
          }
        }
      }
      return reject('Schedule ID not found.');
    });
  }

  public async cancelJob(id?: number): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      if (id === undefined)
      {
        return resolve(false);
      }
      const rawSchedules: any[] = await App.DB.select(this.schedulerTable, [], { id }) as any[];
      const schedules: SchedulerConfig[] = rawSchedules.map((result: object) => new SchedulerConfig(result));
      if (schedules.length === 0)
      {
        return resolve(false);
      }
      schedules.map((schedule) =>
      {
        this.scheduleMap[schedule['id'] as number].cancel();
      });
      return resolve(true);
    });
  }

  public async changeActiveStatus(user: UserConfig, id: number, status: number): Promise<SchedulerConfig[]>
  {
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      if (id !== undefined)
      {
        const schedules: SchedulerConfig[] = await this.get(id) as SchedulerConfig[];
        if (schedules.length !== 0)
        {
          for (const schedule of schedules)
          {
            schedule.active = status === 1 ? true : false;
            if (status === 0)
            {
              await this.cancelJob(schedule.id);
            }
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
      else if (req['jobType'] === 'import' && req['transport'] !== undefined && (req['transport'] as any)['type'] === 'http')
      {
        jobId = 2;
        packedParamsSchedule = [req['paramsJob'], req['transport'], req['sort'], 'utf8'];
      }
      else if (req['jobType'] === 'export' && req['transport'] !== undefined && (req['transport'] as any)['type'] === 'http')
      {
        // Not implemented yet
        jobId = 3;
        packedParamsSchedule = [req['paramsJob'], req['transport'], req['sort'], 'utf8'];
      }
      else if (req['jobType'] === 'import' && req['transport'] !== undefined && (req['transport'] as any)['type'] === 'local')
      {
        jobId = 4;
        packedParamsSchedule = [req['paramsJob'], req['transport'], req['sort'], 'utf8'];
      }
      else if (req['jobType'] === 'export' && req['transport'] !== undefined && (req['transport'] as any)['type'] === 'local')
      {
        jobId = 5;
        packedParamsSchedule = [req['paramsJob'], req['transport'], req['sort'], 'utf8'];
      }
      req.active = true;
      req.archived = false;
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
        req.active = true;
        req.archived = false;
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
    return new Promise<SchedulerConfig[]>(async (resolve, reject) =>
    {
      let rawResults;
      if (id !== undefined)
      {
        rawResults = await App.DB.select(this.schedulerTable, [], { id, archived });
      }
      else
      {
        rawResults = await App.DB.select(this.schedulerTable, [], { archived });
      }
      const results: SchedulerConfig[] = rawResults.map((result: object) => new SchedulerConfig(result));
      resolve(results);
    });
  }

  public async initializeJobs(): Promise<void>
  {
    // 0: import via sftp
    // 1: export via sftp
    // 2: import via http
    // 3: export via http (not implemented yet)
    // 4: import via local filesystem
    // 5: export via local filesystem
    await this.createJob(async (scheduleID: number, fields: object, // 0
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
              winston.info('Schedule ' + scheduleID.toString() + ': Error while importing: ' + ((e as any).toString() as string));
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

    await this.createJob(async (scheduleID: number, fields: object, transport: object, // 1
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
          const checkIfDirectoryExists: object[] =
            await sftp.list(path.substring(0, path.substring(0, path.lastIndexOf('/')).lastIndexOf('/') + 1));
          const parentDir: string = path.substring(path.lastIndexOf('/', path.lastIndexOf('/') - 1) + 1, path.lastIndexOf('/'));
          const dirExists = checkIfDirectoryExists.filter((obj) => obj['name'] === parentDir);

          if (dirExists.length > 0 && parentDir !== '/')
          {
            winston.info('Schedule ' + scheduleID.toString() + ': Starting export with sftp');
            let writeStream: stream.Readable = new stream.Readable();
            try
            {
              writeStream = await exprt.export(fields as ExportConfig, true) as stream.Readable;
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
          else
          {
            winston.info('Unable to export to that file. Are you sure that path exists?');
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

    await this.createJob(async (scheduleID: number, fields: object, // 2
      transport: object, sort: string, encoding?: string | null): Promise<any> => // import with http
    {
      return new Promise<any>(async (resolveJob, rejectJob) =>
      {
        let httpJobConfig;
        try
        {
          await this.setJobStatus(scheduleID, 1);
          const creds: CredentialConfig[] = await credentials.get(transport['id'], transport['type']);
          if (creds.length === 0)
          {
            return rejectJob('No HTTP credentials matched parameters.');
          }
          try
          {
            httpJobConfig = JSON.parse(creds[0].meta);
          }
          catch (e)
          {
            return rejectJob(e.message);
          }
          if (httpJobConfig['baseURL'] === undefined ||
            (httpJobConfig['baseURL'] !== undefined && transport['filename'] !== undefined
              && transport['filename'].substr(0, httpJobConfig['baseURL'].length) !== httpJobConfig['baseURL']))
          {
            return rejectJob('Invalid base URL ' + (transport['filename'].substr(0, httpJobConfig['baseURL'].length) as string));
          }
          delete httpJobConfig['baseURL'];
          httpJobConfig['uri'] = transport['filename'];
          encoding = (encoding !== undefined ? (encoding === 'binary' ? null : encoding) : 'utf8');
          const readStream: any = new stream.PassThrough();
          try
          {
            request(httpJobConfig).pipe(readStream);
            winston.info('Schedule ' + scheduleID.toString() + ': Starting import with http');
            const result = await imprt.upsert(readStream, fields, true);
            await this.setJobStatus(scheduleID, 0);
            winston.info('Schedule ' + scheduleID.toString() + ': Successfully completed scheduled import with http.');
            return resolveJob('Successfully completed scheduled import with http.');
          }
          catch (e)
          {
            winston.info('Schedule ' + scheduleID.toString() + ': Error while importing: ' + ((e as any).toString() as string));
          }

          await this.setJobStatus(scheduleID, 0);
          return rejectJob('Failed to import.');
        }
        catch (e)
        {
          winston.info('Schedule ' + scheduleID.toString() + ': Exception caught: ' + (e.toString() as string));
          await this.setJobStatus(scheduleID, 0);
          return rejectJob(e.toString());
        }
      });
    });

    await this.createJob(async (scheduleID: number, fields: object, // 3, not implemented yet
      transport: object, sort: string, encoding?: string | null): Promise<any> => // export with http
    {
      return new Promise<any>(async (resolveJob, rejectJob) =>
      {
        resolveJob('');
      });
    });

    await this.createJob(async (scheduleID: number, fields: object, // 4
      transport: object, sort: string, encoding?: string | null): Promise<any> => // import with local filesystem
    {
      return new Promise<any>(async (resolveJob, rejectJob) =>
      {
        try
        {
          let readStream: stream.Readable | string;
          try
          {
            await this.setJobStatus(scheduleID, 1);
            readStream = await this._readFromFilesystem(transport['filename']);
            if (typeof readStream === 'string')
            {
              winston.info('Schedule ' + scheduleID.toString() + ': Failed to complete scheduled import from local filesystem.');
              return rejectJob(readStream as string);
            }
            winston.info('Schedule ' + scheduleID.toString() + ': Starting import with sftp');
            const result = await imprt.upsert(readStream as stream.Readable, fields, true);
            await this.setJobStatus(scheduleID, 0);
            winston.info('Schedule ' + scheduleID.toString() + ': Successfully completed scheduled import from local filesystem.');
            return resolveJob('Successfully completed scheduled import from local filesystem.');
          }
          catch (e)
          {
            winston.info('Schedule ' + scheduleID.toString() + ': Error while importing: ' + ((e as any).toString() as string));
          }
          await this.setJobStatus(scheduleID, 0);
          return rejectJob('Failed to import.');
        }
        catch (e)
        {
          winston.info('Schedule ' + scheduleID.toString() + ': Exception caught: ' + (e.toString() as string));
          await this.setJobStatus(scheduleID, 0);
          return rejectJob(e.toString());
        }
      });
    });

    await this.createJob(async (scheduleID: number, fields: object, transport: object, // 5
      sort: string, encoding?: string | null) => // export to local filesystem
    {
      return new Promise<any>(async (resolveJob, rejectJob) =>
      {
        try
        {
          const path: string = transport['filename'];
          winston.info('Schedule ' + scheduleID.toString() + ': Starting export to local filesystem');
          await this.setJobStatus(scheduleID, 1);
          let writeStream: stream.Readable = new stream.Readable();
          try
          {
            writeStream = await exprt.export(fields as ExportConfig, true) as stream.Readable;
          }
          catch (e)
          {
            winston.info('Schedule ' + scheduleID.toString() + ': Error while exporting: ' + ((e as any).toString() as string));
            await this.setJobStatus(scheduleID, 0);
            return rejectJob('Failed to export.');
          }
          try
          {
            const didWriteToFile: string = await this._writeToFilesystem(writeStream, path);
            if (didWriteToFile !== 'Success')
            {
              throw new Error(didWriteToFile);
            }
            winston.info('Schedule ' + scheduleID.toString() + ': Successfully completed scheduled export to local filesystem.');
            return resolveJob('Successfully completed scheduled export to local filesystem.');
          }
          catch (e)
          {
            if (e.message !== undefined)
            {
              winston.info('Error: ' + ((e.message as string).toString() as string));
            }
            winston.info('Schedule ' + scheduleID.toString() +
              ': Error while trying to write file. Do you have write permission?');
          }
          await this.setJobStatus(scheduleID, 0);
          return rejectJob('Failed to export.');
        }
        catch (e)
        {
          winston.info('Schedule ' + scheduleID.toString() + ': Exception caught: ' + (e.toString() as string));
          await this.setJobStatus(scheduleID, 0);
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
      if (schedules[scheduleInd].active === true) // only start active schedules
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
        schedule.currentlyRunning = status === 1 ? true : false;
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

        const results: SchedulerConfig[] = await this.get();
        schedule.id = results.length + 1;
      }
      return resolve(await App.DB.upsert(this.schedulerTable, schedule) as SchedulerConfig[]);
    });
  }

  private async _readFromFilesystem(filename: string): Promise<stream.Readable | string>
  {
    return new Promise<stream.Readable | string>(async (resolve, reject) =>
    {
      try
      {
        // tslint:disable-next-line:no-bitwise
        fs.accessSync(filename, fs.constants.F_OK | fs.constants.R_OK);
        return resolve(fs.createReadStream(filename));
      }
      catch (e)
      {
        if (e.message !== undefined)
        {
          return resolve(e.message as string);
        }
        else
        {
          return resolve(e.toString());
        }
      }
    });
  }

  private async _writeToFilesystem(readStream: stream.Readable, filename: string): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      try
      {
        const filepath = filename.substring(0, filename.lastIndexOf('/') + 1);
        // tslint:disable-next-line:no-bitwise
        fs.accessSync(filepath, fs.constants.F_OK | fs.constants.W_OK);
        const writeStream = fs.createWriteStream(filename);
        readStream.pipe(writeStream);
        writeStream.on('close', () =>
        {
          return resolve('Success');
        });
      }
      catch (e)
      {
        if (e.message !== undefined)
        {
          return resolve(e.message as string);
        }
        else
        {
          return resolve(e.toString());
        }
      }
    });
  }
}

export default Scheduler;
