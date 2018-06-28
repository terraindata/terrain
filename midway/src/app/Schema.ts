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

import * as assert from 'assert';
import * as winston from 'winston';
import * as Tasty from '../tasty/Tasty';

import DatabaseController from '../database/DatabaseController';
import ElasticDB from '../database/elastic/tasty/ElasticDB';
import DatabaseRegistry from '../databaseRegistry/DatabaseRegistry';

import { DatabaseConfig } from './database/DatabaseConfig';
import { TemplateConfig } from './etl/TemplateConfig';
import { MetricConfig } from './events/MetricConfig';
import { IntegrationConfig } from './integrations/IntegrationConfig';
import { ItemConfig } from './items/ItemConfig';
import { JobConfig } from './jobs/JobConfig';
import { JobLogConfig } from './jobs/JobLogConfig';
import { MigrationRecordConfig } from './migrations/MigrationRecordConfig';
import { ResultsConfigConfig } from './resultsConfig/ResultsConfigConfig';
import { SchedulerConfig } from './scheduler/SchedulerConfig';
import { SchemaMetadataConfig } from './schemaMetadata/SchemaMetadataConfig';
import { StatusHistoryConfig } from './statusHistory/StatusHistoryConfig';
import { UserConfig } from './users/UserConfig';
import { VersionConfig } from './versions/VersionConfig';

export class Tables
{
  public versions: Tasty.Table;
  public items: Tasty.Table;
  public databases: Tasty.Table;
  public users: Tasty.Table;
  public metrics: Tasty.Table;
  public integrations: Tasty.Table;
  public schemaMetadata: Tasty.Table;
  public resultsConfig: Tasty.Table;
  public templates: Tasty.Table;
  public schedules: Tasty.Table;
  public jobLogs: Tasty.Table;
  public jobs: Tasty.Table;
  public statusHistory: Tasty.Table;
  public migrationRecords: Tasty.Table;
}

function verifyTableWithConfig(table: Tasty.Table, configClass: object)
{
  assert.strictEqual(Object.keys(table.getMapping()).sort().toString(), Object.keys(configClass).sort().toString());
}

