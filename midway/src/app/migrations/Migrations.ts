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
import * as _ from 'lodash';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';

import { CURRENT_VERSION, FIRST_VERSION, Migrator, Version } from '../AppVersion';
import { MigrationRecordConfig as MigrationRecord } from './MigrationRecordConfig';

import { MidwayLogger } from '../log/MidwayLogger';
import { defaultETLMigration } from '../etl/ETLMigrations';

const registeredMigrations: Migrator[] = [
  defaultETLMigration,
];

export class Migrations
{
  private migrationTable: Tasty.Table;

  constructor()
  {

  }

  public initialize()
  {
    this.migrationTable = App.TBLS.migrationRecords;
  }

  public async runMigrations(): Promise<void>
  {
    return new Promise<void>(async (resolve, reject) =>
    {
      const currentRecord = await this.getCurrent();

      let fromVersion = FIRST_VERSION;
      if (currentRecord !== undefined)
      {
        fromVersion = currentRecord.toVersion;
      }
      MidwayLogger.info(`Checking migrations from version ${fromVersion} to version ${CURRENT_VERSION}`);
      let anyUpdated = false;
      for (const migrator of registeredMigrations)
      {
        if (migrator.toVersion === CURRENT_VERSION && migrator.fromVersion === fromVersion)
        {
          anyUpdated = await migrator.migrate(fromVersion, CURRENT_VERSION) || anyUpdated;
        }
      }
      if (!anyUpdated)
      {
        MidwayLogger.info('No Migrations Occurred');
      }

      if (fromVersion !== CURRENT_VERSION)
      {
        MidwayLogger.info('Updating Application Version Record');
        await this.createCurrent(fromVersion, CURRENT_VERSION);
      }
      resolve();
    });
  }

  public async get(id?: number, isCurrent?: boolean)
  {
    return new Promise<MigrationRecord[]>(async (resolve, reject) =>
    {
      const records = await App.DB.select(this.migrationTable, [], { id, isCurrent }) as MigrationRecord[];
      resolve(records);
    });
  }

  public async getCurrent(): Promise<MigrationRecord>
  {
    return new Promise<MigrationRecord>(async (resolve, reject) =>
    {
      const records = await this.get(undefined, true);
      resolve(records[0]);
    });
  }

  /*
   *  Create a new migration record and set it to be the (only) current one.
   */
  private async createCurrent(fromVersion: Version, toVersion: Version): Promise<MigrationRecord[]>
  {
    return new Promise<MigrationRecord[]>(async (resolve, reject) =>
    {
      const currentMigrations = await this.get(undefined, true);
      if (currentMigrations.length !== 0)
      {
        for (const currentMigration of currentMigrations)
        {
          await this.update(_.extend({}, currentMigration, { isCurrent: false }));
        }
      }
      const currDateTime: Date = new Date(Date.now());
      const newCurrentRecord: MigrationRecord = {
        createdAt: currDateTime,
        lastModified: currDateTime,
        fromVersion,
        toVersion,
        isCurrent: true,
      };
      resolve(await this.upsert(newCurrentRecord));
    });
  }

  private async update(record: MigrationRecord): Promise<MigrationRecord[]>
  {
    return new Promise<MigrationRecord[]>(async (resolve, reject) =>
    {
      const currDateTime: Date = new Date(Date.now());
      const newRecord: MigrationRecord = {
        createdAt: record.createdAt,
        lastModified: currDateTime,
        id: record.id,
        isCurrent: record.isCurrent,
        toVersion: record.toVersion,
        fromVersion: record.fromVersion,
      };
      resolve(await this.upsert(newRecord));
    });
  }

  private async upsert(record: MigrationRecord): Promise<MigrationRecord[]>
  {
    return new Promise<MigrationRecord[]>(async (resolve, reject) =>
    {
      const records = await App.DB.upsert(this.migrationTable, record) as MigrationRecord[];
      resolve(records);
    });
  }
}
