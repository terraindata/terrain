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

import App from '../src/App';

let server;

beforeAll(async (done) =>
{
  try
  {
    const options =
      {
        debug: true,
        demo: true,
        db: 'http://127.0.0.1:9200',
        port: 43003,
      };

    const app = new App(options);
    server = await app.start();
  }
  catch (e)
  {
    fail(e);
  }
  done();
});

describe('Demo website tests', () =>
{
  test('GET /demo/search', async () =>
  {
    await request(server)
      .get('/demo/search')
      .query({
        s: 'http://localhost:9200',
        q: '',
        p: 0,
        v: 123,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).not.toBe('');
        if (response.text === '')
        {
          fail('GET /demo/search request returned empty response body');
        }
        const result = JSON.parse(response.text);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
  });

  test('GET /demo/search', async () =>
  {
    await request(server)
    .get('/demo/search')
    .query({
      s: 'http://localhost:9200',
      q: 'Whiplash',
      p: 0,
      v: 123,
    })
    .expect(200)
    .then((response) =>
    {
      expect(response.text).not.toBe('');
      if (response.text === '')
      {
        fail('GET /demo/search request returned empty response body');
      }
      const result = JSON.parse(response.text);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toEqual(1);
    });
});

  test('Invalid GET /demo/search', async () =>
  {
    await request(server)
      .get('/demo/search')
      .query({
        s: '',
        q: 123456,
        p: 1,
      })
      .expect(200)
      .then((response) =>
      {
        expect(response.text).toBe('[]');
      });
  });
});
