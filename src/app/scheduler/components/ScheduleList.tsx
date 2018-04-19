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
// tslint:disable:no-console
import TerrainComponent from 'common/components/TerrainComponent';
import * as React from 'react';
import SchedulerApi from 'scheduler/SchedulerApi';
import XHR from 'util/XHR';
import './Schedule.less';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import Colors from 'app/colors/Colors';
import RouteSelector from 'app/common/components/RouteSelector';
import EndpointForm from 'app/etl/common/components/EndpointForm';
import { ETLActions } from 'app/etl/ETLRedux';
import { ETLState } from 'app/etl/ETLTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import {_SinkConfig, _SourceConfig } from 'app/etl/EndpointTypes';
import { SchedulerActions } from 'app/scheduler/data/SchedulerRedux';
import { SchedulerConfig, _SchedulerConfig, SchedulerState } from 'app/scheduler/SchedulerTypes';

export interface Props
{
  scheduler?: SchedulerState;
  etl?: ETLState;
  etlActions?: typeof ETLActions;
  schedulerActions?: typeof SchedulerActions;
}

class ScheduleList extends TerrainComponent<Props>
{
  public state: {
    configurationKeys: List<string>
  } =
  {
    configurationKeys: List([]),
  }
/*
  These functions should be moved and will actually all be Redux actions (not ajax)
*/
  public schedulerApi: SchedulerApi = new SchedulerApi(XHR.getInstance());

