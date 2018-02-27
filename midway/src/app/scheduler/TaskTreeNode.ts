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

import { Task } from './Task';
import { TaskConfig, TaskOutputConfig } from './TaskConfig';
import { TaskDefaultExit } from './tasks/TaskDefaultExit';
import { TaskDefaultFailure } from './tasks/TaskDefaultFailure';
import { TaskExport } from './tasks/TaskExport';
import { TaskImport } from './tasks/TaskImport';

const taskDefaultExit: TaskDefaultExit = new TaskDefaultExit();
const taskDefaultFailure: TaskDefaultFailure = new TaskDefaultFailure();
const taskExport: TaskExport = new TaskExport();
const taskImport: TaskImport = new TaskImport();

export enum TaskEnum
{
  taskDefaultExit,
  taskDefaultFailure,
  taskExport, // TODO implement this
  taskImport, // TODO implement this
}

export class TaskTreeNode
{
  private value: TaskConfig;

  constructor(arg: TaskConfig)
  {
    this.value = arg;
  }

  public getValue(): TaskConfig
  {
    return this.value;
  }

  public async printTree(): Promise<TaskOutputConfig>
  {
    const basicTaskOutputConfig: TaskOutputConfig =
      {
        exit: false,
        status: true,
      };

    winston.info(JSON.stringify(this.value as object));
    switch (this.value.taskId)
    {
      case TaskEnum.taskDefaultExit:
        basicTaskOutputConfig.exit = true;
        return Promise.resolve(basicTaskOutputConfig);
      case TaskEnum.taskDefaultFailure:
        basicTaskOutputConfig.exit = true;
        basicTaskOutputConfig.status = false;
        return Promise.resolve(basicTaskOutputConfig);
      case TaskEnum.taskExport:
        return Promise.resolve(basicTaskOutputConfig);
      case TaskEnum.taskImport:
        return Promise.resolve(basicTaskOutputConfig);
      default:
        winston.info('Default case found!');
        return Promise.resolve(basicTaskOutputConfig);
    }
  }

  public async recurse(taskNodes: TaskTreeNode[], traversedNodes: number[]): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      if (this.value.type === 'default')
      {
        return resolve(true);
      }
      if (traversedNodes.includes(this.value.id)
        || this.value.onSuccess === undefined || this.value.onFailure === undefined
        || taskNodes[this.value.onSuccess] === undefined || taskNodes[this.value.onFailure] === undefined)
      {
        return resolve(false);
      }
      resolve(await taskNodes[this.value.onSuccess].recurse(taskNodes, traversedNodes.concat(this.value.id))
        && await taskNodes[this.value.onFailure].recurse(taskNodes, traversedNodes.concat(this.value.id)));
    });
  }

  public setValueOptions(taskOutputConfig: TaskOutputConfig): void
  {
    this.value.params['options'] = taskOutputConfig['options'];
  }

  public async visit(): Promise<TaskOutputConfig>
  {
    switch (this.value.taskId)
    {
      case TaskEnum.taskDefaultExit:
        return taskDefaultExit.run(this.value);
      case TaskEnum.taskDefaultFailure:
        return taskDefaultFailure.run(this.value);
      case TaskEnum.taskExport:
        return taskExport.run(this.value);
      case TaskEnum.taskImport:
        return taskImport.run(this.value);
      default:
        return taskDefaultExit.run(this.value);
    }
  }
}
