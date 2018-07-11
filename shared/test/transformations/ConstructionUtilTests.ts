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

import { List } from 'immutable';
import * as _ from 'lodash';

import TransformationRegistry from 'shared/transformations/TransformationRegistry';
import ConstructionUtil, { TypeTracker } from 'shared/transformations/util/ConstructionUtil';
import { TransformationEngine } from '../../transformations/TransformationEngine';
import TransformationNodeType from '../../transformations/TransformationNodeType';
import { KeyPath, WayPoint } from '../../util/KeyPath';
import * as yadeep from '../../util/yadeep';
import { TestDocs } from './TestDocs';

import { ETLFieldTypes } from 'shared/etl/types/ETLTypes';

function testHelper(values: any[], interpret = false): ETLFieldTypes
{
  const tracker = new TypeTracker(List(['samplePath']), undefined, interpret);
  for (const val of values)
  {
    tracker.push(val);
  }
  return tracker.getType();
}

// delete these tests if they become inconvenient
describe('simple primitive type tracker tests', () =>
{
  test('all strings test', () => {
    expect(testHelper(['hello', 'there', 'friend'])).toBe(ETLFieldTypes.String);
    expect(testHelper(['whoa!'])).toBe(ETLFieldTypes.String);
  });
  test('all strings with nulls', () => {
    expect(testHelper([null, null, 'friend'])).toBe(ETLFieldTypes.String);
    expect(testHelper(['hello', null, 'friend'])).toBe(ETLFieldTypes.String);
    expect(testHelper(['hello', null])).toBe(ETLFieldTypes.String);
  });
  test('all strings with undefined', () => {
    expect(testHelper([undefined, 'hello', 'friend'])).toBe(ETLFieldTypes.String);
    expect(testHelper(['hello', undefined, 'friend'])).toBe(ETLFieldTypes.String);
    expect(testHelper(['hello', undefined])).toBe(ETLFieldTypes.String);
  });
  test('all strings with empty strings', () => {
    expect(testHelper(['', 'hello', 'friend'])).toBe(ETLFieldTypes.String);
    expect(testHelper(['hello', '', 'friend'])).toBe(ETLFieldTypes.String);
    expect(testHelper(['hello', ''])).toBe(ETLFieldTypes.String);
  });
  test('all numbers', () => {
    expect(testHelper([5, 4.5, 1e5])).toBe(ETLFieldTypes.Number);
    expect(testHelper([0, -1.5])).toBe(ETLFieldTypes.Number);
  });
  test('all integers', () => {
    expect(testHelper([5, 1e5])).toBe(ETLFieldTypes.Integer);
    expect(testHelper([0, -4])).toBe(ETLFieldTypes.Integer);
  });
  test('numbers with nulls', () => {
    expect(testHelper([null, 5.3, 10])).toBe(ETLFieldTypes.Number);
    expect(testHelper([3, null, -1.5])).toBe(ETLFieldTypes.Number);
    expect(testHelper([3, 4, null])).toBe(ETLFieldTypes.Integer);
  });
  test('all booleans', () => {
    expect(testHelper([false])).toBe(ETLFieldTypes.Boolean);
    expect(testHelper([false, true, false])).toBe(ETLFieldTypes.Boolean);
  });
  test('booleans with nulls', () => {
    expect(testHelper([null, false])).toBe(ETLFieldTypes.Boolean);
    expect(testHelper([false, true, null, false])).toBe(ETLFieldTypes.Boolean);
  });
});

describe('special type tracker tests', () =>
{
  test('arrays', () => {
    expect(testHelper([[], [1, 2]])).toBe(ETLFieldTypes.Array);
    expect(testHelper([null, [1, 2]])).toBe(ETLFieldTypes.Array);
  });
  test('objects', () => {
    expect(testHelper([{hello: 'world'}, {}])).toBe(ETLFieldTypes.Object);
    expect(testHelper([{hello: 'world'}, null])).toBe(ETLFieldTypes.Object);
  });
  test('dates', () => {
    expect(testHelper([null, '2011-05-11T00:00:00.000Z'])).toBe(ETLFieldTypes.Date);
    expect(testHelper(['2011-05-11T00:00:00.000', null])).toBe(ETLFieldTypes.Date);
    expect(testHelper(['07/04/2018', '2018-07-04'])).toBe(ETLFieldTypes.Date);
  });
  test('geopoints', () => {
    expect(testHelper(['', `{"lat":0.63,"lon":0.43}`])).toBe(ETLFieldTypes.GeoPoint);
  });
});

