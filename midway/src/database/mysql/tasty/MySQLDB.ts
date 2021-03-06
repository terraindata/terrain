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

import * as mysql from 'mysql';

import util from '../../../../../shared/Util';
import SQLGenerator from '../../../tasty/MySQLGenerator';
import { IsolationLevel, TastyDB, TransactionHandle } from '../../../tasty/TastyDB';
import TastyNodeTypes from '../../../tasty/TastyNodeTypes';
import TastyQuery from '../../../tasty/TastyQuery';
import TastySchema from '../../../tasty/TastySchema';
import TastyTable from '../../../tasty/TastyTable';
import MySQLClient from '../client/MySQLClient';

export class MySQLDB implements TastyDB
{
  private client: MySQLClient;

  constructor(client: MySQLClient)
  {
    this.client = client;
  }

  /**
   * Generates MySQL queries from TastyQuery objects.
   */
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
    const result = await this.execute(
      ['SELECT table_schema, table_name, column_name, data_type ' +
        'FROM information_schema.columns ' +
        'WHERE table_schema NOT IN (\'information_schema\', \'performance_schema\', \'mysql\', \'sys\');']);
    return TastySchema.fromSQLResultSet(result);
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
        this.client.query(statement, [], util.promise.makeCallback(resolve, reject));
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

    let upserted: object[] = [];
    for (let i = 0; i < statements.length; ++i)
    {
      const statement = statements[i];
      const value = values[i];
      const result = await new Promise<object[]>((resolve, reject) =>
      {
        this.client.query(statement, value, util.promise.makeCallback(resolve, reject));
      });

      upserted = upserted.concat(result);
    }

    const results = new Array(upserted.length);
    for (let i = 0; i < results.length; i++)
    {
      results[i] = elements[i];
      if ((primaryKeys.length === 1) &&
        (elements[i][primaryKeys[0]] === undefined))
      {
        results[i][primaryKeys[0]] = upserted[i]['insertId'];
      }
    }

    return results;
  }

  public async destroy(): Promise<void>
  {
    return new Promise<void>((resolve, reject) =>
    {
      this.client.end(util.promise.makeCallback(resolve, reject));
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

  // tslint:disable-next-line:no-unused-variable
  private async getConnection(): Promise<mysql.Connection>
  {
    return new Promise<mysql.Connection>((resolve, reject) =>
    {
      this.client.getConnection(util.promise.makeCallback(resolve, reject));
    });
  }
}

export default MySQLDB;
