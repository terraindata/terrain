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
import * as request from 'supertest';
import * as test from 'tape-async';
import * as winston from 'winston';

import App from '../../App';
import ElasticExecutor from '../../tasty/ElasticExecutor';
import * as Tasty from '../../tasty/Tasty';

let elasticSearch;

const DBMovies = new Tasty.Table('movies', ['movieid'], ['title', 'releasedate']);

test('GET /midway/v1/schema', (t) =>
{
  request(App)
      .get('/midway/v1/schema')
      .then((response) => {
        // TODO @david check against expected value for schema, not just non-emptiness
        if (response.text !== '')
        {
          t.pass();
        } else
        {
          t.skip('GET /schema request returned empty response body');
        }
      });
  t.end();
});

test('connection establish', async (t) =>
{
  try
  {
    elasticSearch = new ElasticExecutor();
    t.pass();
  }
  catch (e)
  {
    t.skip(e);
  }
  t.end();
});

test('elastic health', async (t) =>
{
  try
  {
    const h = await elasticSearch.health();
    winston.info(h);
    t.pass();
  }
  catch (e)
  {
    t.skip(e);
  }
  t.end();
});

test('basic query', async (t) =>
{
  try
  {
    const h = await elasticSearch.fullQuery(
      {
        index: 'movies',
        query: {
          aggregations: {
            count_by_type: {
              terms: {
                field: '_type',
                size:  1000,
              },
            },
            fields:        {
              terms: {
                field: '_field_names',
                size:  1000,
              },
            },
          },
        },
        size:  0,
      },
    );
    winston.info(JSON.stringify(h, null, 2));
    t.pass();
    // console.log(h.hits.hits.forEach(
    //     (result) => {console.log(JSON.stringify(result, null, 2));}));
  }
  catch (e)
  {
    t.skip(e);
  }
  t.end();
});

test('store terrain_PWLScore script', async (t) =>
{
  try
  {
    await elasticSearch.storeProcedure(
      {
        id:   'terrain_PWLScore',
        lang: 'painless',
        body: {
          script: `
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

int method = 0;
if(params.method == 'sum')
  method = 0;
else if(params.method == 'log')
  method = 1;
else
  return 0;

List factors = params.factors;

double total = 0.0;
for(int i = 0; i < factors.length; ++i)
{
  Map factor = factors[i];

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
  output *= factor['weight'];
  if(method == 1)
    output = Math.log(output);

  total += output;
}

return total;`,
        },
      });
  }
  catch (e)
  {
    t.skip(e);
  }
  t.end();
});

