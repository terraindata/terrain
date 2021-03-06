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
// tslint:disable:strict-boolean-expressions no-var-requires
import Colors, { backgroundColor, borderColor, fontColor } from 'app/colors/Colors';
import CheckBox from 'app/common/components/CheckBox';
import
{
  TaskConfig,
} from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayType, InputDeclarationType } from 'common/components/DynamicFormTypes';
import TerrainComponent from 'common/components/TerrainComponent';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import TaskEnum from 'shared/types/jobs/TaskEnum';
import { TaskFormMap } from './TaskBaseClasses';
import './TaskItemStyle.less';

const DeleteIcon = require('images/icon_close_8x8.svg?name=RemoveIcon');
const EditableField = (props) =>
  props.editing && props.canEdit ? props.editComponent : props.readOnlyComponent;

export interface Props
{
  task: TaskConfig;
  type: 'SUCCESS' | 'FAILURE' | 'ROOT';
  onDelete: (id: ID) => void;
  onTaskChange: (newTask: TaskConfig) => void;
  templates?: List<ETLTemplate>;
  onErrorClick: (id: ID) => void;
}

interface State
{
  editingName: boolean;
  name: string;
}

class TaskItem extends TerrainComponent<Props>
{

  public state: State = {
    editingName: false,
    name: this.props.task.name,
  };

  public taskTypeMap = {
    taskId: {
      type: DisplayType.Pick,
      displayName: 'Task Type',
      options: {
        pickOptions: (s) => taskTypeList,
        indexResolver: (value) => taskTypeList.indexOf(value),
        displayNames: (s) => taskTypeDisplayNames,
      },
    } as any,
  };

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.state.name !== nextProps.task.name)
    {
      this.setState({
        name: nextProps.task.name,
      });
    }
  }

  public handleTextKeyDown(e)
  {
    if (e.keyCode === 13)
    {
      this.setState({
        editingName: false,
      });
      this.props.onTaskChange(this.props.task.set('name', this.state.name));
    }
  }

  public handleTextBlur()
  {
    this.setState({
      editingName: false,
    });
    this.props.onTaskChange(this.props.task.set('name', this.state.name));
  }

  public handleTaskIdChange(s)
  {
    this.props.onTaskChange(this.props.task.set('taskId', s.taskId));
  }

  public handleTaskSettingsChange(newTask: TaskConfig)
  {
    const { task, templates } = this.props;
    if (newTask.taskId === TaskEnum.taskETL &&
      newTask.getIn(['params', 'options', 'templateId']) !== task.getIn(['params', 'options', 'templateId'])
    )
    {
      // Get name of template
      const templateName = templates.find((t) =>
        t.id === newTask.getIn(['params', 'options', 'templateId']),
      ).templateName;
      newTask = newTask
        .set('name', templateName)
        .setIn(['params', 'options', 'overrideSources'], Map())
        .setIn(['params', 'options', 'overrideSinks'], Map());
      // Clear overrides
    }
    this.props.onTaskChange(newTask);
  }

  public renderTaskSettings(task: TaskConfig)
  {
    const FormClass = TaskFormMap[task.taskId];
    return (
      <div>
        <DynamicForm
          inputMap={this.taskTypeMap}
          inputState={{ taskId: task.taskId }}
          onStateChange={this.handleTaskIdChange}
        />
        {
          FormClass &&
          <FormClass
            task={task}
            onChange={this.handleTaskSettingsChange}
            templates={this.props.templates}
          />
        }
      </div>
    );
  }

  public handleBlockingChange()
  {
    const { blocking } = this.props.task;
    this.props.onTaskChange(this.props.task.set('blocking', blocking === null ? true : !blocking));
  }

  public render()
  {
    const { task, type } = this.props;
    return (
      <div
        className='task-item-wrapper'
        style={borderColor(Colors().blockOutline)}
      >
        <div
          className='task-item-header'
          style={backgroundColor(Colors().blockBg)}
        >
          <EditableField
            editing={this.state.editingName}
            canEdit={TerrainTools.isAdmin()}
            editComponent={
              <input
                type='text'
                className='task-item-name-input'
                value={this.state.name}
                onChange={this._setStateWrapperPath('name', 'target', 'value')}
                onKeyDown={this.handleTextKeyDown}
                onBlur={this.handleTextBlur}
                style={[
                  fontColor(Colors().active),
                  borderColor(Colors().active),
                ]}
                autoFocus
                disabled={!TerrainTools.isAdmin()}
              />
            }
            readOnlyComponent={
              <div
                className='task-item-name'
                style={
                  _.extend({},
                    fontColor(Colors().active),
                    { fontStyle: this.state.name ? 'normal' : 'italic' })
                }
                onClick={this._toggle('editingName')}
              >
                {
                  this.state.name || 'Untitled'
                }
              </div>
            }
          />
          {
            type !== 'ROOT' &&
            <div
              className='task-item-delete close'
              onClick={this._fn(this.props.onDelete, task.id)}
            >
              <DeleteIcon />
            </div>
          }
        </div>
        <div
          className='task-item-body'
        >
          {
            this.renderTaskSettings(task)
          }
        </div>
        {
          (task.onSuccess != null || task.onFailure != null) ?
            <div
              className='task-item-settings'
            >
              <CheckBox
                checked={task.blocking}
                onChange={this.handleBlockingChange}
                disabled={!TerrainTools.isAdmin()}
                label='Complete task before starting next task'
              />
            </div>
            :
            null
        }
        <div
          className='task-item-error'
          onClick={this._fn(this.props.onErrorClick, task.id)}
          style={fontColor(Colors().error)}
        >
          On Failure
        </div>
      </div>
    );
  }
}

const taskTypeList = List([
  TaskEnum.taskDefaultExit,
  TaskEnum.taskDefaultFailure,
  TaskEnum.taskETL,
]);
const taskTypeDisplayNames = Map({
  [TaskEnum.taskDefaultExit]: 'Default Exit',
  [TaskEnum.taskDefaultFailure]: 'Default Failure',
  [TaskEnum.taskETL]: 'ETL Task',
});

export default TaskItem;
