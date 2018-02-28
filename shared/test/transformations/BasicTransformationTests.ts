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
import { TransformationEngine } from '../../transformations/TransformationEngine';
import { TransformationNode } from '../../transformations/TransformationNode';
import TransformationNodeType from '../../transformations/TransformationNodeType';
import { KeyPath } from '../../util/KeyPath';
import * as yadeep from '../../util/yadeep';

const doc1 = {
  name: 'Bob',
  age: 17,
  meta: {
    school: 'Stanford',
  },
};

const doc2 = {
  name: 'Bob',
  age: 17,
  meta: {
    school: 'Stanford',
    sport: 'bobsled',
  },
};

const doc3 = {
  name: 'Bob',
  arr: ['sled', [{ a: 'dog' }, { a: 'fren', b: 'doggo' }]],
  hardarr: [['a'], ['b', ['c']]],
};

test('add fields manually', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  const r = e.transform(doc1);
  expect(yadeep.get(r, KeyPath(['meta', 'school']))).toBe('STANFORD');
});

test('capitalization', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  const r = e.transform(doc1);
  expect(r['name']).toBe('BOB');
  expect(yadeep.get(r, KeyPath(['meta.school']))).toBe('STANFORD');
});

test('serialize to JSON', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  expect(e.json()).toEqual({
    dag: {
      options: {
        directed: true,
        multigraph: false,
        compound: false,
      },
      nodes: [
        {
          v: '0',
          value: new TransformationNode(0, TransformationNodeType.CapitalizeNode, List<number>([0])),
        },
        {
          v: '1',
          value: new TransformationNode(1, TransformationNodeType.CapitalizeNode, List<number>([3])),
        },
      ],
      edges: [],
    },
    doc: {
      name: 'Bob',
      age: 17,
      meta: {
        school: 'Stanford',
      },
    },
    uidField: 4,
    uidNode: 2,
    fieldNameToIDMap: [
      [KeyPath(['name']), 0],
      [KeyPath(['age']), 1],
      [KeyPath(['meta']), 2],
      [KeyPath(['meta', 'school']), 3],
    ],
    IDToFieldNameMap: [
      [0, KeyPath(['name'])],
      [1, KeyPath(['age'])],
      [2, KeyPath(['meta'])],
      [3, KeyPath(['meta', 'school'])],
    ],
    fieldTypes: [
      [0, 'string'],
      [1, 'number'],
      [2, 'object'],
      [3, 'string'],
    ],
    fieldEnabled: [
      [0, true],
      [1, true],
      [2, true],
      [3, true],
    ],
    fieldProps: [
      [0, {}],
      [1, {}],
      [2, {}],
      [3, {}],
    ],
  });
});

test('JSON serialize/deserialize round trip', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  const j = e.json();
  const e2 = TransformationEngine.load(j);
  expect(e.equals(e2)).toBe(true);
  e2.addField(KeyPath(['i']), 'number');
  expect(e.equals(e2)).toBe(false);
});

test('String serialize/deserialize round trip', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  const j: string = JSON.stringify(e.json());
  const e2 = TransformationEngine.load(j);
  expect(e.equals(e2)).toBe(true);
  expect(e2.transform(doc1)['name']).toBe('BOB');
  e2.addField(KeyPath(['i']), 'number');
  expect(e.equals(e2)).toBe(false);
});

test('linear chain of transformations', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.SubstringNode, List<KeyPath>([KeyPath(['name'])]), { from: 0, length: 2 });
  const t = e.transform(doc1);
  expect(t['name']).toBe('BO');
});

test('get transformations for a field', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  const id1: number = e.addField(KeyPath(['name']), 'string');
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.SubstringNode, List<KeyPath>([KeyPath(['name'])]), { from: 0, length: 2 });
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  expect(e.getTransformations(id1)).toEqual(List<number>([0, 1]));
});

test('rename a field (no structural changes)', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  const id1: number = e.addField(KeyPath(['name']), 'string');
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.setOutputKeyPath(id1, KeyPath(['firstname']));
  expect(e.transform(doc1)['name']).toBe(undefined);
  expect(e.transform(doc1)['firstname']).toBe('Bob');
  e.setOutputKeyPath(id1, KeyPath(['professor']));
  expect(e.transform(doc1)['name']).toBe(undefined);
  expect(e.transform(doc1)['firstname']).toBe(undefined);
  expect(e.transform(doc1)['professor']).toBe('Bob');
});

test('rename a field (subjugation)', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  const id1: number = e.addField(KeyPath(['name']), 'string');
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.setOutputKeyPath(id1, KeyPath(['meta', 'firstname']));
  expect(e.transform(doc1)['name']).toBe(undefined);
  expect(e.transform(doc1)['meta']['firstname']).toBe('Bob');
});

test('rename a field (promotion)', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  e.addField(KeyPath(['name']), 'string');
  const id2: number = e.addField(KeyPath(['meta', 'school']), 'string');
  e.setOutputKeyPath(id2, KeyPath(['skool']));
  expect(e.transform(doc1)['skool']).toBe('Stanford');
  expect(e.transform(doc1)['meta']).toBe(undefined);
});

test('rename a field (an object with subkeys)', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  e.addField(KeyPath(['name']), 'string');
  const id2: number = e.addField(KeyPath(['meta']), 'object');
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.addField(KeyPath(['meta', 'sport']), 'string');
  e.setOutputKeyPath(id2, KeyPath());
  expect(e.transform(doc2)['meta']).toBe(undefined);
  expect(e.transform(doc2)['school']).toBe('Stanford');
  expect(e.transform(doc2)['sport']).toBe('bobsled');
});

test('transform of deeply nested value', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc3);
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['hardarr', '1', '1', '0'])]));
  expect(e.transform(doc3)).toEqual(
    {
      name: 'Bob',
      arr: [
        'sled',
        [
          {
            a: 'dog',
          },
          {
            b: 'doggo',
            a: 'fren',
          },
        ],
      ],
      hardarr: [
        [
          'a',
        ],
        [
          'b',
          [
            'C',
          ],
        ],
      ],
    },
  );
});

test('nested transform with wildcard', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc3);
  e.appendTransformation(TransformationNodeType.CapitalizeNode, List<KeyPath>([KeyPath(['arr', '1', '*', 'a'])]));
  expect(e.transform(doc3)).toEqual(
    {
      name: 'Bob',
      arr: [
        'sled',
        [
          {
            a: 'DOG',
          },
          {
            a: 'FREN',
            b: 'doggo',
          },
        ],
      ],
      hardarr: [
        [
          'a',
        ],
        [
          'b',
          [
            'c',
          ],
        ],
      ],
    },
  );
});
