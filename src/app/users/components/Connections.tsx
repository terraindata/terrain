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

// tslint:disable:no-var-requires strict-boolean-expressions no-unused-expression

import * as classNames from 'classnames';
import { List, Map } from 'immutable';
import * as React from 'react';

import TerrainTools from 'app/util/TerrainTools';
import { AuthState } from 'auth/AuthTypes';
import { Colors, fontColor } from 'colors/Colors';
import Badge from 'common/components/Badge';
import FadeInOut from 'common/components/FadeInOut';
import Switch from 'common/components/Switch';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { SchemaState } from 'schema/SchemaTypes';
import Util from 'util/Util';
import BackendInstance from '../../../database/types/BackendInstance';
import CreateItem from '../../common/components/CreateItem';
import Dropdown from '../../common/components/Dropdown';
import InfoArea from '../../common/components/InfoArea';
import Modal from '../../common/components/Modal';
import TerrainComponent, { browserHistory } from '../../common/components/TerrainComponent';
import { HeaderConfig, HeaderConfigItem, ItemList } from '../../etl/common/components/ItemList';
import Ajax, { AjaxResponse } from '../../util/Ajax';
import { UserActions } from '../data/UserRedux';
import * as UserTypes from '../UserTypes';

const CheckIcon = require('../../../images/icon_checkMark.svg');
const CloseIcon = require('../../../images/icon_close_8x8.svg');

import './Connections.less';

export interface Connection extends BackendInstance
{
  host: string;
  status: string;
  isAnalytics: boolean;
  analyticsIndex: string;
  analyticsType: string;
}

export interface Props
{
  params?: any;
  history?: any;
  children?: any;
  // injected props
  schema?: SchemaState;
  auth?: AuthState;
  users?: UserTypes.UserState;
  userActions?: typeof UserActions;
}

export interface State
{
  typeIndex: number;
  loading: boolean;
  connections: Connection[];
  addingConnection: boolean;
  errorModalOpen: boolean;
  errorModalMessage: string;
  analyticsEnabled: number;
}

class Connections extends TerrainComponent<Props>
{
  public state: State = {
    typeIndex: 0,
    loading: true,
    connections: null,
    addingConnection: false,
    errorModalOpen: false,
    errorModalMessage: '',
    analyticsEnabled: 0,
  };

  public xhr: AjaxResponse = null;
  public analyticsIndex: any = null;
  public analyticsType: any = null;

  public ConnectionTypes = List(
    [
      'elastic',
      'mysql',
    ],
  );

  constructor(props: Props)
  {
    super(props);
  }

  public fetchConnections()
  {
    this.xhr = Ajax.req(
      'get',
      'database/status',
      {},
      (connections: Connection[]) =>
      {
        if (connections)
        {
          this.setState({
            connections,
            loading: false,
          });
        }
      });
  }

  public componentWillMount()
  {
    this.fetchConnections();
  }

  public componentWillUnmount()
  {
    this.xhr && this.xhr.cancel();
    this.xhr = null;
  }

  public removeConnection(id: number, e?)
  {
    if (e !== undefined)
    {
      e.stopPropagation();
    }

    Ajax.deleteDb(id, this.fetchConnections, (error) =>
    {
      this.setState({
        errorModalMessage: 'Error deleting connection: ' + JSON.stringify(error),
        errorModalOpen: true,
      });
    },
    );
  }

  public handleRowClick(index: number)
  {
    const connections = this.state.connections;
    const connection = connections[index];
    browserHistory.push(`/account/connections/connectionId=${connection.id}`)
  }

  public createConnection()
  {
    this.props.userActions({
      actionType: 'createConnection',
      connection: { id: undefined } as Connection,
    });

    // Ajax.createDb(
    //   name,
    //   address,
    //   type,
    //   isAnalytics,
    //   analyticsIndex,
    //   analyticsType,
    //   this.fetchConnections,
    //   (error) =>
    //   {
    //     this.setState({
    //       errorModalMessage: 'Error creating connection: ' + JSON.stringify(error),
    //       errorModalOpen: true,
    //     });
    //   },
    // );
  }

  public handleTypeChange(index: number)
  {
    this.setState({
      typeIndex: index,
    });

    const type = this.ConnectionTypes.get(index);
  }

