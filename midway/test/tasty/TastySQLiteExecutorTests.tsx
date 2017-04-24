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

import * as hash from 'object-hash';

import SQLiteExecutor from '../../src/tasty/SQLiteExecutor';
import * as Tasty from '../../src/tasty/Tasty';
import SQLQueries from './SQLQueries';

const resultHash: string[] = [
  '25947fb6a68505be72373babb0499bd51b5e44fb',
  '3da7fb2ac116d0ceb112a1f7593b94dd4c4b3112',
  '289dbad322d227eee7385af01e964dbcecb0b4a2',
  '2699d0b1d7879de7fcfc34b921e43404f552b39e',
  '3bbef0194391e54c7642693a0a5357e8d16611b8',
  'f93adfaaa1986dc5d1dedc54e73eee59faab3985',
  '25947fb6a68505be72373babb0499bd51b5e44fb',
  '5b95dc900d820ee93091e4861e2aeea16e7ead43',
  '989db2448f309bfdd99b513f37c84b8f5794d2b5',
  '989db2448f309bfdd99b513f37c84b8f5794d2b5',
  'c95266c7ea79135e06bf67a60e78204a3491a2f2',
];

let tasty: Tasty.Tasty;

async function runQuery(qstr: string)
{
  const results = await tasty.execute(qstr);
  return hash(results);
}

function runTest(index: number)
{
  test('SQLite: execute ' + SQLQueries[index][0], async (done) =>
  {
    try
    {
      const h = await runQuery(SQLQueries[index][1]);
      expect(h).toBe(resultHash[index]);
    } catch (e)
    {
      fail(e);
    }
    done();
  });
}

test('pool connect', async (done) =>
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
  done();
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
  expect(results[0]).toEqual({ movieid: 123, releasedate: '1994-07-14 00:00:00', title: 'Chungking Express (Chung Hing sam lam) (1994)' });
  done();
});

test('pool destroy', async (done) =>
{
  try
  {
    await tasty.destroy();
  } catch (e)
  {
    fail(e);
  }
  done();
});
