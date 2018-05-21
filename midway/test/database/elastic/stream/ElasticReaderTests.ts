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

// Copyright 2018 Terrain Data, Inc.

import * as winston from 'winston';

import ElasticClient from '../../../../src/database/elastic/client/ElasticClient';
import ElasticConfig from '../../../../src/database/elastic/ElasticConfig';
import ElasticController from '../../../../src/database/elastic/ElasticController';
import ElasticReader from '../../../../src/database/elastic/streams/ElasticReader';

import BufferTransform from '../../../../src/app/io/streams/BufferTransform';

let elasticController: ElasticController;
let elasticClient: ElasticClient;

beforeAll(() =>
{
  (winston as any).level = 'debug';
  const config: ElasticConfig = {
    hosts: ['http://localhost:9200'],
  };

  elasticController = new ElasticController(config, 0, 'ElasticReaderTests');
  elasticClient = elasticController.getClient();
});

const query = {
  size: 3,
  _source: ['movieid', 'title'],
  sort: { movieid: 'asc' },
  query: {
    bool: {
      filter: [
        {
          term: {
            _index: 'movies',
          },
        },
        {
          term: {
            _type: 'data',
          },
        },
      ],
    },
  },
};

const expectedResponse = [
  {
    _index: 'movies',
    _type: 'data',
    _id: '1',
    _score: null,
    _source: {
      movieid: 1,
      title: 'Toy Story (1995)',
    },
  },
  {
    _index: 'movies',
    _type: 'data',
    _id: '2',
    _score: null,
    _source: {
      movieid: 2,
      title: 'Jumanji (1995)',
    },
  },
  {
    _index: 'movies',
    _type: 'data',
    _id: '3',
    _score: null,
    _source: {
      movieid: 3,
      title: 'Grumpier Old Men (1995)',
    },
  },
];

test('simple elastic stream', async (done) =>
{
  try
  {
    const stream = new ElasticReader(elasticClient, query);
    let results = [];
    stream.on('data', (chunk) =>
    {
      if (chunk['hits'] !== undefined)
      {
        results = results.concat(chunk['hits'].hits);
      }
    });

    stream.on('end', () =>
    {
      expect(results.length).toEqual(3);
      expect(results).toMatchObject(expectedResponse);
      done();
    });
  }
  catch (e)
  {
    fail(e);
  }
});

test('elastic stream (buffer transform)', async (done) =>
{
  try
  {
    const stream = new ElasticReader(elasticClient, query);
    const bufferTransform = new BufferTransform(stream,
      (err, response) =>
      {
        expect(err).toBeFalsy();
        expect(response).toBeDefined();
        expect(response[0]['hits']).toBeDefined();
        const results = response[0]['hits'].hits;
        expect(results.length).toEqual(3);
        expect(results).toMatchObject(expectedResponse);
        done();
      });
  }
  catch (e)
  {
    fail(e);
  }
});