  public renderAddConnection()
  {
    const userId = this.props.auth.id;
    const user = this.props.users.users.get(userId) as UserTypes.User;

    if (user && user.isSuperUser)
    {
      if (this.state.addingConnection)
      {
        return (
          <div className='create-connection'>
            <h3>Add a new connection</h3>
            <div className='flex-container'>
              <div className='flex-grow'>
                <b>Connection Type</b>
                <div>
                  <Dropdown
                    selectedIndex={this.state.typeIndex}
                    options={this.ConnectionTypes}
                    onChange={this.handleTypeChange}
                    canEdit={true}
                    className='create-connection-dropdown'
                  />
                </div>
              </div>
              <div className='flex-grow'>
                <b>Name</b>
                <div>
                  <input
                    ref='name'
                    placeholder='Connection Name'
                  />
                </div>
              </div>
              <div className='flex-grow'>
                <b>Address</b>
                <div>
                  <input
                    ref='address'
                    placeholder='Connection Address (DSN)'
                  />
                </div>
              </div>
            </div>
            {this.renderAnalyticsConnection()}
            <div className='button' onClick={this.createConnection}>
              Create
            </div>
            <div className='button' onClick={this._toggle('addingConnection')}>
              Cancel
            </div>
          </div>
        );
      }

      return (
        <CreateItem
          name='New Connection'
          onCreate={this._toggle('addingConnection')}
        />
      );
    }
    return null;
  }

  public renderAnalyticsConnection()
  {
    const { analyticsEnabled } = this.state;

    return (
      <div className='connections-analytics flex-container'>
        <div className='left-column flex-grow'>
          <h4>Set Analytics Index and Type</h4>
          <Switch
            medium={true}
            first='On'
            second='Off'
            selected={analyticsEnabled}
            onChange={this.handleAnalyticsSwitch}
          />
        </div>
        <div className='right-column flex-grow'>
          <FadeInOut open={analyticsEnabled === 1}>
            <div className='flex-grow'>
              <b>Index</b>
              <div>
                <input
                  ref={(input) => this.analyticsIndex = input}
                  placeholder='Index'
                />
              </div>
            </div>
            <div className='flex-grow'>
              <b>Type</b>
              <div>
                <input
                  ref={(input) => this.analyticsType = input}
                  placeholder='Type'
                />
              </div>
            </div>
          </FadeInOut>
        </div>
      </div>
    );
  }

  public getConnectionActions(index: number, connection: Connection)
  {
    return (
      <CloseIcon
        className='close'
        onClick={this._fn(this.removeConnection, connection.id)}
      />
    );
  }

  public getStatusColor(status: string)
  {
    return Colors().connectionStatuses[status];
  }

  public renderProperty(propertyName, item: Connection, index: number)
  {
    if (propertyName === 'status')
    {
      return (
        <Badge
            label={item[propertyName]}
            color={this.getStatusColor(item[propertyName])}
        />
      );
    }
    else if (propertyName === 'analytics')
    {
      if (item['isAnalytics'])
      {
        return (
          <div
            className='connections-analytics-status'
            style={fontColor(Colors().success)}
          >
            <CheckIcon />
          </div>
        );
      }
    }
    else
    {
      return (
        <div>
          { item[propertyName] }
        </div>
      );
    }

  }

  public toggleErrorModal()
  {
    this.setState({
      errorModalOpen: !this.state.errorModalOpen,
    });
  }

  public handleAnalyticsSwitch(selected)
  {
    this.setState((state) =>
    {
      return { analyticsEnabled: selected };
    });
  }

  public render()
  {
    const { connections, loading } = this.state;

    return (
      <div
        className='connections-page'
      >
        <div
          className='connection-list-wrapper'
        >
          <ItemList
            items={List(connections)}
            columnConfig={[
              {
                name: 'id',
                render: this._fn(this.renderProperty, 'id'),
                style: { width: `5%` },
              },
              {
                name: 'name',
                render: this._fn(this.renderProperty, 'name'),
                style: { width: `30%` },
              },
              {
                name: 'type',
                render: this._fn(this.renderProperty, 'type'),
                style: { width: `10%` },
              },
              {
                name: 'host',
                render: this._fn(this.renderProperty, 'host'),
                style: { width: `30%` },
              },
              {
                name: 'analytics',
                render: this._fn(this.renderProperty, 'analytics'),
              },
              {
                name: 'status',
                render: this._fn(this.renderProperty, 'status'),
                style: { width: `25%` },
              },
            ]}
            onRowClicked={this.handleRowClick}
            getActions={this.getConnectionActions}
            itemsName='connection'
            canCreate={TerrainTools.isAdmin()}
            onCreate={this.createConnection}
          />
        </div>
      </div>
    );
  }
}

const ConnectionList = Util.createTypedContainer(
  Connections,
  ['auth', 'schema', 'users'],
  { userActions: UserActions },
);

export default ConnectionList;
