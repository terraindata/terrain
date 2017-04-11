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

test('skip node type', (t) => {
  t.equal(TastyNodeTypes[TastyNodeTypes.skip], 'skip');
  t.equal(TastyNodeTypes.skip, 9);
  t.end();
});

const DBMovies = new Tasty.Table('movies', ['movieid'], ['title', 'releasedate']);

test('generate simple query (select all)', (t) => {
  const query = new Tasty.Query(DBMovies);
  const qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM movies;`);
  t.end();
});

test('generate simple query (select columns)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]);
  const qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT movies.movieid, movies.title, movies.releasedate \n  FROM movies;`);
  t.end();
});

test('generate simple query (filter equals)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.filter(DBMovies['movieid'].equals(123));
  const qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM movies\n  WHERE movies.movieid = 123;`);
  t.end();
});

test('generate simple query (filter doesNotEqual)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.filter(DBMovies['title'].doesNotEqual('Toy Story (1995)'));
  const qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM movies\n  WHERE movies.title <> 'Toy Story (1995)';`);
  t.end();
});

test('generate simple query (sort asc)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.sort(DBMovies['title'], 'asc');
  const qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM movies\n  ORDER BY movies.title ASC;`);
  t.end();
});

test('generate simple query (sort desc)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.sort(DBMovies['title'], 'desc');
  const qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM movies\n  ORDER BY movies.title DESC;`);
  t.end();
});

test('generate simple query (take)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.take(10);
  const qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM movies\n  LIMIT 10;`);
  t.end();
});

test('generate simple query (skip)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.skip(20);
  const qstr = Tasty.MySQL.generate(query);
  t.equal(qstr, `SELECT * \n  FROM movies\n  OFFSET 20;`);
  t.end();
});

test('generate complex query (MySQL)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]).filter(DBMovies['movieid'].neq(2134));
  query.filter(DBMovies['releasedate'].gte('2007-03-24')).filter(DBMovies['releasedate'].lt('2017-03-24'));
  query.sort(DBMovies['title'], 'asc').sort(DBMovies['movieid'], 'desc').sort(DBMovies['releasedate'], 'asc');
  query.take(10).skip(20);

  const qstr = Tasty.MySQL.generate(query);
  /* tslint:disable-next-line:max-line-length */
  t.equal(qstr, `SELECT movies.movieid, movies.title, movies.releasedate \n  FROM movies\n  WHERE movies.movieid <> 2134\n     AND movies.releasedate >= '2007-03-24'\n     AND movies.releasedate < '2017-03-24'\n  ORDER BY movies.title ASC, movies.movieid DESC, movies.releasedate ASC\n  LIMIT 10 OFFSET 20;`);
  t.end();
});

test('generate complex query (Elastic)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]).filter(DBMovies['movieid'].neq(2134));
  query.filter(DBMovies['releasedate'].gte('2007-03-24')).filter(DBMovies['releasedate'].lt('2017-03-24'));
  query.sort(DBMovies['title'], 'asc').sort(DBMovies['movieid'], 'desc').sort(DBMovies['releasedate'], 'asc');
  query.take(10).skip(20);

  const qstr = JSON.stringify(Tasty.Elastic.generate(query));
  /* tslint:disable-next-line:max-line-length */
  t.equal(qstr, `{"index":"movies","from":20,"size":10,"stored_fields":["movieid","title","releasedate"],"query":{"filter":{"bool":{"must_not":[{"term":{"movieid":2134}}]},"range":{"releasedate":{"gte":"2007-03-24","lt":"2017-03-24"}}}},"sort":[{"title":"asc"},{"movieid":"desc"},{"releasedate":"asc"}]}`);
  t.end();
});
