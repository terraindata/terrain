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
import * as hash from 'object-hash';
import * as winston from 'winston';
import { makePromiseCallback } from '../../../src/tasty/Utils';

import ElasticInterface from '../../../src/databases/elastic/ElasticInterface';

let elasticInterface;

beforeAll(() =>
{
  elasticInterface = new ElasticInterface();
});

test('elastic health', async (done) =>
{
  const result = await new Promise((resolve, reject) =>
  {
    elasticInterface.cluster.health(
      {},
      makePromiseCallback(resolve, reject));
  });
  winston.info(result);
  done();
});

test('basic query', async (done) =>
{
  try
  {
    const result = await new Promise((resolve, reject) =>
    {
      elasticInterface.search(
        {
          index: 'movies',
          type: 'data',
          body: {
            query: {},
            sort: [{ revenue: 'desc' }, { movieid: 'asc' }],
          },
          size: 1,
        },
        makePromiseCallback(resolve, reject));
    });
    winston.info(JSON.stringify(result, null, 2));
    expect(result.hits).toEqual({
      total: 27278,
      max_score: null,
      hits: [
        {
          _index: 'movies',
          _type: 'data',
          _id: '72998',
          _score: null,
          _source: {
            'overview': 'In the 22nd century, a paraplegic Marine is dispatched to the moon Pandora on a unique mission, but becomes torn between following orders and protecting an alien civilization.',
            'votecount': 8218,
            'posterpath': '/tcqb9NHdw9SWs2a88KCDD4V8sVR.jpg',
            'runtime': 162,
            'movieid': 72998,
            'language': 'en',
            'releasedate': '2009-12-10T00:00:00.000Z',
            'voteaverage': 7.099999904632568,
            'title': 'Avatar (2009)',
            'revenue': 2100000000,
            'backdroppath': '/5XPPB44RQGfkBrbJxmtdndKz05n.jpg',
            'genres': 'Action|Adventure|Sci-Fi|IMAX',
            'popularity': 8.273819923400879,
            '@version': '1',
            'tagline': 'Enter the World of Pandora.',
            'status': 'Released',
            'budget': 237000000,
            'homepage': 'http://www.avatarmovie.com/',
          },
          sort: [
            2100000000,
            72998,
          ],
        },
      ],
    });
  }
  catch (e)
  {
    fail(e);
  }

  done();
});

test('put script', async (done) =>
{
  try
  {
    await new Promise((resolve, reject) =>
    {
      elasticInterface.putScript(
        {
          id: 'terrain_test_movie_profit',
          lang: 'painless',
          body: {
            script: `return doc['revenue'].value - doc['budget'].value;`,
          },
        },
        makePromiseCallback(resolve, reject));
    });

    const result = await new Promise((resolve, reject) =>
    {
      elasticInterface.search(
        {
          index: 'movies',
          type: 'data',
          body: {
            query: {},
            sort: {
              _script: {
                type: 'number',
                order: 'desc',
                script: {
                  stored: 'terrain_test_movie_profit',
                  params: {},
                },
              },
            },
          },
          size: 1,
        },
        makePromiseCallback(resolve, reject));
    });
    winston.info(JSON.stringify(result, null, 2));
    expect(result.hits).toEqual({
      total: 27278,
      max_score: null,
      hits: [
        {
          _index: 'movies',
          _type: 'data',
          _id: '72998',
          _score: null,
          _source: {
            'overview': 'In the 22nd century, a paraplegic Marine is dispatched to the moon Pandora on a unique mission, but becomes torn between following orders and protecting an alien civilization.',
            'votecount': 8218,
            'posterpath': '/tcqb9NHdw9SWs2a88KCDD4V8sVR.jpg',
            'runtime': 162,
            'movieid': 72998,
            'language': 'en',
            'releasedate': '2009-12-10T00:00:00.000Z',
            'voteaverage': 7.099999904632568,
            'title': 'Avatar (2009)',
            'revenue': 2100000000,
            'backdroppath': '/5XPPB44RQGfkBrbJxmtdndKz05n.jpg',
            'genres': 'Action|Adventure|Sci-Fi|IMAX',
            'popularity': 8.273819923400879,
            '@version': '1',
            'tagline': 'Enter the World of Pandora.',
            'status': 'Released',
            'budget': 237000000,
            'homepage': 'http://www.avatarmovie.com/',
          },
          sort: [
            1863000000,
          ],
        },
      ],
    });
  }
  catch (e)
  {
    fail(e);
  }

  done();
});
