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
const {List, Map} = Immutable;
import {BaseClass, New} from '../Classes';
import Util from '../util/Util';

type stringList = string[] | List<string>;

export module SchemaTypes {

  export class SchemaBaseClass extends BaseClass {
    public id: string;
    public type: string = '';
    public name: string = '';
  }

  class SchemaStateC {
    public databases: DatabaseMap = Map<string, Database>({});
    public tables: TableMap = Map<string, Table>({});
    public columns: ColumnMap = Map<string, Column>({});
    public indexes: IndexMap = Map<string, Index>({});

    public dbCount: number = -1;
    public loading: boolean = false;
    public loaded: boolean = false;
    public schemaError: boolean = false;

    // view state
    public selectedId: string = null;
    public highlightedId: string = null;
    public highlightedInSearchResults: boolean = false;

    // for the builder, a list of names for each db
    public tableNamesByDb: TableNamesByDb = Map<string, List<string>>({});
    public columnNamesByDb: ColumnNamesByDb = Map<string, IMMap<string, List<string>>>({});
  }
  export type SchemaState = SchemaStateC & IRecord<SchemaStateC>;
  export const _SchemaState = (config?: { [key: string]: any }) =>
    New<SchemaState>(new SchemaStateC(), config);

  export function databaseId(databaseName: string) {
    return databaseName;
  }

  class DatabaseC extends SchemaBaseClass {
    public type = 'database';
    public name = '';
    public databaseType = 'mysql';

    public tableIds: List<string> = List([]);
  }
  export type Database = DatabaseC & IRecord<DatabaseC>;
  export const _Database =
    (config: {
      name: string,
      id?: string,
    }) => {
      config.id = databaseId(config.name);
      return New<Database>(
        new DatabaseC(config),
        config, 'string');
    };
  export type DatabaseMap = IMMap<string, Database>;

  export function tableId(databaseName: string, tableName: string): string {
    return databaseName + '.' + tableName;
  }

  class TableC extends SchemaBaseClass {
    public type = 'table';
    public name = '';
    public databaseId: string = '';

    public columnIds: List<string> = List([]);
    public indexIds: List<string> = List([]);
  }
  export type Table = TableC & IRecord<TableC>;
  export const _Table = (config: {
    name: string,
    databaseId: string,
    id?: string,
  }) => {
    config.id = tableId(config.databaseId, config.name);
    return New<Table>(new TableC(config), config, 'string');
  };
  export type TableMap = IMMap<string, Table>;

  export function columnId(tableId: string, columnName: string) {
    return tableId + '.c.' + columnName;
  }

  class ColumnC extends SchemaBaseClass {
    public type = 'column';
    public name = '';
    public databaseId: string = '';
    public tableId: string = '';

    public indexIds: List<string> = List([]);
    public datatype = '';
    public defaultValue = '';
    public isNullable = false;
    public isPrimaryKey = false;
  }
  export type Column = ColumnC & IRecord<ColumnC>;
  export const _Column = (config: {
    name: string,
    databaseId: string,
    tableId: string,

    defaultValue?: string,
    datatype: string,
    isNullable?: boolean,
    isPrimaryKey?: boolean,

    id?: string,
  }) => {
    config.id = columnId(config.tableId, config.name);
    return New<Column>(new ColumnC(config), config, 'string');
  };
  export type ColumnMap = IMMap<string, Column>;

  export function indexId(databaseName: string, tableName: string, indexName: string) {
    return databaseName + '.' + tableName + '.i.' + indexName;
  }

  class IndexC extends SchemaBaseClass {
    public type = 'index';
    public name = '';
    public databaseId: string = '';
    public tableId: string = '';

    public indexType = '';
    public columnIds: List<string> = List([]);
  }
  export type Index = IndexC & IRecord<IndexC>;
  export const _Index = (config: {
    name: string,
    databaseId: string,
    tableId: string,

    indexType: string,
    id?: string,
  }) => {
    config.id = indexId(config.databaseId, config.tableId, config.tableId);
    return New<Index>(new IndexC(config), config, 'string');
  };
  export type IndexMap = IMMap<string, Index>;

  export const typeToStoreKey =
    {
      database: 'databases',
      table: 'tables',
      column: 'columns',
      index: 'indexes',
    };

  export function searchIncludes(item: SchemaBaseClass, search: string): boolean {
    return !search ||
      (
        item && typeof item.name === 'string' &&
        item.name.toLowerCase().indexOf(
          search.toLowerCase(),
        ) !== -1
      );
  }

// used to define how to render tree item children in tree list
  export type ISchemaTreeChildrenConfig = [
    {
      label?: string;
      type: string;
    }
    ];

  export type TableNamesByDb = IMMap<string, List<string>>;
  export type ColumnNamesByDb = IMMap<string, IMMap<string, List<string>>>;
  export interface SetDbActionPayload {
    database: Database;
    tables: IMMap<string, Table>;
    columns: IMMap<string, Column>;
    indexes: IMMap<string, Index>;
    columnNames: IMMap<string, List<string>>;
    tableNames: List<string>;
  }
}

export default SchemaTypes;
