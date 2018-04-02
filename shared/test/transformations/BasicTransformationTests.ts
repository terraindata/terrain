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
import { TransformationInfo } from '../../transformations/TransformationInfo';
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
  // arr2: [{foo: {bar: {cat: 'a'}}}],
  // arr2: [[{foo: 'a', bar: 'b'}], [{foo: 'c'}]],
  hardarr: [['a'], ['b', ['c']]],
};

const doc4 = {
  arr: ['a', 'b'],
};

const doc5 = {
  arr: ['a', 'b', 'c', 'd'],
};

const doc6 = {
  value: null,
};

const doc7 = {
  deepArray:
    [
      [
        5,
      ],
      [
        6,
      ],
    ],
};

test('add fields manually', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  const r = e.transform(doc1);
  expect(yadeep.get(r, KeyPath(['meta', 'school']))).toBe('STANFORD');
});

test('make a field uppercase', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  const r = e.transform(doc1);
  expect(r['name']).toBe('BOB');
  expect(yadeep.get(r, KeyPath(['meta', 'school']))).toBe('STANFORD');
});

test('prepend string to a field', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.InsertNode, List<KeyPath>([KeyPath(['name'])]), { at: 0, value: 'Sponge ' });
  const r = e.transform(doc1);
  expect(r['name']).toBe('Sponge Bob');
});

test('append string to a field', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.InsertNode, List<KeyPath>([KeyPath(['name'])]), { value: 's Burgers' });
  const r = e.transform(doc1);
  expect(r['name']).toBe('Bobs Burgers');
});

test('insert field value in a field', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.InsertNode, List<KeyPath>([KeyPath(['name'])]),
    { at: 0, value: ' ' });
  e.appendTransformation(TransformationNodeType.InsertNode, List<KeyPath>([KeyPath(['name'])]),
    { at: 0, value: KeyPath(['meta', 'school']) });
  const r = e.transform(doc1);
  expect(r['name']).toBe('Stanford Bob');
});

test('transform doc with null value(s)', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc6);
  const r = e.transform(doc6);
  expect(r['value']).toBe(null);
});

test('serialize to JSON', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  expect(e.toJSON()).toEqual({
    dag: {
      options: {
        directed: true,
        multigraph: false,
        compound: false,
      },
      nodes: [
        {
          v: '0',
          value: new (TransformationInfo.getType(TransformationNodeType.UppercaseNode))
            (0, List<KeyPath>([KeyPath(['name'])]), {}, TransformationNodeType.UppercaseNode),
        },
        {
          v: '1',
          value: new (TransformationInfo.getType(TransformationNodeType.UppercaseNode))
            (1, List<KeyPath>([KeyPath(['meta', 'school'])]), {}, TransformationNodeType.UppercaseNode),
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
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  const j = e.toJSON();
  const e2 = TransformationEngine.load(j);
  expect(e.equals(e2)).toBe(true);
  e2.addField(KeyPath(['i']), 'number');
  expect(e.equals(e2)).toBe(false);
});

test('String serialize/deserialize round trip', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
  const j: string = JSON.stringify(e.toJSON());
  const e2 = TransformationEngine.load(j);
  expect(e.equals(e2)).toBe(true);
  expect(e2.transform(doc1)['name']).toBe('BOB');
  e2.addField(KeyPath(['i']), 'number');
  expect(e.equals(e2)).toBe(false);
});

test('String serialize/deserialize round trip - substring', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.SubstringNode, List<KeyPath>([KeyPath(['meta', 'school'])]), { from: 1, length: 3 });
  const j: string = JSON.stringify(e.toJSON());
  const e2 = TransformationEngine.load(j);
  expect(e.equals(e2)).toBe(true);
  expect(e2.transform(doc1)['meta']['school']).toBe('tan');
});

test('linear chain of transformations', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.SubstringNode, List<KeyPath>([KeyPath(['name'])]), { from: 0, length: 2 });
  const t = e.transform(doc1);
  expect(t['name']).toBe('BO');
});

