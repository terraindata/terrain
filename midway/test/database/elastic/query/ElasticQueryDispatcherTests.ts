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

import RecordBlock from '../../../../src/app/io/iterator/RecordBlock';
import RecordSource from '../../../../src/app/io/iterator/RecordSource';
import ElasticClient from '../../../../src/database/elastic/client/ElasticClient';
import ElasticConfig from '../../../../src/database/elastic/ElasticConfig';
import ElasticController from '../../../../src/database/elastic/ElasticController';
import ElasticQueryDispatcher from '../../../../src/database/elastic/iterator/ElasticQueryDispatcher';
import ElasticStream from '../../../../src/database/elastic/query/ElasticStream';

let elasticController: ElasticController;
let elasticClient: ElasticClient;

beforeAll(() =>
{
  (winston as any).level = 'debug';
  const config: ElasticConfig = {
    hosts: ['http://localhost:9200'],
  };

  elasticController = new ElasticController(config, 0, 'ElasticStreamTests');
  elasticClient = elasticController.getClient();
});

async function accumulateHits(source: RecordSource): Promise<object[]>
{
  let hits: object[] = [];
  let block: RecordBlock;
  do
  {
    block = await source.getNext();
    winston.info('accumulateHits recieved ' + JSON.stringify(block));
    hits = hits.concat(block.records);
    winston.info('hits: ' + JSON.stringify(hits));
  } while (!block.end);
  return hits;
}

test('dispatch single buffered query', async (done) =>
{
  try
  {
    const dispatcher: ElasticQueryDispatcher =
      new ElasticQueryDispatcher(elasticClient);

    const query = {
      size: 3,
      _source: ['movieid', 'title'],
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

    const source: RecordSource = dispatcher.send(query);
    const block: RecordBlock = await source.getNext();
    expect(block.end === true);
    expect(block.records.length === 3);
    expect(block.errors.length === 0);

    expect(block.records).toMatchObject(
      [
        {
          _index: 'movies',
          _type: 'data',
          _id: '14',
          _score: 0,
          _source: {
            movieid: 14,
            title: 'Nixon (1995)',
          },
        },
        {
          _index: 'movies',
          _type: 'data',
          _id: '270',
          _score: 0,
          _source: {
            movieid: 270,
            title: 'Love Affair (1994)',
          },
        },
        {
          _index: 'movies',
          _type: 'data',
          _id: '295',
          _score: 0,
          _source: {
            movieid: 295,
            title: 'Pyromaniac\'s Love Story, A (1995)',
          },
        },
      ],
    );
    done();
  }
  catch (e)
  {
    fail(e);
  }
});

test('dispatch invalid buffered query', async (done) =>
{
  try
  {
    const dispatcher: ElasticQueryDispatcher =
      new ElasticQueryDispatcher(elasticClient);

    const query = {
      invalidKey: 'this is an invalid key',
      size: 3,
      _source: ['movieid', 'title'],
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

    const source: RecordSource = dispatcher.send(query);
    const block: RecordBlock = await source.getNext();
    expect(block.end === true);
    expect(block.records.length === 0);
    expect(block.errors.length !== 0);
    done();
  }
  catch (e)
  {
    fail(e);
  }
});

test('dispatch single scrolling query', async (done) =>
{
  try
  {
    const dispatcher: ElasticQueryDispatcher =
      new ElasticQueryDispatcher(elasticClient,
        16 * 1024, 32, 3, 2);

    const query = {
      size: 5,
      _source: ['movieid', 'title'],
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

    const source: RecordSource = dispatcher.send(query);
    const hits: object[] = await accumulateHits(source);

    expect(hits).toMatchObject(
      [
        {
          _index: 'movies',
          _type: 'data',
          _id: '14',
          _score: 0,
          _source: { movieid: 14, title: 'Nixon (1995)' },
        },
        {
          _index: 'movies',
          _type: 'data',
          _id: '270',
          _score: 0,
          _source: { movieid: 270, title: 'Love Affair (1994)' },
        },
        {
          _index: 'movies',
          _type: 'data',
          _id: '295',
          _score: 0,
          _source: { movieid: 295, title: 'Pyromaniac\'s Love Story, A (1995)' },
        },
        {
          _index: 'movies',
          _type: 'data',
          _id: '300',
          _score: 0,
          _source: { movieid: 300, title: 'Quiz Show (1994)' },
        },
        {
          _index: 'movies',
          _type: 'data',
          _id: '302',
          _score: 0,
          _source: { movieid: 302, title: 'Queen Margot (Reine Margot, La) (1994)' },
        },
      ],
    );
    done();
  }
  catch (e)
  {
    fail(e);
  }
});
