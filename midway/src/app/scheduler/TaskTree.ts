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
import { TaskConfig, TaskEnum, TaskOutputConfig } from './TaskConfig';
import { TaskTreeNode } from './TaskTreeNode';
import { TaskTreePrinter } from './TaskTreePrinter';

export class TaskTree
{
  private tasks: TaskConfig[];

  constructor()
  {
    this.tasks = [];
  }

  public cancel(): void
  {
    this.tasks.forEach((task) =>
    {
      task.cancel = true;
    });
  }

  public create(taskConfigs: TaskConfig[]): boolean | string
  {
    // verify that each task has a unique id
    const idSet: Set<number> = new Set<number>();
    taskConfigs.forEach((task) =>
    {
      idSet.add(task.id);
    });
    if (taskConfigs.length !== idSet.size) // there were duplicates
    {
      return 'All tasks must have unique IDs';
    }

    taskConfigs = this._appendDefaults(taskConfigs);
    for (let i = 0; i < taskConfigs.length - 2; ++i)
    {
      if (i < taskConfigs.length - 3) // not the last original task
      {
        if (taskConfigs[i].onSuccess === undefined) // set onSuccess to the next task in the queue
        {
          taskConfigs[i].onSuccess = taskConfigs[i + 1].id;
        }
      }
      else
      {
        if (taskConfigs[i].onSuccess === undefined) // default exit
        {
          taskConfigs[i].onSuccess = taskConfigs[taskConfigs.length - 2].id;
        }
      }
      if (taskConfigs[i].onFailure === undefined) // default failure
      {
        taskConfigs[i].onFailure = taskConfigs[taskConfigs.length - 1].id;
      }
    }
    taskConfigs.forEach((taskConfig) =>
    {
      this.tasks.push(taskConfig);
    });

    return this.isValid() as boolean;
  }

  public isValid(): boolean // checks if tree is a valid DAG
  {
    return this._isValidHelper(this.tasks[0], this.tasks, []);
  }

  public async printTree(): void // iterate through tree and print tasks
  {
    if (this.tasks.length === 0)
    {
      return;
    }
    let ind: number = 0;
    let result: TaskOutputConfig = await TaskTreeNode.accept(TaskTreePrinter, this.tasks[ind]);
    while (result.exit !== true)
    {
      winston.info('-->');
      ind = this.tasks[ind].onSuccess;
      result = await TaskTreeNode.accept(TaskTreePrinter, this.tasks[ind]);
    }
  }

  public async visit(): Promise<TaskOutputConfig> // iterate through tree and execute tasks
  {
    return new Promise<TaskOutputConfig>(async (resolve, reject) =>
    {
      let cancelled: boolean = false;
      let ind: number = 0;
      let result: TaskOutputConfig = await TaskTreeNode.accept(TaskTreeVisitor, this.tasks[ind]);
      while (result.exit !== true)
      {
        if (result.status === true)
        {
          ind = this.tasks[ind].onSuccess;
          if (this.tasks[ind].cancel === true)
          {
            cancelled = true;
            break;
          }
          this._setInputConfigFromOutputConfig(this.tasks[ind], result);
          result = await TaskTreeNode.accept(TaskTreeVisitor, this.tasks[ind]);
        }
        else if (result.status === false)
        {
          ind = this.tasks[ind].onFailure;
          if (this.tasks[ind].cancel === true)
          {
            cancelled = true;
            break;
          }
          this._setInputConfigFromOutputConfig(this.tasks[ind], result);
          result = await TaskTreeNode.accept(TaskTreeVisitor, this.tasks[ind]);
        }
      }
      result.cancelled = cancelled;
      return resolve(result);
    });
  }

  private _appendDefaults(tasks: TaskConfig[]): TaskConfig[]
  {
    let maxId = 0;
    tasks.forEach((task) =>
    {
      maxId = Math.max(maxId, task.id);
    });
    const defaults: TaskConfig[] =
      [
        {
          id: maxId + 1,
          name: 'Default Exit',
          params:
            {
              options:
                {
                  stream: new stream.PassThrough(),
                },
            },
          taskId: TaskEnum.taskDefaultExit,
          type: 'default',
        },
        {
          id: maxId + 2,
          name: 'Default Failure',
          params:
            {
              options:
                {
                  stream: new stream.PassThrough(),
                },
            },
          taskId: TaskEnum.taskDefaultFailure,
          type: 'default',
        },
      ];
    tasks = tasks.concat(defaults);
    return tasks;
  }

  private _isValidHelper(currTask: TaskConfig, tasks: TaskConfig[], traversedTasks: number[]): boolean
  {
    if (currTask.type === 'default')
    {
      return true;
    }
    if (traversedTasks.includes(currTask.id)
      || currTask.onSuccess === undefined || currTask.onFailure === undefined
      || tasks[currTask.onSuccess] === undefined || tasks[currTask.onFailure] === undefined)
    {
      return false;
    }
    return this._isValidHelper(tasks[currTask.onSuccess], tasks, traversedTasks.concat(currTask.id))
      && this._isValidHelper(tasks[currTask.onFailure], tasks, traversedTasks.concat(currTask.id));
  }

  private _setInputConfigFromOutputConfig(taskConfig: TaskTreeNode, taskOutputConfig: TaskOutputConfig): void
  {
    taskConfig.setValueOptions(taskOutputConfig);
  }
}
