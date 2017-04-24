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
import * as winston from 'winston';

import App from '../../src/App';
import ElasticExecutor from '../../src/tasty/ElasticExecutor';
import * as Tasty from '../../src/tasty/Tasty';

let elasticSearch;

const DBMovies = new Tasty.Table('movies', ['movieid'], ['title', 'releasedate']);

test('GET /midway/v1/schema', (done) =>
{
  request(App)
    .get('/midway/v1/schema')
    .then((response) =>
    {
      // TODO @david check against expected value for schema, not just non-emptiness
      if (response.text === '')
      {
        fail('GET /schema request returned empty response body');
      }
    });
  done();
});

test('connection establish', async (done) =>
{
  try
  {
    elasticSearch = new ElasticExecutor();
  }
  catch (e)
  {
    fail(e);
  }
  done();
});

test('elastic health', async (done) =>
{
  try
  {
    const h = await elasticSearch.health();
    winston.info(h);
  }
  catch (e)
  {
    fail(e);
  }
  done();
});

test('basic query', async (done) =>
{
  try
  {
    const h = await elasticSearch.fullQuery(
      {
        index: 'movies',
        type: 'data',
        body: {
          query: {},
        },
        size: 1,
      },
    );
    // winston.info(JSON.stringify(h, null, 2));
    // console.log(h.hits.hits.forEach(
    //     (result) => {console.log(JSON.stringify(result, null, 2));}));
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
    await elasticSearch.storeProcedure(
      {
        id: 'terrain_PWLScore',
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
    fail(e);
  }
  done();
});

test('stored PWL transform sort query', async (done) =>
{
  try
  {
    const results = await elasticSearch.query(
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
                stored: 'terrain_PWLScore',
                params: {
                  method: 'sum',
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
      });
    // console.log(JSON.stringify(results, null, 2));
    const expected = [
      {
        _id: 'AVtpT5jiECWm4N1o7kE8',
        _index: 'movies',
        _score: null,
        _source: {
          '@timestamp': '2017-04-13T21:54:35.819Z',
          '@version': '1',
          'backdroppath': '/qcb6z1HpokTOKdjqDTsnjJk0Xvg.jpg',
          'budget': 14000000,
          'genres': 'Drama|Thriller',
          'homepage': 'http://theimitationgamemovie.com/',
          'language': 'en',
          'movieid': 116797,
          'overview': 'Based on the real life story of legendary cryptanalyst Alan Turing, the film portrays the nail-biting race against time by Turing and his brilliant team of code-breakers at Britain\'s top-secret Government Code and Cypher School at Bletchley Park, during the darkest days of World War II.',
          'popularity': 9.532139778137207,
          'posterpath': '/noUp0XOqIcmgefRnRZa1nhtRvWO.jpg',
          'releasedate': '2014-11-14T00:00:00.000Z',
          'revenue': 233555708,
          'runtime': 113,
          'status': 'Released',
          'tagline': 'The true enigma was the man who cracked the code.',
          'title': 'The Imitation Game (2014)',
          'voteaverage': 8,
          'votecount': 3268,
        },
        _type: 'data',
        sort: [0.7044360129081163],
      },
      {
        _id: 'AVtpT5fNECWm4N1o7jue',
        _index: 'movies',
        _score: null,
        _source: {
          '@timestamp': '2017-04-13T21:54:35.569Z',
          '@version': '1',
          'backdroppath': '/eCgIoGvfNXrbSiQGqQHccuHjQHm.jpg',
          'budget': 40000000,
          'genres': 'Action|Sci-Fi',
          'homepage': 'http://lucymovie.com/',
          'language': 'en',
          'movieid': 111360,
          'overview': 'A woman, accidentally caught in a dark deal, turns the tables on her captors and transforms into a merciless warrior evolved beyond human logic.',
          'popularity': 7.560890197753906,
          'posterpath': '/rwn876MeqienhOVSSjtUPnwxn0Z.jpg',
          'releasedate': '2014-07-14T00:00:00.000Z',
          'revenue': 463360063,
          'runtime': 89,
          'status': 'Released',
          'tagline': 'The average person uses 10% of their brain capacity. Imagine what she could do with 100%.',
          'title': 'Lucy (2014)',
          'voteaverage': 6.300000190734863,
          'votecount': 3554,
        },
        _type: 'data',
        sort: [0.6807745937088925],
      },
      {
        _id: 'AVtpT4NUECWm4N1o7eG-',
        _index: 'movies',
        _score: null,
        _source: {
          '@timestamp': '2017-04-13T21:54:30.260Z',
          '@version': '1',
          'backdroppath': '/4iJfYYoQzZcONB9hNzg0J0wWyPH.jpg',
          'budget': 11000000,
          'genres': 'Action|Adventure|Sci-Fi',
          'homepage': 'http://www.starwars.com/films/star-wars-episode-iv-a-new-hope',
          'language': 'en',
          'movieid': 260,
          'overview': 'Princess Leia is captured and held hostage by the evil Imperial forces in their effort to take over the galactic Empire. Venturesome Luke Skywalker and dashing captain Han Solo team together with the loveable robot duo R2-D2 and C-3PO to rescue the beautiful princess and restore peace and justice in the Empire.',
          'popularity': 7.078539848327637,
          'posterpath': '/tvSlBzAdRE29bZe5yYWrJ2ds137.jpg',
          'releasedate': '1977-03-20T00:00:00.000Z',
          'revenue': 775398007,
          'runtime': 121,
          'status': 'Released',
          'tagline': 'A long time ago in a galaxy far, far away...',
          'title': 'Star Wars: Episode IV - A New Hope (1977)',
          'voteaverage': 7.900000095367432,
          'votecount': 4206,
        },
        _type: 'data',
        sort: [0.6749814962066102],
      },
      {
        _id: 'AVtpT4NfECWm4N1o7eHi',
        _index: 'movies',
        _score: null,
        _source: {
          '@timestamp': '2017-04-13T21:54:30.277Z',
          '@version': '1',
          'backdroppath': '/mte63qJaVnoxkkXbHkdFujBnBgd.jpg',
          'budget': 8000000,
          'genres': 'Comedy|Crime|Drama|Thriller',
          'homepage': '',
          'language': 'en',
          'movieid': 296,
          'overview': 'A burger-loving hit man, his philosophical partner, a drug-addled gangster\'s moll and a washed-up boxer converge in this sprawling, comedic crime caper. Their adventures unfurl in three stories that ingeniously trip back and forth in time.',
          'popularity': 5.996039867401123,
          'posterpath': '/dM2w364MScsjFf8pfMbaWUcWrR.jpg',
          'releasedate': '1994-10-14T00:00:00.000Z',
          'revenue': 213928762,
          'runtime': 154,
          'status': 'Released',
          'tagline': 'Just because you are a character doesn\'t mean you have character.',
          'title': 'Pulp Fiction (1994)',
          'voteaverage': 8,
          'votecount': 5096,
        },
        _type: 'data',
        sort: [0.6619847933324328],
      },
      {
        _id: 'AVtpT4ZMECWm4N1o7ev2',
        _index: 'movies',
        _score: null,
        _source: {
          '@timestamp': '2017-04-13T21:54:31.090Z',
          '@version': '1',
          'backdroppath': '/bplDiT5JhaXf9S5arO8g5QsFtDi.jpg',
          'budget': 1100000,
          'genres': 'Action|Adventure|Thriller',
          'homepage': 'http://www.mgm.com/view/movie/566/Dr.-No/',
          'language': 'en',
          'movieid': 2949,
          'overview': 'In the film that launched the James Bond saga, Agent 007 (Sean Connery) battles mysterious Dr. No, a scientific genius bent on destroying the U.S. space program. As the countdown to disaster begins, Bond must go to Jamaica, where he encounters beautiful Honey Ryder (Ursula Andress), to confront a megalomaniacal villain in his massive island headquarters.',
          'popularity': 5.804810047149658,
          'posterpath': '/c3zP1U1P2OpD0504izo2KhyJfLU.jpg',
          'releasedate': '1962-10-04T00:00:00.000Z',
          'revenue': 59600000,
          'runtime': 110,
          'status': 'Released',
          'tagline': 'NOW meet the most extraordinary gentleman spy in all fiction!',
          'title': 'Dr. No (1962)',
          'voteaverage': 6.599999904632568,
          'votecount': 532,
        },
        _type: 'data',
        sort: [0.6599492334800453],
      },
    ];
    expect(results).toEqual(expected);
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
    const results = await elasticSearch.query(
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
                      stored: 'terrain_PWLScore',
                      params: {
                        method: 'log',
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
      });
    winston.info(JSON.stringify(results, null, 2));
    const expected = [
      {
        _id: 'AVtpT40bECWm4N1o7f05',
        _index: 'movies',
        _score: -11.855619,
        _source: {
          '@timestamp': '2017-04-13T21:54:32.810Z',
          '@version': '1',
          'backdroppath': '/57XgSBngTXnvEwqVSlKB3vmmPVd.jpg',
          'budget': 5600000,
          'genres': 'Action|Adventure|Comedy',
          'homepage': '',
          'language': 'en',
          'movieid': 7394,
          'overview': 'Star studded comedy about a early 20th century air race from Britain to France.',
          'popularity': 0.8980460166931152,
          'posterpath': '/xB4tZIOGfyL41MHGUUEBsy5fQ5y.jpg',
          'releasedate': '1965-06-03T00:00:00.000Z',
          'revenue': 29950000,
          'runtime': 138,
          'status': 'Released',
          'tagline': 'or How I Flew from London to Paris in 25 hours 11 minutes',
          'title': 'Those Magnificent Men in Their Flying Machines (1965)',
          'voteaverage': 6.599999904632568,
          'votecount': 18,
        },
        _type: 'data',
      },
      {
        _id: 'AVtpT4YpECWm4N1o7elR',
        _index: 'movies',
        _score: -12.032712,
        _source: {
          '@timestamp': '2017-04-13T21:54:31.006Z',
          '@version': '1',
          'backdroppath': '/e5MP0pHZdcF48PAGtJTgss4qsV8.jpg',
          'budget': 3000000,
          'genres': 'Action|Drama|Thriller',
          'homepage': '',
          'language': 'en',
          'movieid': 2521,
          'overview': '"Something hit us...the crew is dead...help us, please, please help us!" With these terrifying words, 22 of Hollywood\'s greatest stars find themselves aboard a pilotless jumbo jet headed on a collision course with destruction in the nerve chilling sequel to the greatest disaster movie ever made.',
          'popularity': 0.7732750177383423,
          'posterpath': '/53M89n1LDl20ZCAhqEadjTVc0Ml.jpg',
          'releasedate': '1974-10-18T00:00:00.000Z',
          'revenue': 47000000,
          'runtime': 107,
          'status': 'Released',
          'tagline': 'Something hit us... The crew is dead... Help us, please, please help us!',
          'title': 'Airport 1975 (1974)',
          'voteaverage': 6.099999904632568,
          'votecount': 30,
        },
        _type: 'data',
      },
    ];
    expect(results).toEqual(expected);
  }
  catch (e)
  {
    fail(e);
  }
  done();
});
