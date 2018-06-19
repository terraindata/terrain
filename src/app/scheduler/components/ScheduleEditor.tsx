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
// tslint:disable:no-console strict-boolean-expressions no-var-requires
import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import Colors, { backgroundColor, borderColor, fontColor, getStyle } from 'app/colors/Colors';
import Button from 'app/common/components/Button';
import CRONEditor from 'app/common/components/CRONEditor';
import FloatingInput from 'app/common/components/FloatingInput';
import { ETLActions } from 'app/etl/ETLRedux';
import { ETLState } from 'app/etl/ETLTypes';
import TaskItem from 'app/scheduler/components/TaskItem';
import { SchedulerActions } from 'app/scheduler/data/SchedulerRedux';
import
{
  _SchedulerConfig,
  _TaskConfig,
  scheduleForDatabase,
  SchedulerConfig,
  SchedulerState,
  TaskConfig,
} from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { List, Map } from 'immutable';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import SchedulerApi from 'scheduler/SchedulerApi';
import TaskEnum from 'shared/types/jobs/TaskEnum';
import XHR from 'util/XHR';
import { ETLTemplate } from 'shared/etl/immutable/TemplateRecords';

export interface Props
{
  location?: any;
  match?: {
    params?: {
      scheduleId?: number;
    },
  };
  router?: any;
  route?: any;
  schedules?: Map<ID, SchedulerConfig>;
  schedulerActions?: typeof SchedulerActions;
  templates?: List<ETLTemplate>;
}

interface State
{
  schedule: SchedulerConfig;
  orderedTasks: List<TaskConfig>;
}

function getScheduleId(params): number
{
  const asNumber = (params != null && params.scheduleId != null) ? Number(params.scheduleId) : NaN;
  return Number.isNaN(asNumber) ? -1 : asNumber;
}

class ScheduleEditor extends TerrainComponent<Props>
{
  public state: State = {
    schedule: null,
    orderedTasks: List(),
  };

  public componentDidMount()
  {
    const { schedules, match } = this.props;
    const schedule = schedules.get(getScheduleId(match.params));
    this.setState({
      schedule,
      orderedTasks: schedule ? this.orderTasks(schedule.tasks) : [],
    });
    this.props.schedulerActions({
      actionType: 'getSchedules',

    });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    const { params } = this.props.match;
    const nextParams = nextProps.match.params;
    const oldScheduleId = getScheduleId(params);
    const scheduleId = getScheduleId(nextParams);
    if (scheduleId !== -1 &&
      (oldScheduleId !== scheduleId ||
        this.props.schedules !== nextProps.schedules))
    {
      const schedule = nextProps.schedules.get(scheduleId);
      this.setState({
        schedule,
        orderedTasks: schedule ? this.orderTasks(schedule.tasks) : List(),
      });
    }
  }

  public handleScheduleChange(key: string, value: any, reorderTasks?: boolean)
  {
    const schedule = this.state.schedule.set(key, value);
    this.setState({
      schedule,
      orderedTasks: reorderTasks ? this.orderTasks(schedule.tasks) : this.state.orderedTasks,
    });
  }

  public orderTasks(tasks: List<TaskConfig>): List<TaskConfig>
  {
    const orderedTasks: TaskConfig[] = [];
    orderedTasks[0] = tasks.get(0);
    for (let i = 0; i < tasks.size; i++)
    {
      if (!orderedTasks[i])
      {
        continue;
      }
      if (orderedTasks[i].onFailure !== null && orderedTasks[i].onFailure !== undefined)
      {
        orderedTasks[i * 2 + 1] = tasks.get(orderedTasks[i].onFailure).set('type', 'FAILURE');
      }
      else
      {
        orderedTasks[i * 2 + 1] = undefined;
      }
      if (orderedTasks[i].onSuccess !== null && orderedTasks[i].onSuccess !== undefined)
      {
        orderedTasks[i * 2 + 2] = tasks.get(orderedTasks[i].onSuccess).set('type', 'SUCCESS');
      }
      else
      {
        orderedTasks[i * 2 + 2] = undefined;
      }
    }
    // Clear end of array
    let taskList = List(orderedTasks);
    for (let i = taskList.size - 1; i >= 0; i--)
    {
      if (!taskList.get(i))
      {
        taskList = taskList.delete(i);
      }
      else
      {
        break;
      }
    }
    return taskList;
  }

  // Schedule name and interval config
  public renderScheduleInfo()
  {
    const { schedule } = this.state;
    return (
      <div>
        <div>
          Schedule Name
          <FloatingInput
            label={'Name'}
            value={schedule.name}
            isTextInput={true}
            canEdit={TerrainTools.isAdmin()}
            onChange={this._fn(this.handleScheduleChange, 'name')}
          />
        </div>
        <div>
          Schedule Interval
          <CRONEditor
            cron={schedule.cron}
            onChange={this._fn(this.handleScheduleChange, 'cron')}
          />
        </div>
      </div>
    );
  }

