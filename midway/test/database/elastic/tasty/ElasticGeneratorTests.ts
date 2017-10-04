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

import ElasticConfig from '../../../../src/database/elastic/ElasticConfig';
import ElasticController from '../../../../src/database/elastic/ElasticController';
import ElasticDB from '../../../../src/database/elastic/tasty/ElasticDB';
import * as Tasty from '../../../../src/tasty/Tasty';
import TastyTable from '../../../../src/tasty/TastyTable';

let DBMovies: TastyTable;
let elasticController: ElasticController;
let elasticDB: ElasticDB;

beforeAll(() =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';
  const elasticConfig: ElasticConfig = {
    hosts: ['http://localhost:9200'],
  };

  DBMovies = new Tasty.Table('data', ['movieid'], ['title', 'releasedate'], 'movies');

  elasticController = new ElasticController(elasticConfig, 0, 'ElasticGeneratorTests');
  elasticDB = elasticController.getTasty().getDB() as ElasticDB;
});

test('t1', () =>
{
  const query = new Tasty.Query(DBMovies).take(10);
  const qstr = elasticDB.generateString(query);
  expect(JSON.parse(qstr)).toEqual(
    [
      {
        fields: [
          'movieid',
          'releasedate',
          'title',
        ],
        index: 'movies',
        primaryKeys: [
          'movieid',
        ],
        table: 'data',
        op: 'select',
        params: [
          {
            index: 'movies',
            type: 'data',
            size: 10,
            body: {},
          }],
      }]);
});

test('t2', () =>
{
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]).take(10);
  const qstr = elasticDB.generateString(query);
  // tslint:disable-next-line:max-line-length
  expect(qstr).toEqual('[{"index":"movies","table":"data","primaryKeys":["movieid"],"fields":["movieid","releasedate","title"],"op":"select","params":[{"index":"movies","type":"data","size":10,"body":{"_source":["movieid","title","releasedate"]}}]}]');
});

test('t3', () =>
{
  const query = new Tasty.Query(DBMovies);
  query.filter(DBMovies['movieid'].equals(123));
  const qstr = elasticDB.generateString(query);
  // tslint:disable-next-line:max-line-length
  expect(qstr).toEqual('[{"index":"movies","table":"data","primaryKeys":["movieid"],"fields":["movieid","releasedate","title"],"op":"select","params":[{"index":"movies","type":"data","body":{"query":{"bool":{"filter":{"match":{"movieid":123}}}}}}]}]');
});

test('t4', () =>
{
  const query = new Tasty.Query(DBMovies);
  query.filter(DBMovies['title'].doesNotEqual('Toy Story (1995)')).take(10);
  const qstr = elasticDB.generateString(query);
  // tslint:disable-next-line:max-line-length
  expect(qstr).toEqual('[{"index":"movies","table":"data","primaryKeys":["movieid"],"fields":["movieid","releasedate","title"],"op":"select","params":[{"index":"movies","type":"data","size":10,"body":{"query":{"bool":{"must_not":[{"match":{"title":"Toy Story (1995)"}}]}}}}]}]');
});

test('t5', () =>
{
  const query = new Tasty.Query(DBMovies);
  query.sort(DBMovies['movieid'], 'asc').take(10);
  const qstr = elasticDB.generateString(query);
  // tslint:disable-next-line:max-line-length
  expect(qstr).toEqual('[{"index":"movies","table":"data","primaryKeys":["movieid"],"fields":["movieid","releasedate","title"],"op":"select","params":[{"index":"movies","type":"data","size":10,"body":{"sort":[{"movieid":{"order":"asc"}}]}}]}]');
});

test('t6', () =>
{
  const query = new Tasty.Query(DBMovies);
  query.sort(DBMovies['movieid'], 'desc').take(10);
  const qstr = elasticDB.generateString(query);
  // tslint:disable-next-line:max-line-length
  expect(qstr).toEqual('[{"index":"movies","table":"data","primaryKeys":["movieid"],"fields":["movieid","releasedate","title"],"op":"select","params":[{"index":"movies","type":"data","size":10,"body":{"sort":[{"movieid":{"order":"desc"}}]}}]}]');
});

test('t7', () =>
{
  const query = new Tasty.Query(DBMovies);
  query.select([DBMovies['movieid'], DBMovies['title'], DBMovies['releasedate']]).filter(DBMovies['movieid'].neq(2134));
  query.filter(DBMovies['releasedate'].gte('2007-03-24')).filter(DBMovies['releasedate'].lt('2017-03-24'));
  query.sort(DBMovies['movieid'], 'desc').sort(DBMovies['releasedate'], 'asc');
  query.take(10).skip(20);

  const qstr = elasticDB.generateString(query);
  // tslint:disable-next-line:max-line-length
  expect(qstr)
    .toEqual('[{"index":"movies","table":"data","primaryKeys":["movieid"],"fields":["movieid","releasedate","title"],"op":"select","params":[{"index":"movies","type":"data","from":20,"size":10,"body":{"_source":["movieid","title","releasedate"],"sort":[{"movieid":{"order":"desc"}},{"releasedate":{"order":"asc"}}],"query":{"bool":{"filter":{"bool":{"must":[{"range":{"releasedate":{"gte":"2007-03-24"}}},{"range":{"releasedate":{"lt":"2017-03-24"}}}]}},"must_not":[{"match":{"movieid":2134}}]}}}}]}]');
});
