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

import * as fs from 'fs';
import * as request from 'supertest';
import * as winston from 'winston';

import { App, DB } from '../../src/app/App';
import ElasticConfig from '../../src/database/elastic/ElasticConfig';
import ElasticController from '../../src/database/elastic/ElasticController';
import ElasticDB from '../../src/database/elastic/tasty/ElasticDB';
import { readFile } from '../Utils';

let elasticDB: ElasticDB;
let server;

// tslint:disable:max-line-length

beforeAll(async (done) =>
{
  try
  {
    const options =
      {
        debug: true,
        db: 'postgres',
        dsn: 't3rr41n-demo:r3curs1v3$@127.0.0.1:65432/moviesdb',
        port: 3000,
        databases: [
          {
            name: 'My ElasticSearch Instance',
            type: 'elastic',
            dsn: 'http://127.0.0.1:9200',
            host: 'http://127.0.0.1:9200',
            isAnalytics: true,
            analyticsIndex: 'terrain-analytics',
            analyticsType: 'events',
          },
        ],
      };

    const app = new App(options);
    server = await app.start();

    const config: ElasticConfig = {
      hosts: ['http://localhost:9200'],
    };

    const elasticController: ElasticController = new ElasticController(config, 0, 'FileImportRouteTests');
    elasticDB = elasticController.getTasty().getDB() as ElasticDB;

    const sql = await readFile('./midway/test/scripts/test.sql');
    const results = await new Promise(async (resolve, reject) =>
    {
      resolve(await DB.getDB().execute([sql.toString()]));
    });
  }
  catch (e)
  {
    fail(e);
  }

  request(server)
    .post('/midway/v1/users/')
    .send({
      id: 1,
      accessToken: 'ImAnAdmin',
      body: {
        email: 'test@terraindata.com',
        name: 'Test Person',
        password: 'Flash Flash Hundred Yard Dash',
        isSuperUser: false,
        isDisabled: false,
        timezone: 'UTC',
      },
    })
    .end(() =>
    {
      done();
    });

  request(server)
    .post('/midway/v1/database/')
    .send({
      id: 1,
      accessToken: 'ImAnAdmin',
      body: {
        name: 'MySQL Test Connection',
        type: 'mysql',
        dsn: 't3rr41n-demo:r3curs1v3$@127.0.0.1:3306/moviesdb',
        host: '127.0.0.1:3306',
        isAnalytics: false,
      },
    })
    .end(() =>
    {
      done();
    });
});

describe('User and auth route tests', () =>
{
  test('http login route: GET /midway/v1/auth/login', async () =>
  {
    await request(server)
      .post('/midway/v1/auth/login')
      .send({
        email: 'test@terraindata.com',
        password: 'Flash Flash Hundred Yard Dash',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(typeof respData['id']).toBe('number');
        expect(typeof respData['accessToken']).toBe('string');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/login request returned an error: ' + String(error));
      });
  });

  test('logout, attempt login with bad accessToken, get new accessToken', async () =>
  {
    let id: number = 0;
    let accessToken: string = '';
    await request(server)
      .post('/midway/v1/auth/login')
      .send({
        email: 'test@terraindata.com',
        password: 'Flash Flash Hundred Yard Dash',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(typeof respData['id']).toBe('number');
        expect(typeof respData['accessToken']).toBe('string');
        id = respData.id;
        accessToken = respData.accessToken;
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/login request returned an error: ' + String(error));
      });

    await request(server)
      .post('/midway/v1/auth/logout')
      .send({
        id,
        accessToken,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0])
          .toMatchObject({ accessToken: '', email: 'test@terraindata.com', id });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/logout request returned an error: ' + String(error));
      });

    await request(server)
      .post('/midway/v1/auth/logout')
      .send({
        id,
        accessToken,
      })
      .expect(401)
      .then((response) =>
      {
        expect(response.text).toBe('Unauthorized');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/logout request returned an error: ' + String(error));
      });
  });
});

