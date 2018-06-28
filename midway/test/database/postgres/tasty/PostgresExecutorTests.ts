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

import * as winston from 'winston';

import PostgreSQLClient from '../../../../src/database/pg/client/PostgreSQLClient';
import PostgresConfig from '../../../../src/database/pg/PostgreSQLConfig';
import PostgresController from '../../../../src/database/pg/PostgreSQLController';

import * as Tasty from '../../../../src/tasty/Tasty';
import { IsolationLevel } from '../../../../src/tasty/TastyDB';
import PostgreSQLQueries from '../../../tasty/PostgreSQLQueries';
import SQLQueries from '../../../tasty/SQLQueries';
import * as Utils from '../../TestUtil';

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

let tasty: Tasty.Tasty;
let postgresController: PostgresController;

beforeAll(async () =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';
  const config: PostgresConfig =
    {
      database: 'moviesdb',
      host: 'localhost',
      port: 65432,
      password: 'r3curs1v3$',
      user: 't3rr41n-demo',
    };

  try
  {
    postgresController = new PostgresController(config, 0, 'PostgresExecutorTests');
    let connected = false;
    while (!connected)
    {
      connected = await postgresController.getClient().isConnected();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    tasty = postgresController.getTasty();
  }
  catch (e)
  {
    fail(e);
  }
});

function runTest(testObj: object)
{
  const testName: string = 'Postgres: execute ' + String(testObj[0]);
  test(testName, async (done) =>
  {
    try
    {
      const results = await tasty.getDB().execute([testObj[1], undefined]);
      await Utils.checkResults(getExpectedFile(), testName, JSON.parse(JSON.stringify(results)));
    }
    catch (e)
    {
      fail(e);
    }
    done();
  });
}

const tests = PostgreSQLQueries.concat(SQLQueries);

for (let i = 0; i < tests.length; i++)
{
  runTest(tests[i]);
}

test('Postgres: transactions', async (done) =>
{
  const queries = ['SELECT * \n  FROM movies\n  LIMIT 10;'];
  const client: PostgreSQLClient = tasty.getDB()['client'];
  const transactionIndex = client['nextTransactionIndex'];
  await tasty.executeTransaction(async (handle, commit, rollback) =>
  {
    await tasty.getDB().execute([queries, undefined], handle);
    await commit();
  }, IsolationLevel.REPEATABLE_READ, true);
  await tasty.executeTransaction(async (handle, commit, rollback) =>
  {
    await tasty.getDB().execute([queries, undefined], handle);
    await rollback();
  }, IsolationLevel.SERIALIZABLE);
  await tasty.executeTransaction(async (handle, commit, rollback) =>
  {
    await tasty.getDB().execute([queries, undefined], handle);
    await commit();
  });
  await expect(tasty.executeTransaction(async (handle, commit, rollback) =>
  {
    throw new Error('ABC');
  })).rejects.toThrow('ABC');
  let poolClient;
  await expect(tasty.executeTransaction(async (handle, commit, rollback) =>
  {
    expect((await tasty.getDB().execute([queries, undefined], handle)).length).toBe(10);
    expect(client['transactionClients'][handle]).toBeTruthy();
    poolClient = client['transactionClients'][handle];
  })).rejects.toThrow('Transaction was not ended');
  expect(poolClient.release).toThrow('Release called on client which has already been released to the pool.');
  expect(client['transactionClients']).toEqual({});
  expect(client['nextTransactionIndex']).toBeGreaterThanOrEqual(transactionIndex + 5);
  done();
});

test('Postgres: transaction locking', async (done) =>
{
  const table = new Tasty.Table(
    'movies',
    ['movieid'],
    ['title', 'votecount'],
  );

  expect(await tasty.executeTransaction(async (handle, commit, rollback) =>
  {
    const movies = await tasty.select(table, ['movieid'], { votecount: 541 }, true, false, false, handle);
    expect(movies.length).toBe(2);
    expect(await tasty.select(table, ['movieid'], { votecount: 541 })).toEqual(movies);

    await expect(tasty.executeTransaction(async (handle2, commit2, rollback2) =>
    {
      expect(await tasty.select(table, ['movieid'], { movieid: movies[0]['movieid'] }, true, false, true, handle2)).toEqual([]);
      await tasty.select(table, ['movieid'], { movieid: movies[0]['movieid'] }, true, true, false, handle2);
    })).rejects.toThrow('could not obtain lock on row in relation "movies"');

    const start = new Date().getTime();
    setTimeout(commit, 2000);

    await tasty.executeTransaction(async (handle2, commit2, rollback2) =>
    {
      await tasty.select(table, ['movieid'], { movieid: movies[0]['movieid'] }, true, false, false, handle2);
      await commit2();
    });

    expect(new Date().getTime() - start).toBeGreaterThan(1900);

    return 3;
  })).toBe(3);
  done();
});

test('Postgres: parameterized', async (done) =>
{
  expect(
    (await tasty.getDB().execute([['SELECT * FROM movies WHERE title LIKE $1 AND votecount > $2 AND $3;'], [['Bad%', 20, true]]])).length,
  ).toBe(23);
  expect(
    (await tasty.getDB().execute([['SELECT * FROM movies WHERE title LIKE $1 AND votecount > $2 AND $3;'], [['Bad%', 20, false]]])).length,
  ).toBe(0);
  await expect(tasty.getDB().execute([['SELECT * FROM movies WHERE title LIKE $1 AND votecount > $2;'], [['Bad%', 20, 21]]]))
    .rejects.toThrow();
  await expect(tasty.getDB().execute([['SELECT * FROM movies WHERE title LIKE $1 AND votecount > $2;'], [['Bad%']]]))
    .rejects.toThrow();
  await expect(tasty.getDB().execute([['SELECT * FROM movies WHERE title LIKE $1 AND votecount > $2;'], [['Bad%', 20], []]]))
    .rejects.toThrow();
  done();
});

afterAll(async () =>
{
  try
  {
    await tasty.destroy();
  }
  catch (e)
  {
    fail(e);
  }
});
