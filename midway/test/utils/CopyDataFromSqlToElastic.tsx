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
import MySQLExecutor from '../../tasty/MySQLExecutor';
import ElasticExecutor from '../../tasty/ElasticExecutor';
import Tasty from '../../tasty/Tasty';
import * as mysql from 'mysql';
import * as hash from 'object-hash';

//run this test `./node_modules/.bin/ts-node --harmony ./midway/test/utils/CopyDataFromSqlToElastic.tsx`

const td1MySQLConfig: mysql.IPoolConfig = {
    connectionLimit: 20,
    database: 'tdbdtest',
    host: 'localhost',
    password: 'r3curs1v3$',
    user: 't3rr41n-demo',
};

let mysqlConnection;
let elasticSearch;

try {
    mysqlConnection = new MySQLExecutor(td1MySQLConfig);
    elasticSearch = new ElasticExecutor();
} catch (err) {
    console.log('Error: ', err.message);
    process.exit(1);
}

// let elements = results as Array<object>;
// console.log("type of results is " + typeof (results));
// await elasticSearch.upsertObjects(DBMovies, elements);
//
// console.log(results);
// for (const item of elements) {
//     console.log("ID" + item["movieid"] + " payload: " + item);
// }

async function syncSqlQuery(qstr: string, mysql: MySQLExecutor) {
    try {
        let results = await mysql.query(qstr);
        let elements = results as Array<object>;
        return elements;
    } catch (err) {
        console.log('Error: ', err.message);
        process.exit(1);
    }
}

async function syncCheckElasticHealth(elastic: ElasticExecutor) {
    try {
        const h = await elastic.health();
        console.log("Health state: " + h);
    } catch (e) {
        console.log('Error: ', e.message);
        process.exit(1);
    }
}

async function copyTable(table, mysql: MySQLExecutor, elastic: ElasticExecutor)
{
    const query = new Tasty.Query(table);
    try {
        let sqlStr = Tasty.MySQL.generate(query);
        console.log(sqlStr);
        const elements = await syncSqlQuery(sqlStr, mysql);
        console.log("Copy " + (elements as Array<object>).length + " elements");
        elastic.upsertObjects(table, elements);
    } catch (e) {
        console.log('Error: ', e.message);
        process.exit(1);
    }
}

syncCheckElasticHealth(elasticSearch);
const DBMovies = new Tasty.Table('movies', ['movieid'], ['title', 'releasedate']);
copyTable(DBMovies, mysqlConnection, elasticSearch)

