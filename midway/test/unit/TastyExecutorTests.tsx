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

let skip: boolean = false;
let mysql;

test('pool connect', async (t) => {
  try {
    mysql = new MySQLExecutor();
  } catch (e)
  {
    t.fail(e);
    t.end();
    skip = true;
    return;
  }
  t.pass();
  t.end();
});

async function runQuery(qstr: string)
{
  let results = await mysql.query(qstr);
  return hash(results);
}

test('execute simple query (select all)', async (t) =>
{
  if (skip === true)
  {
    t.skip();
    t.end();
    return;
  }

  let h = await runQuery(`SELECT * \n  FROM movies LIMIT 2;`);
  t.equal(h, `38877538d52f8f6f7e81a95d38e2aeaaad9f5043`);
  t.end();
});

test('execute simple query (select columns)', async (t) => {
  if (skip === true)
  {
    t.skip();
    t.end();
    return;
  }

  let h = await runQuery(`SELECT movies.movieid, movies.title, movies.releasedate \n  FROM movies LIMIT 2;`);
  t.equal(h, `dc07a13cda832dfd0be10b26ad68b87d3272d11d`);
  t.end();
});

test('execute simple query (filter equals)', async (t) => {
  if (skip === true)
  {
    t.skip();
    t.end();
    return;
  }
  let h = await runQuery(`SELECT * \n  FROM movies\n  WHERE movies.movieid = 123;`);
  t.equal(h, `24b3b17d77c1a849692a7a2a4a5f1de1978816f4`);
  t.end();
});

test('execute simple query (filter doesNotEqual)', async (t) => {
  if (skip === true)
  {
    t.skip();
    t.end();
    return;
  }
  let h = await runQuery(`SELECT * \n  FROM movies\n  WHERE movies.title <> 'Toy Story (1995)' LIMIT 2;`);
  t.equal(h, `0ea0dca172bcfc6d8b32da35259390e320cbc53b`);
  t.end();
});

test('execute simple query (sort asc)', async (t) => {
  if (skip === true)
  {
    t.skip();
    t.end();
    return;
  }
  let h = await runQuery(`SELECT * \n  FROM movies\n  ORDER BY movies.title ASC LIMIT 10;`);
  t.equal(h, `d865452b582b20d92d5e00c538f5a0645df4cfdf`);
  t.end();
});

test('execute simple query (sort desc)', async (t) => {
  if (skip === true)
  {
    t.skip();
    t.end();
    return;
  }
  let h = await runQuery(`SELECT * \n  FROM movies\n  ORDER BY movies.title DESC LIMIT 10;`);
  t.equal(h, `464d75bb6d519b4aa11f5aa435bb30d80be48837`);
  t.end();
});

test('execute simple query (take+skip)', async (t) => {
  if (skip === true)
  {
    t.skip();
    t.end();
    return;
  }
  let h = await runQuery(`SELECT * \n  FROM movies\n  LIMIT 2 OFFSET 20;`);
  t.equal(h, `0f319cfcf59f21e1804f4da6fd5b902f2dc8810a`);
  t.end();
});

test('execute complex query (MySQL)', async (t) => {
  if (skip === true)
  {
    t.skip();
    t.end();
    return;
  }
  let h = await runQuery(`SELECT movies.movieid, movies.title, movies.releasedate \n  FROM movies\n  WHERE movies.movieid <> 2134\n     AND movies.releasedate >= '2007-03-24'\n     AND movies.releasedate < '2017-03-24'\n  ORDER BY movies.title ASC, movies.movieid DESC, movies.releasedate ASC\n  LIMIT 10 OFFSET 20;`);
  t.equal(h, `f1c34d8cbc4877c9fe93e7e1f3f82d4b84bc63d3`);
  t.end();
});

test('pool destroy', (t) =>
{
  try {
    mysql.end();
  } catch (e)
  {
    t.fail(e);
    return;
  }
  t.end();

  // FIX: end the testsuite gracefully making sure that we do not have
  // any leaked handles
  process.exit();
});
