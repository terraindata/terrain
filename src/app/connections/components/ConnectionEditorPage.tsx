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
import { Map } from 'immutable';
import * as React from 'react';

import { backgroundColor } from 'app/colors/Colors';
import Button from 'app/common/components/Button';
import { _ConnectionConfig, ConnectionConfig } from 'app/connections/ConnectionTypes';
import { ConnectionsActions } from 'app/connections/data/ConnectionsRedux';
import Util from 'app/util/Util';
import TerrainComponent from 'common/components/TerrainComponent';
import ConnectionForm from './ConnectionForm';

export interface Props
{
  location?: any;
  match?: {
    params?: {
      connectionId?: number;
    };
  };
  connections?: Map<ID, ConnectionConfig>;
  connectionsActions?: typeof ConnectionsActions;
}

interface State
{
  connection: ConnectionConfig;
}

function getConnectionId(params): number
{
  const asNumber = (params != null && params.connectionId != null) ? Number(params.connectionId) : NaN;
  return Number.isNaN(asNumber) ? -1 : asNumber;
}

class ConnectionEditorPage extends TerrainComponent<Props>
{
  public state: State = {
    connection: _ConnectionConfig({ id: undefined }),
  };

  public componentDidMount()
  {
    const { connections, match } = this.props;
    if (connections.size === 0)
    {
      this.props.connectionsActions({
        actionType: 'getConnections',
      });
    }

    const connectionId = getConnectionId(match.params);
    if (connectionId >= 0)
    {
      this.setState({
        connection: connections.get(connectionId),
      });
    }
  }

  public handleConnectionChange(connection)
  {
    let dsn = '';
    if (connection['user'] && connection['password'])
    {
      dsn += String(connection['user']) + ':' + String(connection['password']) + '@';
    }

    dsn += String(connection['host']);

    if (connection['port'])
    {
      dsn += ':' + String(connection['port']);
    }

    connection['dsn'] = dsn;

    delete connection['user'];
    delete connection['password'];
    delete connection['port'];

    this.setState({
      connection: _ConnectionConfig(connection),
    });
  }

  public save()
  {
    const { connection } = this.state;
    if (connection['id'])
    {
      this.props.connectionsActions({
        actionType: 'updateConnection',
        connection,
      });
    }
    else
    {
      this.props.connectionsActions({
        actionType: 'createConnection',
        connection,
      });
    }
    // Update route to go back
    this.browserHistory.push('/account/connections');
  }

  public cancel()
  {
    // Go back don't save
    this.browserHistory.push('/account/connections');
  }

  public render()
  {
    const { connection } = this.state;
    if (!connection)
    {
      return null;
    }

    return (
      <div
        className='connection-wrapper'
        style={backgroundColor('rgba(255, 255, 255, 0.75)')}
      >
        <div
          className='connection-editor-header'
        >
          Edit Connection
        </div>
        <ConnectionForm
          connection={connection}
          onChange={this.handleConnectionChange}
          onSubmit={this.save}
        />
        <div
          className='connection-buttons'
        >
          <Button
            text={'Cancel'}
            onClick={this.cancel}
            size={'small'}
          />
          <Button
            text={'Save'}
            onClick={this.save}
            size={'small'}
            theme={'active'}
          />
        </div>
      </div>
    );
  }
}

export default Util.createContainer(
  ConnectionEditorPage,
  [
    ['connections', 'connections'],
  ],
  {
    connectionsActions: ConnectionsActions,
  },
);
