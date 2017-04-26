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

import SQLiteExecutor from '../../src/tasty/SQLiteExecutor';
import * as Tasty from '../../src/tasty/Tasty';
import * as Utils from '../Utils';
import SQLQueries from './SQLQueries';

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

let tasty: Tasty.Tasty;

function runTest(index: number)
{
  const testName: string = 'SQLite: execute ' + SQLQueries[index][0];
  test(testName, async (done) =>
  {
    try
    {
      const results = await tasty.execute(SQLQueries[index][1]);
      await Utils.checkResults(getExpectedFile(), testName, JSON.parse(JSON.stringify(results)));

    } catch (e)
    {
      fail(e);
    }
    done();
  });
}

beforeAll(async () =>
{
  const config: Tasty.SQLiteConfig =
    {
      filename: 'moviesdb.db',
    };

  try
  {
    tasty = new Tasty.Tasty(Tasty.SQLite, config);
  } catch (e)
  {
    fail(e);
  }
});

for (let i = 0; i < SQLQueries.length; i++)
{
  runTest(i);
}

const DBMovies = new Tasty.Table('movies', ['movieid'], ['title', 'releasedate']);

test('tasty select', async (done) =>
{
  const movieid = 123;
  const results = await tasty.select(DBMovies, [], { movieid: 123 });
  expect(results[0])
    .toEqual({
      movieid: 123,
      releasedate: '1994-07-14 00:00:00',
      title: 'Chungking Express (Chung Hing sam lam) (1994)',
    });
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
            movieid: { type: 'int(11)' },
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
        },
      },
    };
    expect(result).toEqual(expected);
  } catch (e)
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
  } catch (e)
  {
    fail(e);
  }
});
