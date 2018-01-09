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

import SQLiteConfig from '../../../../src/database/sqlite/SQLiteConfig';
import SQLiteController from '../../../../src/database/sqlite/SQLiteController';
import SQLiteDB from '../../../../src/database/sqlite/tasty/SQLiteDB';

import * as Tasty from '../../../../src/tasty/Tasty';
import TastyNodeTypes from '../../../../src/tasty/TastyNodeTypes';
import MySQLQueries from '../../../tasty/MySQLQueries';
import SQLQueries from '../../../tasty/SQLQueries';

const tests = SQLQueries.concat(MySQLQueries);

function testName(index: number)
{
  return 'generate ' + tests[index][0];
}

function testQuery(index: number)
{
  return tests[index][1];
}

const DBMovies: Tasty.Table = new Tasty.Table('movies', ['movieid'], ['title', 'releasedate'], 'movies');
let sqliteController: SQLiteController;
let sqliteDB: SQLiteDB;

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
    sqliteController = new SQLiteController(config, 0, 'SQLiteGeneratorTests');
    sqliteDB = sqliteController.getTasty().getDB() as SQLiteDB;
  } catch (e)
  {
    fail(e);
  }
});

test('node type: skip', (done) =>
{
  expect(TastyNodeTypes[TastyNodeTypes.skip]).toEqual('skip');
  expect(TastyNodeTypes.skip).toEqual(13);
  done();
});

test(testName(0), (done) =>
{
  const query = new Tasty.Query(DBMovies).take(10);
  const qstr = sqliteDB.generate(query);
  expect(qstr).toEqual(testQuery(0));
  done();
});

test(testName(1), (done) =>
{
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]).take(10);
  const qstr = sqliteDB.generate(query);
  expect(qstr).toEqual(testQuery(1));
  done();
});

test(testName(2), (done) =>
{
  const query = new Tasty.Query(DBMovies);
  query.filter(DBMovies['movieid'].equals(123));
  const qstr = sqliteDB.generate(query);
  expect(qstr).toEqual(testQuery(2));
  done();
});

test(testName(3), (done) =>
{
  const query = new Tasty.Query(DBMovies);
  query.filter(DBMovies['title'].doesNotEqual('Toy Story (1995)')).take(10);
  const qstr = sqliteDB.generate(query);
  expect(qstr).toEqual(testQuery(3));
  done();
});

test(testName(4), (done) =>
{
  const query = new Tasty.Query(DBMovies);
  query.sort(DBMovies['title'], 'asc').take(10);
  const qstr = sqliteDB.generate(query);
  expect(qstr).toEqual(testQuery(4));
  done();
});

test(testName(5), (done) =>
{
  const query = new Tasty.Query(DBMovies);
  query.sort(DBMovies['title'], 'desc').take(10);
  const qstr = sqliteDB.generate(query);
  expect(qstr).toEqual(testQuery(5));
  done();
});

test(testName(6), (done) =>
{
  const query = new Tasty.Query(DBMovies);
  query.take(10);
  const qstr = sqliteDB.generate(query);
  expect(qstr).toEqual(testQuery(6));
  done();
});

test(testName(7), (done) =>
{
  const query = new Tasty.Query(DBMovies);
  query.take(10);
  query.skip(20);
  const qstr = sqliteDB.generate(query);
  expect(qstr).toEqual(testQuery(7));
  done();
});

test(testName(8), (done) =>
{
  const query = new Tasty.Query(DBMovies).delete();
  const qstr1 = sqliteDB.generate(query);
  expect(qstr1).toEqual([`DELETE \n  FROM movies;`]);
  query.filter(DBMovies['movieid'].equals(13371337));
  const qstr2 = sqliteDB.generate(query);
  expect(qstr2).toEqual(testQuery(8));
  done();
});

test(testName(9), (done) =>
{
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]).filter(DBMovies['movieid'].neq(2134));
  query.filter(DBMovies['releasedate'].gte('2007-03-24')).filter(DBMovies['releasedate'].lt('2017-03-24'));
  query.sort(DBMovies['title'], 'asc').sort(DBMovies['movieid'], 'desc').sort(DBMovies['releasedate'], 'asc');
  query.take(10).skip(20);

  const qstr = sqliteDB.generate(query);
  /* tslint:disable-next-line:max-line-length */
  expect(qstr).toEqual(testQuery(9));
  done();
});

test(testName(10), (done) =>
{
  const movie = {
    movieid: 13371337,
    releasedate: new Date('01/01/17').toISOString().substring(0, 10),
    title: 'My New Movie',
  };
  const query = new Tasty.Query(DBMovies).upsert(movie);
  const qstr = sqliteDB.generate(query);
  expect(qstr).toEqual(testQuery(10));
  done();
});