describe('Version route tests', () =>
{
  test('Get all versions: GET /midway/v1/versions', async () =>
  {
    await request(server)
      .get('/midway/v1/versions')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0])
          .toMatchObject({
            createdAt: '2017-05-31T00:22:04.000Z',
            createdByUserId: 1,
            id: 1,
            object: '{"id":2,"meta":"#realmusician","name":"Updated Item","parent":0,"status":"LIVE","type":"CATEGORY"}',
            objectId: 2,
            objectType: 'items',
          });
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/versions/items/1 request returned an error: ' + String(error));
      });
  });
});

describe('Item route tests', () =>
{
  test('Get all items: GET /midway/v1/items/', async () =>
  {
    await request(server)
      .get('/midway/v1/items/')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData)
          .toMatchObject([
            {
              id: 1,
              meta: 'I won a Nobel prize! But Im more proud of my music',
              name: 'Al Gore',
              parent: 0,
              status: 'Still Alive',
              type: 'GROUP',
            },
            {
              id: 2,
              meta: '#realmusician',
              parent: 0,
              type: 'CATEGORY',
            },
            {
              id: 3,
              meta: 'Are we an item?',
              name: 'Justin Bieber',
              parent: 0,
              status: 'Baby',
              type: 'ALGORITHM',
            },
          ]);
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Create item: POST /midway/v1/items/', async () =>
  {
    await request(server)
      .post('/midway/v1/items/')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          name: 'Test Item',
          status: 'LIVE',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0])
          .toMatchObject({
            id: 4,
            name: 'Test Item',
            status: 'LIVE',
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Get item: GET /midway/v1/items/:id', async () =>
  {
    await request(server)
      .get('/midway/v1/items/1')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0]).toMatchObject({
          id: 1,
          meta: 'I won a Nobel prize! But Im more proud of my music',
          name: 'Al Gore',
          parent: 0,
          status: 'Still Alive',
          type: 'GROUP',
        });
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Update item: POST /midway/v1/items/', async () =>
  {
    const insertOjbect = { id: 2, name: 'Updated Item', status: 'LIVE' };
    await request(server)
      .post('/midway/v1/items/2')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: insertOjbect,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0]).toMatchObject(insertOjbect);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Invalid update: POST /midway/v1/items/', async () =>
  {
    await request(server)
      .post('/midway/v1/items/314159265359')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          id: 314159265359,
          name: 'Test Item',
        },
      })
      .expect(400)
      .then((response) =>
      {
        winston.info('response: "' + String(response) + '"');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });

  test('Update with invalid status: POST /midway/v1/items/', async () =>
  {
    let id: number = 0;
    let accessToken: string = '';
    await request(server)
      .post('/midway/v1/auth/login')
      .send({
        email: 'test@terraindata.com',
        password: 'Flash Flash Hundred Yard Dash',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(typeof respData['id']).toBe('number');
        expect(typeof respData['accessToken']).toBe('string');
        id = respData.id;
        accessToken = respData.accessToken;
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/login request returned an error: ' + String(error));
      });

    await request(server)
      .post('/midway/v1/items/2')
      .send({
        id,
        accessToken,
        body: {
          id: 2,
          name: 'Test Item',
          status: 'BUILD',
        },
      })
      .expect(400)
      .then((response) =>
      {
        winston.info('response: "' + String(response) + '"');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });
});

describe('Schema route tests', () =>
{
  test('GET /midway/v1/schema/', async () =>
  {
    await request(server)
      .get('/midway/v1/schema/')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
      });
  });
});

