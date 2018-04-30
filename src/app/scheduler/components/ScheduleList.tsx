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
// tslint:disable:no-console strict-boolean-expressions
import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import Modal from 'app/common/components/Modal';
import { ETLActions } from 'app/etl/ETLRedux';
import { ETLState } from 'app/etl/ETLTypes';
import { SchedulerActions } from 'app/scheduler/data/SchedulerRedux';
import { _SchedulerConfig, scheduleForDatabase, SchedulerConfig, SchedulerState } from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as React from 'react';
import SchedulerApi from 'scheduler/SchedulerApi';
import XHR from 'util/XHR';
import Schedule from './Schedule';
import './Schedule.less';

export interface Props
{
  schedules?: Immutable.Map<ID, SchedulerConfig>;
  templates?: any;
  etlActions?: typeof ETLActions;
  schedulerActions?: typeof SchedulerActions;
  algorithms: Immutable.Map<ID, Algorithm>;
}

class ScheduleList extends TerrainComponent<Props>
{
  public state: {
    confirmModalOpen: boolean,
    deleteScheduleId: ID,
  } = {
      confirmModalOpen: false,
      deleteScheduleId: -1,
    };
  public componentWillMount()
  {
    this.props.schedulerActions({
      actionType: 'getSchedules',
    });
    this.props.etlActions({
      actionType: 'fetchTemplates',
    });
  }

  public handleScheduleChange(schedule: SchedulerConfig)
  {
    this.props.schedulerActions({
      actionType: 'updateSchedule',
      schedule: scheduleForDatabase(schedule),
    });
  }

  public createSchedule()
  {
    const blankSchedule = {
      cron: '0 0 * * 1',
      name: '',
      tasks: [{ params: { templateId: -1 }, id: 0, taskId: 2 }],
    };
    this.props.schedulerActions({
      actionType: 'createSchedule',
      schedule: blankSchedule,
    });
  }

  public performAction(action, scheduleId?: ID)
  {
    scheduleId = scheduleId !== undefined ? scheduleId : this.state.deleteScheduleId;
    this.props.schedulerActions({
      actionType: action,
      scheduleId,
    });
  }

  public confirmDeleteSchedule(scheduleId: ID)
  {
    this.setState({
      confirmModalOpen: true,
      deleteScheduleId: scheduleId,
    });
  }

  public render()
  {
    const { schedules } = this.props;
    const keys = schedules.keySeq().toList().sort();
    const scheduleList = keys.map((id) => schedules.get(id));
    const toDelete = schedules.get(this.state.deleteScheduleId) ? schedules.get(this.state.deleteScheduleId).name : '';
    return (
      <div className='schedule-list-wrapper'>
        {
          scheduleList.map((schedule, i) =>
            <Schedule
              key={i}
              schedule={schedule}
              onDelete={this.confirmDeleteSchedule}
              onRun={this._fn(this.performAction, 'runSchedule')}
              onPause={this._fn(this.performAction, 'pauseSchedule')}
              onUnpause={this._fn(this.performAction, 'unpauseSchedule')}
              onDisable={this._fn(this.performAction, 'disableSchedule')}
              onEnable={this._fn(this.performAction, 'enableSchedule')}
              onChange={this.handleScheduleChange}
              templates={this.props.templates}
              algorithms={this.props.algorithms}
            />,
          )
        }
        <PathfinderCreateLine
          text='Add Schedule'
          canEdit={TerrainTools.isAdmin()}
          onCreate={this.createSchedule}
          showText={true}
        />
        <Modal
          open={this.state.confirmModalOpen}
          confirm={true}
          title={'Confirm Action'}
          message={`Are you sure you want to delete ${toDelete}?`}
          confirmButtonText={'Yes'}
          onConfirm={this._fn(this.performAction, 'deleteSchedule')}
          onClose={this._toggle('confirmModalOpen')}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  ScheduleList,
  [
    ['etl', 'templates'],
    ['scheduler', 'schedules'],
    ['library', 'algorithms'],
  ],
  {
    etlActions: ETLActions,
    schedulerActions: SchedulerActions,
  },
);
