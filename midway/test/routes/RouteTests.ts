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

// import { App, Credentials, DB, Scheduler } from '../../src/app/App';
import { App, DB } from '../../src/app/App';
import ElasticConfig from '../../src/database/elastic/ElasticConfig';
import ElasticController from '../../src/database/elastic/ElasticController';
import ElasticDB from '../../src/database/elastic/tasty/ElasticDB';
import * as Tasty from '../../src/tasty/Tasty';

let elasticDB: ElasticDB;
let server;

let exportTemplateID: number = -1;
let persistentExportAccessToken: string = '';

let mySQLImportTemplateID: number = -1;
let persistentImportMySQLAccessToken: string = '';

let schedulerExportId = -1;

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
          {
            name: 'MySQL Test Connection',
            type: 'mysql',
            dsn: 't3rr41n-demo:r3curs1v3$@127.0.0.1:63306/moviesdb',
            host: '127.0.0.1:63306',
            isAnalytics: false,
          },
        ],
      };

    const app = new App(options);
    server = await app.start();

    // await Credentials.initializeLocalFilesystemCredential();

    // await Scheduler.initializeJobs();
    // await Scheduler.initializeSchedules();

    const config: ElasticConfig = {
      hosts: ['http://localhost:9200'],
    };

    const elasticController: ElasticController = new ElasticController(config, 0, 'RouteTests');
    elasticDB = elasticController.getTasty().getDB() as ElasticDB;

    const items = [
      {
        meta: 'I won a Nobel prize! But Im more proud of my music',
        name: 'Al Gore',
        parent: 0,
        status: 'Still Alive',
        type: 'GROUP',
      },
      {
        meta: '#realmusician',
        name: 'Updated Item',
        parent: 0,
        status: 'LIVE',
        type: 'CATEGORY',
      },
      {
        meta: 'Are we an item?',
        name: 'Justin Bieber',
        parent: 0,
        status: 'Baby',
        type: 'ALGORITHM',
      },
    ];
    const itemTable = new Tasty.Table(
      'items',
      ['id'],
      [
        'meta',
        'name',
        'parent',
        'status',
        'type',
      ],
    );
    await DB.getDB().execute(
      DB.getDB().generate(new Tasty.Query(itemTable).upsert(items)),
    );

    const versions = [
      {
        objectType: 'items',
        objectId: 2,
        object: '{"id":2,"meta":"#realmusician","name":"Updated Item","parent":0,"status":"LIVE","type":"CATEGORY"}',
        createdAt: '2017-05-31 00:22:04',
        createdByUserId: 1,
      },
    ];
    const versionTable = new Tasty.Table(
      'versions',
      ['id'],
      [
        'createdAt',
        'createdByUserId',
        'object',
        'objectId',
        'objectType',
      ],
    );
    await DB.getDB().execute(
      DB.getDB().generate(new Tasty.Query(versionTable).upsert(versions)),
    );
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

  try
  {
    fs.unlinkSync(process.cwd() + '/midway/test/routes/scheduler/test_scheduled_export.json');
  }
  catch (e)
  {
    // do nothing
  }
});

describe('Status tests', () =>
{
  test('Check status: GET /midway/v1/status/', async () =>
  {
    await request(server)
      .get('/midway/v1/status/')
      .expect(200)
      .then((response) =>
      {
        const responseObject = JSON.parse(response.text);
        expect(responseObject.status).toBe('ok');
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/status/ request returned an error: ' + String(error));
      });
  });

  test('Check stats: GET /midway/v1/status/stats', async () =>
  {
    await request(server)
      .get('/midway/v1/status/stats')
      .query({
        id: 1,
        accessToken: 'ImAnAdmin',
      })
      .expect(200)
      .then((response) =>
      {
        const responseObject = JSON.parse(response.text);
        winston.info(JSON.stringify(responseObject, null, 1));
        expect(responseObject.uptime > 0);
        expect(responseObject.numRequests > 0);
        expect(responseObject.numRequestsCompleted > 0 && responseObject.numRequestsCompleted < responseObject.numRequests);
        expect(responseObject.numRequestsPending === responseObject.numRequests - responseObject.numRequestsCompleted);
        expect(responseObject.numRequestsThatThrew >= 0 && responseObject.numRequestsThatThrew < responseObject.numRequests);
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/status/stats request returned an error: ' + String(error));
      });
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
        expect(response.text).toBe('Success');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/logout request number 1 returned an error: ' + String(error));
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
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/logout request number 2 returned an error: ' + String(error));
      });
  });
});