describe('Query route tests', () =>
{
  test('Elastic Search Query Result: POST /midway/v1/query', async () =>
  {
    await request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          database: 1,
          type: 'search',
          body: JSON.stringify({
            from: 0,
            size: 0,
            query: {},
          }),
        },
      })
      .expect(200)
      .then((response) =>
      {
        winston.info(response.text);
        expect(JSON.parse(response.text))
          .toMatchObject({
            result: {
              timed_out: false,
              _shards: { failed: 0 },
              hits: { max_score: 0, hits: [] },
            }, errors: [],
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + String(error));
      });
  });

  test('Elastic Search Route Error: POST /midway/v1/query', async () =>
  {
    await request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          database: 1,
          type: 'wrongtype',
          body: {
            from: 0,
            size: 0,
            query: {},
          },
        },
      })
      .expect(400)
      .then((response) =>
      {
        winston.info(response.text);
        expect(JSON.parse(response.text)).toMatchObject(
          {
            errors: [
              {
                status: 400,
                title: 'Route /midway/v1/query/ has an error.',
                detail: 'Query type "wrongtype" is not currently supported.',
              },
            ],
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + String(error));
      });
  });

  test('Elastic Search Query Route: POST /midway/v1/query : templates',
    async () =>
    {
      const template: string = `{
                   "from" : 0,
                   "size" : {{#toJson}}size{{/toJson}},
                   "query" : {
                      "bool" : {
                        "must" : [
                          {"match" : {"_index" : "movies"}},
                          {"match" : {"_type" : "data"}}
                        ]
                      }
                   }
                }`;

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: 'ImAnAdmin',
          body: {
            database: 1,
            type: 'putTemplate',
            body: {
              id: 'testTemplateQuery',
              body: {
                template,
              },
            },
          },
        }).expect(200).then((response) =>
        {
          winston.info(response.text);
        }).catch((error) =>
        {
          fail(error);
        });

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: 'ImAnAdmin',
          body: {
            database: 1,
            type: 'getTemplate',
            body: {
              id: 'testTemplateQuery',
            },
          },
        }).expect(200).then((response) =>
        {
          winston.info(response.text);
          expect(JSON.parse(response.text)).toMatchObject(
            {
              result: {
                _id: 'testTemplateQuery',
                lang: 'mustache',
                found: true,
                template,
              }, errors: [], request: { database: 1, type: 'getTemplate', body: { id: 'testTemplateQuery' } },
            });
        }).catch((error) =>
        {
          fail(error);
        });

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: 'ImAnAdmin',
          body: {
            database: 1,
            type: 'deleteTemplate',
            body: {
              id: 'testTemplateQuery',
            },
          },
        }).expect(200).then((response) =>
        {
          winston.info(response.text);
        });

      await request(server)
        .post('/midway/v1/query/')
        .send({
          id: 1,
          accessToken: 'ImAnAdmin',
          body: {
            database: 1,
            type: 'getTemplate',
            body: {
              id: 'testTemplateQuery',
            },
          },
        }).then((response) =>
        {
          winston.info(response.text);
          expect(JSON.parse(response.text)).toMatchObject(
            {
              errors: [
                {
                  status: 404,
                  title: 'Not Found',
                },
              ],
            });
        }).catch((error) =>
        {
          fail(error);
        });
    });

  test('Elastic groupJoin Query Result: POST /midway/v1/query', async () =>
  {
    await request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          database: 1,
          type: 'search',
          body: `{
            "size": 5,
            "_source": ["movieid", "title"],
            "query": {
              "bool": {
                "filter": [
                  {
                    "term": {
                      "_index": "movies"
                    }
                  },
                  {
                    "term": {
                      "_type": "data"
                    }
                  }
                ],
                "must": [
                  { "match": { "status": "Released" } },
                  { "match": { "language": "en" } }
                ],
                "must_not": [
                  { "term": { "budget": 0 } },
                  { "term": { "revenue": 0 } }
                ]
              }
            },
            "groupJoin": {
              "englishMovies": {
                "_source": ["movieid", "overview"],
                "query" : {
                  "bool" : {
                    "filter": [
                      { "term": {"movieid" : @parent.movieid} }
                    ],
                    "must" : [
                      { "match": {"_index" : "movies"} },
                      { "match": {"_type" : "data"} }
                    ]
                  }
                }
              }
            }
          }`,
        },
      })
      .expect(200)
      .then((response) =>
      {
        winston.info(response.text);
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['errors'].length).toEqual(0);
        expect(respData['result'].hits.hits.length).toEqual(5);
        expect(respData['result'].hits.hits[0]._id === respData['result'].hits.hits[0].englishMovies[0]._id);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + String(error));
      });
  });
});