test('get transformations for a field', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  const id1: number = e.addField(KeyPath(['name']), 'string');
  e.addField(KeyPath(['meta', 'school']), 'string');
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['name'])]));
  e.appendTransformation(TransformationNodeType.SubstringNode, List<KeyPath>([KeyPath(['name'])]), { from: 0, length: 2 });
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]));
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

test('rename a field (deeply nested property in array)', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc3);
  e.setOutputKeyPath(e.getInputFieldID(KeyPath(['arr', '1', '*', 'a'])), KeyPath(['arr', '1', '*', 'cool']));
  expect(e.transform(doc3)['arr'][1][0]['a']).toBe(undefined);
  expect(e.transform(doc3)['arr'][1][0]['cool']).toBe('dog');
  expect(e.transform(doc3)['arr'][1][1]['a']).toBe(undefined);
  expect(e.transform(doc3)['arr'][1][1]['cool']).toBe('fren');
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

test('array in array in object: identity transformation', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc7);
  expect(e.transform(doc7)).toEqual(doc7);
});

test('proper wildcard behavior in rename stage', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc4);
  e.setOutputKeyPath(e.getInputFieldID(KeyPath(['arr'])), KeyPath(['car']));
  expect(e.transform(doc5)).toEqual(
    {
      car: ['a', 'b', 'c', 'd'],
    },
  );
});

test('transform of deeply nested value', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc3);
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['hardarr', '1', '1', '0'])]));
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
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['arr', '1', '*', 'a'])]));
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

test('proper wildcard behavior across multiple docs', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc4);
  e.setOutputKeyPath(e.getInputFieldID(KeyPath(['arr'])), KeyPath(['car']));
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['arr', '*'])]));
  expect(e.transform(doc5)).toEqual(
    {
      car: ['A', 'B', 'C', 'D'],
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

test('(deep) clone a TransformationEngine', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc4);
  e.setOutputKeyPath(e.getInputFieldID(KeyPath(['arr'])), KeyPath(['car']));
  e.appendTransformation(TransformationNodeType.UppercaseNode, List<KeyPath>([KeyPath(['arr', '*'])]));
  const clone: TransformationEngine = e.clone();
  expect(clone.equals(e)).toBe(true);
  e.setOutputKeyPath(e.getInputFieldID(KeyPath(['arr'])), KeyPath(['dog']));
  expect(clone.equals(e)).toBe(false);
});

test('join two fields', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc2);
  e.appendTransformation(
    TransformationNodeType.JoinNode,
    List<KeyPath>([KeyPath(['meta', 'school']), KeyPath(['meta', 'sport'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['meta', 'fullTeam'])]),
      preserveOldFields: false,
      delimiter: ' ',
    });
  const r = e.transform(doc2);
  expect(r['meta']['fullTeam']).toBe('Stanford bobsled');
  expect(r['meta']['sport']).toBe(undefined);
  expect(r['meta']['school']).toBe(undefined);
});

test('duplicate a field', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc2);
  e.appendTransformation(
    TransformationNodeType.DuplicateNode,
    List<KeyPath>([KeyPath(['meta', 'school'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['meta', 'schoolCopy'])]),
    });
  const r = e.transform(doc2);
  expect(r['meta']['school']).toBe('Stanford');
  expect(r['meta']['schoolCopy']).toBe('Stanford');
});

test('split a field (string delimiter)', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc2);
  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List<KeyPath>([KeyPath(['meta', 'sport'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['s1']), KeyPath(['s2']), KeyPath(['s3'])]),
      preserveOldFields: false,
      delimiter: 'b',
    });
  const r = e.transform(doc2);
  expect(r['s1']).toBe('');
  expect(r['s2']).toBe('o');
  expect(r['s3']).toBe('sled');
});

