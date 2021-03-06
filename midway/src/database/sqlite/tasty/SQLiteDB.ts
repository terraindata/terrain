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

import util from '../../../../../shared/Util';
import SQLGenerator from '../../../tasty/MySQLGenerator';
import { IsolationLevel, TastyDB, TransactionHandle } from '../../../tasty/TastyDB';
import TastyNodeTypes from '../../../tasty/TastyNodeTypes';
import TastyQuery from '../../../tasty/TastyQuery';
import TastySchema from '../../../tasty/TastySchema';
import TastyTable from '../../../tasty/TastyTable';
import SQLiteClient from '../client/SQLiteClient';
import SQLiteConfig from '../SQLiteConfig';

export type Config = SQLiteConfig;

export class SQLiteDB implements TastyDB
{
  private client: SQLiteClient;

  constructor(client: SQLiteClient)
  {
    this.client = client;
  }

  public generateQuery(query: TastyQuery, placeholder: boolean): [string[], any[][]]
  {
    const generator = new SQLGenerator();
    if (query.command.tastyType === TastyNodeTypes.select || query.command.tastyType === TastyNodeTypes.delete)
    {
      generator.generateSelectQuery(query, placeholder);
    }
    else if (query.command.tastyType === TastyNodeTypes.upsert && query.upserts.length > 0)
    {
      generator.generateUpsertQuery(query, query.upserts, placeholder);
    }
    return [generator.statements, generator.values];
  }

  public generate(query: TastyQuery): string[]
  {
    // tslint:disable-next-line:no-unused-variable
    const [statements, values] = this.generateQuery(query, false);
    return statements;
  }

  public generateString(query: TastyQuery): string
  {
    return this.generate(query).join('\n');
  }

  public async schema(): Promise<TastySchema>
  {
    const results = {};
    results[this.client.getFilename()] = {};

    const tableListResult: any[] = await this.execute(['SELECT name FROM sqlite_master WHERE Type=\'table\';']);
    for (const table of tableListResult)
    {
      results[this.client.getFilename()][table.name] = {};
      const colResult: any = await this.execute([`pragma table_info(${table.name});`]);
      for (const col of colResult)
      {
        results[this.client.getFilename()][table.name][col.name] =
          {
            type: col.type,
          };
      }
    }
    return new TastySchema(results);
  }

  /**
   * executes statements sequentially
   * @param statements
   * @returns {Promise<Array>} appended result objects
   */
  public async execute(statements: string[]): Promise<object[]>
  {
    let results: object[] = [];
    for (const statement of statements)
    {
      const result: object[] = await new Promise<object[]>((resolve, reject) =>
      {
        this.client.all(statement, [], util.promise.makeCallback(resolve, reject));
      });

      results = results.concat(result);
    }
    return results;
  }

  public async upsert(table: TastyTable, elements: object[]): Promise<object[]>
  {
    const query = new TastyQuery(table).upsert(elements);
    const [statements, values] = this.generateQuery(query, true);
    const primaryKeys = table.getPrimaryKeys();

    const lastIDs: number[] = [];
    for (let i = 0; i < statements.length; ++i)
    {
      const statement = statements[i];
      const value = values[i];
      const result = await new Promise<number>((resolve, reject) =>
      {
        this.client.run(statement, value, function(error: Error, ctx: any)
        {
          if (error !== null && error !== undefined)
          {
            reject(error);
          }
          else
          {
            if (this['lastID'] !== undefined)
            {
              resolve(this['lastID']);
            }
          }
        });
      });
      lastIDs.push(result);
    }

    const results = new Array(elements.length);
    for (let i = 0, j = 0; i < results.length; i++)
    {
      results[i] = elements[i];
      if ((primaryKeys.length === 1) &&
        (elements[i][primaryKeys[0]] === undefined))
      {
        results[i][primaryKeys[0]] = lastIDs[j++];
      }
    }

    return results;
  }

  public async destroy(): Promise<void>
  {
    return new Promise<void>((resolve, reject) =>
    {
      this.client.close(util.promise.makeCallback(resolve, reject) as (err: Error) => void);
    });
  }

  public async putMapping(table: TastyTable): Promise<object>
  {
    throw new Error('putMapping() is currently only supported for Elastic databases.');
  }

  public async update(table: TastyTable, elements: object[]): Promise<object[]>
  {
    throw new Error('update() is currently only supported for Elastic databases.');
  }

  public async startTransaction(isolationLevel: IsolationLevel, readOnly: boolean): Promise<TransactionHandle>
  {
    throw new Error('startTransaction() is not supported');
  }

  public async commitTransaction(handle: TransactionHandle): Promise<object[]>
  {
    throw new Error('commitTransaction() is not supported');
  }

  public async rollbackTransaction(handle: TransactionHandle): Promise<object[]>
  {
    throw new Error('rollbackTransaction() is not supported');
  }
}

export default SQLiteDB;
