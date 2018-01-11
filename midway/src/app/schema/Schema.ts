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
import UserConfig from '../users/UserConfig';
import * as Util from '../Util';
import SchemaConfig from './SchemaConfig';

export class Schema
{
  private schemaTable: Tasty.Table;

  constructor()
  {
    this.schemaTable = new Tasty.Table(
      'schema',
      ['id'],
      [
        'starred',
        'count',
      ],
    );
  }

  public async delete(user: UserConfig, id: number | string): Promise<object>
  {
    if (!user.isSuperUser)
    {
      throw new Error('Only superusers can delete databases.');
    }
    return App.DB.delete(this.schemaTable, { id } as SchemaConfig);
  }

  public async select(columns: string[], filter?: object): Promise<SchemaConfig[]>
  {
    console.log('SELECT');
    console.log(columns);
    console.log(filter);
    return new Promise<SchemaConfig[]>(async (resolve, reject) =>
    {
      const rawResults = await App.DB.select(this.schemaTable, columns, filter);
      const results: SchemaConfig[] = rawResults.map((result: object) => new SchemaConfig(result));
      resolve(results);
    });
  }

  public async get(id?: number | string, fields?: string[]): Promise<SchemaConfig[]>
  {
    console.log('GET');
    console.log(id);
    console.log(fields);
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

  // TODO TODO
  public async upsert(user: UserConfig, schema: SchemaConfig): Promise<SchemaConfig>
  {
    console.log('UPSERT UPSERT ');
    console.log(schema);
    if (schema.id !== undefined)
    {
      const results: SchemaConfig[] = await this.get(schema.id);
      console.log('MADE IT PAST THIS PROMISE')
      console.log(results);
      if (results.length !== 0)
      {
        schema = Util.updateObject(results[0], schema);
      }
    }
    else
    {
      const results: SchemaConfig[] = await this.get();
      schema.id = results.length + 1;
    }
    return App.DB.upsert(this.schemaTable, schema) as Promise<SchemaConfig>;
  }
}

export default Schema;
