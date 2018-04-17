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
import * as _ from 'lodash';
import {List, Map} from 'immutable';
import * as React from 'react';
import SchedulerAjax from 'scheduler/SchedulerAjax';
import Api from 'util/Api';
import PathfinderCreateLine from 'app/builder/components/pathfinder/PathfinderCreateLine';
import './Schedule.less';
import RouteSelector from 'app/common/components/RouteSelector';
import Colors from 'app/colors/Colors';
import Util from 'app/util/Util';
import TerrainTools from 'app/util/TerrainTools';
import { ETLState } from 'app/etl/ETLTypes';
import { ETLActions } from 'app/etl/ETLRedux';
import EndpointForm from 'app/etl/common/components/EndpointForm';

export interface Props {
  // injected
  etl?: ETLState;
  etlActions?: typeof ETLActions;
}

class Scheduler extends TerrainComponent<Props>
{
  public schedulerAjax: SchedulerAjax = new SchedulerAjax(Api.getInstance());
  public state: {
    schedules: List<any>;
    configurations: List<string>;
  } = {
    schedules: List([]),
    configurations: List([]),
  };

  public componentWillMount()
  {
    this.getSchedules();
    this.props.etlActions({
      actionType: 'fetchTemplates',
    });
    this.listenToKeyPath('etl', ['templates']);
  }

  public getSchedules()
  {
    this.schedulerAjax.getSchedules()
      .then((response) =>
      {
        this.updateScheduleList(response);
      })
      .catch((error) =>
       {
        console.log(error);
      });
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.etl.templates !== nextProps.etl.templates)
    {
      this.updateScheduleList(this.state.schedules.toJS(), nextProps.etl.templates);
    }
  }

  public handleConfigurationChange(scheduleId: ID, isSource: boolean, key: string, endpoint)
  {
  }

  public getEndPointOptions(endpoints: Map<string, any>, isSource: boolean, scheduleId: ID)
  {
    const keys = _.keys(endpoints.toJS());
    return List(keys.map((key) => {
      const endpoint = endpoints.get(key);
       return {
         value: isSource ? 'source' + key : 'sink' + key,
         displayName: endpoint.name,
         component: <EndpointForm
           isSource={isSource}
           endpoint={endpoint}
           onChange={this._fn(this.handleConfigurationChange, scheduleId, isSource, key)}
         />
       }
      }));
  }

  public getSourceSinkDescription(schedule)
  {
    return 'From (info) To (info)'
  }

  public getOptionSets(schedule)
  {
    // Template Option Set
     const templateOptions = this.props.etl.templates.map((template) =>
     {
       return {
         value: template.id,
         displayName: template.templateName,
       }
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
      console.log(sources);
      const sourceOptions = this.getEndPointOptions(sources, true, schedule.get('id'));
      const sinkOptions = this.getEndPointOptions(sinks, false, schedule.get('id'));
      configurationOptions = sourceOptions.concat(sinkOptions).toList();
    }
    const configurationOptionSet = {
      key: 'configuration',
      options: configurationOptions,
      shortNameText: 'Configuration',
      headerText: configurationHeaderText,
      column: true,
      forceFloat: true,
      getCustomDisplayName: this._fn(this.getSourceSinkDescription, schedule)
      // ADD IN CUSTOM DISPLAY NAME THAT IS DESCRIPTION OF SOURCE / SINK
    }
    // CRON Option Set

    // Status Options

    // Buttons to Run / Pause
    const buttonOptionSet = {
      isButton: true,
      onButtonClick: this._fn(this.handleRunPause, schedule),
      key: 'run',
      options: List([]),
    }
    // Log of Past Runs
    return List([templateOptionSet, configurationOptionSet, buttonOptionSet]);
  }

  public handleRunPause(schedule)
  {
  }

  public getValues(schedule, index: number)
  {
    const templateId = schedule.get('template') !== undefined ?
      schedule.get('template').id : '';
    const buttonValue = schedule.running ? 'Pause' : 'Run Now';
    return List([templateId, this.state.configurations.get(index), buttonValue]);
  }

  public getTemplateName(templateId: ID, index: number)
  {
    const template = this.props.etl.templates.filter((temp) => temp.id === templateId).get(0);
    const templateName = template ? template.templateName : 'None';
  }

  public updateScheduleList(schedules: any[], templates?)
  {
    templates = templates || this.props.etl.templates;
    let formattedSchedules = List([]);
    schedules.map((schedule) =>
    {
      const newSchedule = schedule;
      const task = JSON.parse(JSON.parse(schedule.tasks));
      const templateId = task.params.templateId;
      const temp = templates.filter((t) => t.id === templateId).get(0);
      newSchedule['template'] = temp;
      formattedSchedules = formattedSchedules.push(Map(newSchedule));
    });
    this.setState({
      schedules: formattedSchedules,
    });
  }

  public handleCreateSchedule()
  {
    this.schedulerAjax.createScheduler({
      interval: '0 0 1 1 *',
      meta: '',
      name: 'Schedule',
      pausedFilename: '',
      tasks: JSON.stringify({
        cancel: false, // whether the tree of tasks should be cancelled
        jobStatus: 0, // 0: not running, 1: running, 2: paused
        name: 'Import', // name of the task i.e. 'import'
        onFailure: 3, // id of task to execute on failure
        onSuccess: 2, // id of next task to execute (default should be next in array)
        params: { templateId: 7 }, // input parameters for the task
        paused: 4, // where in the tree of tasks the tasks are paused
        taskId: 5, // maps to a statically declared task
      }),
      templateId: 1,
    })
      .then((response) =>
      {
        this.updateScheduleList(this.state.schedules.push(response[0]).toJS());
      })
      .catch((error) =>
    {
        console.log('error', error);
      });
  }

  public handleDeleteSchedule(id: ID)
  {
    this.schedulerAjax.deleteSchedule(id)
    .then((response) =>
    {
      this.getSchedules();
    })
    .catch((error) =>
    {
      console.log('error', error);
    });
  }

  public handleScheduleChange(scheduleIndex: number, optionSetIndex: number, value: any)
  {
    console.log('change ', optionSetIndex, value);
    switch (optionSetIndex)
    {
      case 1:
        this.setState({
          configurations: this.state.configurations.set(scheduleIndex, value),
        });
      default:
    }
  }

  public render()
  {
    const { schedules } = this.state;
    return (
      <div className='schedule-list-wrapper'>
        {
          schedules.map((schedule, i) =>
            <RouteSelector
              key={i}
              optionSets={this.getOptionSets(schedule)}
              values={this.getValues(schedule, i)}
              canEdit={TerrainTools.isAdmin()}
              canDelete={TerrainTools.isAdmin()}
              onDelete={this._fn(this.handleDeleteSchedule, schedule.get('id'))}
              onChange={this._fn(this.handleScheduleChange, i)}
            />
          )
        }
        <PathfinderCreateLine
          text='Add Schedule'
          canEdit={true}
          onCreate={this.handleCreateSchedule}
          showText={true}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  Scheduler,
  ['etl'],
  {etlActions: ETLActions},
);
