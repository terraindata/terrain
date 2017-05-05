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

import * as request from 'supertest';
import * as winston from 'winston';
import App from '../../src/app/App';
import { MidwayError } from '../../src/app/MidwayError';
import QueryError from '../../src/app/QueryError';
import ElasticController from '../../src/database/elastic/ElasticController';
import DatabaseRegistry from '../../src/databaseRegistry/DatabaseRegistry';

let server;
let testUserAccessToken: string;

beforeAll((done) =>
{
  winston.level = 'debug';
  const options =
    {
      db: 'sqlite',
      dsn: 'nodewaytest.db',
      port: 3000,
    };

  const app = new App(options);
  server = app.listen();

  DatabaseRegistry.set(
    0,
    new ElasticController({
      hosts: ['http://localhost:9200'],
    }, 0, 'RouteTests'));

  request(server)
    .post('/midway/v1/users/')
    .send({
      id: 1,
      accessToken: 'AccessToken',
      body: {
        email: 'test@terraindata.com',
        name: 'Test Person',
        password: 'Flash Flash Hundred Yard Dash',
        isAdmin: false,
        isDisabled: false,
        timezone: 'UTC',
      },
    })
    .end(() =>
    {
      request(server)
        .post('/midway/v1/auth/api_login')
        .send({
          email: 'test@terraindata.com',
          password: 'Flash Flash Hundred Yard Dash',
        })
        .end((err, res) =>
        {
          testUserAccessToken = res.body.accessToken;
          done();
        });
    });
});

describe('User and auth route tests', () =>
{
  test('http login route: GET /midway/v1/auth/login', () =>
  {
    return request(server)
      .get('/midway/v1/auth/login')
      .query({
        email: 'test@terraindata.com',
        password: 'Flash Flash Hundred Yard Dash',
      })
      .expect(302)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/auth/login request returned an error: ' + error);
      });
  });

  test('logout: POST /midway/v1/auth/api_logout', () =>
  {
    return request(server)
      .post('/midway/v1/auth/api_logout')
      .send({
        id: '2',
        accessToken: testUserAccessToken,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toBe('Success');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/api_logout request returned an error: ' + error);
      });
  });

  test('access API route with bad accessToken: POST /midway/v1/auth/api_logout', () =>
  {
    return request(server)
      .post('/midway/v1/auth/api_logout')
      .send({
        id: '2',
        accessToken: testUserAccessToken,
      })
      .expect(401)
      .then((response) =>
      {
        expect(response.text).toBe('Unauthorized');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/api_logout request returned an error: ' + error);
      });
  });

  test('get new accessToken : POST /midway/v1/auth/api_login', () =>
  {
    return request(server)
      .post('/midway/v1/auth/api_login')
      .send({
        email: 'test@terraindata.com',
        password: 'Flash Flash Hundred Yard Dash',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
        testUserAccessToken = JSON.parse(response.text).accessToken;
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/auth/api_login request returned an error: ' + error);
      });
  });
});

describe('Version route tests', () =>
{
  test('Get all versions: GET /midway/v1/versions', () =>
  {
    return request(server)
      .get('/midway/v1/versions')
      .query({
        id: 1,
        accessToken: 'AccessToken',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text)
          .toBe(
          '[{"id":1,"createdAt":"2017-04-28 03:32:25","createdByUserId":1,"object":"[object Object]","objectId":2,"objectType":"items"}]');
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/versions/items/1 request returned an error: ' + error);
      });
  });
});

describe('Item route tests', () =>
{
  test('Get all items: GET /midway/v1/items/', () =>
  {
    return request(server)
      .get('/midway/v1/items/')
      .query({
        id: 1,
        accessToken: 'AccessToken',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text)
          .toEqual('[{"id":1,"meta":"Meta","name":"Bob Dylan","parent":0,"status":"Alive","type":"Singer"}]');
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/items/ request returned an error: ' + error);
      });
  });

  test('Create item: POST /midway/v1/items/', () =>
  {
    return request(server)
      .post('/midway/v1/items/')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: {
          name: 'Test Item',
          status: 'LIVE',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toBe('Success');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + error);
      });
  });

  test('Get item: GET /midway/v1/items/:id', () =>
  {
    return request(server)
      .get('/midway/v1/items/1')
      .query({
        id: 1,
        accessToken: 'AccessToken',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text)
          .toEqual('[{"id":1,"meta":"Meta","name":"Bob Dylan","parent":0,"status":"Alive","type":"Singer"}]');
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/items/ request returned an error: ' + error);
      });
  });

  test('Update item: POST /midway/v1/items/', () =>
  {
    return request(server)
      .post('/midway/v1/items/2')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: {
          id: 2,
          name: 'Updated Item',
        },
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toBe('Success');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + error);
      });
  });

  test('Invalid update: POST /midway/v1/items/', () =>
  {
    return request(server)
      .post('/midway/v1/items/314159265359')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: {
          id: 314159265359,
          name: 'Test Item',
        },
      })
      .expect(400)
      .then((response) =>
      {
        winston.info('response: "' + response + '"');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + error);
      });
  });

  test('Update with invalid status: POST /midway/v1/items/', () =>
  {
    return request(server)
      .post('/midway/v1/items/2')
      .send({
        id: 2,
        accessToken: testUserAccessToken,
        body: {
          id: 2,
          name: 'Test Item',
          status: 'BUILD',
        },
      })
      .expect(400)
      .then((response) =>
      {
        winston.info('response: "' + response + '"');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/items/ request returned an error: ' + error);
      });
  });
});

describe('Schema route tests', () =>
{
  test('GET /midway/v1/schema/', () =>
  {
    return request(server)
      .get('/midway/v1/schema/')
      .query({
        id: 1,
        accessToken: 'AccessToken',
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
  test('Elastic Search Query Result: POST /midway/v1/query', () =>
  {
    return request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        database: 0,
        type: 'search',
        body: {
          index: 'movies',
          type: 'data',
          from: 0,
          size: 0,
          body: {
            query: {},
          },
        },
      })
      .expect(200)
      .then((response) =>
      {
        winston.info(JSON.stringify(response));
        expect(JSON.parse(response.text).results[0].hits).toEqual({ total: 27278, max_score: 0, hits: [] });
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + error);
      });
  });

  test('Elastic Search Query Error: POST /midway/v1/query', () =>
  {
    return request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        database: 0,
        type: 'search',
        body: {
          index: 'wrongindex',
          type: 'data',
          from: 0,
          size: 0,
          body: {
            query: {},
          },
        },
      })
      .expect(200)
      .then((response) =>
      {
        winston.info(JSON.stringify(response));
        const midwayError: MidwayError = MidwayError.fromJSON(response.text);
        expect(midwayError.getTitle()).toEqual('[index_not_found_exception] no such index, with { resource.type="index_or_alias" & resource.id="wrongindex" & index_uuid="_na_" & index="wrongindex" }');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + error);
      });
  });

  test('Elastic Search Route Error: POST /midway/v1/query', () =>
  {
    return request(server)
      .post('/midway/v1/query/')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        database: 0,
        type: 'wrongtype',
        body: {
          index: 'wrongindex',
          type: 'data',
          from: 0,
          size: 0,
          body: {
            query: {},
          },
        },
      })
      .expect(400)
      .then((response) =>
      {
        winston.info(JSON.stringify(response));
        const midwayError: MidwayError = MidwayError.fromJSON(response.text);
        expect(midwayError.getTitle()).toEqual('Route /midway/v1/query/ has an error.');
      })
      .catch((error) =>
      {
        fail('POST /midway/v1/query/ request returned an error: ' + error);
      });
  });
});
