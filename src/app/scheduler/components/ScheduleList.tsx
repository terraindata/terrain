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
import Colors from 'app/colors/Colors';
import RouteSelector from 'app/common/components/RouteSelector';
import EndpointForm from 'app/etl/common/components/EndpointForm';
import { ETLActions } from 'app/etl/ETLRedux';
import { ETLState } from 'app/etl/ETLTypes';
import { SchedulerActions } from 'app/scheduler/data/SchedulerRedux';
import { _SchedulerConfig, SchedulerConfig, SchedulerState } from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import { List, Map } from 'immutable';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import SchedulerApi from 'scheduler/SchedulerApi';
import { _SinkConfig, _SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import XHR from 'util/XHR';
import Schedule from './Schedule';

import './Schedule.less';

export interface Props
{
  scheduler?: SchedulerState;
  etl?: ETLState;
  etlActions?: typeof ETLActions;
  schedulerActions?: typeof SchedulerActions;
  algorithms: Immutable.Map<ID, Algorithm>;
}

class ScheduleList extends TerrainComponent<Props>
{
  public schedulerApi: SchedulerApi = new SchedulerApi(XHR.getInstance());

  public updateSchedule(id: number, changes)
  {
    this.props.schedulerActions({
      actionType: 'updateSchedule',
      schedule: changes,
    });
  }

  public runSchedule(id: number)
  {
    this.schedulerApi.runSchedule(id);
  }

  public pauseSchedule(id: number)
  {
    this.schedulerApi.pauseSchedule(id);
  }

  public componentWillMount()
  {
    this.props.schedulerActions({
      actionType: 'getSchedules',
    });
    this.props.etlActions({
      actionType: 'fetchTemplates',
    });
    this.listenToKeyPath('etl', ['templates']);
    this.listenToKeyPath('scheduler', ['schedules']);
  }

  public handleScheduleChange(schedule: SchedulerConfig)
  {
    schedule = schedule.set('tasks', schedule.tasks.map((task) => task.toJS()));
    this.updateSchedule(schedule.id, schedule.toJS());
  }

  public canEdit(schedule)
  {
    return !schedule.running && TerrainTools.isAdmin();
  }

  public createSchedule()
  {
    const blankSchedule = {
      cron: '0 0 1 1 *',
      name: `Schedule`,
      priority: 1,
      tasks: [{ params: { templateId: -1 } }],
      workerId: 10,
      createdAt: '',
      id: null,
      lastModified: '',
      lastRun: '',
      meta: '',
      running: false,
      shouldRunNext: true,
    };
    this.props.schedulerActions({
      actionType: 'createSchedule',
      schedule: blankSchedule,
    });
  }

  public deleteSchedule(id)
  {
    this.props.schedulerActions({
      actionType: 'deleteSchedule',
      scheduleId: id,
    });
  }

  public render()
  {
    const { schedules } = this.props.scheduler;
    const keys = schedules.keySeq().toList().sort();
    const scheduleList = keys.map((id) => schedules.get(id));
    return (
      <div className='schedule-list-wrapper'>
        {
          scheduleList.map((schedule, i) =>
            <Schedule
              key={i}
              schedule={schedule}
              onDelete={this.deleteSchedule}
              onRun={this.runSchedule}
              onPause={this.pauseSchedule}
              onChange={this.handleScheduleChange}
              templates={this.props.etl.templates}
              algorithms={this.props.algorithms}
            />,
          )
        }
        <PathfinderCreateLine
          text='Add Schedule'
          canEdit={true}
          onCreate={this.createSchedule}
          showText={true}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  ScheduleList,
  [
    'etl',
    'scheduler',
    ['library', 'algorithms'],
  ],
  {
    etlActions: ETLActions,
    schedulerActions: SchedulerActions,
  },
);
