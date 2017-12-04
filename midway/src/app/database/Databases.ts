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

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';

import DatabaseController from '../../database/DatabaseController';
import * as DBUtil from '../../database/Util';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Scripts from '../../scripts/Scripts';
import { metrics } from '../events/EventRouter';
import { UserConfig } from '../users/UserRouter';
import * as Util from '../Util';

// CREATE TABLE databases (id integer PRIMARY KEY, name text NOT NULL, type text NOT NULL, \
// dsn text NOT NULL, status text, isAnalytics bool NOT NULL, analyticsIndex text, analyticsType text);

export interface DatabaseConfig
{
  id?: number;
  name: string;
  type: string;
  dsn: string;
  host: string;
  status?: string;
  isAnalytics: boolean;
  analyticsIndex?: string;
  analyticsType?: string;
}

export class Databases
{
  private databaseTable: Tasty.Table;

  constructor()
  {
    this.databaseTable = new Tasty.Table(
      'databases',
      ['id'],
      [
        'name',
        'type',
        'dsn',
        'host',
        'status',
        'isAnalytics',
        'analyticsIndex',
        'analyticsType',
      ],
    );
  }

  public async delete(user: UserConfig, id: number): Promise<object>
  {
    if (user.isSuperUser === 0)
    {
      throw new Error('Only superusers can delete databases.');
    }
    return App.DB.delete(this.databaseTable, { id } as DatabaseConfig);
  }

  public async select(columns: string[], filter?: object): Promise<DatabaseConfig[]>
  {
    return App.DB.select(this.databaseTable, columns, filter) as Promise<DatabaseConfig[]>;
  }

  public async get(id?: number, fields?: string[]): Promise<DatabaseConfig[]>
  {
    if (id !== undefined)
    {
      if (fields !== undefined)
      {
        return this.select(fields, { id });
      }
      return this.select([], { id });
    }
    if (fields !== undefined)
    {
      return this.select(fields, {});
    }
    return this.select([], {});
  }

  public async upsert(user: UserConfig, db: DatabaseConfig): Promise<DatabaseConfig>
  {
    if (db.id !== undefined)
    {
      const results: DatabaseConfig[] = await this.get(db.id);
      // database id specified but database not found
      if (results.length === 0)
      {
        throw new Error('Invalid db id passed');
      }

      db = Util.updateObject(results[0], db);
    }

    if (db.isAnalytics === undefined)
    {
      db.isAnalytics = false;
    }

    return App.DB.upsert(this.databaseTable, db) as Promise<DatabaseConfig>;
  }

  public async connect(user: UserConfig, id: number): Promise<DatabaseConfig>
  {
    const results: DatabaseConfig[] = await this.get(id);
    if (results.length === 0)
    {
      throw new Error('Invalid db id passed');
    }

    const db: DatabaseConfig = results[0];
    if (db.id === undefined)
    {
      throw new Error('Database does not have an ID');
    }

    const controller: DatabaseController = DBUtil.makeDatabaseController(db.type, db.dsn, db.analyticsIndex, db.analyticsType);
    DatabaseRegistry.set(db.id, controller);

    // try to provision built-in scripts to the connected database
    await Scripts.provisionScripts(controller);

    // pre-populate the database with pre-defined metrics
    if (db.isAnalytics)
    {
      await metrics.initialize(db.id);
    }

    return this.upsert(user, { id, status: 'CONNECTED' } as DatabaseConfig);
  }

  public async disconnect(user: UserConfig, id: number): Promise<DatabaseConfig>
  {
    await DatabaseRegistry.remove(id);
    // TODO: clean up controller?
    return this.upsert(user, { id, status: 'DISCONNECTED' } as DatabaseConfig);
  }

  public async schema(id: number): Promise<string>
  {
    const controller = DatabaseRegistry.get(id);
    if (controller === undefined)
    {
      throw new Error('Invalid db id passed (schema)');
    }

    const schema: Tasty.Schema = await controller.getTasty().schema();
    return schema.toString();
  }
}

export default Databases;
