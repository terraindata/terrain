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

import * as _ from 'underscore';
import Redux = require('redux');
import {Store} from 'redux';
import * as ReduxActions from 'redux-actions';
import SchemaTypes from '../SchemaTypes';
type SchemaState = SchemaTypes.SchemaState;
import Ajax from './../../util/Ajax';
import ExampleSchemaData from './ExampleSchemaData';
import SchemaActionTypes from './SchemaActionTypes';
import SchemaParser from './SchemaParser';
import SharedTypes from './../../../../shared/SharedTypes';

type Server = SchemaTypes.Server;
type Database = SchemaTypes.Database;
type Table = SchemaTypes.Table;
type Column = SchemaTypes.Column;
type Index = SchemaTypes.Index;

export const SchemaStore: Store<SchemaState> =
  Redux.createStore(ReduxActions.handleActions<SchemaState, any>(
    {
      [SchemaActionTypes.fetch]:
        (state: SchemaState) =>
        {
          Ajax.getDbs(
            (m1Dbs: object, m2Dbs: object) =>
            {
              console.log('m1Dbs:');
              console.log(m1Dbs);
              // Group all m1Dbs under a server e.g. "Other Databases"
              console.log('m2Dbs:');
              console.log(m2Dbs);
              // The m2Dbs are servers, so need to do parsing differently
              return;
              SchemaActions.serverCount(Object.keys(dbs).length);
              _.map((dbs as any),
                (db: SharedTypes.Database) =>
                  (db.source === 'm1' ? Ajax.schema_m1 : Ajax.schema)(
                    db['id'],
                    (colsData, error) =>
                    {
                      if (!error)
                      {
                        if (db['type'] === 'mysql')
                        {
                          SchemaParser.parseMySQLDb(db, colsData, SchemaActions.setDatabase);
                        }
                        else if (db['type'] === 'elastic')
                        {
                          SchemaParser.parseElasticDb(db, colsData, SchemaActions.setDatabase);
                        }
                      }
                    },
                    (error) =>
                    {
                      // TODO consider handling individual DB errors
                    }),
              );
            },
            (dbError) =>
            {
              SchemaActions.error(JSON.stringify(dbError));
            },
          );

          return state
            .set('loading', true);
        },

      [SchemaActionTypes.serverCount]:
        (
          state: SchemaState,
          action: Action<{
            serverCount: number,
          }>,
        ) =>
          state.set('serverCount', action.payload.serverCount),

      [SchemaActionTypes.setServer]:
        (
          state: SchemaState,
          action: Action<SchemaTypes.SetServerActionPayload>,
        ) => {
          const {server, databases, tables, columns, indexes, tableNames, columnNames} = action.payload;
          if (state.servers.size === state.serverCount - 1)
          {
            state = state.set('loading', false).set('loaded', true);
          }

          return state
            .setIn(['servers', server.id], server)
            .set('databases', state.databases.merge(databases)
            .set('tables', state.tables.merge(tables))
            .set('columns', state.columns.merge(columns))
            .set('indexes', state.indexes.merge(indexes))
            .set('tableNamesByDb', state.tableNamesByDb.set(database.name, tableNames))
            .set('columnNamesByDb', state.columnNamesByDb.set(database.name, columnNames));
        },

      [SchemaActionTypes.selectId]:
        (state: SchemaState, action: Action<{ id: ID }>) =>
          state.set('selectedId', action.payload.id),

      [SchemaActionTypes.highlightId]:
        (state: SchemaState, action: Action<{
          id: ID,
          inSearchResults: boolean,
        }>) =>
          state.set('highlightedId', action.payload.id)
            .set('highlightedInSearchResults', action.payload.inSearchResults),
    },
    DEV ? ExampleSchemaData : SchemaTypes._SchemaState(),
  ), DEV ? ExampleSchemaData : SchemaTypes._SchemaState());

const $ = (type: string, payload: any) => SchemaStore.dispatch({type, payload});

export const SchemaActions =
  {
    fetch:
      () =>
        $(SchemaActionTypes.fetch, {} ),

    dbCount:
      (dbCount: number) =>
        $(SchemaActionTypes.serverCount, { serverCount }),

    error:
      (error: string) =>
        $(SchemaActionTypes.error, { error }),

    setDatabase:
      (
        payload: SchemaTypes.SetServerActionPayload,
      ) =>
        $(SchemaActionTypes.setServer, payload),

    highlightId:
      (id: ID, inSearchResults: boolean) =>
        $(SchemaActionTypes.highlightId, {
          id,
          inSearchResults,
        }),

    selectId:
      (id: ID) =>
        $(SchemaActionTypes.selectId, {
          id,
        }),

  };

export default SchemaStore;
