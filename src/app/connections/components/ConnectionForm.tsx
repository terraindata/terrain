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
// tslint:disable:no-var-requires max-classes-per-file strict-boolean-expressions
import TerrainComponent from 'common/components/TerrainComponent';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { _ConnectionConfig, ConnectionConfig } from 'app/connections/ConnectionTypes';
import Autocomplete from 'common/components/Autocomplete';
import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import FadeInOut from 'common/components/FadeInOut';
import Switch from 'common/components/Switch';
import SharedConnectionConfig from 'shared/types/connections/ConnectionConfig';
import SharedUtil from 'shared/Util';
import { instanceFnDecorator } from 'shared/util/Classes';

import { LibraryState } from 'library/LibraryTypes';

export interface Props
{
  connection: ConnectionConfig;
  onChange: (newConfig: ConnectionFormConfig, apply?: boolean) => void;
}

export type ConnectionFormConfig = SharedConnectionConfig & {
  user: string,
  password: string,
  port: number,
};

const ConnectionTypes = Map(
  {
    elastic: 'Elasticsearch',
    mysql: 'MySQL',
  },
);

const connectionTypesList = List(ConnectionTypes.keys());

export default class ConnectionForm extends TerrainComponent<Props>
{
  public connectionMap: InputDeclarationMap<ConnectionFormConfig> = {
    name: {
      type: DisplayType.TextBox,
      displayName: 'Name',
      options: {},
    },
    type: {
      type: DisplayType.Pick,
      displayName: 'Type',
      options: {
        pickOptions: (s) => connectionTypesList,
        displayNames: (s) => ConnectionTypes,
        indexResolver: (value) => connectionTypesList.indexOf(value),
      },
    },
    user: {
      type: DisplayType.TextBox,
      displayName: 'User',
      group: 'auth row',
      widthFactor: 2,
    },
    password: {
      type: DisplayType.TextBox,
      displayName: 'Password',
      group: 'auth row',
      widthFactor: 2,
    },
    host: {
      type: DisplayType.TextBox,
      displayName: 'Host',
      group: 'addr row',
      widthFactor: 3,
    },
    port: {
      type: DisplayType.NumberBox,
      displayName: 'Port',
      group: 'addr row',
      widthFactor: 1,
    },
  };

  public analyticsMap: InputDeclarationMap<{ analytics: any }> = {
    analytics: {
      type: DisplayType.Custom,
      displayName: 'Toggle Analytics',
      options: {
        render: this.renderAnalyticsSwitch,
      },
    },
  };

  public renderAnalyticsSwitch()
  {
    const { connection } = this.props;
    const isAnalytics = connection['isAnalytics'];
    return (
      <div>
        <Switch
          medium={true}
          first='On'
          second='Off'
          selected={isAnalytics ? 1 : 0}
          onChange={this.handleAnalyticsSwitch}
        />
        <FadeInOut open={isAnalytics}>
          <div className='dynamic-form-default-block'>
            <div className='dynamic-form-label' style={fontColor(Colors().text2)}> Analytics Index </div>
            <input
              className='dynamic-form-autocomplete'
              value={connection['analyticsIndex']}
              onChange={this.handleAnalyticsIndexChange}
            />
          </div>
        </FadeInOut>
      </div>
    );
  }

  public handleAnalyticsSwitch(selected)
  {
    const { connection } = this.props;
    const newConnection = connection.set('isAnalytics', selected ? true : false);
    this.handleConnectionChange(this.configToState(newConnection), true);
  }

  public handleAnalyticsIndexChange(event)
  {
    const { connection } = this.props;
    let newConnection = connection.set('analyticsIndex', event.target.value);
    newConnection = newConnection.set('analyticsType', 'data');
    this.handleConnectionChange(this.configToState(newConnection), true);
  }

  public render()
  {
    return (
      <div className='integration-form-block'>
        <DynamicForm
          inputMap={this.connectionMap}
          inputState={this.configToState(this.props.connection)}
          onStateChange={this.handleConnectionChange}
        />
        <DynamicForm
          inputMap={this.analyticsMap}
          inputState={this.configToState(this.props.connection)}
          onStateChange={this.handleConnectionChange}
        />
      </div>
    );
  }

  @instanceFnDecorator(memoizeOne)
  public configToState(config: ConnectionConfig): ConnectionFormConfig
  {
    // console.log(config);
    let state = Util.asJS(config) as SharedConnectionConfig;
    const dsnString = state['dsn'];
    if (dsnString !== '')
    {
      const dsnConfig = _.omitBy(SharedUtil.dsn.parseDSNConfig(dsnString), _.isUndefined);
      state = _.merge(state, dsnConfig);
    }
    return state as ConnectionFormConfig;
  }

  public handleConnectionChange(connection: ConnectionFormConfig, apply?: boolean)
  {
    this.props.onChange(connection, apply);
  }
}
