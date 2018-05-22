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

import * as _ from 'lodash';
import * as stream from 'stream';
import * as winston from 'winston';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import IntegrationConfig from '../integrations/IntegrationConfig';
import BufferTransform from '../io/streams/BufferTransform';
import SchedulerConfig from '../scheduler/SchedulerConfig';
import { integrations } from '../scheduler/SchedulerRouter';
import JobConfig from './JobConfig';

import JobLogConfig from './JobLogConfig';

export class JobLog
{
  private jobLogTable: Tasty.Table;

  constructor()
  {
    this.jobLogTable = new Tasty.Table(
      'jobLogs',
      ['id'],
      [
        'contents',
        'createdAt',
      ],
    );
  }

  /*
   * PARAMS: jobId, logStream (number, stream.Readable ==> number)
   *
   */
  public async create(jobId: number, logStream: stream.Readable, jobStatus?: boolean): Promise<JobLogConfig[]>
  {
    return new Promise<JobLogConfig[]>(async (resolve, reject) =>
    {
      const jobLogs: JobLogConfig[] = await this.get(jobId);
      if (jobLogs.length !== 0)
      {
        throw new Error('Job log already exists');
      }

      const newJobLog: JobLogConfig =
        {
          contents: '',
          createdAt: new Date(),
          id: jobId,
        };

      const upsertedJobLogs: JobLogConfig[] = await App.DB.upsert(this.jobLogTable, newJobLog) as JobLogConfig[];
      resolve(upsertedJobLogs);

      const updatedContentJobLog: JobLogConfig = upsertedJobLogs[0];
      let jobStatusMsg: string = 'SUCCESS';
      try
      {
        const accumulatedLog: string[] = await BufferTransform.toArray(logStream);
        updatedContentJobLog.contents = accumulatedLog.join('\n');
        if (jobStatus === false)
        {
          jobStatusMsg = 'FAILURE';
        }
        await App.JobQ.setJobStatus(jobId, false, jobStatusMsg);
        await App.DB.upsert(this.jobLogTable, updatedContentJobLog);
      }
      catch (e)
      {
        if (Array.isArray(e['logs']))
        {
          updatedContentJobLog.contents = e['logs'].join('\n');
          await App.DB.upsert(this.jobLogTable, updatedContentJobLog);
        }
        jobStatusMsg = 'FAILURE';
        await App.JobQ.setJobStatus(jobId, false, jobStatusMsg);
      }
      if (jobStatusMsg === 'FAILURE')
      {
        await this._sendEmail(jobId);
      }
    });
  }

  public async get(id?: number): Promise<JobLogConfig[]>
  {
    return this._select([], { id });
  }

  private async _select(columns: string[], filter: object): Promise<JobLogConfig[]>
  {
    return new Promise<JobLogConfig[]>(async (resolve, reject) =>
    {
      let rawResults: object[] = [];
      rawResults = await App.DB.select(this.jobLogTable, columns, filter);

      const results: JobLogConfig[] = rawResults.map((result: object) => new JobLogConfig(result as JobLogConfig));
      resolve(results);
    });
  }

  private async _sendEmail(jobId: number): Promise<void>
  {
    const emailIntegrations: IntegrationConfig[] = await integrations.get(null, undefined, 'Email', true) as IntegrationConfig[];
    if (emailIntegrations.length !== 1)
    {
      winston.warn(`Invalid number of email integrations, found ${emailIntegrations.length}`);
    }
    else if (emailIntegrations.length === 1 && emailIntegrations[0].name !== 'Default Failure Email')
    {
      winston.warn('Invalid Email found.');
    }
    else
    {
      const jobs: JobConfig[] = await App.JobQ.get(jobId) as JobConfig[];
      const jobLogs: JobLogConfig[] = await this.get(jobId) as JobLogConfig[];
      if (jobs.length !== 0 && jobLogs.length !== 0)
      {
        if (jobs[0].scheduleId !== undefined)
        {
          const schedules: SchedulerConfig[] = await App.SKDR.get(jobs[0].scheduleId) as SchedulerConfig[];
          if (schedules.length !== 0)
          {
            const connectionConfig = emailIntegrations[0].connectionConfig;
            const authConfig = emailIntegrations[0].authConfig;
            const fullConfig = Object.assign(connectionConfig, authConfig);
            const subject: string = `[${fullConfig['customerName']}] Schedule "${schedules[0].name}" failed at job ${jobs[0].id}`;
            const body: string = 'Check the job log table for details'; // should we include the log contents? jobLogs[0].contents;
            const emailSendStatus: boolean = await App.EMAIL.send(emailIntegrations[0].id, subject, body);
            winston.info(`Email ${emailSendStatus === true ? 'sent successfully' : 'failed'}`);
          }
        }
      }
    }
  }
}

export default JobLog;
