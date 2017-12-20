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

import * as Tasty from '../../../../src/tasty/Tasty';
import MySQLQueries from '../../../tasty/MySQLQueries';
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

function runTest(testObj: object)
{
  const testName: string = 'MySQL: execute ' + testObj[0];
  test(testName, async (done) =>
  {
    try
    {
      const results = await tasty.getDB().execute(testObj[1]);
      await Utils.checkResults(getExpectedFile(), testName, JSON.parse(JSON.stringify(results)));
    }
    catch (e)
    {
      fail(e);
    }
    done();
  });
}

const tests = SQLQueries.concat(MySQLQueries);

for (let i = 0; i < tests.length; i++)
{
  runTest(tests[i]);
}

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
