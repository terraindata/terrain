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
import Colors from 'app/colors/Colors';
import CRONEditor from 'app/common/components/CRONEditor';
import FloatingInput from 'app/common/components/FloatingInput';
import RouteSelector from 'app/common/components/RouteSelector';
import EndpointForm from 'app/etl/common/components/EndpointForm';
import { _SchedulerConfig, _TaskConfig, SchedulerConfig, SchedulerState, TaskConfig } from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import cronstrue from 'cronstrue';
import { List, Map } from 'immutable';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';

export interface Props
{
  schedule: SchedulerConfig;
  algorithms: Immutable.Map<ID, Algorithm>;
  templates: List<any>;
  onDelete: (id: ID) => void;
  onChange: (newSchedule: SchedulerConfig) => void;
  onRun: (id: ID) => void;
  onPause: (id: ID) => void;
  onUnpause: (id: ID) => void;
  onDisable: (id: ID) => void;
  onEnable: (id: ID) => void;
}

interface State
{
  configurationKey: string;
}

class Schedule extends TerrainComponent<Props>
{
  public state: State = {
    configurationKey: '',
  };

  public shouldComponentUpdate(nextProps: Props, nextState: State)
  {
    return nextProps !== this.props || nextState !== this.state;
  }

  public getSourceSinkDescription(template)
  {
    const { schedule } = this.props;
    if (!template)
    {
      return '--';
    }
    template = template.applyOverrides(this.getParam('overrideSources'), this.getParam('overrideSinks'));
    return template.getDescription(this.props.algorithms);
  }

  public handleConfigurationChange(schedule: SchedulerConfig, isSource: boolean, key: string, endpoint)
  {
    const task = this.getTask(schedule);
    const sourceKey = isSource ? 'overrideSources' : 'overrideSinks';
    const newSchedule = schedule.setIn(['tasks', 0], task.setIn(['params', sourceKey, key], endpoint));
    this.props.onChange(newSchedule);
  }

