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

import SQLiteConfig from '../../../../src/database/sqlite/SQLiteConfig';
import SQLiteController from '../../../../src/database/sqlite/SQLiteController';

import * as Tasty from '../../../../src/tasty/Tasty';
import MySQLQueries from '../../../tasty/MySQLQueries';
import SQLQueries from '../../../tasty/SQLQueries';
import * as Utils from '../../TestUtil';

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

const DBMovies: Tasty.Table = new Tasty.Table('movies', ['movieid'], ['title', 'releasedate'], 'movies');
let tasty: Tasty.Tasty;
let sqliteController: SQLiteController;

beforeAll(async () =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';
  const config: SQLiteConfig =
    {
      filename: 'moviesdb.db',
    };

  try
  {
    sqliteController = new SQLiteController(config, 0, 'SQLiteExecutorTests');
    tasty = sqliteController.getTasty();
  }
  catch (e)
  {
    fail(e);
  }
});

const tests = SQLQueries.concat(MySQLQueries);

function runTest(index: number)
{
  const testName: string = 'SQLite: execute ' + tests[index][0];
  test(testName, async (done) =>
  {
    try
    {
      const results = await tasty.getDB().execute(tests[index][1]);
      await Utils.checkResults(getExpectedFile(), testName, JSON.parse(JSON.stringify(results)));

    }
    catch (e)
    {
      fail(e);
    }
    done();
  });
}

for (let i = 0; i < tests.length; i++)
{
  runTest(i);
}

test('tasty select', async (done) =>
{
  const results = await tasty.select(DBMovies, [], { movieid: 123 });
  expect(results[0])
    .toEqual({
      movieid: 123,
      releasedate: '1994-07-14 00:00:00',
      title: 'Chungking Express (Chung Hing sam lam) (1994)',
    });
  done();
});

test('SQLite: upsert', async (done) =>
{
  try
  {
    const movies: object[] = [];
    movies[0] = { title: 'Arrival', releasedate: new Date('01/01/17') };
    movies[1] = { title: "Schindler's List", releasedate: new Date('01/01/17') };
    movies[2] = {
      movieid: 232323,
      title: 'Guardians of the Galaxy 2',
      releasedate: new Date('04/04/17').toISOString().substring(0, 10),
    };
    const results: any = await tasty.upsert(DBMovies, movies);
    expect(results).not.toBeUndefined();
    expect(results.length).toBe(movies.length);
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

test('SQLite: schema', async (done) =>
{
  try
  {
    const result = await tasty.schema();
    const expected = {
      tree: {
        'moviesdb.db': {
          movies: {
            movieid: { type: 'INTEGER' },
            title: { type: 'varchar(255)' },
            genres: { type: 'varchar(255)' },
            backdroppath: { type: 'varchar(255)' },
            overview: { type: 'varchar(1000)' },
            posterpath: { type: 'varchar(255)' },
            status: { type: 'varchar(255)' },
            tagline: { type: 'varchar(255)' },
            releasedate: { type: 'datetime' },
            budget: { type: 'int(11)' },
            revenue: { type: 'int(11)' },
            votecount: { type: 'int(11)' },
            popularity: { type: 'float' },
            voteaverage: { type: 'float' },
            homepage: { type: 'varchar(255)' },
            language: { type: 'varchar(255)' },
            runtime: { type: 'int(11)' },
          },
          sqlite_sequence: {
            name: {
              type: '',
            },
            seq: {
              type: '',
            },
          },
        },
      },
    };
    expect(result).toEqual(expected);
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