test('stored PWL transform sort query', async (t) =>
{
  try
  {
    const results = await elasticSearch.query(
      {
        index: 'movies',
        type:  'data',
        from:  0,
        size:  5,
        body:  {
          query: {
            bool: {
              must:                 [
                {match: {status: 'Released'}},
                {match: {language: 'en'}},
              ],
              must_not:             [
                {term: {budget: 0}},
                {term: {revenue: 0}},
              ],
              minimum_should_match: 1,
              should:               [
                {match: {genres: 'Thriller'}},
                {match: {genres: 'Action'}},
              ],
            },
          },
          sort:  {
            _script: {
              type:   'number',
              order:  'desc',
              script: {
                stored: 'terrain_PWLScore',
                params: {
                  method:  'sum',
                  factors: [
                    {
                      weight:  .1,
                      ranges:  [-100.0, 100.0],
                      outputs: [0.0, 1.0],
                    },
                    {
                      weight:       .2,
                      a:            0.0,
                      b:            1.0,
                      numerators:   [['popularity', 1]],
                      denominators: [],
                      ranges:       [0.0, 2.5, 5.0, 10.0, 50.0],
                      outputs:      [0.0, 0.2, 0.5, 0.8, 1.0],
                    },
                    {
                      weight:       .2,
                      a:            25.0,
                      b:            10.0,
                      numerators:   [['voteaverage', 1]],
                      denominators: [['votecount', 1]],
                      ranges:       [0.0, 4.0, 5.0, 10.0],
                      outputs:      [0.0, 0.1, 0.5, 1.0],
                    },
                    {
                      weight:       .5,
                      a:            0.0,
                      b:            1.0,
                      numerators:   [['revenue', 1], ['budget', -1]],
                      denominators: [['budget', 1]],
                      ranges:       [-10.0, 1.0, 2.0, 10.0],
                      outputs:      [0.0, 0.1, 0.5, 1.0],
                    },
                  ],
                },
              },
            },
          },
        },
      });
    // console.log(JSON.stringify(results, null, 2));
    const expected = [
      {
        _index:  'movies',
        _type:   'data',
        _id:     'AVtLODwPFGpkkkhizu3Q',
        _score:  null,
        _source: {
          'overview':     'Based on the real life story of legendary cryptanalyst Alan Turing, the film portrays the nail-biting race against time by Turing and his brilliant team of code-breakers at Britain\'s top-secret Government Code and Cypher School at Bletchley Park, during the darkest days of World War II.',
          'votecount':    3268,
          'posterpath':   '/noUp0XOqIcmgefRnRZa1nhtRvWO.jpg',
          'runtime':      113,
          'movieid':      116797,
          'language':     'en',
          'releasedate':  '2014-11-14T00:00:00.000Z',
          'voteaverage':  8,
          'title':        'The Imitation Game (2014)',
          'revenue':      233555708,
          '@timestamp':   '2017-04-08T01:40:28.297Z',
          'backdroppath': '/qcb6z1HpokTOKdjqDTsnjJk0Xvg.jpg',
          'genres':       'Drama|Thriller',
          'popularity':   9.532139778137207,
          '@version':     '1',
          'tagline':      'The true enigma was the man who cracked the code.',
          'status':       'Released',
          'budget':       14000000,
          'homepage':     'http://theimitationgamemovie.com/',
        },
        sort:    [
          0.7044360129081163,
        ],
      },
      {
        _index:  'movies',
        _type:   'data',
        _id:     'AVtLODj7FGpkkkhizuiv',
        _score:  null,
        _source: {
          'overview':     'A woman, accidentally caught in a dark deal, turns the tables on her captors and transforms into a merciless warrior evolved beyond human logic.',
          'votecount':    3554,
          'posterpath':   '/rwn876MeqienhOVSSjtUPnwxn0Z.jpg',
          'runtime':      89,
          'movieid':      111360,
          'language':     'en',
          'releasedate':  '2014-07-14T00:00:00.000Z',
          'voteaverage':  6.300000190734863,
          'title':        'Lucy (2014)',
          'revenue':      463360063,
          '@timestamp':   '2017-04-08T01:40:27.507Z',
          'backdroppath': '/eCgIoGvfNXrbSiQGqQHccuHjQHm.jpg',
          'genres':       'Action|Sci-Fi',
          'popularity':   7.560890197753906,
          '@version':     '1',
          'tagline':      'The average person uses 10% of their brain capacity. Imagine what she could do with 100%.',
          'status':       'Released',
          'budget':       40000000,
          'homepage':     'http://lucymovie.com/',
        },
        sort:    [
          0.6807745937088925,
        ],
      },
      {
        _index:  'movies',
        _type:   'data',
        _id:     'AVtLN-tXFGpkkkhizo5d',
        _score:  null,
        _source: {
          'overview':     'Princess Leia is captured and held hostage by the evil Imperial forces in their effort to take over the galactic Empire. Venturesome Luke Skywalker and dashing captain Han Solo team together with the loveable robot duo R2-D2 and C-3PO to rescue the beautiful princess and restore peace and justice in the Empire.',
          'votecount':    4206,
          'posterpath':   '/tvSlBzAdRE29bZe5yYWrJ2ds137.jpg',
          'runtime':      121,
          'movieid':      260,
          'language':     'en',
          'releasedate':  '1977-03-20T00:00:00.000Z',
          'voteaverage':  7.900000095367432,
          'title':        'Star Wars: Episode IV - A New Hope (1977)',
          'revenue':      775398007,
          '@timestamp':   '2017-04-08T01:40:07.552Z',
          'backdroppath': '/4iJfYYoQzZcONB9hNzg0J0wWyPH.jpg',
          'genres':       'Action|Adventure|Sci-Fi',
          'popularity':   7.078539848327637,
          '@version':     '1',
          'tagline':      'A long time ago in a galaxy far, far away...',
          'status':       'Released',
          'budget':       11000000,
          'homepage':     'http://www.starwars.com/films/star-wars-episode-iv-a-new-hope',
        },
        sort:    [
          0.6749814962066102,
        ],
      },
      {
        _index:  'movies',
        _type:   'data',
        _id:     'AVtLN-tXFGpkkkhizo6B',
        _score:  null,
        _source: {
          'overview':     'A burger-loving hit man, his philosophical partner, a drug-addled gangster\'s moll and a washed-up boxer converge in this sprawling, comedic crime caper. Their adventures unfurl in three stories that ingeniously trip back and forth in time.',
          'votecount':    5096,
          'posterpath':   '/dM2w364MScsjFf8pfMbaWUcWrR.jpg',
          'runtime':      154,
          'movieid':      296,
          'language':     'en',
          'releasedate':  '1994-10-14T00:00:00.000Z',
          'voteaverage':  8,
          'title':        'Pulp Fiction (1994)',
          'revenue':      213928762,
          '@timestamp':   '2017-04-08T01:40:07.567Z',
          'backdroppath': '/mte63qJaVnoxkkXbHkdFujBnBgd.jpg',
          'genres':       'Comedy|Crime|Drama|Thriller',
          'popularity':   5.996039867401123,
          '@version':     '1',
          'tagline':      'Just because you are a character doesn\'t mean you have character.',
          'status':       'Released',
          'budget':       8000000,
          'homepage':     '',
        },
        sort:    [
          0.6619847933324328,
        ],
      },
      {
        _index:  'movies',
        _type:   'data',
        _id:     'AVtLN_cnFGpkkkhizpiK',
        _score:  null,
        _source: {
          'overview':     'In the film that launched the James Bond saga, Agent 007 (Sean Connery) battles mysterious Dr. No, a scientific genius bent on destroying the U.S. space program. As the countdown to disaster begins, Bond must go to Jamaica, where he encounters beautiful Honey Ryder (Ursula Andress), to confront a megalomaniacal villain in his massive island headquarters.',
          'votecount':    532,
          'posterpath':   '/c3zP1U1P2OpD0504izo2KhyJfLU.jpg',
          'runtime':      110,
          'movieid':      2949,
          'language':     'en',
          'releasedate':  '1962-10-04T00:00:00.000Z',
          'voteaverage':  6.599999904632568,
          'title':        'Dr. No (1962)',
          'revenue':      59600000,
          '@timestamp':   '2017-04-08T01:40:10.641Z',
          'backdroppath': '/bplDiT5JhaXf9S5arO8g5QsFtDi.jpg',
          'genres':       'Action|Adventure|Thriller',
          'popularity':   5.804810047149658,
          '@version':     '1',
          'tagline':      'NOW meet the most extraordinary gentleman spy in all fiction!',
          'status':       'Released',
          'budget':       1100000,
          'homepage':     'http://www.mgm.com/view/movie/566/Dr.-No/',
        },
        sort:    [
          0.6599492334800453,
        ],
      },
    ];
    t.deepEqual(results, expected);
  }
  catch (e)
  {
    t.skip(e);
  }
  t.end();
});

