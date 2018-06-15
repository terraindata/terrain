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

import { Map } from 'immutable';

import { ConstrainedMap, GetType, TerrainRedux, Unroll } from 'app/store/TerrainRedux';
import { ModalProps, MultiModal } from 'common/components/overlay/MultiModal';
import
{
  _ConnectionConfig,
  _ConnectionState,
  ConnectionConfig,
  ConnectionState,
} from 'shared/types/connections/ConnectionTypes';
import ConnectionsApi from '../ConnectionsApi';

import Util from 'util/Util';
import XHR from 'util/XHR';

export interface ConnectionsActionTypes
{
  addModal: {
    actionType: 'addModal';
    props: ModalProps;
  };
  setModalRequests: {
    actionType: 'setModalRequests';
    requests: List<ModalProps>;
  };

  getConnections?: {
    actionType: 'getConnections';
  };
  getConnectionsStart: {
    actionType: 'getConnectionsStart';
  };
  getConnectionsSuccess: {
    actionType: 'getConnectionsSuccess';
    connections: ConnectionConfig[];
  };
  getConnectionsFailed: {
    actionType: 'getConnectionsFailed';
    error: string;
  };

  createConnection?: {
    actionType: 'createConnection';
    connection: any;
  };
  createConnectionstart: {
    actionType: 'createConnectionstart';
  };
  createConnectionsuccess: {
    actionType: 'createConnectionsuccess';
    connection: ConnectionConfig;
  };
  createConnectionFailed: {
    actionType: 'createConnectionFailed';
    error: string;
  };

  updateConnection?: {
    actionType: 'updateConnection';
    connection: any;
  };
  updateConnectionstart: {
    actionType: 'updateConnectionstart';
  };
  updateConnectionsuccess: {
    actionType: 'updateConnectionsuccess';
    connection: ConnectionConfig;
  };
  updateConnectionFailed: {
    actionType: 'updateConnectionFailed';
    error: string;
  };

  deleteConnection?: {
    actionType: 'deleteConnection';
    connectionId: ID;
  };
  deleteConnectionstart: {
    actionType: 'deleteConnectionstart';
  };
  deleteConnectionsuccess: {
    actionType: 'deleteConnectionsuccess';
    connectionId: ID;
  };
  deleteConnectionFailed: {
    actionType: 'deleteConnectionFailed';
    error: string;
  };
}

class ConnectionsRedux extends TerrainRedux<ConnectionsActionTypes, ConnectionState>
{
  public namespace: string = 'connections';
  public api: ConnectionsApi = new ConnectionsApi(XHR.getInstance());

  public reducers: ConstrainedMap<ConnectionsActionTypes, ConnectionState> =
    {
      addModal: (state, action) =>
      {
        return state.set('modalRequests',
          MultiModal.addRequest(state.modalRequests, action.payload.props));
      },

      setModalRequests: (state, action) =>
      {
        return state.set('modalRequests', action.payload.requests);
      },

      getConnectionsStart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      getConnectionsSuccess: (state, action) =>
      {
        const connections: Map<ID, ConnectionConfig> = Util.arrayToImmutableMap(
          action.payload.connections,
          'id',
          _ConnectionConfig,
        );

        return state
          .set('loading', false)
          .set('connections', connections);
      },

      getConnectionsFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },

      createConnectionstart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      createConnectionsuccess: (state, action) =>
      {
        const { connection } = action.payload;
        return state
          .set('loading', false)
          .setIn(['connections', connection.id], _ConnectionConfig(connection));
      },

      createConnectionFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },

      updateConnectionstart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      updateConnectionsuccess: (state, action) =>
      {
        const { connection } = action.payload;
        return state
          .set('loading', false)
          .setIn(['connections', connection.id], _ConnectionConfig(connection));
      },

      updateConnectionFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },

      deleteConnectionstart: (state, action) =>
      {
        return state
          .set('loading', true);
      },

      deleteConnectionsuccess: (state, action) =>
      {
        const { connectionId } = action.payload;
        return state
          .set('loading', false)
          .deleteIn(['connections', connectionId]);
      },

      deleteConnectionFailed: (state, action) =>
      {
        return state
          .set('loading', false)
          .set('error', action.payload.error);
      },
    };

  public getConnections(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'getConnectionsStart',
    });

    return this.api.getConnections()
      .then((response) =>
      {
        const connections = response.data;

        directDispatch({
          actionType: 'getConnectionsSuccess',
          connections,
        });

        return Promise.resolve(connections);
      });
  }

  public createConnection(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'createConnectionstart',
    });

    return this.api.createConnection(action.connection)
      .then((response) =>
      {
        const connection: ConnectionConfig = response.data[0];
        directDispatch({
          actionType: 'createConnectionsuccess',
          connection,
        });

        return Promise.resolve(connection);
      });
  }

  public updateConnection(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'updateConnectionstart',
    });

    const { connection: connectionChanges } = action;

    return this.api.updateConnection(connectionChanges.id, connectionChanges)
      .then((response) =>
      {
        const connection: ConnectionConfig = response.data[0];
        directDispatch({
          actionType: 'updateConnectionsuccess',
          connection,
        });

        return Promise.resolve(connection);
      });
  }

  public deleteConnection(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'deleteConnectionstart',
    });

    return this.api.deleteConnection(action.connectionId)
      .then((response) =>
      {
        const connection: ConnectionConfig = response.data[0];
        directDispatch({
          actionType: 'deleteConnectionsuccess',
          connectionId: action.connectionId,
        });

        return Promise.resolve(connection);
      });
  }

  public overrideAct(action: Unroll<ConnectionsActionTypes>)
  {
    const asyncActions = [
      'getConnections',
      'createConnection',
      'updateConnection',
      'deleteConnection',
    ];

    if (asyncActions.indexOf(action.actionType) > -1)
    {
      return this[action.actionType].bind(this, action);
    }
  }
}

const ReduxInstance = new ConnectionsRedux();
export const ConnectionsActions = ReduxInstance._actionsForExport();
export const ConnectionsReducers = ReduxInstance._reducersForExport(_ConnectionState);
export const ConnectionsActionTypes = ReduxInstance._actionTypesForExport();
export declare type ConnectionsActionType<K extends keyof ConnectionsActionTypes> = GetType<K, ConnectionsActionTypes>;