describe('File import route tests', () =>
{
  test('Import JSON: POST /midway/v1/import/', async () =>
  {
    await request(server)
      .post('/midway/v1/import/')
      .field('accessToken', 'ImAnAdmin')
      .field('columnTypes', JSON.stringify({
        pkey: { type: 'long' },
        col1: { type: 'text' },
        col3: { type: 'boolean' },
        col4: { type: 'date' },
      }))
      .field('dbid', '1')
      .field('dbname', 'test_elastic_db')
      .attach('file', './midway/test/routes/fileImport/test_file.json')
      .field('filetype', 'json')
      .field('id', '1')
      .field('originalNames', JSON.stringify(['pkey', 'column1', 'col2', 'col3', 'col4']))
      .field('primaryKeys', JSON.stringify(['pkey']))
      .field('tablename', 'fileImportTestTable')
      .field('transformations', JSON.stringify([
        {
          name: 'rename',
          colName: 'column1',
          args: { newName: 'col1' },
        },
      ]))
      .field('update', 'false')
      .expect(200)
      .then(async (response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        try
        {
          await elasticDB.refresh('test_elastic_db');
          const result: object = await elasticDB.query([
            {
              index: 'test_elastic_db',
              type: 'fileImportTestTable',
              body: {
                query: {},
                sort: [{ pkey: 'asc' }],
              },
            },
          ]);
          expect(result['hits']['hits'].length).toBeGreaterThan(0);
          expect(result['hits']['hits'][0]['_source'])
            .toMatchObject({
              pkey: 1,
              col1: 'hello',
              col3: false,
              col4: null,
            });
        }
        catch (e)
        {
          fail(e);
        }
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/import/ request returned an error: ' + String(error));
      });
  });

  test('Import CSV: POST /midway/v1/import/', async () =>
  {
    await request(server)
      .post('/midway/v1/import/')
      .field('accessToken', 'ImAnAdmin')
      .field('columnTypes', JSON.stringify({
        pkey: { type: 'long' },
        col1: { type: 'text' },
        col3: { type: 'boolean' },
        col4: { type: 'date' },
      }))
      .field('dbid', '1')
      .field('dbname', 'test_elastic_db')
      .attach('file', './midway/test/routes/fileImport/test_file.csv')
      .field('filetype', 'csv')
      .field('hasCsvHeader', 'true')
      .field('id', '1')
      .field('originalNames', JSON.stringify(['pkey', 'column1', 'column2', 'column3', 'column4']))
      .field('primaryKeys', JSON.stringify(['pkey']))
      .field('tablename', 'fileImportTestTable')
      .field('transformations', JSON.stringify([
        {
          name: 'rename',
          colName: 'column1',
          args: { newName: 'col1' },
        },
        {
          name: 'rename',
          colName: 'column3',
          args: { newName: 'col3' },
        },
        {
          name: 'rename',
          colName: 'column4',
          args: { newName: 'col4' },
        },
      ]))
      .field('update', 'false')
      .expect(200)
      .then(async (response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        try
        {
          await elasticDB.refresh('test_elastic_db');
          const result: object = await elasticDB.query([
            {
              index: 'test_elastic_db',
              type: 'fileImportTestTable',
              body: {
                query: {},
                sort: [{ pkey: 'desc' }],
              },
            },
          ]);
          expect(result['hits']['hits'].length).toBeGreaterThanOrEqual(2);
          expect(result['hits']['hits'][0]['_source'])
            .toMatchObject({
              pkey: 3,
              col1: 'hi',
              col3: false,
              col4: new Date(Date.parse('1970-01-01')).toISOString(),
            });
          expect(result['hits']['hits'][1]['_source'])
            .toMatchObject({
              pkey: 2,
              col1: 'bye',
              col3: null,
              col4: null,
            });
        }
        catch (e)
        {
          fail(e);
        }
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/import/ request returned an error: ' + String(error));
      });
  });

  test('Invalid import: POST /midway/v1/import/', async () =>
  {
    await request(server)
      .post('/midway/v1/import/')
      .field('accessToken', 'ImAnAdmin')
      .field('columnTypes', JSON.stringify({
        pkey: { type: 'long' },
        col1: { type: 'text' },
        col2: { type: 'text' },
        col3: { type: 'boolean' },
        col4: { type: 'date' },
      }))
      .field('dbid', '1')
      .field('dbname', 'test_elastic_db')
      .attach('file', './midway/test/routes/fileImport/test_file_bad.json')
      .field('filetype', 'json')
      .field('id', '1')
      .field('originalNames', JSON.stringify(['pkey', 'column1', 'col2', 'col3', 'col4']))
      .field('primaryKeys', JSON.stringify(['pkey']))
      .field('tablename', 'fileImportTestTable')
      .field('transformations', JSON.stringify([
        {
          name: 'rename',
          colName: 'column1',
          args: { newName: 'col1' },
        },
      ]))
      .field('update', 'false')
      .expect(400)
      .then((response) =>
      {
        winston.info('response: "' + String(response) + '"');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/import/ request returned an error: ' + String(error));
      });
  });

});

