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
import SchemaTypes from '../SchemaTypes';

let servers = Immutable.Map({});
let databases = Immutable.Map({});
let tables = Immutable.Map({});
let columns = Immutable.Map({});

['Example Database Server'].map(
  (serverName) => {
    let server = SchemaTypes._Server({name: serverName});

    ['movieDB', 'baseballDB'].map(
      (dbName) => {
        let db = SchemaTypes._Database({name: dbName, serverId: server.id});
        server = server.set('databaseIds', server.databaseIds.push(db.id));

        ['movies', 'actors', 'reviews', 'characters', 'users'].map(
          (tableName) => {
            let table = SchemaTypes._Table({name: tableName, serverId: server.id, databaseId: db.id});
            db = db.set('tableIds', db.tableIds.push(table.id));

            ['first', 'second', 'third', 'fourth', 'fifth'].map(
              (colName) => {
                const column = SchemaTypes._Column({
                  name: colName,
                  tableId: table.id,
                  databaseId: db.id,
                  serverId: server.id,
                  datatype: 'VARCHAR',
                  isNullable: true,
                  defaultValue: '',
                  isPrimaryKey: false,
                });

                columns = columns.set(column.id, column);

                table = table.set('columnIds', table.columnIds.push(column.id));
              },
            );

            tables = tables.set(table.id, table);
          },
        );

        databases = databases.set(db.id, db);
      },
    );

    servers = servers.set(server.id, server);
  },
);

const ExampleSchemaData =
  SchemaTypes._SchemaState()
    .set('servers', servers)
    .set('databases', databases)
    .set('columns', columns)
    .set('tables', tables)
    .set('loading', false)
    .set('loaded', true);

export default ExampleSchemaData;
