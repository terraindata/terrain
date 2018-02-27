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

import * as _ from 'lodash';
import * as winston from 'winston';

import { Task } from './Task';
import { TaskConfig, TaskOutputConfig } from './TaskConfig';
import { TaskTree } from './TaskTree';

export class Job
{
  private tasks: TaskConfig[]; // [id]
  private taskTree: TaskTree;

  /*
    Job (Jason)
    Each job is comprised of a series of tasks
    Use a visitor pattern to avoid recursion
    Allow jobs to be chained, with conditions (run this task on failure, run a different task on success)
    Create a unique ID for each job (can be an incrementing long counter)
    Task
      For I/O: source/process/sink
      Can be extended easily for other purposes
      Wrap each task in a Promise
      I/O (Integrates with ETL work)
        Source
          SFTP/HTTP/Local Filesystem/Magento/MySQL/etc.
          Input: params (object), type (string)
          Output: stream.Readable
        Process
          Import/Export
          Input: params (object), stream (stream.Readable)
          Output: status (string) / result (stream.Readable | string)
        Sink
          SFTP/HTTP/Local Filesystem/Magento/MySQL/etc.
          Input: status (string) / result (stream.Readable | string)
          Output: result or status (string)
  */
  constructor()
  {
    this.tasks = [];
    this.taskTree = new TaskTree();
  }

  /*
  public async addTask(task: TaskConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (params.length < 3)
      {
        return reject('Insufficient parameters passed. Must be of format <ID, name, type, task parameters>.');
      }
      const taskConfig: TaskConfig =
      {
        id: Object.keys(this.tasks).length !== 0 ? Math.max(...Object.keys(this.tasks).map((key) => parseInt(key, 10))) + 1 : 1,
        name,
        type,
        task: new Task(params, onSuccess, onFailure),
      };
      this.tasks[taskConfig.id] = taskConfig;
      resolve('Success');
    });
  }
  */

  public async create(args: TaskConfig[]): Promise<boolean>
  {
    this.tasks = args;
    return this.taskTree.create(args);
  }

  public async run(): Promise<TaskOutputConfig>
  {
    return this.taskTree.visit();
  }
}

export default Job;
