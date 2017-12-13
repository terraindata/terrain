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

import Ajax from 'app/util/Ajax';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import { SchemaActionType, SchemaActionTypes } from 'schema/data/SchemaRedux';
import BackendInstance from '../../../database/types/BackendInstance';
import * as SchemaTypes from '../SchemaTypes';

const { Map, List } = Immutable;

type Server = SchemaTypes.Server;
type Database = SchemaTypes.Database;
type Table = SchemaTypes.Table;
type Column = SchemaTypes.Column;
type Index = SchemaTypes.Index;
type FieldProperty = SchemaTypes.FieldProperty;

function recursiveParseFieldProperties(fieldProperty: FieldProperty, fieldPropertiesMap: IMMap<string, FieldProperty>)
{
  if (typeof fieldProperty.value === 'string')
  {
    return { fieldProperty, fieldPropertiesMap };
  }
  if (typeof fieldProperty.value === 'number')
  {
    fieldProperty = fieldProperty.set(
      'value', 'long', // what should we do for numerical values in schema?
    );
  }
  else if (typeof fieldProperty.value === 'boolean')
  {
    fieldProperty = fieldProperty.set(
      'value', 'boolean', // see ^
    );
  }
  else if (typeof fieldProperty.value === 'object')
  {
    let fieldPropertyChildIds = List<string>();
    _.each((fieldProperty.value as any), (fieldPropertyChildValue, fieldPropertyChildName) =>
    {
      let fieldPropertyChild = SchemaTypes._FieldProperty({
        name: (fieldPropertyChildName as any) as string,
        value: fieldPropertyChildValue,
        serverId: fieldProperty.serverId,
        databaseId: fieldProperty.databaseId,
        tableId: fieldProperty.tableId,
        columnId: fieldProperty.columnId,
        fieldPropertyParentId: fieldProperty.id,
      });
      const recursiveReturn = recursiveParseFieldProperties(fieldPropertyChild, fieldPropertiesMap);
      fieldPropertyChild = recursiveReturn.fieldProperty;
      fieldPropertiesMap = recursiveReturn.fieldPropertiesMap;
      fieldPropertyChildIds = fieldPropertyChildIds.push(fieldPropertyChild.id);
      fieldPropertiesMap = fieldPropertiesMap.set(fieldPropertyChild.id, fieldPropertyChild);
    });
    fieldProperty = fieldProperty.set(
      'fieldPropertyIds', fieldPropertyChildIds,
    );
    fieldProperty = fieldProperty.set(
      'value', 'object',
    );
  }
  return { fieldProperty, fieldPropertiesMap };
}

export function parseElasticDb(elasticServer: object,
  schemaData: object,
  directDispatch: (payload: SchemaActionType<'setServer'>) => void,
)
{
  const isAnalytics = elasticServer['isAnalytics'] !== undefined &&
    elasticServer['isAnalytics'] === 1;

  let server = SchemaTypes._Server({
    name: elasticServer['name'],
    connectionId: elasticServer['id'],
    isAnalytics,
    analyticsIndex: elasticServer['analyticsIndex'],
    analyticsType: elasticServer['analyticsType'],
  });
  const serverId = server.id;

  let databases: IMMap<string, Database> = Map<string, Database>();

  let didSetServer = false;

  _.each((schemaData as any), (databaseValue, databaseKey) =>
  {
    let database = SchemaTypes._Database({
      name: databaseKey.toString(),
      serverId: serverId as string,
    });
    const databaseId = database.id;
    server = server.set('databaseIds', server.databaseIds.push(databaseId));

    let tables: IMMap<string, Table> = Map<string, Table>();
    let columns: IMMap<string, Column> = Map<string, Column>();
    const indexes: IMMap<string, Index> = Map<string, Index>();
    let fieldPropertiesMap: IMMap<string, FieldProperty> = Map<string, FieldProperty>();

    let tableNames = List<string>();
    let columnIds = List<string>();
    let fieldPropertyIds = List<string>();
    let columnNamesByTable = Map<string, List<string>>();

    _.each((databaseValue as any),
      (tableFields, tableName) =>
      {
        const tableId = SchemaTypes.tableId(databaseId, (tableName as any) as string);
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
        // Run an elastic query that gets 5 result samples to extract the sample data from
        let results = null;
        const db = {
          id: elasticServer['id'],
          name: elasticServer['name'],
          type: elasticServer['type'],
        };
        const sampleQuery = {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    _index: databaseKey,
                  },
                },
                {
                  term: {
                    _type: tableName,
                  },
                },
              ],
            },
          },
          size: 5,
        };

        Ajax.query(
          JSON.stringify(sampleQuery),
          db,
          (resp) =>
          {
            results = resp.result.hits;
            tables = tables.setIn(
              [tableId, 'sampleData'],
              results.hits,
            );
            _.each((tableFields as any), (fieldProperties, fieldName) =>
            {
              // fieldPropertiesMap = fieldPropertiesMap.clear();
              fieldPropertyIds = fieldPropertyIds.clear();

              _.each((fieldProperties as any), (fieldPropertyValue, fieldPropertyName) =>
              {
                let fieldProperty = SchemaTypes._FieldProperty({
                  name: (fieldPropertyName as any) as string,
                  value: fieldPropertyValue,
                  serverId,
                  databaseId,
                  tableId,
                  columnId: tableId + '.' + ((fieldName as any) as string),
                  fieldPropertyParentId: '',
                });

                const recursiveReturn = recursiveParseFieldProperties(fieldProperty, fieldPropertiesMap);
                fieldProperty = recursiveReturn.fieldProperty;
                fieldPropertiesMap = recursiveReturn.fieldPropertiesMap;

                fieldPropertiesMap = fieldPropertiesMap.set(fieldProperty.id, fieldProperty);
                fieldPropertyIds = fieldPropertyIds.push(fieldProperty.id);
              });

              let column = SchemaTypes._Column({
                name: (fieldName as any) as string,
                serverId,
                databaseId,
                tableId,
                datatype: fieldProperties['type'],
              });

              column = column.set(
                'fieldPropertyIds', fieldPropertyIds,
              );
              // add sample data
              if (results.hits)
              {
                const sampleData = results.hits.map((hit) =>
                {
                  return hit._source[fieldName];
                });
                column = column.set('sampleData', sampleData);
              }

              columns = columns.set(column.id, column);

              if (!columnNamesByTable.get(table.id))
              {
                columnNamesByTable = columnNamesByTable.set(table.id, List());
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
            databases = databases.set(databaseId, database);
            directDispatch({
              actionType: 'setServer',
              server,
              databases,
              tables,
              columns,
              indexes,
              fieldProperties: fieldPropertiesMap,
              tableNames,
              columnNames: columnNamesByTable,
            });

            didSetServer = true;
            if (!didSetServer)
            {
              // empty server, no dbs/indexes, need to set it manually
              // TODO change this terrible code flow
              directDispatch({
                actionType: 'setServer',
                server,
                databases,
                tables: Map<string, Table>(),
                columns: Map<string, Column>(),
                indexes: Map<string, Index>(),
                fieldProperties: Map<string, FieldProperty>(),
                tableNames: List<string>(),
                columnNames: Map<string, List<string>>(),
              });
            }
          },
          (err) =>
          {
            //
          });
      });
  });
}