describe('negative special type tracker tests', () =>
{
  test('incorrect arrays', () => {
    expect(testHelper([[], [1, 2], {}])).toBe(ETLFieldTypes.String);
    expect(testHelper([null, [], '[]'])).toBe(ETLFieldTypes.String);
  });
  test('incorrect objects', () => {
    expect(testHelper([{hello: 'world'}, 5])).toBe(ETLFieldTypes.String);
    expect(testHelper([{hello: 'world'}, '{}'])).toBe(ETLFieldTypes.String);
  });
  test('incorrect dates', () => {
    expect(testHelper([123456, '2011-05-11T00:00:00.000Z'])).toBe(ETLFieldTypes.String);
    expect(testHelper(['2011-05-11T00:00:00.000', 'hello'])).toBe(ETLFieldTypes.String);
    expect(testHelper(['07/04/2018', '', 'hmm'])).toBe(ETLFieldTypes.String);
  });
  test('incorrect geopoint', () => {
    expect(testHelper([`{"lat":0.63,"lon":0.43}`, {}])).toBe(ETLFieldTypes.String);
    expect(testHelper([`{"lat":0.63,"lon":0.43}`, 'hello'])).toBe(ETLFieldTypes.String);
  });
  test('nothing special strings', () => {
    expect(testHelper([null, ''])).toBe(ETLFieldTypes.String);
    expect(testHelper(['', '', ''])).toBe(ETLFieldTypes.String);
  });
  test('nothing special numbers', () => {
    expect(testHelper([NaN])).toBe(ETLFieldTypes.Number);
    expect(testHelper([NaN, null])).toBe(ETLFieldTypes.Number);
  });
});

describe('mix and match', () =>
{
  test('strings and numbers', () => {
    expect(testHelper(['hi', 5])).toBe(ETLFieldTypes.String);
    expect(testHelper([null, 1.5, '5'])).toBe(ETLFieldTypes.String);
  });
  test('geopoints and dates', () => {
    expect(testHelper([`{"lat":0.63,"lon":0.43}`, '2011-05-11T00:00:00.000'])).toBe(ETLFieldTypes.String);
  });
  test('bools and things', () => {
    expect(testHelper([true, 'false'])).toBe(ETLFieldTypes.String);
    expect(testHelper([false, 0])).toBe(ETLFieldTypes.String);
    expect(testHelper([true, NaN, true])).toBe(ETLFieldTypes.String);
  });
});

describe('interpret strings', () =>
{
  test('interpret numbers', () => {
    expect(testHelper(['5', '1e3', '2'], true)).toBe(ETLFieldTypes.Integer);
    expect(testHelper([null, '100.5'], true)).toBe(ETLFieldTypes.Number);
  });
  test('interpret numbers with NaN', () => {
    expect(testHelper(['NaN', '100.5'], true)).toBe(ETLFieldTypes.Number);
    expect(testHelper(['NaN'], true)).toBe(ETLFieldTypes.Number);
    expect(testHelper(['NaN', '5'], true)).toBe(ETLFieldTypes.Integer);
    expect(testHelper(['5', null, 'NaN'], true)).toBe(ETLFieldTypes.Integer);
    expect(testHelper(['5.5', 'NaN'], true)).toBe(ETLFieldTypes.Number);
  });
  test('interpret numbers with decoy real numbers', () => {
    expect(testHelper(['5', 15, '2'], true)).toBe(ETLFieldTypes.String);
    expect(testHelper([NaN, '5'], true)).toBe(ETLFieldTypes.String);
    expect(testHelper(['NaN', NaN], true)).toBe(ETLFieldTypes.String);
  });
  test('interpret booleans', () => {
    expect(testHelper(['true', 'false'], true)).toBe(ETLFieldTypes.Boolean);
    expect(testHelper([null, 'true', ''], true)).toBe(ETLFieldTypes.Boolean);
    expect(testHelper([false, true, 'true'], true)).toBe(ETLFieldTypes.String);
    expect(testHelper(['{}', 'true'], true)).toBe(ETLFieldTypes.String);
  });
});

describe('weird cases with no meaningful types', () =>
{
  test('check nulls', () => {
    expect(testHelper([null, null])).toBe(ETLFieldTypes.String);
  });
  test('no values pushed', () => {
    expect(testHelper([], true)).toBe(ETLFieldTypes.String);
  });
});

describe('check coersion callback', () =>
{
  const messageHelper = (values: any[]): string => {
    let cbCall = null;
    const tracker = new TypeTracker(List(['samplePath']), (msg) => { cbCall = msg; });
    for (const val of values)
    {
      tracker.push(val);
    }
    return cbCall;
  };

  test('coersion check 1', () => {
    const msg = messageHelper(['hello', 5]);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('coersion check 2', () => {
    const msg = messageHelper([5, 'hello']);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('coersion check 3', () => {
    const msg = messageHelper([null, 5]);
    expect(msg).toBe(null);
  });

  test('coersion check 4', () => {
    const msg = messageHelper([{}, []]);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});
