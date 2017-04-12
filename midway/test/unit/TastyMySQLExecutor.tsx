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

import MySQLExecutor from '../../tasty/MySQLExecutor';
import Tasty from '../../tasty/Tasty';

let mysql;

test('pool connect', async (t) => {
  try {
    mysql = new MySQLExecutor();
    t.pass();
  } catch (e) {
    t.fail(e);
  }
  t.end();
});

async function runQuery(qstr: string)
{
  const results = await mysql.query(qstr);
  return hash(results);
}

test('execute simple query (select all)', async (t) =>
{
  try {
    const h = await runQuery(`SELECT * \n  FROM movies LIMIT 2;`);
    t.equal(h, `d15b5db30ab0646594e9d9fdceb15d4cd15abb21`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (select columns)', async (t) => {
  try {
    const h = await runQuery(`SELECT movies.movieid, movies.title, movies.releasedate \n  FROM movies LIMIT 2;`);
    t.equal(h, `c4a600914b91978fba05c5395b0e8af0e57a2bb7`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (filter equals)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  WHERE movies.movieid = 123;`);
    t.equal(h, `e75d1f03dfe3ac0647c430986808be602913b14a`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (filter doesNotEqual)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  WHERE movies.title <> 'Toy Story (1995)' LIMIT 2;`);
    t.equal(h, `99c6355f77ad75be42df72613ed3183c7e04393b`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (sort asc)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  ORDER BY movies.title ASC LIMIT 10;`);
    t.equal(h, `40a132ce95fd02fbf1dcc54ccf0923c64f1ba3b5`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (sort desc)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  ORDER BY movies.title DESC LIMIT 10;`);
    t.equal(h, `180dd258a833585bd3b01dcd576fafa4590aeb75`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('execute simple query (take+skip)', async (t) => {
  try {
    const h = await runQuery(`SELECT * \n  FROM movies\n  LIMIT 2 OFFSET 20;`);
    t.equal(h, `3860e6b2713bbf474e826002d353b0abb2aad84a`);
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
    t.equal(h, `6a56be8acf875c3c02db6ab69931e017747582d0`);
  } catch (e) {
    t.skip(e);
  }
  t.end();
});

test('pool destroy', async (t) =>
{
  try {
    await mysql.end();
    t.pass();
  } catch (e)
  {
    t.skip(e);
  }
  t.end();
});
