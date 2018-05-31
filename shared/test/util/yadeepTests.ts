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
  expect(yadeep.get(objd, KeyPath(['arr', '1', '*', 'a']))).toEqual(['dog', 'fren']);
});

test('double wildcard sensible nested get', () =>
{
  expect(yadeep.get(objd, KeyPath(['arr', '*', '*', 'a']))).toEqual([undefined, ['dog', 'fren']]);
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
  yadeep.set(copy, KeyPath(['arr', '1', '*', 'a']), 'jim');
  expect(copy['arr']['1']['0']['a']).toBe('jim');
  expect(copy['arr']['1']['1']['a']).toBe('jim');
});
