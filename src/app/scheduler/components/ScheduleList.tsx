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
import Scheduler from './Scheduler';
import {_SinkConfig, _SourceConfig } from 'app/etl/EndpointTypes';

export interface Props
{
  etl?: ETLState;
  etlActions?: typeof ETLActions;
}

class ScheduleList extends Scheduler<Props> {

  public constructor(props)
  {
    super(props);
    this.state = {
      responseText: '',
      schedules: List([]),
      id: '',
      configurationKeys: List([]),
    };
  }

  public componentWillMount()
  {
    this.getSchedules();
    this.props.etlActions({
      actionType: 'fetchTemplates',
    });
    this.listenToKeyPath('etl', ['templates']);
  }

  public getSourceSinkDescription(schedule)
  {
    return 'From (info) To (info)';
  }

  public handleConfigurationChange(schedule, isSource: boolean, key: string, endpoint)
  {
    const task = JSON.parse(schedule.get('tasks'));
    const sourceKey = isSource ? 'overrideSources' : 'overrideSinks';
    if (!task['params'][sourceKey])
    {
      task['params'][sourceKey] = {};
    }
    task['params'][sourceKey][key] = endpoint.toJS();
    const newSchedule = schedule
      .set('tasks', JSON.stringify(task))
      .delete('template');
    console.log(newSchedule.toJS());
    this.updateSchedule(newSchedule.get('id'), newSchedule.toJS());
  }

  public getEndPointOptions(endpoints: Map<string, any>, isSource: boolean, schedule)
  {
    const keys = _.keys(endpoints.toJS());
    const sourceKey = isSource ? 'overrideSources' : 'overrideSinks';
    return List(keys.map((key) =>
    {
      let endpoint = endpoints.get(key);
      if (schedule.get(sourceKey) && schedule.get(sourceKey)[key])
      {
        if (isSource)
        {
          endpoint = _SourceConfig(schedule.get(sourceKey)[key]);
        }
        else
        {
          endpoint = _SinkConfig(schedule.get(sourceKey)[key]);
        }
      }
      return {
        value: isSource ? 'source' + key : 'sink' + key,
        displayName: endpoint.name,
        component: <EndpointForm
          isSource={isSource}
          endpoint={endpoint}
          onChange={this._fn(this.handleConfigurationChange, schedule, isSource, key)}
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
    if (schedule.get('template'))
    {
      configurationHeaderText = '';
      const sources = schedule.get('template').sources;
      const sinks = schedule.get('template').sinks;
      const sourceOptions = this.getEndPointOptions(sources, true, schedule);
      const sinkOptions = this.getEndPointOptions(sinks, false, schedule);
      configurationOptions = sourceOptions.concat(sinkOptions).toList();
    }
    const configurationOptionSet = {
      key: 'configuration',
      options: configurationOptions,
      shortNameText: 'Configuration',
      headerText: configurationHeaderText,
      column: true,
      forceFloat: true,
      getCustomDisplayName: this._fn(this.getSourceSinkDescription, schedule),
      // ADD IN CUSTOM DISPLAY NAME THAT IS DESCRIPTION OF SOURCE / SINK
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
    if (schedule.get('running'))
    {
      this.runSchedule(schedule.get('id'));
    }
    else
    {
      this.pauseSchedule(schedule.get('id'));
    }
  }

  public getValues(schedule, index: number)
  {
    const templateId = schedule.get('template') !== undefined ?
      schedule.get('template').id : '';
    const buttonValue = schedule.get('running') ? 'Pause' : 'Run Now';
    const status = JSON.parse(schedule.get('tasks')).jobStatus;
    const statusValue =  status === 0 ? 'Active' : status === 1 ? 'Running' : 'Paused';
    return List([templateId, this.state.configurationKeys.get(index), 'every day!', statusValue, buttonValue]);
  }

  public getTemplateName(templateId: ID, index: number)
  {
    const template = this.props.etl.templates.filter((temp) => temp.id === templateId).get(0);
    const templateName = template ? template.templateName : 'None';
    return templateName;
  }

  public updateScheduleList(schedules: any[], templates?)
  {
    templates = templates || this.props.etl.templates;
    let formattedSchedules = List([]);
    schedules.map((schedule) =>
    {
      const newSchedule = schedule;
      const task = JSON.parse(schedule.tasks);
      const templateId = task.params.templateId;
      const temp = templates.filter((t) => t.id === templateId).get(0);
      newSchedule['template'] = temp;
      newSchedule['overrideSources'] = task.params.overrideSources;
      newSchedule['overrideSinks'] = task.params.overrideSinks;
      formattedSchedules = formattedSchedules.push(Map(newSchedule));
    });
    return formattedSchedules;
  }

  public handleScheduleChange(oldSchedule, index, optionSetIndex: number, value: any)
  {
    let newSchedule = oldSchedule;
    switch (optionSetIndex) {
      case 0: // Template
        const task = JSON.parse(newSchedule.get('tasks'));
        task['params']['templateId'] = value;
        newSchedule = newSchedule.set('tasks', task);
      case 1: // Configuration
        this.setState({
          configurationKeys: this.state.configurationKeys.set(index, value),
        })
      case 2: // Button
      default:
        break;
    }
    // Change schedule based on optionSetIndex + value
    newSchedule = newSchedule.delete('template');
    this.updateSchedule(newSchedule.get('id'), newSchedule.toJS());
  }

  public canEdit(schedule)
  {
    return !schedule.get('running') && TerrainTools.isAdmin();
  }

  public render()
  {
    let { schedules } = this.state;
    schedules = this.updateScheduleList(schedules);
    return (
      <div className='schedule-list-wrapper'>
        {
          schedules.map((schedule, i) =>
            <RouteSelector
              key={i}
              optionSets={this.getOptionSets(schedule)}
              values={this.getValues(schedule, i)}
              canEdit={this.canEdit(schedule)}
              canDelete={this.canEdit(schedule)}
              onDelete={this._fn(this.deleteSchedule, schedule.get('id'))}
              onChange={this._fn(this.handleScheduleChange, schedule, i)}
            />,
          )
        }
        <PathfinderCreateLine
          text='Add Schedule'
          canEdit={true}
          onCreate={this._fn(this.createSchedule, this)}
          showText={true}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  ScheduleList,
  ['etl'],
  { etlActions: ETLActions },
);
