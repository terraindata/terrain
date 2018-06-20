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
import './ScheduleEditorStyle';

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
  currentTasks: List<TaskConfig>;
  rootTask: number;
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
    currentTasks: List(),
    rootTask: 0,
  };

  public componentDidMount()
  {
    const { schedules, match } = this.props;
    const schedule = schedules.get(getScheduleId(match.params));
    this.setState({
      schedule,
      currentTasks: schedule ? this.getCurrentTasks(schedule.tasks) : [],
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
        currentTasks: schedule ? this.getCurrentTasks(schedule.tasks) : List(),
      });
    }
  }

  public handleScheduleChange(key: string, value: any, newTasks?: List<TaskConfig>)
  {
    const schedule = this.state.schedule.set(key, value);
    this.setState({
      schedule,
      currentTasks: newTasks || this.state.currentTasks,
    });
  }

  public getCurrentTasks(tasks: List<TaskConfig>, rootTask: number = 0): List<TaskConfig>
  {
    let currentTasks: List<TaskConfig> = List();
    let currId = rootTask;
    while (true)
    {
      if (currId === undefined || currId === null)
      {
        break;
      }
      const task = tasks.find((t) => t.id === currId);
      currentTasks = currentTasks.push(task);
      currId = task.onSuccess;
    }
    return currentTasks;
  }

  // Schedule name and interval config
  public renderScheduleInfo()
  {
    const { schedule } = this.state;
    return (
      <div>
        <div>
          <FloatingInput
            label={'Name'}
            value={schedule.name}
            isTextInput={true}
            canEdit={TerrainTools.isAdmin()}
            onChange={this._fn(this.handleScheduleChange, 'name')}
          />
        </div>
        <div>
          <div
            className='schedule-editor-sub-header'
          >
            Interval
          </div>
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
    let newTasks = this.state.currentTasks;
    const currentIndex = newTasks.findIndex((task) => task && task.id === newTask.id);
    if (currentIndex !== -1)
    {
      newTasks = newTasks.set(currentIndex, newTask);
    }
    this.handleScheduleChange('tasks', schedule.tasks.set(index, newTask), newTasks);
  }

  public handleTaskDelete(id: ID)
  {
    let { tasks } = this.state.schedule;
    const index = tasks.findIndex((task) => task && task.id === id);
    // Find parent task
    const parentIndex = tasks.findIndex((task) => task && (
      task.onFailure === index || task.onSuccess === index));
    const parentTask = tasks.get(parentIndex);
    const isFailure = parentTask.onFailure === index;
    tasks = tasks
      .set(parentIndex, parentTask.set(isFailure ? 'onFailure' : 'onSuccess', undefined))
      .set(index, undefined);
    let newTasks = this.state.currentTasks;
    const currentIndex = newTasks.findIndex((task) => task && task.id === id);
    if (currentIndex !== -1)
    {
      newTasks = newTasks.slice(0, currentIndex).toList();
    }
    this.handleScheduleChange('tasks', tasks, newTasks);
  }

  public handleAddSuccessTask()
  {
    const { schedule, currentTasks } = this.state;
    const { tasks } = schedule;

    const parentIndex = tasks.findIndex((task) => task && task.id === currentTasks.last().get('id'));
    const parentTask = tasks.get(parentIndex).set('onSuccess', tasks.size);
    const newTask = _TaskConfig({
      id: tasks.size,
      taskId: TaskEnum.taskETL,
      type: 'SUCCESS'
    });
    this.handleScheduleChange(
      'tasks',
      tasks.set(parentIndex, parentTask).push(newTask),
      currentTasks.set(currentTasks.size - 1, parentTask).push(newTask),
    );
  }

  public handleTaskErrorClick(id: ID)
  {
    // If there is no error task, add one
    const scheduleTasks = this.state.schedule.tasks;
    let newRootTaskId = this.state.currentTasks.find((task) => task.id === id).onFailure;
    let rootTask;
    let schedule = this.state.schedule;
    if (newRootTaskId === undefined || newRootTaskId === null)
    {
      rootTask = _TaskConfig({
        type: 'FAILURE',
        id: scheduleTasks.size,
        taskId: TaskEnum.taskDefaultFailure
      });
      newRootTaskId = scheduleTasks.size;
      const parentIndex = scheduleTasks.findIndex((task) => task && task.id === id);
      const parentTask = scheduleTasks.get(parentIndex).set('onFailure', newRootTaskId);
      schedule = schedule.set('tasks', scheduleTasks.set(parentIndex, parentTask).push(rootTask))
    }
    else
    {
      rootTask = scheduleTasks.find((task) => task.id === newRootTaskId);
    }
    // switch the root task
    const newTasks = this.getCurrentTasks(schedule.tasks, newRootTaskId);
    this.setState({
      currentTasks: newTasks,
      rootTask: newRootTaskId,
      schedule,
    });
  }

  public renderTask(task)
  {
    return (
      <TaskItem
        task={task}
        type={task.type || 'ROOT'}
        onDelete={this.handleTaskDelete}
        onTaskChange={this.handleTaskChange}
        key={task.id}
        templates={this.props.templates}
        onErrorClick={this.handleTaskErrorClick}
      />
    );
  }

  public back()
  {
    // Find it's parent task
    const parentTask =
      this.state.schedule.tasks.find((task) => task && task.onFailure === this.state.rootTask);
    const newTasks = this.getCurrentTasks(this.state.schedule.tasks, parentTask.id);
    this.setState({
      currentTasks: newTasks,
      rootTask: parentTask.id,
    });
  }

  public renderTasks(tasks: List<TaskConfig>)
  {
    return (
      <div>
        {
          this.state.rootTask !== 0 ?
          <div
            className='schedule-editor-back'
            onClick={this.back}
          >
           BACK!!
          </div>
          :
          null
        }
        {
          tasks.map((task, index) => this.renderTask(task))
        }
        <PathfinderCreateLine
          onCreate={this.handleAddSuccessTask}
          text={'Add Task'}
          canEdit={TerrainTools.isAdmin()}
        />
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
        className='schedule-editor-buttons'
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

  public renderColumn(header, content)
  {
    return (
      <div
        className='schedule-editor-column'
        style={borderColor(Colors().blockOutline)}
      >
        <div
          className='schedule-editor-column-header'
          style={backgroundColor(Colors().blockBg)}
        >
          {
            header
          }
        </div>
        <div
          className='schedule-editor-column-content'
        >
          {
            content
          }
        </div>
      </div>
    );
  }

  public render()
  {
    const { schedule } = this.state;
    if (!schedule)
    {
      return (<div>NO SCHEDULE</div>);
    }
    return (
      <div
        className='schedule-editor'
      >
        <div
          className='schedule-editor-columns'
          style={borderColor(Colors().blockOutline)}
        >
          {
            this.renderColumn('Schedule', this.renderScheduleInfo())
          }
          {
            this.renderColumn('Tasks', this.renderTasks(this.state.currentTasks))
          }
        </div>
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
