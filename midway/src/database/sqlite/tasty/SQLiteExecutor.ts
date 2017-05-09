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

import TastyExecutor from '../../../tasty/TastyExecutor';
import TastySchema from '../../../tasty/TastySchema';
import { makePromiseCallback, makePromiseCallback0 } from '../../../tasty/Utils';
import SQLiteClient from '../client/SQLiteClient';
import SQLiteConfig from '../SQLiteConfig';

export type Config = SQLiteConfig;

export class SQLiteExecutor implements TastyExecutor
{
  private client: SQLiteClient;

  constructor(client: SQLiteClient)
  {
    this.client = client;
  }

  public async schema(): Promise<TastySchema>
  {
    const results = {};
    results[this.client.getFilename()] = {};

    const tableListResult: any[] = await this.query(['SELECT name FROM sqlite_master WHERE Type=\'table\';']);
    for (const table of tableListResult)
    {
      results[this.client.getFilename()][table.name] = {};
      const colResult: any = await this.query([`pragma table_info(${table.name});`]);
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
   * @returns {Promise<Array>} the result of the last one
   */
  public async query(statements: string[]): Promise<object[]>
  {
    if (statements.length === 0)
    {
      return [];
    }

    for (let i = 0; ; ++i)
    {
      const statement: string = statements[i];
      const result: Promise<object[]> = new Promise<object[]>((resolve, reject) =>
      {
        this.client.all(statement, makePromiseCallback(resolve, reject));
      });

      if (i === statements.length - 1)
      {
        return result;
      }

      await result;
    }
  }

  // /**
  //  * executes statements sequentially
  //  * @param statements
  //  * @returns {Promise<Array>} appended result objects
  //  */
  // public async upsert(statements: string[]): Promise<object[]>
  // {
  //   const result : object[] = [];
  //
  //   for (const statement of statements)
  //   {
  //     const result = await new Promise<object[]>((resolve, reject) =>
  //     {
  //       this.client.all(statement, makePromiseCallback(resolve, reject));
  //     });
  //
  //     result.concat();
  //   }
  // }

  public async destroy(): Promise<void>
  {
    return new Promise<void>((resolve, reject) =>
    {
      this.client.close(makePromiseCallback0(resolve, reject));
    });
  }
}

export default SQLiteExecutor;
