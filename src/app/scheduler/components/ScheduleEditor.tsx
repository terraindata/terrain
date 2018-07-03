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
// tslint:disable:strict-boolean-expressions no-var-requires prefer-const
import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import Colors, { backgroundColor, borderColor, getStyle } from 'app/colors/Colors';
import Button from 'app/common/components/Button';
import CRONEditor from 'app/common/components/CRONEditor';
import FloatingInput from 'app/common/components/FloatingInput';
import TaskItem from 'app/scheduler/components/TaskItem';
import { SchedulerActions } from 'app/scheduler/data/SchedulerRedux';
import
{
  _TaskConfig,
  scheduleForDatabase,
  SchedulerConfig,
  TaskConfig,
} from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import { List, Map } from 'immutable';
import * as React from 'react';
import
{
  CSSTransition,
  TransitionGroup,
} from 'react-transition-group';
import { ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import TaskEnum from 'shared/types/jobs/TaskEnum';
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
  rootTasks: List<number>;
  back: boolean;
  taskMap: Map<ID, TaskConfig>;
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
    rootTasks: List([0]),
    back: false,
    taskMap: Map(),
  };

  public componentDidMount()
  {
    const { schedules, match } = this.props;
    const schedule = schedules.get(getScheduleId(match.params));
    this.setState({
      schedule,
      taskMap: schedule ? this.buildTaskMap(schedule.tasks) : Map(),
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
        taskMap: schedule ? this.buildTaskMap(schedule.tasks) : Map(),
        rootTasks: List([0]),
        back: false,
      });
    }
  }

  public buildTaskMap(tasks: List<TaskConfig>): Map<ID, TaskConfig>
  {
    let taskMap: Map<ID, TaskConfig> = Map();
    tasks.forEach((task, i) =>
    {
      taskMap = taskMap.set(task.id, task);
    });
    return taskMap;
  }

  public taskMapToList(): List<TaskConfig>
  {
    const { taskMap } = this.state;
    let tasks: List<TaskConfig> = List();
    let id = 0;
    taskMap.keySeq().forEach((key) =>
    {
      let task = taskMap.get(key);
      if (task)
      {
        // This adjusts the task map so that index always = id (for backend)
        task = task.set('id', id);
        if (task.taskId === TaskEnum.taskDefaultExit || task.taskId === TaskEnum.taskDefaultFailure)
        {
          // Set exit = true
          task = task.setIn(['params', 'exit'], true);
        }
        tasks = tasks.push(task);
        id += 1;
      }
    });
    return tasks;
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

  public handleScheduleChange(key: string, value: any)
  {
    this.setState({
      schedule: this.state.schedule.set(key, value),
    });
  }

  public handleTaskChange(newTask: TaskConfig)
  {
    this.setState({
      taskMap: this.state.taskMap.set(newTask.id, newTask),
    });
  }

  public handleTaskDelete(id: ID)
  {
    const { taskMap } = this.state;
    const [parentKey, parentTask] = taskMap.findEntry((task) => task.onFailure === id || task.onSuccess === id);
    const key = parentTask.onSuccess === id ? 'onSuccess' : 'onFailure';
    this.setState({
      taskMap: taskMap.delete(id).set(parentKey, parentTask.set(key, null)),
    });
    // // If they deleted the current root task, go back
    if (id === this.state.rootTasks.last())
    {
      this.back();
    }
  }

  public getVisibleTasks(taskMap: Map<ID, TaskConfig>, rootTaskId: ID): List<TaskConfig>
  {
    let tasks: List<TaskConfig> = List();
    let currTask = taskMap.get(rootTaskId);
    tasks = tasks.push(currTask);
    while (currTask && currTask.onSuccess != null)
    {
      currTask = taskMap.get(currTask.onSuccess);
      tasks = tasks.push(currTask);
    }
    return tasks;
  }

  public handleAddSuccessTask()
  {
    const lastTask = this.getVisibleTasks(this.state.taskMap, this.state.rootTasks.last()).last();
    const newId = Number(this.state.taskMap.keySeq().sort().last()) + 1;
    const newTask = _TaskConfig({
      id: newId,
      taskId: TaskEnum.taskETL,
      type: 'SUCCESS',
      blocking: true,
      name: 'Task ' + String(newId + 1),
    });
    this.setState({
      taskMap: this.state.taskMap
        .set(lastTask.id, lastTask
          .set('onSuccess', newId)).set(newId, newTask),
    });
  }

  public handleTaskErrorClick(parentId: ID)
  {
    const task = this.state.taskMap.get(parentId);
    let { taskMap } = this.state;
    let newId;
    if (task.onFailure == null)
    {
      newId = Number(this.state.taskMap.keySeq().sort().last()) + 1;
      const newTask = _TaskConfig({
        type: 'FAILURE',
        id: newId,
        taskId: TaskEnum.taskDefaultFailure,
        name: 'Task ' + String((newId as number) + 1),
      });
      taskMap = taskMap.set(parentId, task.set('onFailure', newId)).set(newId, newTask);
    }
    else
    {
      newId = task.onFailure;
    }
    this.setState({
      back: false,
    }, () =>
      {
        this.setState({
          taskMap,
          rootTasks: this.state.rootTasks.push(newId),
        });
      });
  }

  public back(newSchedule?: SchedulerConfig)
  {
    // Find it's parent task
    const rootTasks = this.state.rootTasks.delete(this.state.rootTasks.size - 1);
    // Use callback to get animation into correct state
    this.setState({
      back: true,
    }, () =>
      {
        this.setState({
          rootTasks,
        });
      });
  }

  public save()
  {
    let { schedule } = this.state;
    schedule = schedule.set('tasks', this.taskMapToList());
    this.props.schedulerActions({
      actionType: 'updateSchedule',
      schedule: scheduleForDatabase(schedule) as SchedulerConfig,
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
      return 'Tasks';
    }
    let header: string = '';
    taskList.forEach((taskId, index) =>
    {
      const task = this.state.taskMap.get(taskId);
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
            Frequency
          </div>
          <CRONEditor
            cron={schedule.cron}
            onChange={this._fn(this.handleScheduleChange, 'cron')}
            canEdit={TerrainTools.isAdmin()}
          />
        </div>
      </div>
    );
  }

  public renderTask(task)
  {
    if (!task)
    {
      return null;
    }
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
    const tasks = this.getVisibleTasks(this.state.taskMap, this.state.rootTasks.last());
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
            this.renderColumn(tasksHeader, this.renderTasks(tasks))
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