const setupTablesHelper = (datetimeTypeName: string, falseValue: string, stringTypeName: string, primaryKeyType: string): Tables =>
{
  const tables = {};

  const addTable = (table: Tasty.Table, configObject: object) =>
  {
    verifyTableWithConfig(table, configObject);
    tables[table.getTableName()] = table;
  };

  addTable(
    new Tasty.Table(
      'versions',
      ['id'],
      [
        'objectType',
        'objectId',
        'object',
        'createdAt',
        'createdByUserId',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        objectType: 'text NOT NULL',
        objectId: 'integer NOT NULL',
        object: 'text NOT NULL',
        createdAt: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        createdByUserId: 'integer NOT NULL',
      },
    ),
    new VersionConfig({}),
  );
  addTable(
    new Tasty.Table(
      'items',
      ['id'],
      [
        'meta',
        'name',
        'parent',
        'status',
        'type',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        meta: 'text',
        name: 'text NOT NULL',
        parent: 'integer',
        status: 'text',
        type: 'text',
      },
    ),
    new ItemConfig({}),
  );
  addTable(
    new Tasty.Table(
      'databases',
      ['id'],
      [
        'name',
        'type',
        'dsn',
        'host',
        'isAnalytics',
        'analyticsIndex',
        'analyticsType',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        name: 'text NOT NULL',
        type: 'text NOT NULL',
        dsn: 'text NOT NULL',
        host: 'text NOT NULL',
        isAnalytics: 'bool DEFAULT ' + falseValue,
        analyticsIndex: 'text',
        analyticsType: 'text',
      },
    ),
    new DatabaseConfig({}),
  );
  addTable(
    new Tasty.Table(
      'users',
      ['id'],
      [
        'accessToken',
        'email',
        'isDisabled',
        'isSuperUser',
        'name',
        'oldPassword',
        'password',
        'timezone',
        'meta',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        accessToken: 'text NOT NULL',
        email: 'text NOT NULL',
        isDisabled: 'bool NOT NULL DEFAULT false',
        isSuperUser: 'bool NOT NULL DEFAULT false',
        name: 'text NOT NULL',
        oldPassword: 'text',
        password: 'text NOT NULL',
        timezone: stringTypeName,
        meta: 'text',
      },
    ),
    new UserConfig({}),
  );
  addTable(
    new Tasty.Table(
      'metrics',
      ['id'],
      [
        'database',
        'label',
        'events',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        database: 'integer NOT NULL',
        label: 'text NOT NULL',
        events: 'text NOT NULL',
      },
    ),
    new MetricConfig({}),
  );
  addTable(
    new Tasty.Table(
      'integrations',
      ['id'],
      [
        'authConfig',
        'connectionConfig',
        'createdBy',
        'meta',
        'name',
        'readPermission',
        'type',
        'lastModified',
        'writePermission',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        authConfig: 'text NOT NULL',
        connectionConfig: 'text NOT NULL',
        createdBy: 'integer NOT NULL',
        meta: 'text NOT NULL',
        name: 'text NOT NULL',
        readPermission: 'text NOT NULL',
        type: 'text NOT NULL',
        lastModified: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        writePermission: 'text NOT NULL',
      },
    ),
    new IntegrationConfig({}),
  );
  addTable(
    new Tasty.Table(
      'schemaMetadata',
      ['id'],
      [
        'columnId',
        'starred',
        'count',
        'countByAlgorithm',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        columnId: 'text NOT NULL',
        count: 'integer NOT NULL',
        starred: 'bool NOT NULL',
        countByAlgorithm: 'text',
      },
    ),
    new SchemaMetadataConfig({}),
  );
  addTable(
    new Tasty.Table(
      'resultsConfig',
      ['id'],
      [
        'index',
        'thumbnail',
        'name',
        'score',
        'fields',
        'formats',
        'primaryKeys',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        index: 'text NOT NULL',
        thumbnail: 'text',
        name: 'text',
        score: 'text',
        fields: 'text',
        formats: 'text',
        primaryKeys: 'text',
      },
    ),
    new ResultsConfigConfig({}),
  );
  addTable(
    new Tasty.Table(
      'templates',
      ['id'],
      [
        'createdAt',
        'lastModified',
        'archived',
        'templateName',
        'process',
        'sources',
        'sinks',
        'settings',
        'meta',
        'uiData',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        createdAt: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        lastModified: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        archived: 'bool NOT NULL',
        templateName: 'text NOT NULL',
        process: 'text NOT NULL',
        sources: 'text NOT NULL',
        sinks: 'text NOT NULL',
        settings: 'text NOT NULL',
        meta: 'text NOT NULL',
        uiData: 'text NOT NULL',
      },
    ),
    new TemplateConfig({}),
  );
  addTable(
    new Tasty.Table(
      'schedules',
      ['id'],
      [
        'createdAt',
        'createdBy',
        'cron',
        'lastModified',
        'lastRun',
        'meta',
        'name',
        'priority',
        'running',
        'shouldRunNext',
        'tasks',
        'workerId',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        createdAt: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        createdBy: 'integer',
        cron: 'text NOT NULL',
        lastModified: 'date NOT NULL',
        lastRun: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        meta: 'text NOT NULL',
        name: 'text NOT NULL',
        priority: 'integer NOT NULL',
        running: 'bool NOT NULL',
        shouldRunNext: 'bool NOT NULL',
        tasks: 'text NOT NULL',
        workerId: 'integer NOT NULL',
      },
    ),
    new SchedulerConfig({}),
  );
  addTable(
    new Tasty.Table(
      'jobLogs',
      ['id'],
      [
        'contents',
        'createdAt',
      ],
      undefined,
      {
        id: 'integer PRIMARY KEY',
        createdAt: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        contents: 'text',
      },
    ),
    new JobLogConfig({}),
  );
  addTable(
    new Tasty.Table(
      'jobs',
      ['id'],
      [
        'createdAt',
        'createdBy',
        'endTime',
        'logId',
        'meta',
        'name',
        'pausedFilename',
        'priority',
        'running',
        'runNowPriority',
        'scheduleId',
        'startTime',
        'status',
        'tasks',
        'type',
        'workerId',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        createdAt: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        createdBy: 'integer',
        endTime: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        logId: 'integer',
        meta: 'text NOT NULL',
        name: 'text NOT NULL',
        pausedFilename: 'text NOT NULL',
        priority: 'integer NOT NULL',
        running: 'bool NOT NULL',
        runNowPriority: 'integer NOT NULL',
        scheduleId: 'integer',
        startTime: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        status: 'text NOT NULL',
        tasks: 'text NOT NULL',
        type: 'text NOT NULL',
        workerId: 'integer NOT NULL',
      },
    ),
    new JobConfig({}),
  );
  addTable(
    new Tasty.Table(
      'statusHistory',
      ['id'],
      [
        'createdAt',
        'userId',
        'algorithmId',
        'fromStatus',
        'toStatus',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        createdAt: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        userId: 'integer NOT NULL',
        algorithmId: 'integer NOT NULL',
        fromStatus: 'text NOT NULL',
        toStatus: 'text NOT NULL',
      },
    ),
    new StatusHistoryConfig({}),
  );
  addTable(
    new Tasty.Table(
      'migrationRecords',
      ['id'],
      [
        'createdAt',
        'lastModified',
        'fromVersion',
        'toVersion',
        'isCurrent',
      ],
      undefined,
      {
        id: primaryKeyType + ' PRIMARY KEY',
        createdAt: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        lastModified: datetimeTypeName + ' DEFAULT CURRENT_TIMESTAMP',
        fromVersion: 'text NOT NULL',
        toVersion: 'text NOT NULL',
        isCurrent: 'bool NOT NULL',
      },
    ),
    new MigrationRecordConfig({}),
  );

  return tables as Tables;
};

