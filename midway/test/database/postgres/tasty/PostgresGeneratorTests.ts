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

import PostgresConfig from '../../../../src/database/pg/PostgreSQLConfig';
import PostgresController from '../../../../src/database/pg/PostgreSQLController';
import PostgresDB from '../../../../src/database/pg/tasty/PostgreSQLDB';

import * as Tasty from '../../../../src/tasty/Tasty';
import TastyNode from '../../../../src/tasty/TastyNode';
import TastyNodeTypes from '../../../../src/tasty/TastyNodeTypes';
import TastyQuery from '../../../../src/tasty/TastyQuery';
import TastyTable from '../../../../src/tasty/TastyTable';

const DBMovies: Tasty.Table = new Tasty.Table('movies', ['movieID'], ['title', 'releaseDate'], 'movies');

let tasty: Tasty.Tasty;
let pgController: PostgresController;
let pgDB: PostgresDB;

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
    pgController = new PostgresController(config, 0, 'PostgresGeneratorTests');
    tasty = pgController.getTasty();
    pgDB = pgController.getTasty().getDB() as PostgresDB;
  }
  catch (e)
  {
    fail(e);
  }
});

test('Postgres Generator: mixedCase', async (done) =>
{
  const movie = {
    movieID: 13371337,
    releaseDate: new Date('01/01/17').toISOString().substring(0, 10),
    myTitle: 'My New Movie',
  };
  let query = new Tasty.Query(DBMovies).upsert(movie);
  let qstr = pgDB.generate(query);
  expect(qstr).toBeInstanceOf(Array);
  expect(qstr.length).toBeGreaterThan(0);
  expect(qstr[0]).toEqual([
    'INSERT INTO "movies" ("movieID", "releaseDate")' +
    ' VALUES ($1, $2)' +
    ' ON CONFLICT ("movieID") DO UPDATE SET ("movieID", "releaseDate") = ($1, $2)' +
    ' WHERE ("movies"."movieID") = (13371337) RETURNING "movieID" AS insertid;',
  ]);

  query = new Tasty.Query(DBMovies)
    .select([DBMovies['movieID']])
    .filter(DBMovies['releaseDate']
    .doesNotEqual('01/01/2017'))
    .sort(DBMovies['movieID'], 'asc');
  qstr = pgDB.generate(query);
  expect(qstr).toBeInstanceOf(Array);
  expect(qstr.length).toBeGreaterThan(0);
  expect(qstr[0]).toEqual([
    'SELECT "movies"."movieID" FROM "movies"\n  WHERE "movies"."releaseDate" <> $1\n  ORDER BY "movies"."movieID" ASC;',
  ]);
  done();
});

test('Postgres: generator', async (done) =>
{
  const table = new TastyTable(
    'test',
    ['id'],
    ['fname', 'lname'],
  );
  const query = new TastyQuery(table).select([table.getColumns().get('lname')])
    .filter(table.getColumns().get('lname').lt(TastyNode.make('ABC')))
    .filter(table.getColumns().get('lname').gt(TastyNode.make('A')))
    .noWait().forUpdate();
  expect(pgDB.generate(query)).toEqual(
    [['SELECT "test"."lname" FROM "test"\n  WHERE "test"."lname" < $1\n     AND "test"."lname" > $2\n  FOR UPDATE\n  NOWAIT;'],
    [['ABC', 'A']]],
  );
  done();
});
