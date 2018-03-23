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

import SharedUtil from '../../../../../shared/Util';
import * as Utils from '../../TestUtil';

import ElasticClient from '../../../../src/database/elastic/client/ElasticClient';
import ElasticConfig from '../../../../src/database/elastic/ElasticConfig';
import ElasticController from '../../../../src/database/elastic/ElasticController';

let elasticController: ElasticController;
let elasticClient: ElasticClient;

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

beforeAll(() =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';
  const config: ElasticConfig = {
    hosts: ['http://localhost:9200'],
  };

  elasticController = new ElasticController(config, 0, 'ElasticClientTests');
  elasticClient = elasticController.getClient();
});

test('elastic health', async (done) =>
{
  const result = await new Promise((resolve, reject) =>
  {
    elasticClient.cluster.health(
      {},
      SharedUtil.promise.makeCallback(resolve, reject));
  });
  winston.info(JSON.stringify(result));
  done();
});

test('search', async (done) =>
{
  try
  {
    const result: any = await new Promise((resolve, reject) =>
    {
      elasticClient.search(
        {
          index: 'movies',
          type: 'data',
          body: {
            sort: [{ revenue: 'desc' }, { movieid: 'asc' }],
          },
          size: 1,
        },
        SharedUtil.promise.makeCallback(resolve, reject));
    });
    winston.info(JSON.stringify(result, null, 2));
    await Utils.checkResults(getExpectedFile(), 'search', result.hits);
  }
  catch (e)
  {
    fail(e);
  }

  done();
});

test('indices.getMapping', async (done) =>
{
  try
  {
    const result = await new Promise((resolve, reject) =>
    {
      elasticClient.indices.getMapping(
        {},
        SharedUtil.promise.makeCallback(resolve, reject));
    });
    winston.info(JSON.stringify(result, null, 2));
    await Utils.checkResults(getExpectedFile(), 'indices.getMapping', result);
  }
  catch (e)
  {
    fail(e);
  }

  done();
});

test('putScript', async (done) =>
{
  try
  {
    await new Promise((resolve, reject) =>
    {
      elasticClient.putScript(
        {
          id: 'terrain_test_movie_profit',
          lang: 'painless',
          body: `return doc['revenue'].value - doc['budget'].value;`,
        },
        SharedUtil.promise.makeCallback(resolve, reject));
    });

    const result: any = await new Promise((resolve, reject) =>
    {
      elasticClient.search(
        {
          index: 'movies',
          type: 'data',
          body: {
            sort: {
              _script: {
                type: 'number',
                order: 'desc',
                script: {
                  id: 'terrain_test_movie_profit',
                  params: {},
                },
              },
            },
          },
          size: 1,
        },
        SharedUtil.promise.makeCallback(resolve, reject));
    });
    winston.info(JSON.stringify(result, null, 2));
    await Utils.checkResults(getExpectedFile(), 'putScript', result.hits);
  }
  catch (e)
  {
    fail(e);
  }

  done();
});
