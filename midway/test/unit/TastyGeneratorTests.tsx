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

import * as Tasty from '../../tasty/Tasty';
import TastyNodeTypes from '../../tasty/TastyNodeTypes';
import SQLQueries from './SQLQueries';

function testName(index: number)
{
  return 'generate ' + SQLQueries[index][0];
}

function testQuery(index: number)
{
  return SQLQueries[index][1];
}

test('node type: skip', (t) => {
  t.equal(TastyNodeTypes[TastyNodeTypes.skip], 'skip');
  t.equal(TastyNodeTypes.skip, 11);
  t.end();
});

const DBMovies = new Tasty.Table('movies', ['movieid'], ['title', 'releasedate']);

test(testName(0), (t) => {
  const query = new Tasty.Query(DBMovies).take(10);
  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr, testQuery(0));
  t.end();
});

test(testName(1), (t) => {
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]).take(10);
  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr, testQuery(1));
  t.end();
});

test(testName(2), (t) => {
  const query = new Tasty.Query(DBMovies);
  query.filter(DBMovies['movieid'].equals(123));
  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr, testQuery(2));
  t.end();
});

test(testName(3), (t) => {
  const query = new Tasty.Query(DBMovies);
  query.filter(DBMovies['title'].doesNotEqual('Toy Story (1995)')).take(10);
  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr, testQuery(3));
  t.end();
});

test(testName(4), (t) => {
  const query = new Tasty.Query(DBMovies);
  query.sort(DBMovies['title'], 'asc').take(10);
  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr, testQuery(4));
  t.end();
});

test(testName(5), (t) => {
  const query = new Tasty.Query(DBMovies);
  query.sort(DBMovies['title'], 'desc').take(10);
  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr, testQuery(5));
  t.end();
});

test(testName(6), (t) => {
  const query = new Tasty.Query(DBMovies);
  query.take(10);
  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr, testQuery(6));
  t.end();
});

test(testName(7), (t) => {
  const query = new Tasty.Query(DBMovies);
  query.take(10);
  query.skip(20);
  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr, testQuery(7));
  t.end();
});

test(testName(8), (t) => {
  const movie = {
    movieid: 13371337,
    releasedate: new Date('01/01/17').toISOString().substring(0, 10),
    title: 'My New Movie',
  };
  const query = new Tasty.Query(DBMovies).upsert(movie);
  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr, testQuery(8));
  t.end();
});

test(testName(9), (t) => {
  const query = new Tasty.Query(DBMovies).delete();
  const qstr1 = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr1, `DELETE \n  FROM movies;`);
  query.filter(DBMovies['movieid'].equals(13371337));
  const qstr2 = Tasty.Tasty.generate(Tasty.MySQL, query);
  t.equal(qstr2, testQuery(9));
  t.end();
});

test(testName(10), (t) => {
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]).filter(DBMovies['movieid'].neq(2134));
  query.filter(DBMovies['releasedate'].gte('2007-03-24')).filter(DBMovies['releasedate'].lt('2017-03-24'));
  query.sort(DBMovies['title'], 'asc').sort(DBMovies['movieid'], 'desc').sort(DBMovies['releasedate'], 'asc');
  query.take(10).skip(20);

  const qstr = Tasty.Tasty.generate(Tasty.MySQL, query);
  /* tslint:disable-next-line:max-line-length */
  t.equal(qstr, testQuery(10));
  t.end();
});

test('generate complex query (Elastic)', (t) => {
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]).filter(DBMovies['movieid'].neq(2134));
  query.filter(DBMovies['releasedate'].gte('2007-03-24')).filter(DBMovies['releasedate'].lt('2017-03-24'));
  query.sort(DBMovies['title'], 'asc').sort(DBMovies['movieid'], 'desc').sort(DBMovies['releasedate'], 'asc');
  query.take(10).skip(20);

  const qstr = JSON.stringify(Tasty.Tasty.generate(Tasty.ElasticSearch, query));
  /* tslint:disable-next-line:max-line-length */
  t.equal(qstr, `{"index":"movies","from":20,"size":10,"stored_fields":["movieid","title","releasedate"],"query":{"filter":{"bool":{"must_not":[{"term":{"movieid":2134}}]},"range":{"releasedate":{"gte":"2007-03-24","lt":"2017-03-24"}}}},"sort":[{"title":"asc"},{"movieid":"desc"},{"releasedate":"asc"}]}`);
  t.end();
});