  public getEndPointOptions(endpoints: Map<string, any>, isSource: boolean, schedule)
  {
    const sourceKey = isSource ? 'overrideSources' : 'overrideSinks';
    return List(endpoints.keySeq().toList().map((key) =>
    {
      const endpoint = (this.getParam(sourceKey) as any).get(key) || endpoints.get(key);
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

  public handleScheduleChange(optionSetIndex: number, value: any)
  {
    let { schedule } = this.props;
    switch (optionSetIndex)
    {
      case 0: // Template
        let task: TaskConfig = this.getTask();
        task = task
          .setIn(['params', 'templateId'], value)
          .setIn(['params', 'overrideSources'], Map({}))
          .setIn(['params', 'overrideSinks'], Map({}));
        schedule = schedule.setIn(['tasks', 0], task);
        this.props.onChange(schedule);
        break;
      case 1: // Configuration
        this.setState({
          configurationKey: value,
        });
        break;
      default:
        break;
    }
  }

  public getIntervalDisplayName(value)
  {
    const { schedule } = this.props;
    try
    {
      return cronstrue.toString(value);
    }
    catch
    {
      return value;
    }
  }

  public handleScheduleValueChange(key, value)
  {
    this.props.onChange(this.props.schedule.set(key, value))
  }

  public getIntervalComponent(props)
  {
    return (
      <CRONEditor
        cron={props.value}
        onChange={this._fn(this.handleScheduleValueChange, 'cron')}
      />
    );
  }

  public getScheduleNameInput(props)
  {
    return (
      <FloatingInput
        isTextInput={true}
        value={this.getScheduleName('', props.value, -1)}
        onChange={this._fn(this.handleScheduleValueChange, 'name')}
        label={'Name'}
        canEdit={this.canEdit()}
        debounce={true}
      />
    );
  }

  public getValues()
  {
    const { schedule } = this.props;
    const templateId = this.getParam('templateId', -1);
    const statusValue = templateId === -1 ? '' : schedule.running ? 'Running' :
      schedule.shouldRunNext ? 'Disable' : 'Enable';
    const buttonValue = templateId === -1 ? '' :
      schedule.running ? 'Pause' :
        this.getTask().paused ? 'Unpause' : 'Run Now';
    return List([templateId, this.state.configurationKey, schedule.cron, statusValue, buttonValue]);
  }

  public getOptionSets()
  {
    const { schedule } = this.props;
    const task = this.getTask();
    // Template Option Set
    const templateOptions = this.props.templates.filter((t) =>
      t.canSchedule(),
    ).map((t) =>
    {
      return {
        value: t.id,
        displayName: t.templateName,
      };
    }).toList();

    const templateOptionSet = {
      key: 'template',
      options: templateOptions,
      shortNameText: 'Schedule',
      headerText: 'Template',
      column: true,
      forceFloat: true,
      getCustomDisplayName: this._fn(this.getScheduleName, '--'),
      hideSampleData: true,
      getValueComponent: this.getScheduleNameInput,
      headerBelowValueComponent: true,
    };

    // Configuration Option Set (Based on Template)
    let configurationOptions = List([]);
    let configurationHeaderText = 'Choose a Template';
    let template;
    if (task && task.params && task.params.get('templateId') !== undefined)
    {
      template = this.props.templates.filter((temp) => temp.id === task.params.get('templateId')).get(0);
      if (template)
      {
        configurationHeaderText = '';
        const sourceOptions = this.getEndPointOptions(template.sources, true, schedule);
        const sinkOptions = this.getEndPointOptions(template.sinks, false, schedule);
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
      getCustomDisplayName: this._fn(this.getSourceSinkDescription, template),
      hideSampleData: true,
    };

    const intervalOptionSet = {
      key: 'interval',
      options: List([]),
      shortNameText: 'Interval',
      headerText: !template ? 'Choose a Template' : '',
      column: true,
      forceFloat: true,
      getCustomDisplayName: !template ? (value) => '--' : this.getIntervalDisplayName,
      getValueComponent: !template ? (props) => null : this.getIntervalComponent,
      hideSampleData: true,
    };

    const statusOptionSet = {
      isButton: template !== undefined && !schedule.running,
      onButtonClick: this.handleEnableDisable,
      key: 'disable',
      options: List([]),
      column: true,
      hideSampleData: true,
      canUseButton: this.canEdit(),
    };

    const buttonOptionSet = {
      isButton: template !== undefined,
      onButtonClick: this.handleRunPause,
      key: 'run',
      options: List([]),
      column: true,
      canUseButton: TerrainTools.isAdmin(),
      hideSampleData: true,
    };

    return List([templateOptionSet, configurationOptionSet, intervalOptionSet, statusOptionSet, buttonOptionSet]);
  }

  public handleEnableDisable()
  {
    const { schedule } = this.props;
    schedule.shouldRunNext ? this.props.onDisable(schedule.id) : this.props.onEnable(schedule.id);
  }

  public handleRunPause()
  {
    const { schedule } = this.props;
    schedule.running ? this.props.onPause(schedule.id) :
      this.getTask().paused ? this.props.onUnpause(schedule.id) :
        this.props.onRun(schedule.id);
  }

  public canEdit()
  {
    return !this.props.schedule.running && TerrainTools.isAdmin();
  }

  public getScheduleName(defaultVal: string, templateId: ID, index: number)
  {
    if (this.props.schedule.name)
    {
      return this.props.schedule.name;
    }
    const template = this.props.templates.filter((temp) => temp.id === templateId).get(0);
    const templateName = template ? template.templateName : defaultVal;
    return templateName;
  }

  public getTask(overrideSchedule?: SchedulerConfig, index: number = 0): TaskConfig
  {
    const schedule = overrideSchedule || this.props.schedule;
    return (schedule.tasks && schedule.tasks.get(index)) || _TaskConfig({});
  }

  public getParam(key, defaultValue?)
  {
    const task = this.getTask();
    if (task && task.params && task.params.get(key) !== undefined)
    {
      return task.params.get(key);
    }
    return defaultValue;
  }

  public render()
  {
    const { schedule } = this.props;
    return (
      <RouteSelector
        optionSets={this.getOptionSets()}
        values={this.getValues()}
        canEdit={this.canEdit()}
        canDelete={this.canEdit()}
        onDelete={this._fn(this.props.onDelete, schedule.id)}
        onChange={this.handleScheduleChange}
        useTooltip={true}
      />
    );
  }
}

export default Schedule;
