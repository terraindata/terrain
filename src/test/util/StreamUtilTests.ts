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

import StreamUtil from 'app/etl/pathselector/StreamUtil';

describe('StreamUtil', () =>
{
  const formatJsonStringTests =
    {
      '{"type": "FeatureCollection", "metadata": { "generated": 124123, ': { type: 'FeatureCollection', metadata: { generated: 124123 } },
      '{"page": 1, "total_results": 367048, "total_pages": 18353, "results": [{ "vote_count": 1178, ': {
        page: 1, total_results: 367048,
        total_pages: 18353, results: [{ vote_count: 1178 }],
      },
      '{"vote_count": 403,"id": 260513,"video": false,"vote_average": 7.6,"title": "Incredibles 2","popularity": 171.840079,':
        { vote_count: 403, id: 260513, video: false, vote_average: 7.6, title: 'Incredibles 2', popularity: 171.840079 },
      '[{"PurchaseHistory": [{"SKU": "317-139", "Genres": "Comedy|Romance", "Title": "Pretty Woman (1990)", "Tagline": \
        "Who knew it was so much fun to be a hooker?", "Version": 1, "Inventory": 42,':
        [{
          PurchaseHistory: [{
            SKU: '317-139', Genres: 'Comedy|Romance', Title: 'Pretty Woman (1990)', Tagline:
              'Who knew it was so much fun to be a hooker?', Version: 1, Inventory: 42,
          }],
        }],
      '{"type": "Feature", "properties": {"mag": 2.63, "place": "2km SSW of Volcano, Hawaii",': {
        type: 'Feature', properties:
          { mag: 2.63, place: '2km SSW of Volcano, Hawaii' },
      },
      '{"name": "Steven", "age": 21, "favNums": [1,2,': { name: 'Steven', age: 21, favNums: [1, 2] },
      '[{"type": "FeatureCollection", "metadata"': [{ type: 'FeatureCollection' }],
      '{"name": "Steven", "age": 21, "favNums"': { name: 'Steven', age: 21 },
      '{"favs": ["apples", "peaches"], "legal": false, "friends": [{"name":"bob", "age":21},{"name"':
        { favs: ['apples', 'peaches'], legal: false, friends: [{ name: 'bob', age: 21 }] },
      '{"favs": ["apples", "peaches"], "legal": false, "friends": [{"name":"bob", "age":21},{"name":"joe","age"':
        { favs: ['apples', 'peaches'], legal: false, friends: [{ name: 'bob', age: 21 }, { name: 'joe' }] },
      '{"favs": ["apples", "peaches"], "legal": false, "friends": [{"name":"bob", "age":21},{"name":"joe","age":29}':
        { favs: ['apples', 'peaches'], legal: false, friends: [{ name: 'bob', age: 21 }, { name: 'joe', age: 29 }] },

    };

  describe('#formatJsonString', () =>
  {
    it('should return a proper json string without loose ends', () =>
    {
      for (const rawJsonString of Object.keys(formatJsonStringTests))
      {
        expect(formatJsonStringTests[rawJsonString]).toEqual(StreamUtil.formatJsonString(rawJsonString));
      }
    });
  });

},
);
