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

import FadeInOut from 'common/components/FadeInOut';
import Switch from 'common/components/Switch';
import { tooltip } from 'common/components/tooltip/Tooltips';
import { SchemaState } from 'schema/SchemaTypes';
import Util from 'util/Util';
import BackendInstance from '../../../database/types/BackendInstance';
import AuthStore from '../../auth/data/AuthStore';
import CreateItem from '../../common/components/CreateItem';
import Dropdown from '../../common/components/Dropdown';
import InfoArea from '../../common/components/InfoArea';
import Modal from '../../common/components/Modal';
import TerrainComponent from '../../common/components/TerrainComponent';
import Ajax from '../../util/Ajax';
import UserActions from '../data/UserActions';
import UserStore from '../data/UserStore';
import * as UserTypes from '../UserTypes';

const CloseIcon = require('../../../images/icon_close_8x8.svg');

import './Connections.less';

interface Server extends BackendInstance
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
  schema: SchemaState;
}

class Connections extends TerrainComponent<Props>
{
  public state: {
    typeIndex: number,
    loading: boolean,
    servers: Server[],
    expanded: Map<number, boolean>,
    addingConnection: boolean,
    errorModalOpen: boolean,
    errorModalMessage: string,
    analyticsEnabled: number,
  } = {
    typeIndex: 0,
    loading: true,
    servers: null,
    expanded: Map<number, boolean>(),
    addingConnection: false,
    errorModalOpen: false,
    errorModalMessage: '',
    analyticsEnabled: 0,
  };

  public xhr: XMLHttpRequest = null;
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
      'database',
      {},
      (servers: Server[]) =>
      {
        if (servers)
        {
          this.setState({
            servers,
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
    this.xhr && this.xhr.abort();
    this.xhr = null;
  }

  public componentWillReceiveProps(nextProps)
  {
    this.fetchConnections();
  }

  public updateState()
  {
    const { schema: state } = this.props;
    this.setState({
      servers: state.servers,
      loading: state.loading,
    });
  }

  public expandConnection(id: number)
  {
    const { expanded } = this.state;
    this.setState({
      expanded: expanded.set(id, !expanded.get(id)),
    });
  }

  public removeConnection(id: number)
  {
    Ajax.deleteDb(id, this.fetchConnections, (error) =>
    {
      this.setState({
        errorModalMessage: 'Error deleting connection: ' + JSON.stringify(error),
        errorModalOpen: true,
      });
    },
    );
  }

  public renderConnectionInfo(server: Server)
  {
    if (this.state.expanded.get(server.id as number))
    {
      return (
        <div className='connections-item-info'>
          <div className='connections-item-info-row'>
            Type:
            <div className='connections-item-info-value'>
              {
                server.type
              }
            </div>
          </div>
          <div className='connections-item-info-row'>
            Address:
            <div className='connections-item-info-value'>
              {
                server.host
              }
            </div>
          </div>
          {server.isAnalytics ?
            (<div>
              <div className='connections-item-info-row'>
                Analytics Index:
                  <div className='connections-item-info-value'>
                  {
                    server.analyticsIndex
                  }
                </div>
              </div>
              <div className='connections-item-info-row'>
                Analytics Type:
                  <div className='connections-item-info-value'>
                  {
                    server.analyticsType
                  }
                </div>
              </div>
            </div>) : null
          }
        </div>
      );
    }
  }

  public renderServer(server: Server)
  {
    const connInfo = this.renderConnectionInfo(server);
    const id: number = server.id as number;
    const connected: boolean = server.status === 'CONNECTED';
    return (
      <div key={server.id}>
        <div className='connections-row'>
          <div
            className='connections-items'
            onClick={this._fn(this.expandConnection, id)}>
            <div className='connections-id'>
              {
                server.id
              }
            </div>
            <div className='connections-name'>
              {
                server.name
              }
            </div>
            <div className='connections-status'>
              <div className={classNames({
                connected,
                disconnected: !connected,
              })}>
                {
                  connected ? 'CONNECTED' : 'DISCONNECTED'
                }
              </div>
            </div>
          </div>
          {
            tooltip(
              <div
                className='connections-remove'
                onClick={this._fn(this.removeConnection, id)}
              >
                <CloseIcon />
              </div>,
              'Remove',
            )
          }
        </div>
        {
          connInfo
        }
      </div>
    );
  }

  public createConnection()
  {
    const name: string = this.refs['name']['value'];
    const address: string = this.refs['address']['value'];
    const type = this.ConnectionTypes.get(this.state.typeIndex);
    const { analyticsEnabled } = this.state;
    const isAnalytics = analyticsEnabled === 1;
    const analyticsIndex = this.analyticsIndex !== undefined ?
      this.analyticsIndex.value : null;
    const analyticsType = this.analyticsType !== undefined ?
      this.analyticsType.value : null;

    if (!name.length)
    {
      this.setState({
        errorModalMessage: 'Connection name is required.',
        errorModalOpen: true,
      });
      return;
    }

    if (!address.length)
    {
      this.setState({
        errorModalMessage: 'Server address is required.',
        errorModalOpen: true,
      });
      return;
    }

    this.refs['name']['value'] = '';
    this.refs['address']['value'] = '';
    this.setState({
      addingConnection: false,
    });

    Ajax.createDb(
      name,
      address,
      type,
      isAnalytics,
      analyticsIndex,
      analyticsType,
      this.fetchConnections,
      (error) =>
      {
        this.setState({
          errorModalMessage: 'Error creating connection: ' + JSON.stringify(error),
          errorModalOpen: true,
        });
      },
    );
  }

  public handleTypeChange(index: number)
  {
    this.setState({
      typeIndex: index,
    });

    const type = this.ConnectionTypes.get(index);
    UserActions.changeType(type);
  }

  public renderAddConnection()
  {
    const userId = AuthStore.getState().id;
    const user = UserStore.getState().getIn(['users', userId]) as UserTypes.User;

    if (user && user.isSuperUser)
    {
      if (this.state.addingConnection)
      {
        return (
          <div className='create-server'>
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
                    className='create-server-dropdown'
                  />
                </div>
              </div>
              <div className='flex-grow'>
                <b>Connection Name</b>
                <div>
                  <input
                    ref='name'
                    placeholder='Connection Name'
                  />
                </div>
              </div>
              <div className='flex-grow'>
                <b>Server Address</b>
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
    const { servers, loading } = this.state;

    return (
      <div>
        <div className='connections'>
          <div className='connections-page-title'>
            Database Connections
          </div>
          {
            loading &&
            <InfoArea large='Loading...' />
          }
          {servers && servers.map(this.renderServer)}
          {this.renderAddConnection()}
        </div>
        <Modal
          message={this.state.errorModalMessage}
          onClose={this.toggleErrorModal}
          open={this.state.errorModalOpen}
          error={true}
        />
      </div>
    );
  }
}

export default Util.createContainer(
  Connections,
  ['schema'],
  {},
);
