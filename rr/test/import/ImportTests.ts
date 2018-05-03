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

import * as request from 'supertest';
import * as winston from 'winston';

let defaultUserAccessToken;

beforeAll(async (done) =>
{
  try
  {
    await request('http://localhost:3000')
      .post('/midway/v1/auth/login')
      .send({
        email: 'admin@terraindata.com',
        password: 'CnAATPys6tEB*ypTvqRRP5@2fUzTuY!C^LZP#tBQcJiC*5',
      })
      .then((response) =>
      {
        const respData = JSON.parse(response.text);
        defaultUserAccessToken = respData.accessToken;
      })
      .catch((error) =>
      {
        winston.warn('Error while creating access token for default user: ' + String(error));
        fail(error);
      });
  } catch (e)
  {
    fail(e);
  }
  done();
});
describe('Testing the midway import interface', () =>
{
  test('Import the nest user action data', async () =>
  {
    await request('http://localhost:3000')
      .post('/midway/v1/import/')
      .field('accessToken', defaultUserAccessToken)
      .field('id', '1')
      .field('dbid', '1')
      .field('dbname', 'users')
      .field('tablename', 'data')
      .field('filetype', 'json')
      .field('originalNames', JSON.stringify([
        'UserId',
        'PurchaseHistory',
        'PurchasedTitles',
        'PreferredGenre',
      ]))
      .field('primaryKeys', JSON.stringify(
        [
          'UserId',
        ],
      ))
      .field('transformations', JSON.stringify([]))
      .field('update', 'false')
      .attach('file', './rr/test/components/users_action.json')
      .field('columnTypes', JSON.stringify(
        {
          PurchaseHistory: {
            type: 'array',
            innerType: {
              type: 'nested',
              innerType: {
                SKU: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                Genres: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                Title: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                Tagline: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                Version: {
                  type: 'long',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                Inventory: {
                  type: 'long',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                Homepage: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                Status: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                ConversionRate: {
                  type: 'double',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                StoreName: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                Price: {
                  type: 'double',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                ReleaseDate: {
                  type: 'date',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                StoreLocation: {
                  type: 'nested',
                  innerType: {
                    lat: {
                      type: 'double',
                      index: 'not_analyzed',
                      analyzer: null,
                    },
                    lon: {
                      type: 'double',
                      index: 'not_analyzed',
                      analyzer: null,
                    },
                  },
                },
                Posterpath: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                Language: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                StoreAddress: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                Popularity: {
                  type: 'double',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                Budget: {
                  type: 'long',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                Runtime: {
                  type: 'long',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                MovieId: {
                  type: 'long',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                Revenue: {
                  type: 'long',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                Overview: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
                VoteAverage: {
                  type: 'double',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                StoreId: {
                  type: 'long',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                VoteCount: {
                  type: 'long',
                  index: 'not_analyzed',
                  analyzer: null,
                },
                BackdropPath: {
                  type: 'text',
                  index: 'analyzed',
                  analyzer: 'standard',
                },
              },
            },
          },
          UserId: {
            type: 'text',
            index: 'analyzed',
            analyzer: 'standard',
          },
          PurchasedTitles: {
            type: 'array',
            innerType: {
              type: 'text',
              index: 'analyzed',
              analyzer: 'standard',
            },
          },
          PreferredGenre: {
            type: 'text',
            index: 'analyzed',
            analyzer: 'standard',
          },
        },
      ))
      .expect(200)
      .then(async (response) =>
      {
        expect(response.text).not.toBe('Unauthorized');
      });
  });
});
