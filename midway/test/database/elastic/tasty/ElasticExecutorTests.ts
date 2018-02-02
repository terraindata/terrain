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

import ElasticConfig from '../../../../src/database/elastic/ElasticConfig';
import ElasticController from '../../../../src/database/elastic/ElasticController';
import ElasticDB from '../../../../src/database/elastic/tasty/ElasticDB';

import * as Tasty from '../../../../src/tasty/Tasty';
import * as Utils from '../../../Utils';

function getExpectedFile(): string
{
  return __filename.split('.')[0] + '.expected';
}

let elasticController: ElasticController;
let elasticDB: ElasticDB;

const DBMovies = new Tasty.Table('data', ['movieid'], ['title', 'releasedate'], 'movies');

beforeAll(async () =>
{
  // TODO: get rid of this monstrosity once @types/winston is updated.
  (winston as any).level = 'debug';
  try
  {
    const config: ElasticConfig = {
      hosts: ['http://localhost:9200'],
    };

    elasticController = new ElasticController(config, 0, 'ElasticExecutorTest');
    elasticDB = elasticController.getTasty().getDB() as ElasticDB;
  }
  catch (e)
  {
    fail(e);
  }
});

test('basic query', async (done) =>
{
  try
  {
    const result: any = await elasticDB.query([
      {
        index: 'movies',
        type: 'data',
        body: {
          sort: [{ revenue: 'desc' }, { movieid: 'asc' }],
        },
        size: 1,
      },
    ]);

    await Utils.checkResults(getExpectedFile(), 'basic query', result.hits);
  }
  catch (e)
  {
    fail(e);
  }
  done();
});

test('store terrain_PWLScore script', async (done) =>
{
  try
  {
    await elasticDB.storeProcedure(
      {
        id: 'terrain_PWLScore',
        lang: 'painless',
        body: `
double pwlTransform(def ranges, def outputs, def input)
{
if (input <= ranges[0])
    return outputs[0];
  if (input >= ranges[ranges.length - 1])
    return outputs[outputs.length - 1];
  int range = Collections.binarySearch(ranges, input,
    (lhs, rhs) -> (lhs < rhs ? -1 : (lhs == rhs ? 0 : 1)));
  if (range < 0)
    range = -range - 1;
  def low = ranges[range - 1];
  def high = ranges[range];
  double pos = (input - low) / (double)(high - low);
  def a = outputs[range - 1];
  def b = outputs[range];
  return a + (b - a) * pos;
}
double accumulateFactors(def doc, List factors, double offset)
{
  double acc = offset;
  for(List element : factors)
    acc += element[1] * doc[element[0]].value;
  return acc;
}
List factors = params.factors;
double total = 0.0;
for(int i = 0; i < factors.length; ++i)
{
  Map factor = factors[i];
  double weight = factor['weight'];
  if(weight == 0)
    continue;
  double input = 0;
  if(i == 0)
  {
    input = _score;
  }
  else
  {
    double numerator = accumulateFactors(doc, factor['numerators'], factor['a']);
    double denominator = accumulateFactors(doc, factor['denominators'], factor['b']);
    input = numerator / denominator;
  }
  double output = pwlTransform(factor.ranges, factor.outputs, input);
  total += weight * output;
}
return total;`,
      });
  }
  catch (e)
  {
    fail(e);
  }
  done();
});

