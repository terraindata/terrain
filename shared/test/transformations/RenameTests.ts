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
import { TestDocs } from 'shared/test/transformations/TestDocs';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { KeyPath } from 'shared/util/KeyPath';

test('rename a field (no structural changes)', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  const id1: number = e.addField(KeyPath(['name']), 'string');
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.setOutputKeyPath(id1, KeyPath(['firstname']));
  expect(e.transform(TestDocs.doc1)['name']).toBe(undefined);
  expect(e.transform(TestDocs.doc1)['firstname']).toBe('Bob');
  e.setOutputKeyPath(id1, KeyPath(['professor']));
  expect(e.transform(TestDocs.doc1)['name']).toBe(undefined);
  expect(e.transform(TestDocs.doc1)['firstname']).toBe(undefined);
  expect(e.transform(TestDocs.doc1)['professor']).toBe('Bob');
});

test('rename a field (subjugation)', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  const id1: number = e.addField(KeyPath(['name']), 'string');
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.setOutputKeyPath(id1, KeyPath(['meta', 'firstname']));
  expect(e.transform(TestDocs.doc1)['name']).toBe(undefined);
  expect(e.transform(TestDocs.doc1)['meta']['firstname']).toBe('Bob');
});

test('rename a field (promotion)', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  e.addField(KeyPath(['name']), 'string');
  const id2: number = e.addField(KeyPath(['meta', 'school']), 'string');
  e.setOutputKeyPath(id2, KeyPath(['skool']));
  expect(e.transform(TestDocs.doc1)['skool']).toBe('Stanford');
  expect(e.transform(TestDocs.doc1)['meta']).toBe(undefined);
});

test('rename a field (an object with subkeys)', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  e.addField(KeyPath(['name']), 'string');
  const id2: number = e.addField(KeyPath(['meta']), 'object');
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.addField(KeyPath(['meta', 'sport']), 'string');
  e.setOutputKeyPath(id2, KeyPath());
  expect(e.transform(TestDocs.doc2)['meta']).toBe(undefined);
  expect(e.transform(TestDocs.doc2)['school']).toBe('Stanford');
  expect(e.transform(TestDocs.doc2)['sport']).toBe('bobsled');
});

test('rename a field (deeply nested property in array)', () =>
{
  const e: TransformationEngine = new TransformationEngine(TestDocs.doc3);
  e.setOutputKeyPath(e.getInputFieldID(KeyPath(['arr', '1', '*', 'a'])), KeyPath(['arr', '1', '*', 'cool']));
  expect(e.transform(TestDocs.doc3)['arr'][1][0]['a']).toBe(undefined);
  expect(e.transform(TestDocs.doc3)['arr'][1][0]['cool']).toBe('dog');
  expect(e.transform(TestDocs.doc3)['arr'][1][1]['a']).toBe(undefined);
  expect(e.transform(TestDocs.doc3)['arr'][1][1]['cool']).toBe('fren');
});

test('structural rename with array', () =>
{
  const e = new TransformationEngine();
  const arrId = e.addField(List(['foo']), 'array');
  e.addField(List(['foo', '*']), 'array');

  e.setOutputKeyPath(arrId, List(['bar', 'baz']));

  const doc = {
    foo: [1, 2, 3],
  };

  expect(e.transform(doc)['foo']).toBe(undefined);
  expect(e.transform(doc)['bar']['baz'][1]).toBe(2);
});

test('proper wildcard behavior in rename stage', () =>
{
  const e: TransformationEngine = new TransformationEngine(TestDocs.doc4);
  e.setOutputKeyPath(e.getInputFieldID(KeyPath(['arr'])), KeyPath(['car']));
  expect(e.transform(TestDocs.doc5)).toEqual(
    {
      car: ['a', 'b', 'c', 'd'],
    },
  );
});

test('wildcard rename with manual field adding', () =>
{
  // manually creating an engine that matches doc, but only using wildcards
  const e: TransformationEngine = new TransformationEngine();
  const foo = e.addField(List(['foo']), 'array');
  e.setFieldProp(foo, List(['valueType']), 'object');
  const wildcard = e.addField(List(['foo', '*']), 'array');
  e.setFieldProp(wildcard, List(['valueType']), 'object');
  const bar = e.addField(List(['foo', '*', 'bar']), 'string');

  const doc = {
    foo: [
      { bar: 'hi' },
      { bar: 'yo' },
    ],
  };
  expect(e.transform(doc)).toEqual(doc);

  e.setOutputKeyPath(bar, List(['foo', '*', 'baz']));

  expect(e.transform(doc)['foo'][0]['baz']).toBe('hi');
});

test('gracefully handle invalid rename (TE remains in some working/recoverable state)', () =>
{
  const e = new TransformationEngine();
  const fooId = e.addField(List(['foo']), 'number');
  e.addField(List(['bar']), 'number');

  e.setOutputKeyPath(fooId, List(['bar'])); // oops, invalid
  e.setOutputKeyPath(fooId, List(['foo'])); // change it back to foo

  const doc = {
    foo: 5,
    bar: 7,
  };
  expect(e.transform(doc)).toEqual(doc);
});

test('rename a nested field that contains an array', () =>
{
  const e = new TransformationEngine();
  e.addField(List(['nested']), 'object');
  const id1 = e.addField(List(['nested', 'foo']), 'array', { valueType: 'number' });
  const id2 = e.addField(List(['nested', 'foo', '*']), 'array', { valueType: 'number' });
  e.setOutputKeyPath(id1, List(['foo']));
  expect(e.getOutputKeyPath(id1)).toEqual(KeyPath(['foo']));
  expect(e.getOutputKeyPath(id2)).toEqual(KeyPath(['foo', '*']));
});