test('split a field (numeric index)', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc2);
  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List<KeyPath>([KeyPath(['meta', 'sport'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['s1']), KeyPath(['s2'])]),
      preserveOldFields: false,
      delimiter: 3,
    });
  const r = e.transform(doc2);
  expect(r['s1']).toBe('bob');
  expect(r['s2']).toBe('sled');
});

test('split a field (regex delimiter)', () =>
{
  const doc = {
    foo: 'la dee da',
  };

  const e: TransformationEngine = new TransformationEngine(doc);
  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List<KeyPath>([KeyPath(['foo'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['s1']), KeyPath(['s2']), KeyPath(['s3'])]),
      preserveOldFields: false,
      delimiter: RegExp('[\\s,]+'),
    });
  const r = e.transform(doc);
  expect(r['s1']).toBe('la');
  expect(r['s2']).toBe('dee');
  expect(r['s3']).toBe('da');
});

test('cast node tests', () =>
{

  const e: TransformationEngine = new TransformationEngine(doc2);
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['age'])]),
    {
      toTypename: 'string',
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['meta', 'school'])]),
    {
      toTypename: 'object',
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['meta', 'sport'])]),
    {
      toTypename: 'array',
    });
  const r = e.transform(doc2);
  expect(r['age']).toBe('17');
  expect(r['meta']['school']).toEqual({});
  expect(r['meta']['sport']).toEqual([]);
});

test('super deep transformation preserves arrays', () =>
{
  const doc = {
    foo: [
      {
        bar: [1, 2, 3],
      },
      {
        bar: [3, 2, 1],
      },
    ],
  };

  const e = new TransformationEngine(doc);

  expect(e.transform(doc)).toEqual(doc);
});

test('split a nested field', () =>
{
  const doc = {
    foo: [
      { bar: 'Apples and Oranges' },
      { bar: 'Milk and Cookies' },
    ],
  };

  const e = new TransformationEngine(doc);

  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List([List(['foo', '*', 'bar'])]),
    {
      newFieldKeyPaths: List([List(['foo', '*', 'a']), List(['foo', '*', 'b'])]),
      preserveOldFields: true,
      delimiter: ' and ',
    },
  );

  expect(e.transform(doc)).toEqual(
    {
      foo: [
        { bar: 'Apples and Oranges', a: 'Apples', b: 'Oranges' },
        { bar: 'Milk and Cookies', a: 'Milk', b: 'Cookies' },
      ],
    },
  );
});

test('cast array to array should be no-op', () =>
{
  const doc = {
    foo: [
      { bar: 'Apples and Oranges' },
      { bar: 'Milk and Cookies' },
    ],
  };

  const e = new TransformationEngine(doc);

  e.appendTransformation(
    TransformationNodeType.CastNode,
    List([List(['foo'])]),
    {
      toTypename: 'array',
    },
  );

  expect(e.transform(doc)).toEqual(doc);
});

test('delete a field that has transformations', () =>
{
  const e = new TransformationEngine();
  const id1 = e.addField(List(['foo']), 'string');
  e.addField(List(['bar']), 'string');
  e.appendTransformation(TransformationNodeType.CastNode, List([List(['foo'])]),
    {
      toTypename: 'string',
    });
  e.deleteField(id1);
  const doc = {
    foo: 'hi',
    bar: 'yo',
  };
  expect(e.transform(doc)).toEqual({ bar: 'yo' });
});

test('cast on a field inside a nested object inside an array', () =>
{
  const e = new TransformationEngine();
  e.addField(List(['foo']), 'array', { valueType: 'object' });
  e.addField(List(['foo', '*']), 'array', { valueType: 'object' });
  const id3 = e.addField(List(['foo', '*', 'bar']), 'string');
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List([e.getInputKeyPath(id3)]),
    {
      toTypename: 'string',
    },
  );
  const doc = {
    foo: [
      {
        bar: 'hello',
      },
      {
        bar: 'hey there',
      },
    ],
  };
  expect(e.transform(doc)).toEqual(doc);
});
