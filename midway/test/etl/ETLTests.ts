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
import { promisify } from 'util';
import * as winston from 'winston';

// import { App, Credentials, DB, Scheduler } from '../../src/app/App';
import { App, DB } from '../../src/app/App';
import ElasticConfig from '../../src/database/elastic/ElasticConfig';
import ElasticController from '../../src/database/elastic/ElasticController';
import ElasticDB from '../../src/database/elastic/tasty/ElasticDB';
import * as Tasty from '../../src/tasty/Tasty';

// let server;

// tslint:disable:max-line-length

// beforeAll(async (done) =>
// {
//   try
//   {
//     const options =
//       {
//         debug: true,
//         db: 'postgres',
//         dsn: 't3rr41n-demo:r3curs1v3$@127.0.0.1:65432/moviesdb',
//         port: 63001,
//         databases: [
//           {
//             name: 'My ElasticSearch Instance',
//             type: 'elastic',
//             dsn: 'http://127.0.0.1:9200',
//             host: 'http://127.0.0.1:9200',
//             isAnalytics: true,
//             analyticsIndex: 'terrain-analytics',
//             analyticsType: 'events',
//           },
//           {
//             name: 'MySQL Test Connection',
//             type: 'mysql',
//             dsn: 't3rr41n-demo:r3curs1v3$@127.0.0.1:63306/moviesdb',
//             host: '127.0.0.1:63306',
//             isAnalytics: false,
//           },
//         ],
//       };

//     const app = new App(options);
//     server = await app.start();
//     done();
//   }
//   catch (e)
//   {
//     fail(e);
//   }
// });

describe('ETL Execute Tests', () =>
{
  test('ETL execute: POST /midway/v1/etl/execute', async () =>
  {
    // TODO: Add test
  });
});