test('stored PWL transform sort query', async (done) =>
{
  try
  {
    const result = await elasticDB.query([
      {
        index: 'movies',
        type: 'data',
        from: 0,
        size: 5,
        body: {
          query: {
            bool: {
              must: [
                { match: { status: 'Released' } },
                { match: { language: 'en' } },
              ],
              must_not: [
                { term: { budget: 0 } },
                { term: { revenue: 0 } },
              ],
              minimum_should_match: 1,
              should: [
                { match: { genres: 'Thriller' } },
                { match: { genres: 'Action' } },
              ],
            },
          },
          sort: {
            _script: {
              type: 'number',
              order: 'desc',
              script: {
                id: 'terrain_PWLScore',
                params: {
                  factors: [
                    {
                      weight: .1,
                      ranges: [-100.0, 100.0],
                      outputs: [0.0, 1.0],
                    },
                    {
                      weight: .2,
                      a: 0.0,
                      b: 1.0,
                      numerators: [['popularity', 1]],
                      denominators: [],
                      ranges: [0.0, 2.5, 5.0, 10.0, 50.0],
                      outputs: [0.0, 0.2, 0.5, 0.8, 1.0],
                    },
                    {
                      weight: .2,
                      a: 25.0,
                      b: 10.0,
                      numerators: [['voteaverage', 1]],
                      denominators: [['votecount', 1]],
                      ranges: [0.0, 4.0, 5.0, 10.0],
                      outputs: [0.0, 0.1, 0.5, 1.0],
                    },
                    {
                      weight: .5,
                      a: 0.0,
                      b: 1.0,
                      numerators: [['revenue', 1], ['budget', -1]],
                      denominators: [['budget', 1]],
                      ranges: [-10.0, 1.0, 2.0, 10.0],
                      outputs: [0.0, 0.1, 0.5, 1.0],
                    },
                  ],
                },
              },
            },
          },
        },
      }]);

    await Utils.checkResults(getExpectedFile(), 'stored PWL transform sort query', result['hits']['hits']);
  }
  catch (e)
  {
    fail(e);
  }
  done();
});

test('stored PWL transform sort query using function_score', async (done) =>
{
  try
  {
    const result = await elasticDB.query([
      {
        index: 'movies',
        type: 'data',
        from: 0,
        size: 2,
        body: {
          query: {
            function_score: {
              query: {
                bool: {
                  must: [
                    { match: { status: 'Released' } },
                    { match: { language: 'en' } },
                  ],
                  must_not: [
                    { term: { budget: 0 } },
                    { term: { revenue: 0 } },
                  ],
                  minimum_should_match: 1,
                  should: [
                    { match: { genres: 'Thriller' } },
                    { match: { genres: 'Action' } },
                  ],
                },
              },
              functions: [
                {
                  script_score: {
                    script: {
                      id: 'terrain_PWLScore',
                      params: {
                        factors: [
                          {
                            weight: .1,
                            ranges: [-100.0, 100.0],
                            outputs: [0.0, 1.0],
                          },
                          {
                            weight: .3,
                            a: 0.0,
                            b: 1.0,
                            numerators: [['popularity', 1]],
                            denominators: [],
                            ranges: [0.0, 2.5, 5.0, 10.0, 50.0],
                            outputs: [0.0, 0.2, 0.0, 1.0, 0.0],
                          },
                          {
                            weight: .4,
                            a: 25.0,
                            b: 10.0,
                            numerators: [['voteaverage', 1]],
                            denominators: [['votecount', 1]],
                            ranges: [0.0, 10.0],
                            outputs: [0.0, 1.0],
                          },
                          {
                            weight: .2,
                            a: 0.0,
                            b: 1.0,
                            numerators: [['revenue', 1], ['budget', -1]],
                            denominators: [['budget', 1]],
                            ranges: [-10.0, 10.0],
                            outputs: [0.0, 1.0],
                          },
                        ],
                      },
                    },
                  },
                },
              ],
              score_mode: 'first',
              boost_mode: 'replace',
            },
          },
        },
      }]);

    await Utils.checkResults(getExpectedFile(), 'stored PWL transform sort query using function_score', result['hits']['hits']);
  }
  catch (e)
  {
    fail(e);
  }
  done();
});

test('Elastic: upsert', async (done) =>
{
  try
  {
    const movies: object[] = [];
    movies[0] = { title: 'Arrival', releasedate: new Date('01/01/17').toISOString().substring(0, 10) };
    movies[1] = { title: 'Alien: Covenant', releasedate: new Date('01/01/17').toISOString().substring(0, 10) };

    const results: any = await elasticController.getTasty().upsert(DBMovies, movies);
    expect(results).not.toBeUndefined();
    for (let i = 0; i < results.length; i++)
    {
      expect(results[i]).toMatchObject(movies[i]);
      expect(results[i]['movieid']).not.toBe('');
    }
  }
  catch (e)
  {
    fail(e);
  }
  done();
});