describe('File io templates route tests', () =>
{
  let persistentImportMySQLAccessToken: string = '';
  test('Create import template for MySQL: POST /midway/v1/import/templates/create', async () =>
  {
    await request(server)
      .post('/midway/v1/import/templates/create')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          name: 'mysql_import_template',
          dbid: 1,
          dbname: 'mysqlimport',
          tablename: 'data',
          csvHeaderMissing: false,
          originalNames: ['movieid', 'title', 'genres', 'backdroppath', 'overview', 'posterpath', 'status', 'tagline', 'releasedate', 'budget', 'revenue', 'votecount', 'popularity', 'voteaverage', 'homepage', 'language', 'runtime'],
          columnTypes:
            {
              movieid: { type: 'long' },
              title: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              genres: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              backdroppath: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              overview: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              posterpath: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              status: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              tagline: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              releasedate: { type: 'date' },
              budget: { type: 'long' },
              revenue: { type: 'long' },
              votecount: { type: 'long' },
              popularity: { type: 'double' },
              voteaverage: { type: 'double' },
              homepage: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              language: { type: 'text', index: 'not_analyzed', analyzer: null },
              runtime: { type: 'long' },
            },
          primaryKeys: ['movieid'],
          transformations: [],
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        persistentImportMySQLAccessToken = respData[0]['persistentAccessToken'];
        expect(respData[0])
          .toMatchObject({
            id: 1,
            name: 'mysql_import_template',
            dbid: 1,
            dbname: 'mysqlimport',
            tablename: 'data',
            originalNames: ['movieid', 'title', 'genres', 'backdroppath', 'overview', 'posterpath', 'status', 'tagline', 'releasedate', 'budget', 'revenue', 'votecount', 'popularity', 'voteaverage', 'homepage', 'language', 'runtime'],
            columnTypes:
              {
                movieid: { type: 'long' },
                title: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                genres: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                backdroppath: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                overview: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                posterpath: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                status: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                tagline: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                releasedate: { type: 'date' },
                budget: { type: 'long' },
                revenue: { type: 'long' },
                votecount: { type: 'long' },
                popularity: { type: 'double' },
                voteaverage: { type: 'double' },
                homepage: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                language: { type: 'text', index: 'not_analyzed', analyzer: null },
                runtime: { type: 'long' },
              },
            primaryKeys: ['movieid'],
            transformations: [],
            persistentAccessToken: persistentImportMySQLAccessToken,
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/export/templates/create request returned an error: ' + String(error));
      });
  });

  let persistentExportAccessToken: string = '';
  test('Create export template: POST /midway/v1/export/templates/create', async () =>
  {
    await request(server)
      .post('/midway/v1/export/templates/create')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          name: 'my_template',
          dbid: 1,
          dbname: 'movies',
          tablename: 'data',
          originalNames: ['pkey', 'column1', 'column2'],
          columnTypes:
            {
              pkey: { type: 'long' },
              column1: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              column2: { type: 'text', index: 'analyzed', analyzer: 'standard' },
            },
          primaryKeys: ['pkey'],
          transformations: [],
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        persistentExportAccessToken = respData[0]['persistentAccessToken'];
        expect(respData[0])
          .toMatchObject({
            id: 1,
            name: 'my_template',
            dbid: 1,
            dbname: 'movies',
            tablename: 'data',
            objectKey: '',
            originalNames: ['pkey', 'column1', 'column2'],
            columnTypes:
              {
                pkey: { type: 'long' },
                column1: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                column2: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              },
            primaryKeys: ['pkey'],
            transformations: [],
            persistentAccessToken: persistentExportAccessToken,
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/export/templates/create request returned an error: ' + String(error));
      });
  });

  test('Get all export templates: GET /midway/v1/export/templates/', async () =>
  {
    await request(server)
      .get('/midway/v1/export/templates/')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0]).toMatchObject({
          id: 1,
          name: 'my_template',

          dbid: 1,
          dbname: 'movies',
          tablename: 'data',
          objectKey: '',
          originalNames: ['pkey', 'column1', 'column2'],
          columnTypes:
            {
              pkey: { type: 'long' },
              column1: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              column2: { type: 'text', index: 'analyzed', analyzer: 'standard' },
            },
          primaryKeys: ['pkey'],
          transformations: [],
          persistentAccessToken: persistentExportAccessToken,
        });
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/export/templates/ request returned an error: ' + String(error));
      });
  });

  test('Get filtered templates: POST /midway/v1/export/templates/', async () =>
  {
    await request(server)
      .post('/midway/v1/export/templates/')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          dbid: 1,
          dbname: 'badname',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toEqual(0);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/export/templates/ request returned an error: ' + String(error));
      });
  });

  test('Headless import via MySQL: POST /midway/v1/import/headless', async () =>
  {
    await request(server)
      .post('/midway/v1/import/headless')
      .send({
        templateId: 1,
        persistentAccessToken: persistentImportMySQLAccessToken,
        body: {
          source: {
            type: 'mysql',
            params: {
              id: 2,
              tablename: 'movies',
              query: 'SELECT * FROM movies LIMIT 10;',
            },
          },
          filetype: 'csv',
        },
      }).expect(200)
      .then(async (response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        try
        {
          await elasticDB.refresh('mysqlimport');
          const result: object = await elasticDB.query([
            {
              index: 'mysqlimport',
              type: 'data',
              body: {
                query: {},
                sort: [{ movieid: 'asc' }],
              },
            },
          ]);
          expect(result['hits']['hits'].length).toBeGreaterThan(0);
          expect(result['hits']['hits'][0]['_source'])
            .toMatchObject({
              movieid: 1,
              title: 'Toy Story (1995)',
              genres: 'Adventure|Animation|Children|Comedy|Fantasy',
              backdroppath: '/dji4Fm0gCDVb9DQQMRvAI8YNnTz.jpg',
              overview: 'Woody the cowboy is young Andy’s favorite toy. Yet this changes when Andy get the new super toy Buzz Lightyear for his birthday. Now that Woody is no longer number one he plans his revenge on Buzz. Toy Story is a milestone in film history for being the first feature film to use entirely computer animation.',
              posterpath: '/uMZqKhT4YA6mqo2yczoznv7IDmv.jpg',
              status: 'Released',
              tagline: 'The adventure takes off!',
              releasedate: '1995-10-30T08:00:00.000Z',
              budget: 30000000,
              revenue: 361958736,
              votecount: 3022,
              popularity: 2.45948,
              voteaverage: 7.5,
              homepage: 'http://toystory.disney.com/toy-story',
              language: 'en',
              runtime: 81,
            });
        }
        catch (e)
        {
          fail(e);
        }
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/import/headless request returned an error: ' + String(error));
      });
  });

  test('Headless import via MySQL with bad SQL: POST /midway/v1/import/headless', async () =>
  {
    await request(server)
      .post('/midway/v1/import/headless')
      .send({
        templateId: 1,
        persistentAccessToken: persistentImportMySQLAccessToken,
        body: {
          source: {
            type: 'mysql',
            params: {
              id: 2,
              tablename: 'movies',
              query: 'SELECT * FROM moviesss LIMIT 10;',
            },
          },
          filetype: 'csv',
        },
      }).expect(400)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData['errors'].length).toBeGreaterThan(0);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/import/headless request returned an error: ' + String(error));
      });
  });

  test('Post headless export: POST /midway/v1/export/headless', async () =>
  {
    await request(server)
      .post('/midway/v1/export/headless')
      .send({
        templateId: 1,
        persistentAccessToken: persistentExportAccessToken,
        body: {
          dbid: 1,
          dbname: 'movies',
          templateId: 1,
          filetype: 'csv',
          query: '{\"query\":{\"bool\":{\"filter\":[{\"term\":{\"_index\":\"movies\"}},'
            + '{\"term\":{\"_type\":\"data\"}}],\"must_not\":[],\"should\":[]}},\"from\":0,\"size\":15}',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toBe(undefined);
        expect(response.body).not.toBe(undefined);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/export/headless request returned an error: ' + String(error));
      });
  });
});

