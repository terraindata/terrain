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

// tslint:disable:strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import BackendInstance from '../../../database/types/BackendInstance';
import * as SchemaTypes from '../SchemaTypes';
const { Map, List } = Immutable;

type Server = SchemaTypes.Server;
type Database = SchemaTypes.Database;
type Table = SchemaTypes.Table;
type Column = SchemaTypes.Column;
type Index = SchemaTypes.Index;

export function parseMySQLDbs_m1(db: BackendInstance,
  colsData: object,
  addDbToServerAction: (payload: SchemaTypes.AddDbToServerActionPayload) => void)
{
  let server: Server = SchemaTypes._Server({
    name: 'Other MySQL Databases',
    connectionId: -1,
  });
  const serverId = server.id;

  let databases: IMMap<string, Database> = Map<string, Database>({});

  let database = SchemaTypes._Database({
    name: db['name'],
    serverId: serverId as string,
  });
  const databaseId = database.id;
  server = server.set('databaseIds', server.databaseIds.push(databaseId));

  let tables: IMMap<string, Table> = Map<string, Table>({});
  let columns: IMMap<string, Column> = Map<string, Column>({});
  const indexes: IMMap<string, Index> = Map<string, Index>({});

  let tableNames = List<string>([]);
  let columnNamesByTable = Map<string, List<string>>([]);

  _.map((colsData as any),
    (col: {
      TABLE_CATALOG: string,
      TABLE_SCHEMA: string,
      TABLE_NAME: string,
      COLUMN_NAME: string,
      ORDINAL_POSITION: number,
      COLUMN_DEFAULT: string,
      IS_NULLABLE: string,
      DATA_TYPE: string,
      CHARACTER_MAXIMUM_LENGTH: number,
      CHARACTER_OCTET_LENGTH: number,
      NUMERIC_PRECISION: number,
      NUMERIC_SCALE: number,
      DATETIME_PRECISION: number,
      CHARACTER_SET_NAME: string,
      COLLATION_NAME: string,
      COLUMN_TYPE: string,
      COLUMN_KEY: string,
      EXTRA: string,
      PRIVILEGES: string,
      COLUMN_COMMENT: string,
      GENERATION_EXPRESSION: string,
    }) =>
    {
      const tableId = SchemaTypes.tableId(serverId, db['name'], col.TABLE_NAME);
      let table = tables.get(tableId);

      if (!table)
      {
        table = SchemaTypes._Table({
          name: col.TABLE_NAME,
          serverId,
          databaseId,
        });
        tables = tables.set(tableId, table);
        tableNames = tableNames.push(table.name);
        database = database.set(
          'tableIds', database.tableIds.push(tableId),
        );
      }

      const column = SchemaTypes._Column({
        name: col.COLUMN_NAME,
        serverId,
        databaseId,
        tableId,
        defaultValue: col.COLUMN_DEFAULT,
        datatype: col.DATA_TYPE,
        isNullable: col.IS_NULLABLE === 'YES',
        isPrimaryKey: col.COLUMN_KEY === 'PRI',
      });

      columns = columns.set(column.id, column);

      if (!columnNamesByTable.get(table.id))
      {
        columnNamesByTable = columnNamesByTable.set(table.id, List([]));
      }
      columnNamesByTable = columnNamesByTable.update(table.id,
        (list) => list.push(column.name),
      );

      tables = tables.setIn(
        [tableId, 'columnIds'],
        table.columnIds.push(column.id),
      );
    });

  databases = databases.set(databaseId, database);

  addDbToServerAction({
    server,
    databases,
    tables,
    columns,
    indexes,
    tableNames,
    columnNames: columnNamesByTable,
  });
}

