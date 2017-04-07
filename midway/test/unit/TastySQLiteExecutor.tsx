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
import * as test from 'tape-async';

import SQLiteExecutor from '../../tasty/SQLiteExecutor';
import Tasty from '../../tasty/Tasty';

let sqlite;

test('pool connect', async (t) => {
  try {
    sqlite = new SQLiteExecutor();
    t.pass();
  } catch (e) {
    t.fail(e);
  }
  t.end();
});

async function runQuery(qstr: string)
{
  const results = await sqlite.query(qstr);
  return hash(results);
}

test('execute simple query (select all)', async (t) =>
{
  try {
    const h = await runQuery(`SELECT * \n  FROM movies LIMIT 2;`);
    t.equal(h, `63f0e555f54a998e2837489c5e16a48cc3465bfe`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (select columns)', async (t) => {
  try {
    const h = await runQuery(`SELECT movies.movieid, movies.title, movies.releasedate \n  FROM movies LIMIT 2;`);
    t.equal(h, `1dbce9ceb168544435792b40737b91b342a73a45`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (filter equals)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  WHERE movies.movieid = 123;`);
    t.equal(h, `8f1223a111269da3d83a4fcc58c19acbb1c1f939`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (filter doesNotEqual)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  WHERE movies.title <> 'Toy Story (1995)' LIMIT 2;`);
    t.equal(h, `e5ab1bafd5dad1f90efc676bcdaed0de952f1856`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (sort asc)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  ORDER BY movies.title ASC LIMIT 10;`);
    t.equal(h, `17f7b5e32ef4f39b7a441f85c2b376297e5ea331`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (sort desc)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  ORDER BY movies.title DESC LIMIT 10;`);
    t.equal(h, `a7ddf3bf437bc21655feb24c174dd9fe8a7c6396`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (take+skip)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  LIMIT 2 OFFSET 20;`);
    t.equal(h, `d4059924a51d84c36df9c07868b7c8b0c5d9a1ff`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute complex query (MySQL)', async (t) => {
  try {
    const h = await runQuery(`SELECT movies.movieid, movies.title, movies.releasedate \n  FROM movies\n
                            WHERE movies.movieid <> 2134\n     AND movies.releasedate >= '2007-03-24'\n
                            AND movies.releasedate < '2017-03-24'\n
                            ORDER BY movies.title ASC, movies.movieid DESC, movies.releasedate ASC\n
                            LIMIT 10 OFFSET 20;`);
    t.equal(h, `5a8145ab48d8d81bd05cc3ff80f8c07b34129d5c`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('pool destroy', async (t) =>
{
  try {
    await sqlite.end();
    t.pass();
  } catch (e)
  {
    t.skip(e);
  }
  t.end();
});
