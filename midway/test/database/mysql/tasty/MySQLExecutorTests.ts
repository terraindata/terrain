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

import * as winston from 'winston';

import MySQLConfig from '../../../../src/database/mysql/MySQLConfig';
import MySQLController from '../../../../src/database/mysql/MySQLController';
import MySQLExecutor from '../../../../src/database/mysql/tasty/MySQLExecutor';

import * as Tasty from '../../../../src/tasty/Tasty';
import SQLQueries from '../../../tasty/SQLQueries';
import * as Utils from '../../../Utils';

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

const DBMovies: Tasty.Table = new Tasty.Table('movies', ['movieid'], ['title', 'releasedate']);
let tasty: Tasty.Tasty;
let mysqlController: MySQLController;

beforeAll(async () =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';
  const config: MySQLConfig =
    {
      connectionLimit: 20,
      database: 'moviesdb',
      host: 'localhost',
      password: 'r3curs1v3$',
      user: 't3rr41n-demo',
      dateStrings: true,
    };

  try
  {
    mysqlController = new MySQLController(config, 0, 'MySQLExecutorTests');
    tasty = mysqlController.getTasty();
  }
  catch (e)
  {
    fail(e);
  }
});

function runTest(index: number)
{
  const testName: string = 'MySQL: execute ' + SQLQueries[index][0];
  test(testName, async (done) =>
  {
    try
    {
      const results = await tasty.getExecutor().query(SQLQueries[index][1]);
      await Utils.checkResults(getExpectedFile(), testName, JSON.parse(JSON.stringify(results)));
    }
    catch (e)
    {
      fail(e);
    }
    done();
  });
}

for (let i = 0; i < SQLQueries.length; i++)
{
  runTest(i);
}

test('MySQL: schema', async (done) =>
{
  try
  {
    const result = await tasty.schema();
    await Utils.checkResults(getExpectedFile(), 'MySQL: schema', result);
  }
  catch (e)
  {
    fail(e);
  }
  done();
});

test('MySQL: upsert', async (done) =>
{
  try
  {
    const movies: object[] = [];
    movies[0] = { title: 'Arrival', releasedate: new Date('01/01/17').toISOString().substring(0, 10) };
    movies[1] = { title: 'Alien: Covenant', releasedate: new Date('01/01/17').toISOString().substring(0, 10) };
    movies[2] = {
      movieid: 232323, title: 'Guardians of the Galaxy 2',
      releasedate: new Date('04/04/17').toISOString().substring(0, 10),
    };

    const results: any = await tasty.upsert(DBMovies, movies);
    expect(results).not.toBeUndefined();
    for (let i = 0; i < results.length; i++)
    {
      expect(results[i]).toMatchObject(movies[i]);
      expect(results[i]['movieid']).toBeGreaterThan(0);
    }
  }
  catch (e)
  {
    fail(e);
  }
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
