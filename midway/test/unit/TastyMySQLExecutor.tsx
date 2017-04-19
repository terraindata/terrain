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

import * as Tasty from '../../tasty/Tasty';
import SQLQueries from './SQLQueries';

const resultHash: string[] = [
  '229037c41de0bc3458a75022a90a658bd5cf688f',
  '72919e12f8080d2e6f5e71384744b0345bc0de01',
  'e75d1f03dfe3ac0647c430986808be602913b14a',
  '9b9e4b2647b4d26d2f450fa6b4c8ea1c9646f1d1',
  '40a132ce95fd02fbf1dcc54ccf0923c64f1ba3b5',
  '180dd258a833585bd3b01dcd576fafa4590aeb75',
  '229037c41de0bc3458a75022a90a658bd5cf688f',
  '817afc5b747e341d7d785e2c86fbd6bc019605a1',
  'cdba91e06d43ac1d85aee145552d7192fa9886cf',
  'cdba91e06d43ac1d85aee145552d7192fa9886cf',
  '6a56be8acf875c3c02db6ab69931e017747582d0',
];

let tasty: Tasty.Tasty;

async function runQuery(qstr: string)
{
  const results = await tasty.execute(qstr);
  return hash(results);
}

function runTest(index: number)
{
  test('MySQL: execute ' + SQLQueries[index][0], async (t) =>
  {
    try
    {
      const h = await runQuery(SQLQueries[index][1]);
      t.equal(h, resultHash[index]);
    } catch (e)
    {
      t.skip(e);
    }
    t.end();
  });
}

test('pool connect', async (t) =>
{
  const config: Tasty.MySQLConfig =
  {
    connectionLimit: 20,
    database : 'moviesdb',
    host     : 'localhost',
    password : 'r3curs1v3$',
    user     : 't3rr41n-demo',
  };

  try
  {
    tasty = new Tasty.Tasty(Tasty.MySQL, config);
    t.pass();
  } catch (e)
  {
    t.skip(e);
  }
  t.end();
});

for (let i = 0; i < SQLQueries.length; i++)
{
  runTest(i);
}

test('pool destroy', async (t) =>
{
  try
  {
    await tasty.destroy();
    t.pass();
  } catch (e)
  {
    t.skip(e);
  }
  t.end();
});
