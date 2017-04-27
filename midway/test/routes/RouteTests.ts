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
import DB from '../../src/DB';

beforeAll(() =>
{
  DB.loadSystemDB({ filename: 'nodewaytest.db' }, 'SQLite');
});

import App from '../../src/App';

describe('Item route tests', () =>
{
  test('Get all items: GET /midway/v1/items/', () =>
  {
    return request(App)
      .get('/midway/v1/items/')
      .query({
        id: 1,
        accessToken: 'AccessToken',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toEqual('[{"id":1,"meta":"Meta","name":"Bob Dylan","parentItemId":0,"status":"Alive","type":"Singer"}]');
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/items/ request returned an error: ' + error);
      });
  });

  test('Create item: POST /midway/v1/items/', () =>
  {
    return request(App)
      .post('/midway/v1/items/')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: {
          name: 'Test Item',
          parentItemId: 0,
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
    return request(App)
      .get('/midway/v1/items/1')
      .query({
        id: 1,
        accessToken: 'AccessToken',
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toEqual('[{"id":1,"meta":"Meta","name":"Bob Dylan","parentItemId":0,"status":"Alive","type":"Singer"}]');
      })
      .catch((error) =>
      {
        fail('GET /midway/v1/items/ request returned an error: ' + error);
      });
    });

  test('Update item: POST /midway/v1/items/', () =>
  {
    return request(App)
      .post('/midway/v1/items/')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: {
          id: 2,
          name: 'Updated Item',
          parentItemId: 1,
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

  test('Invalid update: POST /midway/v1/items/', (done) =>
  {
    return request(App)
      .post('/midway/v1/items/')
      .send({
        id: 1,
        accessToken: 'AccessToken',
        body: {
          id: 314159265359,
          name: 'Test Item',
          parentItemId: 1,
        },
      })
      .expect(200)
      .then((response) =>
      {
        fail('POST /midway/v1/items/ request returned success!');
      })
      .catch((error) =>
      {
        done();
      });
  });
});

describe('Schema route tests', () =>
{
  test('GET /midway/v1/schema', async (done) =>
  {
    request(App)
      .get('/midway/v1/schema')
      .expect(200)
      .then((response) =>
      {
        // TODO @david check against expected value for schema, not just non-emptiness
        if (response.text === '')
        {
          fail('GET /schema request returned empty response body');
        }
      });
    done();
  });
});
