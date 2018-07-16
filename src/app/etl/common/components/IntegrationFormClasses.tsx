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
import * as _ from 'lodash';
import * as React from 'react';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import ObjectForm from 'common/components/ObjectForm';

import { List } from 'immutable';
import { IntegrationConfig } from 'shared/etl/immutable/IntegrationRecords';
import { AuthConfigType, ConnectionConfigType, Integrations } from 'shared/etl/types/IntegrationTypes';

export interface Props
{
  integration: IntegrationConfig;
  onChange: (newIntegration: IntegrationConfig, apply?: boolean) => void;
  onSubmit?: () => void;
}

abstract class IntegrationFormBase<AuthState, ConnectionState, P extends Props = Props> extends TerrainComponent<P>
{
  public abstract authMap: InputDeclarationMap<AuthState>;
  public abstract connectionMap: InputDeclarationMap<ConnectionState>;

  constructor(props)
  {
    super(props);
    this.handleAuthFormChange = this.handleAuthFormChange.bind(this);
    this.handleConnectionFormChange = this.handleConnectionFormChange.bind(this);
  }

  /*
   * Override these converstion methods to customize form behavior / structure
   */
  public authConfigToState(config): AuthState
  {
    return (config || {}) as AuthState;
  }

  public connectionConfigToState(config): ConnectionState
  {
    return (config || {}) as ConnectionState;
  }

  public authStateToConfig(state: AuthState)
  {
    return state as any;
  }

  public connectionStateToConfig(state: ConnectionState)
  {
    return state as any;
  }

  public render()
  {
    const { authConfig, connectionConfig } = this.props.integration;
    const authState = this.authConfigToState(authConfig);
    const connectionState = this.connectionConfigToState(connectionConfig);
    return (
      <div>
        <DynamicForm
          inputMap={this.authMap}
          inputState={authState}
          onStateChange={this.handleAuthFormChange}
          onTextInputEnter={this.props.onSubmit}
        />
        <DynamicForm
          inputMap={this.connectionMap}
          inputState={connectionState}
          onStateChange={this.handleConnectionFormChange}
          onTextInputEnter={this.props.onSubmit}
        />
      </div>
    );
  }

  protected handleAuthFormChange(state: AuthState, apply?: boolean)
  {
    if (apply !== false)
    {
      const { onChange, integration } = this.props;
      const newConfig = this.authStateToConfig(state);
      onChange(integration.set('authConfig', newConfig), apply);
    }

  }

  protected handleConnectionFormChange(state: ConnectionState, apply?: boolean)
  {
    if (apply !== false)
    {
      const { onChange, integration } = this.props;
      const newConfig = this.connectionStateToConfig(state);
      onChange(integration.set('connectionConfig', newConfig), apply);
    }
  }
}

type SftpAuthT = AuthConfigType<Integrations.Sftp>;
type SftpConnectionT = ConnectionConfigType<Integrations.Sftp>;
class SftpForm extends IntegrationFormBase<SftpAuthT, SftpConnectionT>
{
  public authMap: InputDeclarationMap<SftpAuthT & { switch }> = {
    switch: {
      type: DisplayType.Switch,
      displayName: '',
      options: {
        values: List(['Private Key', 'Password']),
      },
    },
    privateKey: {
      type: DisplayType.TextBox,
      displayName: 'Private Key',
      getDisplayState: (s) => (s.switch === undefined || s.switch === 1) ? DisplayState.Active : DisplayState.Hidden,
    },
    password: {
      type: DisplayType.TextBox,
      displayName: 'Password',
      getDisplayState: (s) => !(s.switch === undefined || s.switch === 1) ? DisplayState.Active : DisplayState.Hidden,
    },
  };

