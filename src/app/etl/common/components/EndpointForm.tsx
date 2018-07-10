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

// Copyright 2017 Terrain Data, Inc.
// tslint:disable:no-var-requires import-spacing
import TerrainComponent from 'common/components/TerrainComponent';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as React from 'react';
import Util from 'util/Util';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { instanceFnDecorator } from 'shared/util/Classes';

import { _FileConfig, _SinkConfig, _SourceConfig, FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { EndpointTypeNames, SchedulableSinks, SchedulableSources, Sinks, Sources } from 'shared/etl/types/EndpointTypes';

import { SinkFormMap, SourceFormMap } from 'etl/common/components/EndpointFormLookups';

import FadeInOut from 'app/common/components/FadeInOut';
import IntegrationForm from 'etl/common/components/IntegrationForm';
import IntegrationPicker from 'etl/common/components/IntegrationPicker';
import { ETLActions } from 'etl/ETLRedux';
import DocumentsHelpers from 'etl/helpers/DocumentsHelpers';
import { _IntegrationConfig, IntegrationConfig } from 'shared/etl/immutable/IntegrationRecords';
import { Integrations } from 'shared/etl/types/IntegrationTypes';

import { List, Map } from 'immutable';

export interface Props
{
  isSource: boolean;
  endpoint: SourceConfig | SinkConfig;
  onChange: (newEndpoint: SourceConfig | SinkConfig, apply?: boolean) => void;
  onSubmit?: () => void;
  hideTypePicker?: boolean;
  isSchedule?: boolean;
  integrations?: IMMap<ID, IntegrationConfig>;
  etlActions?: typeof ETLActions;
}

interface State
{
  usingCustomIntegration: boolean;
  currentObject: object;
}

class EndpointForm extends TerrainComponent<Props>
{
  public sinkTypeMap: InputDeclarationMap<SinkFormState> =
    {
      type: {
        type: DisplayType.Pick,
        displayName: 'Destination Type',
        options: {
          pickOptions: (s) => this.props.isSchedule ? List(SchedulableSinks) : sinkList,
          indexResolver: (value) => (this.props.isSchedule ? List(SchedulableSinks) : sinkList).indexOf(value),
          displayNames: (s) => endpointTypeNames,
        },
      },
    };

  public sourceTypeMap: InputDeclarationMap<SourceFormState> =
    {
      type: {
        type: DisplayType.Pick,
        displayName: 'Source Type',
        options: {
          pickOptions: (s) => this.props.isSchedule ? List(SchedulableSources) : sourceList,
          indexResolver: (value) => (this.props.isSchedule ? List(SchedulableSources) : sourceList).indexOf(value),
          displayNames: (s) => endpointTypeNames,

        },
      },
    };

  public state: State = {
    usingCustomIntegration: false,
    currentObject: null,
  };

  // public shouldComponentUpdate(nextProps, nextState)
  // {
  //   if (!_.isEqual(nextState.currentFile, this.state.currentFile))
  //   {
  //     return true;
  //   }
  //   else
  //   {
  //     return (this.props !== nextProps) || (this.state !== nextState);
  //   }
  // }

  public componentDidMount()
  {
    this.props.etlActions({
      actionType: 'getIntegrations',
    });
  }

  public detectFileConfigFromIntegration(newEndpoint, integration: IntegrationConfig | number): SourceConfig | SinkConfig
  {
    const { integrations, endpoint } = this.props;
    if (typeof integration === 'number')
    {
      integration = this.props.integrations.get(integration);
    }
    if (integration == null)
    {
      return newEndpoint;
    }

    const oldIntegration = integrations.get(endpoint.integrationId);

    const newOpts = integration.guessFileOptions();
    const oldOpts = oldIntegration !== undefined ? oldIntegration.guessFileOptions() : {};
    const applyOpts = this.extractFileConfigDelta(oldOpts, newOpts);
    const newFileConfig = _FileConfig(_.extend({}, (newEndpoint.fileConfig as any).toObject(), applyOpts));
    newEndpoint = newEndpoint.set('fileConfig', newFileConfig);
    return newEndpoint;
  }

  public handleIntegrationChange(newIntegration: IntegrationConfig, apply?)
  {
    this.props.etlActions({
      actionType: 'updateIntegration',
      integrationId: newIntegration.id,
      integration: newIntegration,
    });
    const newEndpoint = this.detectFileConfigFromIntegration(this.props.endpoint, newIntegration);
    this.props.onChange(newEndpoint, apply);
  }

  public handleIntegrationPickerChange(id: ID)
  {
    const endpoint = this.detectFileConfigFromIntegration(this.props.endpoint.set('integrationId', id), Number(id));
    this.props.onChange(endpoint);
    this.setState({
      usingCustomIntegration: false,
    });
  }

  public createIntegration()
  {
    this.setState({
      usingCustomIntegration: true,
    });
    this.props.etlActions({
      actionType: 'createIntegration',
      integration: _IntegrationConfig({ id: undefined, type: this.props.endpoint.type }),
      onLoad: (integration) =>
      {
        this.handleEndpointChange(this.props.endpoint.set('integrationId', integration.id));
      },
    });
  }

  public render()
  {
    const { isSource, endpoint, onChange, hideTypePicker, integrations } = this.props;
    const { usingCustomIntegration } = this.state;
    const mapToUse = isSource ? this.sourceTypeMap : this.sinkTypeMap;
    const FormClass = isSource ? SourceFormMap[endpoint.type] : SinkFormMap[endpoint.type];
    const isIntegrationType =
      endpoint.type != null &&
      endpoint.type !== '' &&
      integrationList.indexOf(endpoint.type) !== -1
      ;
    const showIntegrationForm = endpoint.integrationId != null && endpoint.integrationId >= 0;
    const showForm = showIntegrationForm ||
      (endpoint.type != null && endpoint.type !== '' && integrationList.indexOf(endpoint.type) === -1);
    return (
      <div className='endpoint-block'>
        { // type picker
          hideTypePicker === true ? null :
            <DynamicForm
              inputMap={mapToUse}
              inputState={this.typeValueToState(endpoint)}
              onStateChange={this.handleTypeChange}
              onTextInputEnter={this.props.onSubmit}
            />
        }
        { // integration form
          isIntegrationType ?
            <IntegrationPicker
              integrationType={endpoint.type}
              integrations={integrations}
              selectedIntegration={usingCustomIntegration ? 'custom' : endpoint.integrationId}
              onChange={this.handleIntegrationPickerChange}
              createIntegration={this.createIntegration}
            />
            :
            null
        }
        <FadeInOut
          open={showIntegrationForm}
        >
          <IntegrationForm
            integration={integrations.get(endpoint.integrationId)}
            onChange={this.handleIntegrationChange}
            hideType={true}
            hideName={!usingCustomIntegration}
          />
        </FadeInOut>
        <FadeInOut
          open={showForm}
        >
          {
            FormClass ?
              <FormClass
                endpoint={endpoint}
                onChange={this.handleEndpointChange}
                source={this.state.currentObject}
              />
              :
              null
          }

        </FadeInOut>
      </div>
    );
  }

  @instanceFnDecorator(memoizeOne)
  public typeValueToState(value: SinkConfig | SourceConfig)
  {
    return {
      type: value.type,
    };
  }

  public handleTypeChange(state: SinkFormState | SourceFormState)
  {
    const { isSource, endpoint, onChange } = this.props;
    const constructorToUse = isSource ? _SourceConfig : _SinkConfig;
    const newEndpoint = constructorToUse({ type: state.type });
    onChange(newEndpoint);
  }

  public handleEndpointChange(newEndpoint: SinkConfig | SourceConfig, apply?: boolean)
  {
    const newOpts = newEndpoint.guessFileOptions();
    const oldOpts = this.props.endpoint.guessFileOptions();
    const applyOpts = this.extractFileConfigDelta(oldOpts, newOpts);
    const newFileConfig = _FileConfig(_.extend({}, (newEndpoint.fileConfig as any).toObject(), applyOpts));
    newEndpoint = newEndpoint.set('fileConfig', newFileConfig);

    this.props.onChange(newEndpoint, apply);

    console.log(newEndpoint.toJS());

    newEndpoint = newEndpoint.setIn(['fileConfig', 'jsonPath'], '');

    DocumentsHelpers.fetchPreview(newEndpoint).then((res) =>
    {
      this.setState(
        {
          currentObject: res.get(0),
        },
      );
    })
      .catch((e) => e);
  }

  public extractFileConfigDelta(oldConfig: Partial<FileConfig>, newConfig: Partial<FileConfig>): Partial<FileConfig>
  {
    if (oldConfig == null)
    {
      return newConfig;
    }
    if (newConfig == null)
    {
      return {};
    }

    const diff = {};
    for (const k of Object.keys(newConfig))
    {
      if (oldConfig[k] !== newConfig[k])
      {
        diff[k] = newConfig[k];
      }
    }
    return diff;
  }
}

interface SinkFormState
{
  type: Sinks;
}

interface SourceFormState
{
  type: Sources;
}

const sourceList = List(Object.keys(Sources));
const sinkList = List(Object.keys(Sinks));
const integrationList = List(Object.keys(Integrations));
const endpointTypeNames: IMMap<any, string> = Map<any, string>(EndpointTypeNames);

export default Util.createContainer(
  EndpointForm,
  [['etl', 'integrations']],
  {
    etlActions: ETLActions,
  },
);
