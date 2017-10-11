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

import benchrest = require('bench-rest');
import winston = require('winston');

import App from '../src/App';

const db = 'http://127.0.0.1:9200';
const host = 'http://127.0.0.1:43002';
let server;

export async function startServer()
{
  try
  {
    const options =
      {
        debug: true,
        db,
        port: 43002,
      };

    const app = new App(options);
    server = await app.start();
  }
  catch (e)
  {
    throw new Error('starting event server sigint: ' + String(e));
  }
}

export const flow = {
  main: [
    { post: host + '/v1', json: {
        eventid: '#{INDEX}',
        variantid: '#{INDEX}',
        visitorid: '#{INDEX}',
      },
    },
    { get: host + '/v1?eventid=#{INDEX}&variantid=#{INDEX}&visitorid=#{INDEX}' },
  ],
};

const runOptions = {
  limit: 20,
  iterations: 1000,
};

startServer();
benchrest(flow, runOptions)
  .on('error', (err, ctx) => winston.error('Failed in %s with err: ', ctx, err))
  .on('progress', (stats, percent, concurrent, ips) => winston.info('Progress: %s complete', percent))
  .on('end', (stats, errorCount) => {
    winston.info('error count: ', errorCount);
    winston.info('stats', stats);
    // TODO: teardown server here
    process.exit();
  });