describe('Version route tests', () =>
{
  test('Get all versions: GET /midway/v1/versions', async () =>
  {
    await request(server)
      .get('/midway/v1/versions')
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
          .toEqual(expect.arrayContaining([
            {
              id: 1,
              meta: 'I won a Nobel prize! But Im more proud of my music',
              name: 'Al Gore',
              parent: 0,
              status: 'Still Alive',
              type: 'GROUP',
            },
            {
              id: 3,
              meta: 'Are we an item?',
              name: 'Justin Bieber',
              parent: 0,
              status: 'Baby',
              type: 'ALGORITHM',
            },
          ]));
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
    const insertObject = { id: 2, name: 'Updated Item', status: 'LIVE' };
    await request(server)
      .post('/midway/v1/items/2')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: insertObject,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        const respData = JSON.parse(response.text);
        expect(respData.length).toBeGreaterThan(0);
        expect(respData[0]).toMatchObject(insertObject);
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
              body: template,
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
                found: true,
                script: {
                  lang: 'mustache',
                  source: template,
                },
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
          const respData = JSON.parse(response.text);
          expect(respData['result']).toMatchObject(
            {
              acknowledged: true,
            });
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
                // {
                //   status: 404,
                //   title: 'Not Found',
                // },
              ],
              result: {
                _id: 'testTemplateQuery',
                found: false,
              },
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
              "parentAlias": "movie",
              "englishMovies": {
                "_source": ["movieid", "overview"],
                "query" : {
                  "bool" : {
                    "filter": [
                      { "term": {"movieid" : @movie.movieid} },
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

  test('Elastic mergeJoin query Result: POST /midway/v1/query', async () =>
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
            "mergeJoin": {
              "joinKey": "movieid",
              "selfMergeJoin": {
                "_source": ["movieid", "overview"],
                "query" : {
                  "bool": {
                    "filter": [
                      { "match": {"_index" : "movies"} },
                      { "match": {"_type" : "data"} }
                    ],
                    "must_not": [
                      { "term": { "budget": 0 } },
                    ]
                  }
                },
                "sort": "revenue",
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
        for (let i = 0; i < respData['result'].hits.hits.length; ++i)
        {
          expect(respData['result'].hits.hits[i]._id === respData['result'].hits.hits[i].selfMergeJoin[0]._id);
          expect(respData['result'].hits.hits[i]._source.movieid === respData['result'].hits.hits[i].selfMergeJoin[0]._source.movieid);
        }
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
          colName: 'sillyname',
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

  /*test('Invalid import: POST /midway/v1/import/', async () =>
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
  });*/

});

describe('File io templates route tests', () =>
{
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
          originalNames: [
            'movieid',
            'title',
            'genres',
            'backdroppath',
            'overview',
            'posterpath',
            'status',
            'tagline',
            'releasedate',
            'budget',
            'revenue',
            'votecount',
            'popularity',
            'voteaverage',
            'homepage',
            'language',
            'runtime',
          ],
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
        mySQLImportTemplateID = respData[0]['id'];
        expect(respData[0])
          .toMatchObject({
            name: 'mysql_import_template',
            dbid: 1,
            dbname: 'mysqlimport',
            tablename: 'data',
            originalNames: [
              'movieid',
              'title',
              'genres',
              'backdroppath',
              'overview',
              'posterpath',
              'status',
              'tagline',
              'releasedate',
              'budget',
              'revenue',
              'votecount',
              'popularity',
              'voteaverage',
              'homepage',
              'language',
              'runtime',
            ],
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
          originalNames: ['movieid', 'title', 'budget'],
          columnTypes:
            {
              movieid: { type: 'long' },
              title: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              budget: { type: 'long' },
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
        persistentExportAccessToken = respData[0]['persistentAccessToken'];
        exportTemplateID = respData[0]['id'];
        expect(respData[0])
          .toMatchObject({
            name: 'my_template',
            dbid: 1,
            dbname: 'movies',
            tablename: 'data',
            objectKey: '',
            originalNames: ['movieid', 'title', 'budget'],
            columnTypes:
              {
                movieid: { type: 'long' },
                title: { type: 'text', index: 'analyzed', analyzer: 'standard' },
                budget: { type: 'long' },
              },
            primaryKeys: ['movieid'],
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
        const persistentAccessToken = respData[0]['persistentAccessToken'];
        expect(respData[0]).toMatchObject({
          name: 'my_template',
          dbid: 1,
          dbname: 'movies',
          tablename: 'data',
          objectKey: '',
          originalNames: ['movieid', 'title', 'budget'],
          columnTypes:
            {
              movieid: { type: 'long' },
              title: { type: 'text', index: 'analyzed', analyzer: 'standard' },
              budget: { type: 'long' },
            },
          primaryKeys: ['movieid'],
          transformations: [],
          persistentAccessToken,
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
        templateId: mySQLImportTemplateID,
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
      })
      .expect(200)
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
        templateId: mySQLImportTemplateID,
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
      })
      .expect(400)
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
        templateId: exportTemplateID,
        persistentAccessToken: persistentExportAccessToken,
        body: {
          dbid: 1,
          dbname: 'movies',
          templateId: exportTemplateID,
          filetype: 'csv',
          query: '{\"sort\":[{\"movieid\":{\"order\":\"asc\"}}],\"query\":{\"bool\":'
            + '{\"filter\":[{\"term\":{\"_index\":\"movies\"}},'
            + '{\"term\":{\"_type\":\"data\"}}],\"must_not\":[],\"should\":[]}},\"from\":0,\"size\":15}',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toBe(undefined);
        expect(response.body).not.toBe(undefined);
        let respBuffer = response.body;
        let numLines: number = 0;
        const delim: string = '\r\n';
        const firstLine: string = '1,Toy Story (1995),30000000\r\n';
        let indexOfDelim: number = respBuffer.indexOf(delim);
        expect(respBuffer.indexOf(firstLine)).toEqual(22);
        while (indexOfDelim !== -1)
        {
          respBuffer = respBuffer.slice(indexOfDelim + delim.length);
          numLines++;
          indexOfDelim = respBuffer.indexOf(delim); // don't include header
        }
        expect(numLines).toEqual(15);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/export/headless request returned an error: ' + String(error));
      });
  });

  test('Post headless export with 10k+ results: POST /midway/v1/export/headless', async () =>
  {
    await request(server)
      .post('/midway/v1/export/headless')
      .send({
        templateId: exportTemplateID,
        persistentAccessToken: persistentExportAccessToken,
        body: {
          dbid: 1,
          dbname: 'movies',
          templateId: exportTemplateID,
          filetype: 'csv',
          query: '{\"sort\":[{\"movieid\":{\"order\":\"asc\"}}],\"query\":{\"bool\":'
            + '{\"filter\":[{\"term\":{\"_index\":\"movies\"}},'
            + '{\"term\":{\"_type\":\"data\"}}],\"must_not\":[],\"should\":[]}},\"from\":0,\"size\":11000}',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toBe(undefined);
        expect(response.body).not.toBe(undefined);
        let respBuffer = response.body;
        let numLines: number = 0;
        const delim: string = '\r\n';
        const firstLine: string = '1,Toy Story (1995),30000000\r\n';
        let indexOfDelim: number = respBuffer.indexOf(delim);
        expect(respBuffer.indexOf(firstLine)).toEqual(22);
        while (indexOfDelim !== -1)
        {
          respBuffer = respBuffer.slice(indexOfDelim + delim.length);
          numLines++;
          indexOfDelim = respBuffer.indexOf(delim);
        }
        expect(numLines).toEqual(11000);
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/export/headless request (10k+) returned an error: ' + String(error));
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
        expect(result.length).toBeGreaterThanOrEqual(2);
        expect(result).toEqual(expect.arrayContaining([
          {
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
          },
        ]));
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/credentials request returned an error: ' + String(error));
      });
  });
});

describe('Scheduler tests', () =>
{
  test('POST /midway/v1/scheduler/create scheduled export', async () =>
  {
    await request(server)
      .post('/midway/v1/scheduler/create')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          jobType: 'export',
          schedule: '* * * * *', // next run on some leap year date
          sort: 'asc',
          transport:
            {
              type: 'local',
              filename: process.cwd() + '/midway/test/routes/scheduler/test_scheduled_export.json',
            },
          name: 'Test Local Export',
          paramsJob:
            {
              dbid: 1,
              dbname: 'movies',
              templateId: exportTemplateID,
              filetype: 'csv',
              query: '{\"query\":{\"bool\":{\"filter\":[{\"term\":{\"_index\":\"movies\"}},'
                + '{\"term\":{\"_type\":\"data\"}}],\"must_not\":[],\"should\":[]}},\"from\":0,\"size\":15}',
            },
          filetype: 'json',
        },
      })
      .expect(200)
      .then(async (response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('POST /scheduler/create request returned empty response body');
        }
        const result = JSON.parse(response.text);
        expect(Object.keys(result).lastIndexOf('errors')).toEqual(-1);
        schedulerExportId = result['id'];
        expect(await new Promise<boolean>(async (resolve, reject) =>
        {
          function verifyFileWritten()
          {
            resolve(fs.existsSync(process.cwd() + '/midway/test/routes/scheduler/test_scheduled_export.json'));
          }
          setTimeout(verifyFileWritten, (60 - (Math.floor(Date.now() / 1000) % 60) + 3) * 1000);
        })).toBe(true);
      });
  }, 70000);

  test('POST /midway/v1/scheduler/run/<scheduled export ID> run now', async () =>
  {
    await request(server)
      .post('/midway/v1/scheduler/run/' + schedulerExportId.toString())
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
        },
      })
      .expect(200)
      .then(async (responseRun) =>
      {
        expect(await new Promise<boolean>(async (resolve, reject) =>
        {
          function verifyFileWritten()
          {
            resolve(fs.existsSync(process.cwd() + '/midway/test/routes/scheduler/test_scheduled_export.json'));
          }
          setTimeout(verifyFileWritten, 3000);
        })).toBe(true);
      });
  });

  test('POST /midway/v1/scheduler/create INVALID scheduled export', async () =>
  {
    await request(server)
      .post('/midway/v1/scheduler/create')
      .send({
        id: 1,
        accessToken: 'ImAnAdmin',
        body: {
          jobTypeInvalidParam: 'export',
          schedule: '* * * * *', // next run on some leap year date
          sort: 'asc',
          transport:
            {
              type: 'local',
              filename: process.cwd() + '/midway/test/routes/scheduler/test_scheduled_export.json',
            },
          name: 'Test Local Export',
          paramsJob:
            {
              dbid: 1,
              dbname: 'movies',
              templateId: exportTemplateID,
              filetype: 'csv',
              query: '{\"query\":{\"bool\":{\"filter\":[{\"term\":{\"_index\":\"movies\"}},'
                + '{\"term\":{\"_type\":\"data\"}}],\"must_not\":[],\"should\":[]}},\"from\":0,\"size\":15}',
            },
          filetype: 'json',
        },
      })
      .expect(400)
      .then(async (response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('POST /scheduler/create request returned empty response body');
        }
        const result = JSON.parse(response.text);
        expect(Object.keys(result).lastIndexOf('errors')).not.toEqual(-1);
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
        start: new Date(2018, 2, 16, 7, 24, 4),
        end: new Date(2018, 2, 16, 7, 36, 4),
        eventname: 'impression',
        algorithmid: 'bestMovies3',
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
        expect(respData['bestMovies3'].length).toEqual(4);
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
        start: new Date(2018, 2, 16, 7, 24, 4),
        end: new Date(2018, 2, 16, 7, 36, 4),
        eventname: 'impression',
        algorithmid: 'bestMovies3',
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
        expect(respData['bestMovies3'].length).toEqual(8);
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
        start: new Date(2018, 3, 3, 7, 24, 4),
        end: new Date(2018, 3, 3, 10, 24, 4),
        eventname: 'click,impression',
        algorithmid: 'bestMovies3',
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
        expect(respData['bestMovies3'].length).toEqual(4);
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
          label: 'Clicks',
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
            label: 'Clicks',
            events: 'click',
          });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + String(error));
      });
  });
});