describe('Credentials tests', () =>
{
  test('POST /midway/v1/credentials', async () =>
  {
    await request(server)
      .post('/midway/v1/credentials')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          createdBy: 1,
          meta: '"{\"host\":\"10.1.1.103\", \"port\":22, \"username\":\"testuser\", \"password\":\"Terrain123!\"}"',
          name: 'SFTP Test 1',
          type: 'sftp',
          permissions: 1,
        },
      })
      .expect(200)
      .then((response) =>
      {
        const result: object = JSON.parse(response.text);
        expect(Array.isArray(result)).toBe(true);
        const resultAsArray: object[] = result as object[];
        expect(resultAsArray[0]).toMatchObject({
          createdBy: 1,
          id: 2,
          meta: '',
          name: 'SFTP Test 1',
          type: 'sftp',
          permissions: 1,
        });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/credentials request returned an error: ' + String(error));
      });
  });

  test('GET /midway/v1/credentials', async () =>
  {
    await request(server)
      .get('/midway/v1/credentials')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
      })
      .expect(200)
      .then((response) =>
      {
        const result = JSON.parse(response.text);
        expect(result).toMatchObject([{
          createdBy: 1,
          id: 1,
          meta: '',
          name: 'Local Filesystem Config',
          permissions: 0,
          type: 'local',
        },
        {
          createdBy: 1,
          id: 2,
          meta: '"{\"host\":\"10.1.1.103\", \"port\":22, \"username\":\"testuser\", \"password\":\"Terrain123!\"}"',
          name: 'SFTP Test 1',
          permissions: 1,
          type: 'sftp',
        }]);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/credentials request returned an error: ' + String(error));
      });
  });
});

