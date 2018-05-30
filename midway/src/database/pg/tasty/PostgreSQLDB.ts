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
import PostgreSQLGenerator from '../../../tasty/PostgreSQLGenerator';
import { IsolationLevel, TastyDB, TransactionHandle } from '../../../tasty/TastyDB';
import TastyNodeTypes from '../../../tasty/TastyNodeTypes';
import TastyQuery from '../../../tasty/TastyQuery';
import TastySchema from '../../../tasty/TastySchema';
import TastyTable from '../../../tasty/TastyTable';
import PostgreSQLClient from '../client/PostgreSQLClient';

export class PostgreSQLDB implements TastyDB
{
  private client: PostgreSQLClient;

  constructor(client: PostgreSQLClient)
  {
    this.client = client;
  }

  /**
   * Generates PostgreSQL queries from TastyQuery objects.
   */
  public generate(query: TastyQuery): [string[], any[][]]
  {
    const generator = new PostgreSQLGenerator();
    if (query.command.tastyType === TastyNodeTypes.select || query.command.tastyType === TastyNodeTypes.delete)
    {
      generator.generateSelectQuery(query);
    }
    else if (query.command.tastyType === TastyNodeTypes.upsert && query.upserts.length > 0)
    {
      generator.generateUpsertQuery(query, query.upserts);
    }
    return [generator.statements, generator.valuesArray];
  }

  public async schema(): Promise<TastySchema>
  {
    // TODO Implement when/if PostreSQL DBs are made visible in the schema browser
    const result = null;
    return TastySchema.fromSQLResultSet(result);
  }

  /**
   * executes statements sequentially
   * @param query `[string array of statements, array of values arrays for each statement]`
   * e.g. `[['SELECT a FROM b WHERE c = $1 AND d = $2'], [['qwe', 'rty']]]`
   *
   * Can also use undefined if there are no values e.g.
   * `[[queryString1, queryString2], undefined]` instead of
   * `[[queryString1, queryString2], [[], []]]`
   * @returns {Promise<Array>} appended result objects
   */
  public async execute(query: [string[], any[][]], handle?: TransactionHandle): Promise<object[]>
  {
    let results: object[] = [];
    const [statements, values] = query;
    if (values !== undefined && statements.length !== values.length)
    {
      throw new Error('statements and values have different lengths');
    }
    for (let i = 0; i < statements.length; ++i)
    {
      const statement = statements[i];
      const value = values !== undefined ? values[i] : [];
      const result: object[] = await new Promise<object[]>((resolve, reject) =>
      {
        this.client.query(statement, handle, value, util.promise.makeCallback(resolve, reject));
      });

      results = results.concat(result['rows']);
    }
    return results;
  }

  public async upsert(table: TastyTable, elements: object[], handle?: TransactionHandle): Promise<object[]>
  {
    const query = new TastyQuery(table).upsert(elements);
    const generated = this.generate(query);
    const primaryKeys = table.getPrimaryKeys();

    const upserted: object[] = await this.execute(generated, handle);

    const results = new Array(upserted.length);
    for (let i = 0; i < results.length; i++)
    {
      results[i] = elements[i];
      if ((primaryKeys.length === 1) &&
        (elements[i][primaryKeys[0]] === undefined))
      {
        results[i][primaryKeys[0]] = upserted[i]['insertid'];
      }
    }

    return results;
  }

  public async startTransaction(isolationLevel: IsolationLevel, readOnly: boolean): Promise<TransactionHandle>
  {
    const handle = await this.client.startTransaction();
    const generator = new PostgreSQLGenerator();
    generator.generateStartTransactionQuery(isolationLevel, readOnly);
    await this.execute([generator.statements, generator.valuesArray], handle);
    return handle;
  }

  public async commitTransaction(handle: TransactionHandle): Promise<object[]>
  {
    const generator = new PostgreSQLGenerator();
    generator.generateCommitQuery();
    const result = this.execute([generator.statements, generator.valuesArray], handle);
    await this.client.endTransaction(handle);
    return result;
  }

  public async rollbackTransaction(handle: TransactionHandle): Promise<object[]>
  {
    const generator = new PostgreSQLGenerator();
    generator.generateRollbackQuery();
    const result = this.execute([generator.statements, generator.valuesArray], handle);
    await this.client.endTransaction(handle);
    return result;
  }

  public async destroy(): Promise<void>
  {
    return new Promise<void>((resolve, reject) =>
    {
      this.client.end(() => resolve());
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
}

export default PostgreSQLDB;
