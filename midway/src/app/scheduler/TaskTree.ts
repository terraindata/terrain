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

import { TaskConfig, TaskOutputConfig } from './TaskConfig';
import { TaskTreeNode } from './TaskTreeNode';

export class TaskTree
{
  private tasks: TaskTreeNode[];

  constructor(args?: TaskConfig[])
  {
    if (args !== undefined)
    {
      this.create(args);
    }
    this.tasks = [];
  }

  public async create(taskConfigs: TaskConfig[]): Promise<boolean>
  {
    taskConfigs = this._appendDefaults(args);

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
      if (taskConfigs[i].onFailure === undefined)
      {
        taskConfigs[i].onFailure = taskConfigs[taskConfigs.length - 1].id;
      }
    }
    taskConfigs.forEach((taskConfig) =>
    {
      this.tasks.push(new TaskTreeNode(taskConfig));
    });
    return this.isValid();
  }

  public async isValid(): Promise<boolean> // checks if tree is a valid DAG
  {
    return this.tasks[0].recurse(this.tasks, []);
  }

  public async visit(): Promise<TaskOutputConfig>
  {
    return new Promise<TaskOutputConfig>(async (resolve, reject) =>
    {
      let ind: number = 0;
      let result: TaskOutputConfig = await this.tasks[ind].visit();
      while (result.exit !== true)
      {
        if (result.status === true)
        {
          ind = this.tasks[ind].value.onSuccess;
          this.tasks[ind] = this._setInputConfigFromOutputConfig(this.tasks[ind], result);
          result = await this.tasks[ind].visit();
        }
        else if (result.status === false)
        {
          ind = this.tasks[ind].value.onFailure;
          this.tasks[ind] = this._setInputConfigFromOutputConfig(this.tasks[ind], result);
          result = await this.tasks[ind].visit();
        }
      }
      return resolve(result);
    });
  }

  private _appendDefaults(tasks: TaskConfig[]): TaskConfig[]
  {
    let maxId = 0;
    tasks.forEach((task) =>
    {
      maxId = max(maxId, task.id);
    });
    const defaults: TaskConfig[] =
      [
        {
          id: maxId + 1,
          name: 'Default Exit',
          params:
            {

            },
          type: 'default',
        },
        {
          id: maxId + 2,
          name: 'Default Failure',
          params:
            {

            },
          type: 'default',
        },
      ];
    tasks.concat(defaults);
    return tasks;
  }

  private _setInputConfigFromOutputConfig(taskConfig: TaskConfig, taskOutputConfig: TaskOutputConfig): TaskConfig
  {
    taskConfig.options = taskOutputConfig.options;
    return taskConfig;
  }
}
