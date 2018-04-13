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

import * as fs from 'fs';
import * as stream from 'stream';
import * as winston from 'winston';

import { TaskConfig, TaskEnum, TaskOutputConfig, TaskTreeConfig } from 'shared/types/jobs/TaskConfig';
import { Task } from './Task';
import { TaskTreeNode } from './TaskTreeNode';
import { TaskTreePrinter } from './TaskTreePrinter';
import { TaskTreeVisitor } from './TaskTreeVisitor';

import { TaskDefaultExit } from './tasks/TaskDefaultExit';
import { TaskDefaultFailure } from './tasks/TaskDefaultFailure';
import { TaskExport } from './tasks/TaskExport';
import { TaskImport } from './tasks/TaskImport';

const taskTreeNode = new TaskTreeNode();
const taskTreePrinter = new TaskTreePrinter();
const taskTreeVisitor = new TaskTreeVisitor();

export class TaskTree
{
  private tasks: Task[];
  private taskTreeConfig: TaskTreeConfig;

  constructor()
  {
    this.tasks = [];
    this.taskTreeConfig =
      {
        cancel: false,
        filename: '',
        jobStatus: 0,
        paused: -1,
      };
  }

  public cancel(): void
  {
    this.taskTreeConfig.cancel = true;
  }

  public create(taskConfigs: TaskConfig[], taskTreeConfig: TaskTreeConfig): boolean | string
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

    this.taskTreeConfig = taskTreeConfig;

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
      switch (taskConfig.taskId)
      {
        case TaskEnum.taskDefaultExit:
          this.tasks.push(new TaskDefaultExit(taskConfig));
          break;
        case TaskEnum.taskDefaultFailure:
          this.tasks.push(new TaskDefaultFailure(taskConfig));
          break;
        case TaskEnum.taskExport:
          this.tasks.push(new TaskExport(taskConfig));
          break;
        case TaskEnum.taskImport:
          this.tasks.push(new TaskImport(taskConfig));
          break;
        default:
          this.tasks.push(new TaskDefaultExit(taskConfig));
          break;
      }
    });

    return this.isValid() as boolean;
  }

  public isCancelled(): boolean
  {
    return this.taskTreeConfig.cancel;
  }

  public isValid(): boolean // checks if tree is a valid DAG
  {
    return this.tasks[0].recurse(this.tasks, []);
  }

  public async printTree(): Promise<void> // iterate through tree and print tasks
  {
    if (this.tasks.length === 0)
    {
      return;
    }
    let ind: number = 0;
    let result: TaskOutputConfig = await taskTreeNode.accept(taskTreePrinter, this.tasks[ind]);
    while (result.exit !== true)
    {
      winston.info('-->');
      ind = this.tasks[ind].getOnSuccess();
      result = await taskTreeNode.accept(taskTreePrinter, this.tasks[ind]);
    }
  }

  public pause(): void
  {
    if (this.taskTreeConfig.cancel === false)
    {
      this.taskTreeConfig.jobStatus = 2;
    }
  }

  public async visit(): Promise<TaskOutputConfig> // iterate through tree and execute tasks
  {
    return new Promise<TaskOutputConfig>(async (resolve, reject) =>
    {
      let ind: number = 0;
      if (this.taskTreeConfig.jobStatus === 2)
      {
        ind = this.taskTreeConfig.paused;
        const lastStream: stream.Readable | string = await this._readFromFile(this.taskTreeConfig.filename);
        if (typeof lastStream === 'string')
        {
          winston.warn(lastStream as string);
        }
        this.tasks[ind].setInputConfigStream(lastStream as stream.Readable);
      }
      this.taskTreeConfig.jobStatus = 1;
      let result: TaskOutputConfig = await taskTreeNode.accept(taskTreeVisitor, this.tasks[ind]);
      while (result.exit !== true)
      {
        switch (result.status)
        {
          case true:
            ind = this.tasks[ind].getOnSuccess();
            break;
          default:
            ind = this.tasks[ind].getOnFailure();
        }
        if (this.taskTreeConfig.cancel === true)
        {
          break;
        }
        this.tasks[ind].setInputConfig(result);
        if (this.taskTreeConfig.jobStatus === 2) // was paused
        {
          const saveResults: boolean | string = await this._saveToFile(result['options']['stream'], this.taskTreeConfig.filename);
          if (typeof saveResults === 'boolean')
          {
            winston.info('Saved as ' + this.taskTreeConfig.filename);
          }
          else
          {
            winston.warn('Error while saving file ' + this.taskTreeConfig.filename + ': ' + saveResults as string);
          }
        }
        result = await taskTreeNode.accept(taskTreeVisitor, this.tasks[ind]);
      }
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
          jobStatus: 0,
          name: 'Default Exit',
          params:
            {
              options:
                {
                  stream: new stream.PassThrough(),
                },
            },
          taskId: TaskEnum.taskDefaultExit,
        },
        {
          id: maxId + 2,
          jobStatus: 0,
          name: 'Default Failure',
          params:
            {
              options:
                {
                  stream: new stream.PassThrough(),
                },
            },
          taskId: TaskEnum.taskDefaultFailure,
        },
      ];
    tasks = tasks.concat(defaults);
    return tasks;
  }

  private async _readFromFile(filename: string): Promise<stream.Readable | string>
  {
    return new Promise<stream.Readable | string>(async (resolve, reject) =>
    {
      // read a stream from the file and delete the file when finished reading
      // have to write the file contents to a readable stream
      try
      {
        const reader: stream.Readable = fs.createReadStream(filename);
        reader.on('end', () =>
        {
          fs.unlink(filename, (err) =>
          {
            if (err !== undefined)
            {
              throw err;
            }
          });
        });
        return resolve(reader);
      }
      catch (e)
      {
        return resolve(e.toString() as string);
      }
    });
  }

  private async _saveToFile(saveStream: stream.Readable, filename: string): Promise<boolean | string>
  {
    return new Promise<boolean | string>(async (resolve, reject) =>
    {
      try
      {
        fs.stat(filename, (err, stats) =>
        {
          if (err !== undefined)
          {
            throw err;
          }
          const writer = fs.createWriteStream(filename, 'w');
          saveStream.on('data', (chunk) =>
          {
            writer.write(chunk);
          });

          saveStream.on('end', () =>
          {
            writer.end();
            resolve(true); // wait until the stream is finished writing to resolve
          });
        });
      }
      catch (e)
      {
        return resolve(false);
      }
    });
  }
}
