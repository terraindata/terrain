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

import * as chai from 'chai';
import * as test from 'tape';
const {assert} = chai;
import * as sinon from 'sinon';

import Tasty from '../../tasty/Tasty';
import TastyNodeTypes from '../../tasty/TastyNodeType';

test('Skip node type', (t) => {
  t.equal(TastyNodeTypes['skip'].name, 'skip');
  t.equal(TastyNodeTypes['skip'].code, 10);
  t.end();
});

let DBUsers = new Tasty.Table('users', ['id'], ['name', 'joinDate']);

test('Simple Tasty Query (select all)', (t) => {
  let query = new Tasty.Query(DBUsers);
  let qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM 'users'\n  LIMIT 0 OFFSET 0;`);
  t.end();
});

test('Simple Tasty Query (select columns)', (t) => {
  let query = new Tasty.Query(DBUsers);
  query.select([DBUsers['id'], DBUsers['name'], DBUsers['joinDate']]);
  let qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT 'users'.'id', 'users'.'name', 'users'.'joinDate' \n  FROM 'users'\n  LIMIT 0 OFFSET 0;`);
  t.end();
});

test('Simple Tasty Query (filter equals)', (t) => {
  let query = new Tasty.Query(DBUsers);
  query.filter(DBUsers['id'].equals(123));
  let qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM 'users'\n  WHERE 'users'.\'id\' = 123\n  LIMIT 0 OFFSET 0;`);
  t.end();
});

test('Simple Tasty Query (filter doesNotEqual)', (t) => {
  let query = new Tasty.Query(DBUsers);
  query.filter(DBUsers['name'].doesNotEqual('notMyUser'));
  let qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM 'users'\n  WHERE 'users'.'name' <> 'notMyUser'\n  LIMIT 0 OFFSET 0;`);
  t.end();
});

test('Simple Tasty Query (sort asc)', (t) => {
  let query = new Tasty.Query(DBUsers);
  query.sort(DBUsers['name'], 'asc');
  let qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM 'users'\n  ORDER BY 'users'.'name' ASC\n  LIMIT 0 OFFSET 0;`);
  t.end();
});

test('Simple Tasty Query (sort desc)', (t) => {
  let query = new Tasty.Query(DBUsers);
  query.sort(DBUsers['name'], 'desc');
  let qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM 'users'\n  ORDER BY 'users'.'name' DESC\n  LIMIT 0 OFFSET 0;`);
  t.end();
});

test('Simple Tasty Query (take)', (t) => {
  let query = new Tasty.Query(DBUsers);
  query.take(10);
  let qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM 'users'\n  LIMIT 10 OFFSET 0;`);
  t.end();
});

test('Simple Tasty Query (skip)', (t) => {
  let query = new Tasty.Query(DBUsers);
  query.skip(20);
  let qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM 'users'\n  LIMIT 0 OFFSET 20;`);
  t.end();
});

test('Complex Tasty Query (MySQL)', (t) => {
  let query = new Tasty.Query(DBUsers).select([DBUsers['id'], DBUsers['name'], DBUsers['joinDate']]).filter(DBUsers['id'].neq(2134));
  query.filter(DBUsers['joinDate'].gte('2007-03-24')).filter(DBUsers['joinDate'].lt('2017-03-24'));
  query.sort(DBUsers['name'], 'asc').sort(DBUsers['id'], 'desc').sort(DBUsers['joinDate'], 'asc');
  query.take(10).skip(20);

  let qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT 'users'.'id', 'users'.'name', 'users'.'joinDate' \n  FROM 'users'\n  WHERE 'users'.'id' <> 2134\n     AND 'users'.'joinDate' >= '2007-03-24'\n     AND 'users'.'joinDate' < '2017-03-24'\n  ORDER BY 'users'.'name' ASC, 'users'.'id' DESC, 'users'.'joinDate' ASC\n  LIMIT 10 OFFSET 20;`);
  t.end();
});

test('Complex Tasty Query (Elastic)', (t) => {
  let query = new Tasty.Query(DBUsers).select([DBUsers['id'], DBUsers['name'], DBUsers['joinDate']]).filter(DBUsers['id'].neq(2134));
  query.filter(DBUsers['joinDate'].gte('2007-03-24')).filter(DBUsers['joinDate'].lt('2017-03-24'));
  query.sort(DBUsers['name'], 'asc').sort(DBUsers['id'], 'desc').sort(DBUsers['joinDate'], 'asc');
  query.take(10).skip(20);

  let qstr = JSON.stringify(Tasty.Elastic.generate(query));
  t.equal(qstr, `{"from":20,"size":10,"stored_fields":["id","name","joinDate"],"query":{"filter":{"bool":{"must_not":[{"term":{"id":2134}}]},"range":{"joinDate":{"gte":"2007-03-24","lt":"2017-03-24"}}}},"sort":[{"name":"asc"},{"id":"desc"},{"joinDate":"asc"}]}`);
  t.end();
});
