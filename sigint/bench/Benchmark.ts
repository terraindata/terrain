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
import jsurl = require('jsurl');
import winston = require('winston');

import { startServer } from './Server';

let host = 'http://127.0.0.1:43002';

const batchSize = 100;
const batchRequests: any[] = [];

function generateBenchmarkData()
{
  const visitors = ['2329090446', '2329090447', '2329090448', '2329090449'];
  const variants = ['125', '126', '225', '240'];

  for (let i = 0; i < batchSize; i++)
  {
    batchRequests.push({
      eventname: 'view',
      variantid: variants[Math.floor(Math.random() * variants.length)],
      visitorid: visitors[Math.floor(Math.random() * visitors.length)],
    });
  }
}

async function runBenchmark()
{
  const flow = {
    main: [
      {
        get: '',
        beforeHooks: [(all) =>
        {
          all.requestOptions.uri = host + '/v1?'
            + 'eventname=' + String(batchRequests[all.env.index % batchSize].eventname)
            + '&variantid=' + String(batchRequests[all.env.index % batchSize].variantid)
            + '&visitorid=' + String(batchRequests[all.env.index % batchSize].visitorid);
          return all;
        }],
      },
    ],
  };

  const runOptions = {
    limit: 20,
    prealloc: 1000,
    iterations: 1000,
  };

  winston.info('Running benchmark with parameters: ' + JSON.stringify(runOptions));

  return new Promise((resolve, reject) =>
  {
    benchrest(flow, runOptions)
      .on('error', (err, ctx) =>
      {
        winston.error('Failed in %s with err: ', ctx, err);
        reject(err);
      })
      .on('progress', (stats, percent, concurrent, ips) => winston.info('Progress: %s complete', percent))
      .on('end', (stats, errorCount) =>
      {
        winston.info('error count: ', errorCount);
        resolve(stats);
      });
  });
}

async function runBatchBenchmark()
{
  const batchFlow = {
    main: [
      {
        get: '',
        beforeHooks: [(all) =>
        {
          all.requestOptions.uri = host + '/v1?'
            + 'batch=' + String(jsurl.stringify(batchRequests));
          return all;
        }],
      },
    ],
  };

  const batchRunOptions = {
    limit: 20,
    prealloc: 10,
    iterations: 10,
  };

  winston.info('Running batch benchmark with parameters: ' + JSON.stringify(batchRunOptions));

  return new Promise((resolve, reject) =>
  {
    benchrest(batchFlow, batchRunOptions)
      .on('error', (err, ctx) =>
      {
        winston.error('Failed in %s with err: ', ctx, err);
        reject(err);
      })
      .on('progress', (stats, percent, concurrent, ips) => winston.info('Progress: %s complete', percent))
      .on('end', (stats, errorCount) =>
      {
        winston.info('error count: ', errorCount);
        resolve(stats);
      });
  });
}

// =========================================================================

(async () =>
{
  if (process.argv.length > 2)
  {
    host = process.argv[2];
    winston.info('Using specified server address: ' + host);
  }
  else
  {
    // if no host was specified, start a local server
    // tslint:disable-next-line:no-floating-promises
    startServer();
  }

  generateBenchmarkData();

  const s1 = await runBenchmark();
  winston.info(JSON.stringify(s1));

  const s2 = await runBatchBenchmark();
  winston.info(JSON.stringify(s2));

  // TODO: shutdown server gracefully
  process.exit(0);
})();
