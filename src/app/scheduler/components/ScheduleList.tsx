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
import { ETLActions } from 'app/etl/ETLRedux';
import { ETLState } from 'app/etl/ETLTypes';
import { SchedulerActions } from 'app/scheduler/data/SchedulerRedux';
import { _SchedulerConfig, scheduleForDatabase, SchedulerConfig, SchedulerState } from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import SchedulerApi from 'scheduler/SchedulerApi';
import XHR from 'util/XHR';
import Schedule from './Schedule';
import './Schedule.less';
const RefreshIcon = require('images/icon_refresh.svg?name=RefreshIcon');

export interface Props
{
  schedules?: Immutable.Map<ID, SchedulerConfig>;
  templates?: any;
  etlActions?: typeof ETLActions;
  schedulerActions?: typeof SchedulerActions;
  algorithms: Immutable.Map<ID, Algorithm>;
}

const INTERVAL = 60000;

class ScheduleList extends TerrainComponent<Props>
{
  public interval;

  public state: {
    confirmModalOpen: boolean,
  } = {
      confirmModalOpen: false,
    };

  public componentWillMount()
  {
    this.getSchedules();
    this.props.etlActions({
      actionType: 'fetchTemplates',
    });
    this.interval = setInterval(this.getSchedules, INTERVAL);
  }

  public componentWillUnmount()
  {
    clearInterval(this.interval);
  }

  public getSchedules()
  {
    this.props.schedulerActions({
      actionType: 'getSchedules',
    });
  }

  public handleScheduleChange(schedule: SchedulerConfig)
  {
    this.props.schedulerActions({
      actionType: 'updateSchedule',
      schedule: scheduleForDatabase(schedule) as SchedulerConfig,
    });
  }

  public createSchedule()
  {
    const blankSchedule = {
      cron: '0 0 * * 1',
      name: '',
      tasks: [{
        params: {
          options: {
            templateId: -1,
          },
        },
        id: 0,
        taskId: 2,
      }],
    };
    this.props.schedulerActions({
      actionType: 'createSchedule',
      schedule: blankSchedule,
    });
  }

  public performAction(action, scheduleId: ID)
  {
    this.props.schedulerActions({
      actionType: action,
      scheduleId,
    });
  }

  public render()
  {
    const { schedules } = this.props;
    const keys = schedules.keySeq().toList().sort();
    const scheduleList = keys.map((id) => schedules.get(id));

    return (
      <div
        className='schedule-list-wrapper'
        style={backgroundColor(Colors().blockBg)}
      >
        <div
          className='schedule-list-header'
        >
          <div
            className='schedule-list-refresh-wrapper'
          >
            {
              tooltip(
                <RefreshIcon
                  className='schedule-list-refresh'
                  style={getStyle('fill', Colors().iconColor)}
                  onClick={this.getSchedules}
                />,
                'Refresh',
              )
            }
          </div>
        </div>
        <div className='schedule-list-schedules-wrapper'>
          {
            scheduleList.map((schedule, i) =>
              <Schedule
                key={schedule.id}
                schedule={schedule}
                onDelete={this._fn(this.performAction, 'deleteSchedule')}
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
        </div>
        <PathfinderCreateLine
          text='Add Schedule'
          canEdit={TerrainTools.isAdmin()}
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
    ['etl', 'templates'],
    ['scheduler', 'schedules'],
    ['library', 'algorithms'],
  ],
  {
    etlActions: ETLActions,
    schedulerActions: SchedulerActions,
  },
);
