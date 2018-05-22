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
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
import * as Radium from 'radium';
import * as React from 'react';
import { backgroundColor, borderColor, Colors, fontColor, getStyle } from 'src/app/colors/Colors';
import Util from 'util/Util';

import { DynamicForm } from 'common/components/DynamicForm';
import { DisplayState, DisplayType, InputDeclarationMap } from 'common/components/DynamicFormTypes';
import { instanceFnDecorator } from 'shared/util/Classes';

import { _IntegrationConfig, IntegrationConfig } from 'shared/etl/immutable/IntegrationRecords';
import { AuthConfigType, ConnectionConfigType, Integrations } from 'shared/etl/types/IntegrationTypes';
const { List } = Immutable;

export interface Props
{
  integration: IntegrationConfig;
  onChange: (newIntegration: IntegrationConfig) => void;
  debounceAll?: boolean;
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
          debounceAll={this.props.debounceAll}
        />
        <DynamicForm
          inputMap={this.connectionMap}
          inputState={connectionState}
          onStateChange={this.handleConnectionFormChange}
          debounceAll={this.props.debounceAll}
        />
      </div>
    );
  }

  private handleAuthFormChange(state: AuthState)
  {
    const { onChange, integration } = this.props;
    const newConfig = this.authStateToConfig(state);
    onChange(integration.set('authConfig', newConfig));
  }

  private handleConnectionFormChange(state: ConnectionState)
  {
    const { onChange, integration } = this.props;
    const newConfig = this.connectionStateToConfig(state);
    onChange(integration.set('connectionConfig', newConfig));
  }
}

type SftpAuthT = AuthConfigType<Integrations.Sftp>;
type SftpConnectionT = ConnectionConfigType<Integrations.Sftp>;
class SftpForm extends IntegrationFormBase<SftpAuthT, SftpConnectionT>
{
  public authMap: InputDeclarationMap<SftpAuthT> = {
    key: {
      type: DisplayType.TextBox,
      displayName: 'Private Key',
    },
  };

  public connectionMap: InputDeclarationMap<SftpConnectionT> = {
    ip: {
      type: DisplayType.TextBox,
      displayName: 'IP Address',
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
}

type HttpAuthT = AuthConfigType<Integrations.Http>;
type HttpConnectionT = ConnectionConfigType<Integrations.Http>;
class HttpForm extends IntegrationFormBase<HttpAuthT, HttpConnectionT>
{
  public authMap: InputDeclarationMap<HttpAuthT> = {
    jwt: {
      type: DisplayType.TextBox,
      displayName: 'JSON Web Token',
    },
  };

  public connectionMap: InputDeclarationMap<HttpConnectionT> = {
    url: {
      type: DisplayType.TextBox,
      displayName: 'Url',
    },
  };
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
      displayName: 'Private Key',
    },
  };

  public connectionMap: InputDeclarationMap<GoogleAnalyticsConnectionT> = {
    email: {
      type: DisplayType.TextBox,
      displayName: 'Email',
    },
    metrics: {
      type: DisplayType.TagsBox,
      displayName: 'Metrics',
      options: {
        transformValue: (value) => value.map((v) => (v.alias as string) + ',' + (v.expression as string)),
        untransformValue: (value) => value.map((v) =>
        {
          const pieces = v != null ? v.split(',') : ['', ''];
          return { alias: pieces[0] || '', expression: pieces[1] || '' };
        },
        ),
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
    },
  };
}

type EmailAuthT = AuthConfigType<Integrations.Email>;
type EmailConnectionT = ConnectionConfigType<Integrations.Email>;
class EmailForm extends IntegrationFormBase<EmailAuthT, EmailConnectionT>
{
  public authMap: InputDeclarationMap<EmailAuthT> = {
    password: {
      type: DisplayType.TextBox,
      displayName: 'Password',
    },
  };

  public connectionMap: InputDeclarationMap<EmailConnectionT> = {
    email: {
      type: DisplayType.TextBox,
      displayName: 'Email',
    },
    smtp: {
      type: DisplayType.TextBox,
      displayName: 'SMTP Server',
      group: 'addr row',
      widthFactor: 3,
    },
    port: {
      type: DisplayType.NumberBox,
      displayName: 'Port',
      group: 'addr row',
      widthFactor: 1,
    },
    recipient: {
      type: DisplayType.TextBox,
      displayName: 'To',
    },
    customerName: {
      type: DisplayType.TextBox,
      displayName: 'Instance name',
    },
  };
}

type MailchimpAuthT = AuthConfigType<Integrations.Mailchimp>;
type MailchimpConnectionT = ConnectionConfigType<Integrations.Mailchimp>;
class MailchimpForm extends IntegrationFormBase<MailchimpAuthT, MailchimpConnectionT>
{
  public authMap: InputDeclarationMap<MailchimpAuthT> = {
    apiKey: {
      type: DisplayType.TextBox,
      displayName: 'API Key',
    },
  };

  public connectionMap: InputDeclarationMap<MailchimpConnectionT> = {
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
    [Integrations.Mailchimp]: MailchimpForm,
  };
