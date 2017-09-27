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
import * as _ from 'lodash';
import { _SchemaState } from 'schema/SchemaTypes';
import Ajax from 'util/Ajax';
import AjaxM1 from 'util/AjaxM1';
import BackendInstance from '../../../database/types/BackendInstance';
import * as SchemaTypes from '../SchemaTypes';
import SchemaActionTypes from './SchemaActionTypes';

type SchemaState = SchemaTypes.SchemaState;

const SchemaReducer = {};

SchemaReducer[SchemaActionTypes.fetch] =
  (state: SchemaState) =>
  {
    return state
      .set('loading', true);
  };

SchemaReducer[SchemaActionTypes.serverCount] =
  (
    state: SchemaState,
    action: Action<{
      serverCount: number,
    }>,
  ) =>
    state.set('serverCount', action.payload.serverCount);

SchemaReducer[SchemaActionTypes.setServer] =
  (
    state: SchemaState,
    action: Action<SchemaTypes.SetServerActionPayload>,
  ) =>
  {
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
    // .set('tableNamesByDb', state.tableNamesByDb.set(database.name, tableNames))
    // .set('columnNamesByDb', state.columnNamesByDb.set(database.name, columnNames));
  };

SchemaReducer[SchemaActionTypes.addDbToServer] =
  (
    state: SchemaState,
    action: Action<SchemaTypes.AddDbToServerActionPayload>,
  ) =>
  {
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
    // .set('tableNamesByDb', state.tableNamesByDb.set(database.name, tableNames))
    // .set('columnNamesByDb', state.columnNamesByDb.set(database.name, columnNames));
  };

SchemaReducer[SchemaActionTypes.selectId] =
  (state: SchemaState, action: Action<{ id: ID }>) =>
    state.set('selectedId', action.payload.id);

SchemaReducer[SchemaActionTypes.highlightId] =
  (state: SchemaState, action: Action<{
    id: ID,
    inSearchResults: boolean,
  }>) =>
    state.set('highlightedId', action.payload.id)
      .set('highlightedInSearchResults', action.payload.inSearchResults);

const SchemaReducerWrapper = (state: any = _SchemaState(), action) =>
{
  let nextState = state;
  if (SchemaReducer[action.type])
  {
    nextState = SchemaReducer[action.type](state, action);
  }

  return nextState;
};

export default SchemaReducerWrapper;
