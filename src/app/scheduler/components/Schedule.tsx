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
import RouteSelector from 'app/common/components/RouteSelector';
import EndpointForm from 'app/etl/common/components/EndpointForm';
import { _SchedulerConfig, _TaskConfig, SchedulerConfig, SchedulerState, TaskConfig } from 'app/scheduler/SchedulerTypes';
import TerrainTools from 'app/util/TerrainTools';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
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
}

interface State
{
  configurationKey: string;
  overrideSources: Immutable.Map<string, SourceConfig>;
  overrideSinks: Immutable.Map<string, SinkConfig>;
}

class Schedule extends TerrainComponent<Props>
{
  public state: State = {
    configurationKey: '',
    overrideSources: Map({}),
    overrideSinks: Map({}),
  };

  public componentDidMount()
  {
    this.updateOverrides(this.props.schedule);
  }

  public componentWillReceiveProps(nextProps: Props)
  {
    if (this.props.schedule !== nextProps.schedule)
    {
      const oldTask: TaskConfig = this.getTask();
      const newTask: TaskConfig = this.getTask(nextProps.schedule);
      const oldSources = oldTask.getIn(['params', 'overrideSources']);
      const oldSinks = oldTask.getIn(['params', 'overrideSinks']);
      const newSources = newTask.getIn(['params', 'overrideSources']);
      const newSinks = newTask.getIn(['params', 'overrideSinks']);
      if (oldSinks !== newSinks || oldSources !== newSources)
      {
        this.updateOverrides(nextProps.schedule);
      }
    }
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State)
  {
    return nextProps !== this.props || nextState !== this.state;
  }

  public updateOverrides(schedule)
  {
    const task = this.getTask(schedule);
    let sources = Map({});
    let sinks = Map({});
    if (task.params && task.params.get('overrideSources'))
    {
      const sourceObj = task.params.get('overrideSources');
      _.keys(Util.asJS(sourceObj)).forEach((key) =>
      {
        sources = sources.set(key, _SourceConfig(sourceObj.get(key)));
      });
    }
    if (task.params && task.params.get('overrideSinks'))
    {
      const sinkObj = task.params.get('overrideSinks');
      _.keys(Util.asJS(sinkObj)).forEach((key) =>
      {
        sinks = sinks.set(key, _SinkConfig(sinkObj.get(key)));
      });
    }
    this.setState({
      overrideSources: sources,
      overrideSinks: sinks,
    });
  }

  public getSourceSinkDescription(schedule: SchedulerConfig, template)
  {
    if (!template)
    {
      return '--';
    }
    template = template.applyOverrides(this.state.overrideSources, this.state.overrideSinks);
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
    const keys = _.keys(endpoints.toJS());
    const sourceKey = isSource ? 'overrideSources' : 'overrideSinks';
    return List(keys.map((key) =>
    {
      const endpoint = (this.state[sourceKey] as any).get(key) || endpoints.get(key);
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

  public getValues()
  {
    const { schedule } = this.props;
    const templateId = this.getTemplateId(schedule);
    return List([templateId, this.state.configurationKey]);
  }

  public getOptionSets()
  {
    const { schedule } = this.props;
    const task = this.getTask();
    // Template Option Set
    const templateOptions = this.props.templates.map((t) =>
    {
      return {
        value: t.id,
        displayName: t.templateName,
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
      getCustomDisplayName: this._fn(this.getSourceSinkDescription, schedule, template),
    };

    return List([templateOptionSet, configurationOptionSet]);
  }

  public canEdit()
  {
    return !this.props.schedule.running && TerrainTools.isAdmin();
  }

  public getTemplateId(schedule)
  {
    const task = this.getTask();
    if (task && task.params && task.params.get('templateId') !== undefined)
    {
      return task.params.get('templateId');
    }
    return -1;
  }

  public getTemplateName(templateId: ID, index: number)
  {
    const template = this.props.templates.filter((temp) => temp.id === templateId).get(0);
    const templateName = template ? template.templateName : 'None';
    return templateName;
  }

  public getTask(overrideSchedule?: SchedulerConfig, index: number = 0): TaskConfig
  {
    const schedule = overrideSchedule || this.props.schedule;
    return (schedule.tasks && schedule.tasks.get(index)) || _TaskConfig({});
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
