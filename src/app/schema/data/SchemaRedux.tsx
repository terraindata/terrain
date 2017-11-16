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

import * as Immutable from 'immutable';

import { _SchemaState, Column, Database, FieldProperty, Index, SchemaState, Server, Table } from 'schema/SchemaTypes';
import { ActPayload, AllActionsType, ConstrainedMap, TerrainRedux, Unroll } from 'src/app/store/TerrainRedux';
const { List, Map } = Immutable;

export interface SchemaActionTypes extends AllActionsType<SchemaActionTypes>
{
  fetch: {
    actionType: 'fetch';
  };
  setServer: {
    actionType: 'setServer';
    server: Server;
    databases: IMMap<string, Database>;
    tables: IMMap<string, Table>;
    columns: IMMap<string, Column>;
    indexes: IMMap<string, Index>;
    fieldProperties: IMMap<string, FieldProperty>;
    columnNames: IMMap<string, List<string>>;
    tableNames: List<string>;
  };
  addDbToServer: {
    actionType: 'addDbToServer';
    server: Server;
    databases: IMMap<string, Database>;
    tables: IMMap<string, Table>;
    columns: IMMap<string, Column>;
    indexes: IMMap<string, Index>;
    fieldProperties: IMMap<string, FieldProperty>;
    columnNames: IMMap<string, List<string>>;
    tableNames: List<string>;
  };
  error: {
    actionType: 'error';
    error: string;
  };
  serverCount: {
    actionType: 'serverCount';
    serverCount: number;
  };
  highlightId: {
    actionType: 'highlightId';
    id: ID;
    inSearchResults: boolean;
  };
  selectId: {
    actionType: 'selectId';
    id: ID;
  };
}

class SchemaRedux extends TerrainRedux<SchemaActionTypes, SchemaState>
{
  public reducers: ConstrainedMap<SchemaActionTypes, SchemaState> =
  {
    fetch: (state, action) => {
      return state
        .set('loading', true);
    },

    setServer: (state, action) => {
      const { server, databases, tables, columns, indexes, fieldProperties, tableNames, columnNames } = action.payload;
      if (state.servers.size === state.serverCount - 1)
      {
        state = state.set('loading', false).set('loaded', true);
      }

      return state
        .setIn(['servers', server.id], server)
        .set('databases', state.databases.merge(databases))
        .set('tables', state.tables.merge(tables))
        .set('columns', state.columns.merge(columns))
        .set('indexes', state.indexes.merge(indexes))
        .set('fieldProperties', state.fieldProperties.merge(fieldProperties));
    },

    addDbToServer: (state, action) => {
      const { server, databases, tables, columns, indexes, fieldProperties, tableNames, columnNames } = action.payload;

      let newServer = server;
      if (state.servers.get(server.id) !== undefined)
      {
        newServer = state.servers.get(server.id).set('databaseIds',
          state.servers.get(server.id).databaseIds.concat(server.databaseIds),
        );
      }

      return state
        .setIn(['servers', server.id], newServer)
        .set('databases', state.databases.merge(databases))
        .set('tables', state.tables.merge(tables))
        .set('columns', state.columns.merge(columns))
        .set('indexes', state.indexes.merge(indexes))
        .set('fieldProperties', state.fieldProperties.merge(fieldProperties));
    },

    error: (state, action) => {
      return state; // this does not do anything
    },

    serverCount: (state, action) => {
      return state;
    },

    highlightId: (state, action) => {
      return state;
    },

    selectId: (state, action) => {
      return state;
    },
  }

  public fetchAction(dispatch)
  {
    return undefined;
  }

  public overrideAct(action: Unroll<SchemaActionTypes>)
  {
    if (action.actionType === 'fetch')
    {
      return this.fetchAction;
    }
  }
}

export const placeholder = 'hi';
console.log('hello');