  public handleTaskChange(newTask: TaskConfig)
  {
    const { schedule } = this.state;
    const index = schedule.tasks.findIndex((task) => task && task.id === newTask.id);
    this.handleScheduleChange('tasks', schedule.tasks.set(index, newTask));
    // Also update in ordered schedules
    const orderedIndex = this.state.orderedTasks.findIndex((task) => task && task.id === newTask.id);
    this.setState({
      orderedTasks: this.state.orderedTasks.set(orderedIndex, newTask),
    });
  }

  public handleTaskDelete(id: ID)
  {
    let { tasks } = this.state.schedule;
    const index = tasks.findIndex((task) => task && task.id === id);
    // TODO DELETE ALL SUBTASKS!!
    // Find parent task
    const parentIndex = tasks.findIndex((task) => task && (
      task.onFailure === index || task.onSuccess === index));
    const parentTask = tasks.get(parentIndex);
    const isFailure = parentTask.onFailure === index;
    tasks = tasks
      .set(parentIndex, parentTask.set(isFailure ? 'onFailure' : 'onSuccess', undefined))
      .set(index, undefined);
    this.handleScheduleChange('tasks', tasks, true);
  }

  public handleAddSubtask(parentId: ID, type: 'SUCCESS' | 'FAILURE')
  {
    const { schedule } = this.state;
    const parentIndex = schedule.tasks.findIndex((task) => task && task.id === parentId);
    const newTask = _TaskConfig({
      id: schedule.tasks.size,
      taskId: type === 'FAILURE' ? TaskEnum.taskDefaultFailure : TaskEnum.taskETL,
      type,
    });
    const parentTask = schedule.tasks.get(parentIndex)
      .set(type === 'SUCCESS' ? 'onSuccess' : 'onFailure', schedule.tasks.size);
    this.handleScheduleChange('tasks', schedule.tasks.set(parentIndex, parentTask).push(newTask), true);
  }

  public renderTask(task, level, pos)
  {
    if (!task)
    {
      return this.renderSpacer(level, pos);
    }
    return (
      <TaskItem
        task={task}
        type={task.type || 'ROOT'}
        onDelete={this.handleTaskDelete}
        onCreateSubtask={this.handleAddSubtask}
        onTaskChange={this.handleTaskChange}
        key={task.id}
        templates={this.props.templates}
      />
    );
  }

  public renderSpacer(level, pos)
  {
    return (
      <div
        key={String(level) + '-' + String(pos)}
        style={{ width: 200 }}
      />
    );
  }

  public renderTasks(tasks: List<TaskConfig>)
  {
    const numLevels = Math.ceil(Math.log2(tasks.size + 1));
    let levelSize = 1;
    // over all levels
    let i = 0;
    const children = [];
    for (let level = 1; level <= numLevels; level++)
    {
      const levelRender = [];
      for (let pos = 0; pos < levelSize; pos++)
      {
        levelRender.push(this.renderTask(tasks.get(i), level, pos));
        i += 1;
      }
      children.push(levelRender);
      levelSize *= 2;
    }
    return (
      <div>
        {
          children.map((level, index) =>
            <div
              key={index}
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              {
                level.map((item) => item)
              }
            </div>,
          )
        }
      </div>
    );
  }

  public save()
  {
    const { schedule } = this.state;
    this.props.schedulerActions({
      actionType: 'updateSchedule',
      schedule,
    });
    // Update route to go back
    this.browserHistory.push('/data/schedules');
  }

  public cancel()
  {
    // Go back don't save
    this.browserHistory.push('/data/schedules');
  }

  public renderButtons()
  {
    return (
      <div
        className='integration-buttons'
      >
        <Button
          text={'Cancel'}
          onClick={this.cancel}
          size={'small'}
        />
        {
          this.state.schedule &&
          <Button
            text={'Save'}
            onClick={this.save}
            size={'small'}
            theme={'active'}
          />
        }
      </div>
    );
  }

  public render()
  {
    console.log('render schedule editor');
    const { schedule } = this.state;
    if (!schedule)
    {
      return (<div>NO SCHEDULE</div>);
    }
    return (
      <div>
        <div>
          Edit Schedule
        </div>
        {
          this.renderScheduleInfo()
        }
        {
          this.renderTasks(this.state.orderedTasks)
        }
        {
          this.renderButtons()
        }
      </div>
    );
  }
}

export default Util.createContainer(
  ScheduleEditor,
  [
    ['scheduler', 'schedules'],
    ['etl', 'templates'],
  ],
  {
    schedulerActions: SchedulerActions,
  },
);
