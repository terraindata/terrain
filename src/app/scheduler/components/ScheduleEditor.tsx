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
// tslint:disable:no-console strict-boolean-expressions no-var-requires prefer-const
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
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import
{
  CSSTransition,
  TransitionGroup,
} from 'react-transition-group';
import SchedulerApi from 'scheduler/SchedulerApi';
import { ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import TaskEnum from 'shared/types/jobs/TaskEnum';
import XHR from 'util/XHR';
import './ScheduleEditorStyle';
const BackIcon = require('images/icon_back?name=BackIcon');

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
  rootTasks: List<number>;
  back: boolean;
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
    rootTasks: List([0]),
    back: false,
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
        rootTasks: List([0]),
        back: false,
      });
    }
  }

  public getTaskAndIndexById(tasks, id): { task: TaskConfig, index: number }
  {
    const index = tasks.findIndex((t) => t && t.id === id);
    let task;
    if (index !== -1)
    {
      task = tasks.get(index);
    }
    return { index, task };
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
      const task = tasks.find((t) => t && t.id === currId);
      currentTasks = currentTasks.push(task);
      currId = task.onSuccess;
    }
    return currentTasks;
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
    tasks = tasks.set(parentIndex, parentTask.set(isFailure ? 'onFailure' : 'onSuccess', undefined));
    let newTasks = this.state.currentTasks;
    const currentIndex = newTasks.findIndex((task) => task && task.id === id);
    if (currentIndex !== -1)
    {
      newTasks = newTasks.slice(0, currentIndex).toList();
    }
    // If they deleted the current root task, go back
    if (id === this.state.rootTasks.last())
    {
      this.back(this.state.schedule.set('tasks', tasks));
    }
    else
    {
      this.handleScheduleChange('tasks', tasks, newTasks);
    }
  }

  public handleAddSuccessTask()
  {
    const { schedule, currentTasks } = this.state;
    const { tasks } = schedule;
    let { task, index } = this.getTaskAndIndexById(tasks, currentTasks.last().get('id'));
    task = task.set('onSuccess', tasks.size);
    const newTask = _TaskConfig({
      id: tasks.size,
      taskId: TaskEnum.taskETL,
      type: 'SUCCESS',
    });
    this.handleScheduleChange(
      'tasks',
      tasks.set(index, task).push(newTask),
      currentTasks.set(currentTasks.size - 1, task).push(newTask),
    );
  }

  public handleTaskErrorClick(parentId: ID)
  {
    // If there is no error task, add one
    const scheduleTasks = this.state.schedule.tasks;
    const parentTask = this.getTaskAndIndexById(scheduleTasks, parentId).task;
    let newRootTaskId = parentTask.onFailure;
    let rootTask;
    let schedule = this.state.schedule;
    // If there is no current failure task, create one and set it to root task
    if (newRootTaskId === undefined || newRootTaskId === null)
    {
      rootTask = _TaskConfig({
        type: 'FAILURE',
        id: scheduleTasks.size,
        taskId: TaskEnum.taskDefaultFailure,
      });
      newRootTaskId = scheduleTasks.size;
      const parentIndex = scheduleTasks.findIndex((task) => task && task.id === parentTask.id);
      schedule = schedule.set('tasks',
        scheduleTasks
          .set(parentIndex, parentTask.set('onFailure', newRootTaskId))
          .push(rootTask),
      );
    }
    else
    {
      rootTask = this.getTaskAndIndexById(scheduleTasks, newRootTaskId).task;
    }
    // switch the root task
    const newTasks = this.getCurrentTasks(schedule.tasks, newRootTaskId);
    // Use call back to get animation into correct state
    this.setState({
      back: false,
    }, () =>
      {
        this.setState({
          currentTasks: newTasks,
          rootTasks: this.state.rootTasks.push(newRootTaskId),
          schedule,
        });
      });
  }

  public back(newSchedule?: SchedulerConfig)
  {
    // Find it's parent task
    const rootTasks = this.state.rootTasks.delete(this.state.rootTasks.size - 1);
    const newTasks = this.getCurrentTasks(this.state.schedule.tasks, rootTasks.last());
    // Use callback to get animation into correct state
    this.setState({
      back: true,
    }, () =>
      {
        this.setState({
          currentTasks: newTasks,
          rootTasks,
          schedule: newSchedule || this.state.schedule,
        });
      });
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

  // Compute header for tasks section, listing out the current levels of tasks by name or id
  public computeHeader(taskList: List<number>): string
  {
    if (taskList.size === 1)
    {
      return 'Task';
    }
    let header: string = '';
    taskList.forEach((taskId, index) =>
    {
      const task = this.state.schedule.tasks.find((t) => t && t.id === taskId);
      if (!task)
      {
        return header;
      }
      if (task.name)
      {
        header += task.name;
      }
      else
      {
        header += 'Task ' + String(task.id);
      }
      if (index !== taskList.size - 1)
      {
        header += ' > ';
      }
    });
    return 'Tasks: ' + header;
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

  public renderTasks(tasks: List<TaskConfig>)
  {
    return (
      <div>
        {
          this.state.rootTasks.size !== 1 ?
            <div
              className='schedule-editor-back'
              onClick={this._fn(this.back, undefined)}
            >
              <BackIcon
                style={getStyle('fill', Colors().iconColor)}
              />
            </div>
            :
            null
        }
        <TransitionGroup
          className='example-group'
        >
          <CSSTransition
            key={this.state.rootTasks.last()}
            timeout={500}
            classNames={this.state.back ? 'back' : 'forward'}
          >
            <div
              className='tasks-wrapper'
            >
              {
                tasks.map((task, index) => this.renderTask(task))
              }
              <PathfinderCreateLine
                onCreate={this.handleAddSuccessTask}
                text='Add Task'
                canEdit={TerrainTools.isAdmin()}
              />
            </div>
          </CSSTransition>
        </TransitionGroup>
      </div>
    );
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
        onClick={this._toggle('open')}
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
    const tasksHeader = this.computeHeader(this.state.rootTasks);
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
            this.renderColumn(tasksHeader, this.renderTasks(this.state.currentTasks))
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