  public connectionMap: InputDeclarationMap<SftpConnectionT> = {
    username: {
      type: DisplayType.TextBox,
      displayName: 'Username',
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

  public authConfigToState(config)
  {
    if (config['switch'] === undefined)
    {
      let switchVal = 1;
      if (config['password'] !== undefined)
      {
        switchVal = 0;
      }
      config['switch'] = switchVal;
    }
    return config;
  }

  public authStateToConfig(state)
  {
    if (state['switch'] !== undefined && state['switch'] !== 1)
    {
      delete state['privateKey'];
    }
    else
    {
      delete state['password'];
    }
    return state;
  }
}

type HttpAuthT = AuthConfigType<Integrations.Http>;
type HttpConnectionT = ConnectionConfigType<Integrations.Http>;
class HttpForm extends IntegrationFormBase<HttpAuthT, HttpConnectionT>
{
  public authMap: InputDeclarationMap<HttpAuthT> = {
    jwt: {
      type: DisplayType.TextBox,
      displayName: 'Authorization Header',
      help: 'Example: Basic aCBdefGhijklMNOpQRStUVwx=',
    },
  };

  public connectionMap: InputDeclarationMap<HttpConnectionT> = {
    url: {
      type: DisplayType.TextBox,
      displayName: 'Url',
    },
    headers: {
      type: DisplayType.Custom,
      widthFactor: -1,
      options: {
        render: this.renderHeadersForm,
      },
    },
    params: {
      type: DisplayType.Custom,
      widthFactor: -1,
      options: {
        render: this.renderParamsForm,
      },
    },
    gzip: {
      type: DisplayType.CheckBox,
      displayName: 'gzip',
    },
  };

  public defaultState = {
    url: '',
    headers: {},
    params: {},
  };

  public renderHeadersForm(state: HttpConnectionT, disabled)
  {
    return (
      <ObjectForm
        object={state.headers != null ? state.headers : {}}
        onChange={this.handleHeadersChange}
        label='Headers'
        onSubmit={this.props.onSubmit}
      />
    );
  }

  public handleHeadersChange(newHeaders, apply?: boolean)
  {
    const options = this.props.integration.connectionConfig as HttpConnectionT;
    const newFormState: HttpConnectionT = _.extend({}, options);
    newFormState.headers = newHeaders;
    this.handleConnectionFormChange(newFormState, apply);
  }

  public renderParamsForm(state: HttpConnectionT, disabled)
  {
    return (
      <ObjectForm
        object={state.params != null ? state.params : {}}
        onChange={this.handleParamsChange}
        label='Parameters'
        onSubmit={this.props.onSubmit}
      />
    );
  }

  public handleParamsChange(newParams, apply?: boolean)
  {
    const options = this.props.integration.connectionConfig as HttpConnectionT;
    const newFormState: HttpConnectionT = _.extend({}, options);
    newFormState.params = newParams;
    this.handleConnectionFormChange(newFormState, apply);
  }
}

type FsAuthT = AuthConfigType<Integrations.Fs>;
type FsConnectionT = ConnectionConfigType<Integrations.Fs>;
class FsForm extends IntegrationFormBase<FsAuthT, FsConnectionT>
{
  public authMap: InputDeclarationMap<FsAuthT> = {};

  public connectionMap: InputDeclarationMap<FsConnectionT> = {
    path: {
      type: DisplayType.TextBox,
      displayName: 'File Path',
    },
  };
}

type MysqlAuthT = AuthConfigType<Integrations.Mysql>;
type MysqlConnectionT = ConnectionConfigType<Integrations.Mysql>;
class MysqlForm extends IntegrationFormBase<MysqlAuthT, MysqlConnectionT>
{
  public authMap: InputDeclarationMap<MysqlAuthT> = {
    password: {
      type: DisplayType.TextBox,
      displayName: 'Password',
    },
  };

  public connectionMap: InputDeclarationMap<MysqlConnectionT> = {
    user: {
      type: DisplayType.TextBox,
      displayName: 'User',
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
    database: {
      type: DisplayType.TextBox,
      displayName: 'Database',
    },
  };
}

type PostgresqlAuthT = AuthConfigType<Integrations.Postgresql>;
type PostgresqlConnectionT = ConnectionConfigType<Integrations.Postgresql>;
class PostgresqlForm extends IntegrationFormBase<PostgresqlAuthT, PostgresqlConnectionT>
{
  public authMap: InputDeclarationMap<PostgresqlAuthT> = {
    password: {
      type: DisplayType.TextBox,
      displayName: 'Password',
    },
  };

  public connectionMap: InputDeclarationMap<PostgresqlConnectionT> = {
    user: {
      type: DisplayType.TextBox,
      displayName: 'User',
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
    database: {
      type: DisplayType.TextBox,
      displayName: 'Database',
    },
  };
}

type MagentoAuthT = AuthConfigType<Integrations.Magento>;
type MagentoConnectionT = ConnectionConfigType<Integrations.Magento>;
class MagentoForm extends IntegrationFormBase<MagentoAuthT, MagentoConnectionT>
{
  public authMap: InputDeclarationMap<MagentoAuthT> = {
    apiKey: {
      type: DisplayType.TextBox,
      displayName: 'API Key',
    },
  };

  public connectionMap: InputDeclarationMap<MagentoConnectionT> = {
    apiUser: {
      type: DisplayType.TextBox,
      displayName: 'API User',
    },
  };
}

type GoogleAnalyticsAuthT = AuthConfigType<Integrations.GoogleAnalytics>;
type GoogleAnalyticsConnectionT = ConnectionConfigType<Integrations.GoogleAnalytics>;
class GoogleAnalyticsForm extends IntegrationFormBase<GoogleAnalyticsAuthT, GoogleAnalyticsConnectionT>
{
  public authMap: InputDeclarationMap<GoogleAnalyticsAuthT> = {
    privateKey: {
      type: DisplayType.TextBox,
      displayName: 'P12 key associated with the service account. Should begin with ‘-----Begin RSA PRIVATE KEY…’',
    },
  };

  public connectionMap: InputDeclarationMap<GoogleAnalyticsConnectionT> = {
    email: {
      type: DisplayType.TextBox,
      displayName: 'Service Account Email',
      help: 'Example: terrain@terrain.iam.gserviceaccount.com',
    },
    metrics: {
      type: DisplayType.Custom,
      widthFactor: -1,
      options: {
        render: this.renderMetricsForm,
      },
    },
    dimensions: {
      type: DisplayType.TagsBox,
      displayName: 'Dimensions',
      options: {
        transformValue: (value) => value.map((v) => v.name),
        untransformValue: (value) => value.map((v) => ({ name: v })),
      },
    },
    scopes: {
      type: DisplayType.TagsBox,
      displayName: 'Scopes',
    },
    viewId: {
      type: DisplayType.NumberBox,
      displayName: 'View Id',
      help: 'View Id for a specific analytics dashboard',
    },
  };

  public defaultState = {
    metrics: {},
  };

  public renderMetricsForm(state: GoogleAnalyticsConnectionT, disabled)
  {
    /*
    options: {
    //     transformValue: (value) => value.map((v) => (v.alias as string) + ',' + (v.expression as string)),
    //     untransformValue: (value) => value.map((v) =>
    //     {
    //       const pieces = v != null ? v.split(',') : ['', ''];
    //       return { alias: pieces[0] || '', expression: pieces[1] || '' };
    //     },
    //     ),
    //   },
    */
    return (
      <ObjectForm
        object={state.metrics != null ? state.metrics : []}
        keyName='alias'
        valueName='expression'
        onChange={this.handleMetricsChange}
        label='Metrics'
        onSubmit={this.props.onSubmit}
      />
    );
  }

  public handleMetricsChange(newMetrics, apply?: boolean)
  {
    const options = this.props.integration.connectionConfig as GoogleAnalyticsConnectionT;
    const newFormState: GoogleAnalyticsConnectionT = _.extend({}, options);
    newFormState.metrics = newMetrics;
    this.handleConnectionFormChange(newFormState, apply);
  }
}

type EmailAuthT = AuthConfigType<Integrations.Email>;
type EmailConnectionT = ConnectionConfigType<Integrations.Email>;
class EmailForm extends IntegrationFormBase<EmailAuthT, EmailConnectionT>
{
  public authMap: InputDeclarationMap<EmailAuthT> = {
  };

  public connectionMap: InputDeclarationMap<EmailConnectionT> = {
    customerName: {
      type: DisplayType.TextBox,
      displayName: 'Instance name',
    },
  };
}

type MailChimpAuthT = AuthConfigType<Integrations.MailChimp>;
type MailChimpConnectionT = ConnectionConfigType<Integrations.MailChimp>;
class MailChimpForm extends IntegrationFormBase<MailChimpAuthT, MailChimpConnectionT>
{
  public authMap: InputDeclarationMap<MailChimpAuthT> = {
    apiKey: {
      type: DisplayType.TextBox,
      displayName: 'API Key',
    },
  };

  public connectionMap: InputDeclarationMap<MailChimpConnectionT> = {
    host: {
      type: DisplayType.TextBox,
      displayName: 'Host',
    },
  };
}

type FollowUpBossAuthT = AuthConfigType<Integrations.FollowUpBoss>;
type FollowUpBossConnectionT = ConnectionConfigType<Integrations.FollowUpBoss>;
class FollowUpBossForm extends IntegrationFormBase<FollowUpBossAuthT, FollowUpBossConnectionT>
{
  public authMap: InputDeclarationMap<FollowUpBossAuthT> = {
    apiKey: {
      type: DisplayType.TextBox,
      displayName: 'API Key',
    },
  };

  public connectionMap: InputDeclarationMap<FollowUpBossConnectionT> = {
    host: {
      type: DisplayType.TextBox,
      displayName: 'Host',
    },
  };
}

type FormLookupMap =
  {
    [k in Integrations]: React.ComponentClass<Props>
  };

export const IntegrationFormMap: FormLookupMap =
  {
    [Integrations.Sftp]: SftpForm,
    [Integrations.Http]: HttpForm,
    [Integrations.Fs]: FsForm,
    [Integrations.Email]: EmailForm,
    [Integrations.Mysql]: MysqlForm,
    [Integrations.Postgresql]: PostgresqlForm,
    [Integrations.Magento]: MagentoForm,
    [Integrations.GoogleAnalytics]: GoogleAnalyticsForm,
    [Integrations.FollowUpBoss]: FollowUpBossForm,
    [Integrations.MailChimp]: MailChimpForm,
  };
