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

import * as stream from 'stream';

import { TaskConfig, TaskEnum, TaskInputConfig, TaskOutputConfig } from './TaskConfig';

export abstract class Task
{
  protected taskConfig: TaskConfig;
  constructor(taskConfig: TaskConfig)
  {
    this.taskConfig = taskConfig;
  }

  public getCancelStatus(): boolean
  {
    if (this.taskConfig.cancel === true)
    {
      return true;
    }
    return false;
  }

  public getOnFailure(): number
  {
    return this.taskConfig.onFailure;
  }

  public getOnSuccess(): number
  {
    return this.taskConfig.onSuccess;
  }

  public getTaskId(): number
  {
    return this.taskConfig.taskId;
  }

  public setInputConfig(taskOutputConfig: TaskOutputConfig): void
  {
    this.taskConfig.params['options'] = taskOutputConfig['options'];
  }

  public setInputConfigStream(lastStream: stream.Readable): void
  {
    this.taskConfig.params['options']['stream'] = lastStream;
  }

  public abstract async printNode(): Promise<TaskOutputConfig>;
  // {
  //   return Promise.resolve({
  //     status: true,
  //     exit: true,
  //   } as TaskOutputConfig);
  // }

  public recurse(tasks: Task[], traversedNodes: number[]): boolean
  {
    if (this.taskConfig.taskId === TaskEnum.taskDefaultExit || this.taskConfig.taskId === TaskEnum.taskDefaultFailure)
    {
      return true;
    }
    if (traversedNodes.includes(this.taskConfig.id)
      || this.taskConfig.onSuccess === undefined || this.taskConfig.onFailure === undefined
      || tasks[this.taskConfig.onSuccess] === undefined || tasks[this.taskConfig.onFailure] === undefined)
    {
      return false;
    }
    return tasks[this.taskConfig.onSuccess].recurse(tasks, traversedNodes.concat(this.taskConfig.id))
      && tasks[this.taskConfig.onFailure].recurse(tasks, traversedNodes.concat(this.taskConfig.id));
  }

  public abstract async run(): Promise<TaskOutputConfig>;
  // {
  //   return new Promise<TaskOutputConfig>(async (resolve, reject) =>
  //   {
  //     // TODO: call other functions (needs to wrap in Promise for later)
  //     resolve({
  //       status: true,
  //       exit: true,
  //     } as TaskOutputConfig);
  //   });
  // }
}

export default Task;