describe('Analytics events route tests', () =>
{
  test('GET /midway/v1/events/agg (distinct)', async () =>
  {
    await request(server)
      .get('/midway/v1/events/agg')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
        database: 1,
        agg: 'distinct',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const result = JSON.parse(response.text);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toEqual(3);
      });
  });
});

describe('Analytics route tests', () =>
{
  test('GET /midway/v1/events/agg (select)', async () =>
  {
    await request(server)
      .get('/midway/v1/events/agg')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
        database: 1,
        start: new Date(2017, 11, 16, 7, 24, 4),
        end: new Date(2017, 11, 16, 7, 36, 4),
        eventname: 'impression',
        algorithmid: 'terrain_5',
        agg: 'select',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['terrain_5'].length).toEqual(2);
      });
  });

  test('GET /midway/v1/events/agg (histogram)', async () =>
  {
    await request(server)
      .get('/midway/v1/events/agg')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
        database: 1,
        start: new Date(2017, 11, 16, 7, 24, 4),
        end: new Date(2017, 11, 16, 7, 36, 4),
        eventname: 'impression',
        algorithmid: 'terrain_5',
        agg: 'histogram',
        interval: 'minute',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['terrain_5'].length).toEqual(2);
      });
  });

  test('GET /midway/v1/events/agg (rate)', async () =>
  {
    await request(server)
      .get('/midway/v1/events/agg')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
        database: 1,
        start: new Date(2017, 11, 16, 7, 24, 4),
        end: new Date(2017, 11, 16, 10, 24, 4),
        eventname: 'click,impression',
        algorithmid: 'terrain_5',
        agg: 'rate',
        interval: 'hour',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
        const respData = JSON.parse(response.text);
        expect(respData['terrain_5'].length).toEqual(4);
      });
  });

  test('GET /midway/v1/events/metrics', async () =>
  {
    await request(server)
      .post('/midway/v1/events/metrics')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          database: 1,
          label: 'Click',
          events: 'click',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0])
          .toMatchObject({
            database: 1,
            label: 'Click',
            events: 'click',
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });
});