test('stored PWL transform sort query using function_score', async (t) =>
{
  try
  {
    const results = await elasticSearch.query(
      {
        index: 'movies',
        type:  'data',
        from:  0,
        size:  2,
        body:  {
          query: {
            function_score: {
              query:      {
                bool: {
                  must:                 [
                    {match: {status: 'Released'}},
                    {match: {language: 'en'}},
                  ],
                  must_not:             [
                    {term: {budget: 0}},
                    {term: {revenue: 0}},
                  ],
                  minimum_should_match: 1,
                  should:               [
                    {match: {genres: 'Thriller'}},
                    {match: {genres: 'Action'}},
                  ],
                },
              },
              functions:  [
                {
                  script_score: {
                    script: {
                      stored: 'terrain_PWLScore',
                      params: {
                        method:  'log',
                        factors: [
                          {
                            weight:  .1,
                            ranges:  [-100.0, 100.0],
                            outputs: [0.0, 1.0],
                          },
                          {
                            weight:       .3,
                            a:            0.0,
                            b:            1.0,
                            numerators:   [['popularity', 1]],
                            denominators: [],
                            ranges:       [0.0, 2.5, 5.0, 10.0, 50.0],
                            outputs:      [0.0, 0.2, 0.0, 1.0, 0.0],
                          },
                          {
                            weight:       .4,
                            a:            25.0,
                            b:            10.0,
                            numerators:   [['voteaverage', 1]],
                            denominators: [['votecount', 1]],
                            ranges:       [0.0, 10.0],
                            outputs:      [0.0, 1.0],
                          },
                          {
                            weight:       .2,
                            a:            0.0,
                            b:            1.0,
                            numerators:   [['revenue', 1], ['budget', -1]],
                            denominators: [['budget', 1]],
                            ranges:       [-10.0, 10.0],
                            outputs:      [0.0, 1.0],
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
      });
    winston.info(JSON.stringify(results, null, 2));
    const expected = [
      {
        _index:  'movies',
        _type:   'data',
        _id:     'AVtLOAYGFGpkkkhizqnN',
        _score:  -11.855362,
        _source: {
          'overview':     'Star studded comedy about a early 20th century air race from Britain to France.',
          'votecount':    18,
          'posterpath':   '/xB4tZIOGfyL41MHGUUEBsy5fQ5y.jpg',
          'runtime':      138,
          'movieid':      7394,
          'language':     'en',
          'releasedate':  '1965-06-03T00:00:00.000Z',
          'voteaverage':  6.599999904632568,
          'title':        'Those Magnificent Men in Their Flying Machines (1965)',
          'revenue':      29950000,
          '@timestamp':   '2017-04-08T01:40:14.451Z',
          'backdroppath': '/57XgSBngTXnvEwqVSlKB3vmmPVd.jpg',
          'genres':       'Action|Adventure|Comedy',
          'popularity':   0.8980460166931152,
          '@version':     '1',
          'tagline':      'or How I Flew from London to Paris in 25 hours 11 minutes',
          'status':       'Released',
          'budget':       5600000,
          'homepage':     '',
        },
      },
      {
        _index:  'movies',
        _type:   'data',
        _id:     'AVtLN_YpFGpkkkhizpbf',
        _score:  -12.032226,
        _source: {
          'overview':     '"Something hit us...the crew is dead...help us, please, please help us!" With these terrifying words, 22 of Hollywood\'s greatest stars find themselves aboard a pilotless jumbo jet headed on a collision course with destruction in the nerve chilling sequel to the greatest disaster movie ever made.',
          'votecount':    30,
          'posterpath':   '/53M89n1LDl20ZCAhqEadjTVc0Ml.jpg',
          'runtime':      107,
          'movieid':      2521,
          'language':     'en',
          'releasedate':  '1974-10-18T00:00:00.000Z',
          'voteaverage':  6.099999904632568,
          'title':        'Airport 1975 (1974)',
          'revenue':      47000000,
          '@timestamp':   '2017-04-08T01:40:10.388Z',
          'backdroppath': '/e5MP0pHZdcF48PAGtJTgss4qsV8.jpg',
          'genres':       'Action|Drama|Thriller',
          'popularity':   0.7732750177383423,
          '@version':     '1',
          'tagline':      'Something hit us... The crew is dead... Help us, please, please help us!',
          'status':       'Released',
          'budget':       3000000,
          'homepage':     '',
        },
      },
    ];
    t.deepEqual(results, expected);
  }
  catch (e)
  {
    t.skip(e);
  }
  t.end();
});

test('connection destroy', async (t) =>
{
  try
  {
    await elasticSearch.destroy();
    t.pass();
  }
  catch (e)
  {
    t.skip(e);
  }
  t.end();
});