  public createSchedule()
  {
    this.schedulerApi.createSchedule({
      cron: '0 0 1 1 *',
      name: `Jmansor Schedule ${Math.floor(Math.random() * 100)}`,
      priority: 1,
      tasks: {params: {templateId: -1}},
      workerId: 10,
    })
      .then((response) =>
      {
        this.getSchedules();
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        console.log(error);
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public getSchedules()
  {
    this.props.schedulerActions({
      actionType: 'getSchedules'
    })
    .then((schedules) =>
    {
     // console.error(schedules.get(1));
    })
  }

  public getSchedule(id: number)
  {
    this.schedulerApi.getSchedule(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public updateSchedule(id: number, changes: object)
  {
    changes = changes || { name: 'Jmansor Schedule Modified' };
    this.schedulerApi.updateSchedule(id, changes)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public deleteSchedule(id?: number)
  {
    this.schedulerApi.deleteSchedule(id)
      .then((response) =>
      {
        this.setState({ responseText: JSON.stringify(response) });
        this.getSchedules();
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public duplicateSchedule(id?: number)
  {
    this.schedulerApi.duplicateSchedule(id)
      .then((response) =>
      {
        this.getSchedules();
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public getScheduleLog(id: number)
  {
    this.schedulerApi.getScheduleLog(id)
      .then((response) =>
      {
        this.getSchedules();
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public pauseSchedule(id: number)
  {
    this.schedulerApi.pauseSchedule(id)
      .then((response) =>
      {
        this.getSchedules();
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public unpauseSchedule(id: number)
  {
    this.schedulerApi.unpauseSchedule(id)
      .then((response) =>
      {
        this.getSchedules();
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public runSchedule(id: number)
  {
    this.schedulerApi.runSchedule(id)
      .then((response) =>
      {
        this.getSchedules();
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  public setScheduleStatus(id: number)
  {
    this.schedulerApi.setScheduleStatus(id, false)
      .then((response) =>
      {
        this.getSchedules();
        this.setState({ responseText: JSON.stringify(response) });
      })
      .catch((error) =>
      {
        this.setState({ responseText: error.response.data.errors[0].detail });
      });
  }

  /* UI */

  public componentWillMount()
  {
    this.getSchedules();
    this.props.etlActions({
      actionType: 'fetchTemplates',
    });
    this.listenToKeyPath('etl', ['templates']);
    this.listenToKeyPath('scheduler', ['schedules']);
    this.setState({
      configurationKeys: List([]),
    });
  }

  public getSourceSinkDescription(schedule)
  {
    return 'From (info) To (info)';
  }

  public handleConfigurationChange(schedule, isSource: boolean, key: string, endpoint)
  {
    const task = schedule.task;
    const sourceKey = isSource ? 'overrideSources' : 'overrideSinks';
    if (!task['params'][sourceKey])
    {
      task['params'][sourceKey] = {};
    }
    task['params'][sourceKey][key] = endpoint.toJS();
    const newSchedule = schedule
      .set('tasks', JSON.stringify(task));
    this.updateSchedule(newSchedule.id, newSchedule.toJS());
  }

  public getEndPointOptions(endpoints: Map<string, any>, isSource: boolean, schedule)
  {
    const keys = _.keys(endpoints.toJS());
    const sourceKey = isSource ? 'overrideSources' : 'overrideSinks';
    return List(keys.map((key) =>
    {
      let endpoint = endpoints.get(key);
      if (schedule[sourceKey] && schedule[sourceKey][key])
      {
        if (isSource)
        {
          endpoint = _SourceConfig(schedule[sourceKey][key]);
        }
        else
        {
          endpoint = _SinkConfig(schedule[sourceKey][key]);
        }
      }
      return {
        value: isSource ? 'source' + key : 'sink' + key,
        displayName: endpoint.name,
        component: <EndpointForm
          isSource={isSource}
          endpoint={endpoint}
          onChange={this._fn(this.handleConfigurationChange, schedule, isSource, key)}
          isSchedule={true}
        />,
      };
    }));
  }

  public getOptionSets(schedule)
  {
    // Template Option Set
    const templateOptions = this.props.etl.templates.map((template) =>
    {
      return {
        value: template.id,
        displayName: template.templateName,
      };
    }).toList();
    const templateOptionSet = {
      key: 'template',
      options: templateOptions,
      shortNameText: 'Template',
      column: true,
      forceFloat: true,
      getCustomDisplayName: this.getTemplateName,
    };
    // Configuration Option Set (Based on Template)
    let configurationOptions = List([]);
    let configurationHeaderText = 'Choose a Template';
    if (schedule.tasks && schedule.tasks.params && schedule.tasks.params.templateId !== undefined)
    {
      const template = this.props.etl.templates.filter((temp) => temp.id === schedule.tasks.params.templateId).get(0);
      configurationHeaderText = '';
      if (template)
      {
        const sources = template.sources;
        const sinks = template.sinks;
        const sourceOptions = this.getEndPointOptions(sources, true, schedule);
        const sinkOptions = this.getEndPointOptions(sinks, false, schedule);
        configurationOptions = sourceOptions.concat(sinkOptions).toList();
      }
    }
    const configurationOptionSet = {
      key: 'configuration',
      options: configurationOptions,
      shortNameText: 'Configuration',
      headerText: configurationHeaderText,
      column: true,
      forceFloat: true,
      getCustomDisplayName: this._fn(this.getSourceSinkDescription, schedule),
    };

    // CRON Option Set
    const intervalOptionSet = {
      column: true,
      shortNameText: 'Interval',
      forceFloat: true,
      key: 'interval',
      options: List([{value: 'CRON SELECTOR GOES HERE'}])
    };

    // Status Options
    const statusOptions = List([
      {
        value: 'active',
        displayName: 'Active',
      },
      {
        value: 'running',
        displayName: 'Running',
        color: Colors().success
      },
      {
        value: 'disabled',
        displayName: 'Disabled',
        color: Colors().error,
      }
    ]);

    const statusOptionSet = {
      column: true,
      options: statusOptions,
      key: 'status',
      shortNameText: 'Status',
      forceFloat: true,
    }

    // Buttons to Run / Pause
    const buttonOptionSet = {
      isButton: true,
      onButtonClick: this._fn(this.handleRunPause, schedule),
      key: 'run',
      options: List([]),
      column: true,
    };

    // Log of Past Runs

    return List([templateOptionSet, configurationOptionSet, intervalOptionSet, statusOptionSet, buttonOptionSet]);
  }

  // TODO NEED OPTION FOR UNPAUSE
  public handleRunPause(schedule)
  {
    if (schedule.running)
    {
      this.runSchedule(schedule.id);
    }
    else
    {
      this.pauseSchedule(schedule.id);
    }
  }

  public getValues(schedule, index: number)
  {
    const templateId = schedule.tasks && schedule.tasks.params && schedule.tasks.params.templateId !== undefined ?
      schedule.tasks.params.templateId : -1;
    const buttonValue = schedule.running ? 'Pause' : 'Run Now';
    const status = schedule.tasks && schedule.tasks.jobStatus !== undefined ? schedule.tasks.jobStatus : 0;
    const statusValue =  status === 0 ? 'Active' : status === 1 ? 'Running' : 'Paused';
    return List([templateId, this.state.configurationKeys.get(index), 'every day!', statusValue, buttonValue]);
  }

  public getTemplateName(templateId: ID, index: number)
  {
    const template = this.props.etl.templates.filter((temp) => temp.id === templateId).get(0);
    const templateName = template ? template.templateName : 'None';
    return templateName;
  }

  public handleScheduleChange(schedule, index, optionSetIndex: number, value: any)
  {
    switch (optionSetIndex) {
      case 0: // Template
        const task = schedule.tasks;
        task['params']['templateId'] = value;
        schedule = schedule.set('tasks', task);
        this.updateSchedule(schedule.id, schedule.toJS());
      case 1: // Configuration
        this.setState({
          configurationKeys: this.state.configurationKeys.set(index, value),
        })
      case 2: // Button
      default:
        break;
    }
    // Change schedule based on optionSetIndex + value
  }

  public canEdit(schedule)
  {
    return !schedule.running && TerrainTools.isAdmin();
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
             <RouteSelector
              key={i}
              optionSets={this.getOptionSets(schedule)}
              values={this.getValues(schedule, i)}
              canEdit={this.canEdit(schedule)}
              canDelete={this.canEdit(schedule)}
              onDelete={this._fn(this.deleteSchedule, schedule.id)}
              onChange={this._fn(this.handleScheduleChange, schedule, i)}
              useTooltip={true}
            />
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
  ['etl', 'scheduler'],
  { etlActions: ETLActions,
    schedulerActions: SchedulerActions,
   },
);
