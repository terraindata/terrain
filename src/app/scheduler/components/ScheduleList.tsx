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
import EtlRouteUtil from 'app/etl/ETLRouteUtil';
import { ETLState } from 'app/etl/ETLTypes';
import { SchedulerActions } from 'app/scheduler/data/SchedulerRedux';
import { _SchedulerConfig, scheduleForDatabase, SchedulerConfig, SchedulerState } from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import { tooltip } from 'common/components/tooltip/Tooltips';
import cronstrue from 'cronstrue';
import { HeaderConfig, HeaderConfigItem, ItemList } from 'etl/common/components/ItemList';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import SchedulerApi from 'scheduler/SchedulerApi';
import TaskEnum from 'shared/types/jobs/TaskEnum';
import XHR from 'util/XHR';
import Schedule from './Schedule';
import './Schedule.less';
const RefreshIcon = require('images/icon_refresh.svg?name=RefreshIcon');

export interface Props
{
  schedules?: Immutable.Map<ID, SchedulerConfig>;
  schedulerActions?: typeof SchedulerActions;
}

const INTERVAL = 60000;

class ScheduleList extends TerrainComponent<Props>
{
  public displayConfig: HeaderConfig<SchedulerConfig> = [
    {
      name: 'ID',
      render: (schedule, index) => schedule.id,
      style: { width: `5%` },
    },
    {
      name: 'Name',
      render: (schedule, index) => schedule.name,
      style: { width: `30%` },
    },
    {
      name: 'Interval',
      render: (schedule, index) => this.getIntervalDisplayName(schedule.cron),
      style: { width: `35%` },
    },
    {
      name: 'Status',
      render: (schedule, index) => this.getScheduleStatus(schedule),
      style: { width: '30%' },
    },
  ];

  public interval;

  public state: {
    confirmModalOpen: boolean,
  } = {
      confirmModalOpen: false,
    };

  public componentWillMount()
  {
    this.getSchedules();
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

  public getIntervalDisplayName(value)
  {
    try
    {
      return cronstrue.toString(value);
    }
    catch
    {
      return value;
    }
  }

  public getScheduleStatus(schedule)
  {
    if (schedule.running)
    {
      return 'Running';
    }
    return schedule.shouldRunNext ? 'Enabled' : 'Disabled';
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
        taskId: TaskEnum.taskETL,
      }],
    };
    this.props.schedulerActions({
      actionType: 'createSchedule',
      schedule: blankSchedule,
      onLoad: (schedule) => EtlRouteUtil.gotoEditSchedule(schedule.id),
    });
  }

  public performAction(action, scheduleId: ID)
  {
    console.log('perform action  ', action, 'on ', scheduleId);
    this.props.schedulerActions({
      actionType: action,
      scheduleId,
    });
  }

  public handleOnClick(index: number)
  {
    const { schedules } = this.props;
    const keys = schedules.keySeq().toList().sort();
    EtlRouteUtil.gotoEditSchedule(keys.get(index));
  }

  public getMenuActions(schedule: SchedulerConfig)
  {
    let actions = List([
      {
        text: schedule.shouldRunNext ? 'Disable' : 'Enable',
        onClick: this._fn(this.performAction, 'disableSchedule', schedule.id),
      },
    ]);
    if (!schedule.running)
    {
      actions = actions.push({
        text: 'Run Now',
        onClick: this._fn(this.performAction, 'runSchedule', schedule.id),
      }).push({
        text: 'Delete',
        onClick: this._fn(this.performAction, 'deleteSchedule', schedule.id),
      });
    }
    return actions;
  }

  public render()
  {
    const { schedules } = this.props;
    const keys = schedules.keySeq().toList().sort();
    const scheduleList = keys.map((id) => schedules.get(id)).toList();

    return (
      <div
        className='schedule-list-wrapper'
        style={backgroundColor(Colors().blockBg)}
      >
        <ItemList
          items={scheduleList}
          columnConfig={this.displayConfig}
          onRowClicked={this.handleOnClick}
          getMenuOptions={this.getMenuActions}
          itemsName='schedule'
          getActions={undefined}
          canCreate={TerrainTools.isAdmin()}
          onCreate={this.createSchedule}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  ScheduleList,
  [
    ['scheduler', 'schedules'],
  ],
  {
    schedulerActions: SchedulerActions,
  },
);
