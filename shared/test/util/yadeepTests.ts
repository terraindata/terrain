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

import * as _ from 'lodash';
import objectify from '../../util/deepObjectify';
import { KeyPath } from '../../util/KeyPath';
import * as yadeep from '../../util/yadeep';

const doc3: object = {
  name: 'Bob',
  arr: ['sled', [{ a: 'dog' }, { b: 'doggo', a: 'fren' }]],
  hardarr: [['a'], ['b', ['c']]],
};

const objd: object = objectify(doc3);

test('simple top-level get', () =>
{
  expect(yadeep.get(objd, KeyPath(['name']))).toBe('Bob');
});

test('primitive get one layer deep', () =>
{
  expect(yadeep.get(objd, KeyPath(['arr', '0']))).toBe('sled');
});

test('nested array get', () =>
{
  expect(yadeep.get(objd, KeyPath(['hardarr', '1', '1']))).toEqual({ 0: 'c' });
});

test('wildcard nested get', () =>
{
  expect(yadeep.get(objd, KeyPath(['arr', '1', -1, 'a']))).toEqual(['dog', 'fren']);
});

test('double wildcard sensible nested get', () =>
{
  expect(yadeep.get(objd, KeyPath(['arr', -1, -1, 'a']))).toEqual([undefined, ['dog', 'fren']]);
});

test('simple top-level set', () =>
{
  const copy: object = { ...objd };
  yadeep.set(copy, KeyPath(['name']), 'jim');
  expect(copy['name']).toBe('jim');
});

test('a deep set', () =>
{
  const copy: object = { ...objd };
  yadeep.set(copy, KeyPath(['arr', '1', '0', 'a']), 'jim');
  expect(copy['arr']['1']['0']['a']).toBe('jim');
});

test('a deep set with a wildcard', () =>
{
  const copy: object = { ...objd };
  yadeep.set(copy, KeyPath(['arr', '1', -1, 'a']), 'jim');
  expect(copy['arr']['1']['0']['a']).toBe('jim');
  expect(copy['arr']['1']['1']['a']).toBe('jim');
});

test('basic search', () =>
{
  const copy: object = _.cloneDeep(doc3);
  const singleMatches = yadeep.search(copy, KeyPath(['name']));
  expect(singleMatches).toEqual([{
    value: 'Bob',
    location: KeyPath(['name']),
  }]);
  const multiMatches = yadeep.search(copy, KeyPath(['arr', -1, -1]));
  expect(multiMatches.length).toBe(2);
  expect(multiMatches).toContainEqual({
    value: { a: 'dog' },
    location: KeyPath(['arr', 1, 0]),
  });
  expect(multiMatches).toContainEqual({
    value: { b: 'doggo', a: 'fren' },
    location: KeyPath(['arr', 1, 1]),
  });
});

test('negative basic search', () =>
{
  const copy: object = _.cloneDeep(doc3);
  const matches = yadeep.search(copy, KeyPath(['namez']));
  expect(matches).toEqual([]);

  const deepMatches = yadeep.search(copy, KeyPath(['arr', -1, -1, 'c']));
  expect(deepMatches).toEqual([]);
});

test('falsy search', () =>
{
  const doc: object = {
    nullValue: null,
    undefinedValue: undefined,
    falseValue: false,
    nestedFalsies: [
      0,
      {
        nullAgain: null,
        undefinedAgain: undefined,
      },
      null,
      '',
      undefined,
    ],
  };

  expect(yadeep.search(doc, KeyPath(['nullValue']))).toEqual([
    {
      value: null,
      location: KeyPath(['nullValue']),
    },
  ]);

  expect(yadeep.search(doc, KeyPath(['undefinedValue']))).toEqual([
    {
      value: undefined,
      location: KeyPath(['undefinedValue']),
    },
  ]);

  expect(yadeep.search(doc, KeyPath(['falseValue']))).toEqual([
    {
      value: false,
      location: KeyPath(['falseValue']),
    },
  ]);

  const deepSearch = yadeep.search(doc, KeyPath(['nestedFalsies', -1]));
  expect(deepSearch.length).toBe(5);
  expect(deepSearch.map((match) => match.value)).toEqual([
    0, { nullAgain: null, undefinedAgain: undefined }, null, '', undefined,
  ]);
});

test('search long keypath', () =>
{
  const copy: object = _.cloneDeep(doc3);
  expect(yadeep.search(copy, KeyPath(['arr', -1, -1, 'a', 'b']))).toEqual([]);
  expect(yadeep.search(copy, KeyPath(['arr', -1, -1, 'a', -1]))).toEqual([]);
  expect(yadeep.search(copy, KeyPath(['arr', -1, -1, -1, 'a']))).toEqual([]);
});

test('search empty keypath', () =>
{
  const copy: object = _.cloneDeep(doc3);
  expect(yadeep.search(copy, KeyPath([]))[0].value).toEqual(doc3);
});

test('array search', () =>
{
  const copy: object = _.cloneDeep(doc3);
  const matches = yadeep.search(copy, KeyPath(['arr', -1]));
  expect(matches).toContainEqual({
    value: 'sled',
    location: KeyPath(['arr', 0]),
  });
  expect(matches).toContainEqual({
    value: [{ a: 'dog' }, { b: 'doggo', a: 'fren' }],
    location: KeyPath(['arr', 1]),
  });
});

test('only find existing search', () =>
{
  const doc: object = {
    items: [
      {
        foo: 5,
      },
      {
        notFoo: 'hi',
      },
      {
        foo: [1, 2, 3],
      },
    ],
  };

  const matches = yadeep.search(doc, KeyPath(['items', -1, 'foo']));
  const justTheValues = matches.map((match) => match.value);
  expect(justTheValues).not.toContain(undefined);
  expect(justTheValues).not.toContain(null);
});

test('search specific indexed keypath', () =>
{
  const copy: object = _.cloneDeep(doc3);
  const matches = yadeep.search(copy, KeyPath(['arr', 1, 0, 'a']));
  expect(matches).toEqual([{
    value: 'dog',
    location: KeyPath(['arr', 1, 0, 'a']),
  }]);
});

test('trick numeric index', () =>
{
  const doc: object = {
    notArr: {
      '-1': 100,
      '0': 200,
      '1': 300,
    },
    arr: [
      10,
      20,
      30,
    ],
  };

  // search on notArr
  expect(yadeep.search(doc, KeyPath(['notArr', '0']))).toEqual([{
    value: 200,
    location: KeyPath(['notArr', '0']),
  }]);
  expect(yadeep.search(doc, KeyPath(['notArr', '-1']))).toEqual([{
    value: 100,
    location: KeyPath(['notArr', '-1']),
  }]);
  expect(yadeep.search(doc, KeyPath(['notArr', 1]))).toEqual([]);
  expect(yadeep.search(doc, KeyPath(['notArr', -1]))).toEqual([]);

  expect(yadeep.search(doc, KeyPath(['arr', 0]))).toEqual([{
    value: 10,
    location: KeyPath(['arr', 0]),
  }]);
  expect(yadeep.search(doc, KeyPath(['arr', '1']))).toEqual([]);
  expect(yadeep.search(doc, KeyPath(['arr', '-1']))).toEqual([]);
});