export function parseMySQLDb(rawServer: object,
  schemaData: object,
  setServerAction: (payload: SchemaTypes.SetServerActionPayload) => void)
{
  let server = SchemaTypes._Server({
    name: rawServer['name'],
    connectionId: rawServer['id'],
  });
  const serverId = server.id;

  let databases: IMMap<string, Database> = Map<string, Database>({});

  _.each((schemaData as any), (databaseValue, databaseKey, databaseList) =>
  {
    let database = SchemaTypes._Database({
      name: databaseKey.toString(),
      serverId: serverId as string,
    });
    const databaseId = database.id;
    server = server.set('databaseIds', server.databaseIds.push(databaseId));

    let tables: IMMap<string, Table> = Map<string, Table>({});
    let columns: IMMap<string, Column> = Map<string, Column>({});
    const indexes: IMMap<string, Index> = Map<string, Index>({});

    let tableNames = List<string>([]);
    let columnIds = List<string>([]);
    let columnNamesByTable = Map<string, List<string>>([]);

    _.each((databaseValue as any),
      (tableFields, tableName, tableList) =>
      {
        const tableId = SchemaTypes.tableId(server['name'], database['name'], (tableName as any) as string);
        let table = tables.get(tableId);

        if (!table)
        {
          table = SchemaTypes._Table({
            name: (tableName as any) as string,
            databaseId,
            serverId,
          });
          tables = tables.set(tableId, table);
          tableNames = tableNames.push(table.name);
          database = database.set(
            'tableIds', database.tableIds.push(tableId),
          );
          database = database.set(
            'databaseType', 'mysql',
          );
        }

        _.each((tableFields as any), (fieldProperties, fieldName, fieldList) =>
        {
          const column = SchemaTypes._Column({
            name: (fieldName as any) as string,
            serverId,
            databaseId,
            tableId,
            datatype: fieldProperties['type'],
          });

          columns = columns.set(column.id, column);

          if (!columnNamesByTable.get(table.id))
          {
            columnNamesByTable = columnNamesByTable.set(table.id, List([]));
          }
          columnNamesByTable = columnNamesByTable.update(table.id,
            (list) => list.push(column.name),
          );

          columnIds = columnIds.push(column.id);
        });

        tables = tables.setIn(
          [tableId, 'columnIds'],
          columnIds,
        );
      });

    databases = databases.set(databaseId, database);

    setServerAction({
      server,
      databases,
      tables,
      columns,
      indexes,
      tableNames,
      columnNames: columnNamesByTable,
    });

  });
}

export function parseElasticDb(elasticServer: object,
  schemaData: object,
  setServerAction: (payload: SchemaTypes.SetServerActionPayload) => void)
{
  let server = SchemaTypes._Server({
    name: elasticServer['name'],
    connectionId: elasticServer['id'],
  });
  const serverId = server.id;

  let databases: IMMap<string, Database> = Map<string, Database>({});

  _.each((schemaData as any), (databaseValue, databaseKey, databaseList) =>
  {
    let database = SchemaTypes._Database({
      name: databaseKey.toString(),
      serverId: serverId as string,
    });
    const databaseId = database.id;
    server = server.set('databaseIds', server.databaseIds.push(databaseId));

    let tables: IMMap<string, Table> = Map<string, Table>({});
    let columns: IMMap<string, Column> = Map<string, Column>({});
    const indexes: IMMap<string, Index> = Map<string, Index>({});

    let tableNames = List<string>([]);
    let columnIds = List<string>([]);
    let columnNamesByTable = Map<string, List<string>>([]);

    _.each((databaseValue as any),
      (tableFields, tableName, tableList) =>
      {
        const tableId = SchemaTypes.tableId(server['name'], database['name'], (tableName as any) as string);
        let table = tables.get(tableId);

        if (!table)
        {
          table = SchemaTypes._Table({
            name: (tableName as any) as string,
            databaseId,
            serverId,
          });
          tables = tables.set(tableId, table);
          tableNames = tableNames.push(table.name);
          database = database.set(
            'tableIds', database.tableIds.push(tableId),
          );
          database = database.set(
            'databaseType', 'elastic',
          );
        }

        _.each((tableFields as any), (fieldProperties, fieldName, fieldList) =>
        {
          const column = SchemaTypes._Column({
            name: (fieldName as any) as string,
            serverId,
            databaseId,
            tableId,
            datatype: fieldProperties['type'],
          });

          columns = columns.set(column.id, column);

          if (!columnNamesByTable.get(table.id))
          {
            columnNamesByTable = columnNamesByTable.set(table.id, List([]));
          }
          columnNamesByTable = columnNamesByTable.update(table.id,
            (list) => list.push(column.name),
          );

          columnIds = columnIds.push(column.id);
        });

        tables = tables.setIn(
          [tableId, 'columnIds'],
          columnIds,
        );
      });

    databases = databases.set(databaseId, database);

    setServerAction({
      server,
      databases,
      tables,
      columns,
      indexes,
      tableNames,
      columnNames: columnNamesByTable,
    });

  });
}