export function setupTables(dbtype: string): Tables
{
  if (dbtype === 'sqlite' || dbtype === 'mysql')
  {
    return setupTablesHelper('datetime', '0', 'string', 'integer');
  }
  else if (dbtype === 'postgres')
  {
    return setupTablesHelper('timestamp with time zone', 'false', 'varchar(255)', 'serial');
  }
  else
  {
    winston.warn('Auto-provisioning of app schema not supported for DB of type ' + dbtype);
  }
}

export async function deleteElasticIndex(dbid: number, dbname: string): Promise<string>
{
  return new Promise<string>(async (resolve, reject) =>
  {
    const database: DatabaseController | undefined = DatabaseRegistry.get(dbid);
    if (database === undefined)
    {
      throw new Error('Database "' + dbid.toString() + '" not found.');
    }

    winston.info(`Deleting Elastic Index ${dbname} of database ${dbid}`);
    const elasticDb = database.getTasty().getDB() as ElasticDB;
    await elasticDb.deleteIndex(dbname);
    winston.info(`Deleted Elastic Index ${dbname} of database ${dbid}`);
    return resolve('ok');
  });
}

export async function getSchema(databaseID: number | string): Promise<string>
{
  return new Promise<string>(async (resolve, reject) =>
  {
    const database: DatabaseController | undefined = typeof databaseID === 'number' ?
      DatabaseRegistry.get(databaseID)
      :
      DatabaseRegistry.getByName(databaseID);

    if (database === undefined)
    {
      throw new Error('Database "' + databaseID.toString() + '" not found.');
    }
    const schema: Tasty.Schema = await database.getTasty().schema();
    return resolve(schema.toString());
  });
}

export async function getTable(databaseID: number | string, table: string): Promise<object>
{
  return new Promise<object>(async (resolve, reject) =>
  {
    const database: DatabaseController | undefined = typeof databaseID === 'number' ?
      DatabaseRegistry.get(databaseID)
      :
      DatabaseRegistry.getByName(databaseID);

    if (database === undefined)
    {
      throw new Error('Database "' + databaseID.toString() + '" not found.');
    }
    const schema: Tasty.Schema = await database.getTasty().schema();

    const tables = schema.tables(table);
    if (tables !== undefined)
    {
      return resolve(tables);
    }
    else
    {
      return resolve({});
    }
  });
}
