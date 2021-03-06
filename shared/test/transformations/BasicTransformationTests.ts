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
import { KeyPath } from 'terrain-keypath';
import * as yadeep from 'yadeep';
import { TransformationEngine } from '../../transformations/TransformationEngine';
import TransformationNodeType from '../../transformations/TransformationNodeType';
import { TestDocs } from './TestDocs';

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import * as Utils from 'shared/transformations/util/EngineUtils';

function wrap(kp: any[])
{
  return List([List(kp)]);
}

test('change text field case', () =>
{
  const doc = Object.assign({}, TestDocs.doc1);
  doc['t1'] = 'camel case me bro';
  doc['t2'] = 'pascal case me bro';
  doc['t3'] = 'title case me bro';

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['t1'])]), { format: 'camelcase' });
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['t2'])]), { format: 'pascalcase' });
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['t3'])]), { format: 'titlecase' });
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['name'])]), { format: 'uppercase' });
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['name'])]), { format: 'lowercase' });
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]), { format: 'uppercase' });
  const r = e.transform(doc);
  expect(r['name']).toBe('bob');
  expect(r['t1']).toBe('camelCaseMeBro');
  expect(r['t2']).toBe('PascalCaseMeBro');
  expect(r['t3']).toBe('Title Case Me Bro');
  expect(yadeep.get(r, KeyPath(['meta', 'school']))).toBe('STANFORD');
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('prepend string to a field', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc1);
  e.appendTransformation(TransformationNodeType.InsertNode, List<KeyPath>([KeyPath(['name'])]), { at: 0, value: 'Sponge ' });
  const r = e.transform(TestDocs.doc1);
  expect(r['name']).toBe('Sponge Bob');
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('append string to a field', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc1);
  e.appendTransformation(TransformationNodeType.InsertNode, List<KeyPath>([KeyPath(['name'])]), { value: 's Burgers' });
  const r = e.transform(TestDocs.doc1);
  expect(r['name']).toBe('Bobs Burgers');
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('transform doc with null value(s)', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc6);
  const r = e.transform(TestDocs.doc6);
  expect(r['value']).toBe(null);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('linear chain of transformations', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc1);
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['name'])]), { format: 'uppercase' });
  e.appendTransformation(TransformationNodeType.SubstringNode, List<KeyPath>([KeyPath(['name'])]), { from: 0, length: 2 });
  const t = e.transform(TestDocs.doc1);
  expect(t['name']).toBe('BO');
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('get transformations for a field', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  const id1: number = e.addField(KeyPath(['name']));
  e.addField(KeyPath(['meta', 'school']));
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['name'])]), { format: 'uppercase' });
  e.appendTransformation(TransformationNodeType.SubstringNode, List<KeyPath>([KeyPath(['name'])]), { from: 0, length: 2 });
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]), { format: 'uppercase' });
  expect(e.getTransformations(id1)).toEqual(List<number>([0, 2, 3]));
});

test('array in array in object: identity transformation', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc7);
  expect(e.transform(TestDocs.doc7)).toEqual(TestDocs.doc7);
});

test('proper wildcard behavior across multiple docs', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc4);
  e.renameField(e.getFieldID(KeyPath(['arr'])), KeyPath(['car']));
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['car', -1])]), { format: 'uppercase' });
  expect(e.transform(TestDocs.doc5)).toEqual(
    {
      car: ['A', 'B', 'C', 'D'],
    },
  );
});

test('join two fields', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc2);
  e.appendTransformation(
    TransformationNodeType.JoinNode,
    List<KeyPath>([KeyPath(['meta', 'school']), KeyPath(['meta', 'sport'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['meta', 'fullTeam'])]),
      delimiter: ' ',
    });
  const r = e.transform(TestDocs.doc2);
  expect(r['meta']['fullTeam']).toBe('Stanford bobsled');
  expect(r['meta']['sport']).toBe('bobsled');
  expect(r['meta']['school']).toBe('Stanford');
});

test('join multiple fields in a nested array', () =>
{
  const doc = {
    fields: [
      {
        foo: 'somebody',
        bar: 'once',
        baz: 'told',
      },
      {
        blah: [],
      },
      {
        foo: 'me',
        baz: 'the',
      },
    ],
  };

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.JoinNode,
    List([KeyPath(['fields', -1, 'foo']), KeyPath(['fields', -1, 'bar']), KeyPath(['fields', -1, 'baz'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['fields', -1, 'combo'])]),
      delimiter: ' ',
    });
  const r = e.transform(doc);
  expect(r['fields'][0]['combo']).toBe('somebody once told');
  expect(r['fields'][1].hasOwnProperty('combo')).toBe(false);
  expect(r['fields'][2]['combo']).toBe('me the');
});

test('duplicate a field', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc2);
  e.appendTransformation(
    TransformationNodeType.DuplicateNode,
    List<KeyPath>([KeyPath(['meta', 'school'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['meta', 'schoolCopy'])]),
    });
  const r = e.transform(TestDocs.doc2);
  expect(r['meta']['school']).toBe('Stanford');
  expect(r['meta']['schoolCopy']).toBe('Stanford');
});

test('split a field (string delimiter)', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc2);
  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List<KeyPath>([KeyPath(['meta', 'sport'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['s1']), KeyPath(['s2']), KeyPath(['s3'])]),
      delimiter: 'b',
      regex: false,
    });
  const r = e.transform(TestDocs.doc2);
  expect(r['s1']).toBe('');
  expect(r['s2']).toBe('o');
  expect(r['s3']).toBe('sled');
});

test('split a field (numeric index)', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc2);
  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List<KeyPath>([KeyPath(['meta', 'sport'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['s1']), KeyPath(['s2'])]),
      delimiter: 3,
      regex: false,
    });
  const r = e.transform(TestDocs.doc2);
  expect(r['s1']).toBe('bob');
  expect(r['s2']).toBe('sled');
});

test('split a field (regex delimiter)', () =>
{
  const doc = {
    foo: 'la dee da',
  };

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List<KeyPath>([KeyPath(['foo'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['s1']), KeyPath(['s2']), KeyPath(['s3'])]),
      delimiter: '[\\s,]+',
      regex: true,
    });
  const r = e.transform(doc);
  expect(r['s1']).toBe('la');
  expect(r['s2']).toBe('dee');
  expect(r['s3']).toBe('da');
});

test('split multiple fields in a nested array', () =>
{
  const doc = {
    fields: [
      {
        foo: 'look what',
      },
      {
        blah: 'hi',
      },
      {
        foo: 'the cat dragged in',
      },
    ],
  };

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List([KeyPath(['fields', -1, 'foo'])]),
    {
      newFieldKeyPaths: List<KeyPath>([
        KeyPath(['fields', -1, 'f1']),
        KeyPath(['fields', -1, 'f2']),
        KeyPath(['fields', -1, 'f3']),
      ]),
      delimiter: ' ',
    });

  const r = e.transform(doc);

  expect(r['fields'][0]).toEqual({
    foo: 'look what',
    f1: 'look',
    f2: 'what',
    f3: '',
  });
  expect(r['fields'][1].hasOwnProperty('f1')).toBe(false);
  expect(r['fields'][2]).toEqual({
    foo: 'the cat dragged in',
    f1: 'the',
    f2: 'cat',
    f3: 'dragged in',
  });
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('regex split multiple fields in a nested array', () =>
{
  const doc = {
    fields: [
      {
        foo: 'XYZ1234ABC',
      },
      {
        foo: 'XYZ1234',
      },
      {
        foo: '143QWERTY000HELLO9ABC',
      },
    ],
  };

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List([KeyPath(['fields', -1, 'foo'])]),
    {
      newFieldKeyPaths: List<KeyPath>([
        KeyPath(['fields', -1, 'f1']),
        KeyPath(['fields', -1, 'f2']),
        KeyPath(['fields', -1, 'f3']),
      ]),
      delimiter: '[0-9]+',
      regex: true,
    });

  const r = e.transform(doc);

  expect(r['fields'][0]).toEqual({
    foo: 'XYZ1234ABC',
    f1: 'XYZ',
    f2: 'ABC',
    f3: '',
  });
  expect(r['fields'][1]).toEqual({
    foo: 'XYZ1234',
    f1: 'XYZ',
    f2: '',
    f3: '',
  });
  expect(r['fields'][2]).toEqual({
    foo: '143QWERTY000HELLO9ABC',
    f1: '',
    f2: 'QWERTY',
    f3: 'HELLO9ABC',
  });
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('cast node tests', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc2);
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['age'])]),
    {
      toTypename: FieldTypes.String,
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['meta', 'school'])]),
    {
      toTypename: FieldTypes.Object,
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['meta', 'sport'])]),
    {
      toTypename: FieldTypes.Array,
    });
  const r = e.transform(TestDocs.doc2, { removeEmptyObjects: false });
  expect(r['age']).toBe('17');
  expect(r['meta']['school']).toEqual({});
  expect(r['meta']['sport']).toEqual([]);
});

test('boolean cast tests', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc8);
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['t'])]),
    {
      toTypename: FieldTypes.Number,
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['t'])]),
    {
      toTypename: FieldTypes.Boolean,
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['f'])]),
    {
      toTypename: FieldTypes.Number,
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['f'])]),
    {
      toTypename: FieldTypes.Boolean,
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['tb'])]),
    {
      toTypename: FieldTypes.Number,
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['tb'])]),
    {
      toTypename: FieldTypes.String,
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['fb'])]),
    {
      toTypename: FieldTypes.Number,
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['fb'])]),
    {
      toTypename: FieldTypes.String,
    });
  const r = e.transform(TestDocs.doc8);
  expect(r['t']).toBe(true);
  expect(r['f']).toEqual(false);
  expect(r['tb']).toEqual('1');
  expect(r['fb']).toEqual('0');
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('date cast tests', () =>
{
  const doc = {
    foo: '5-18-2018',
    bar: '5-19-2018',
  };
  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['foo'])]),
    {
      toTypename: FieldTypes.Date,
      format: 'ISOstring',
    });
  e.appendTransformation(
    TransformationNodeType.CastNode,
    List<KeyPath>([KeyPath(['bar'])]),
    {
      toTypename: FieldTypes.Date,
      format: 'MMDDYYYY',
    });
  expect(e.transform(doc)['foo'].substr(0, 11)).toEqual('2018-05-18T');
  expect(e.transform(doc)['bar']).toEqual('05/19/2018');
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
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

  const e = Utils.construction.makeEngine(doc);

  expect(e.transform(doc)).toEqual(doc);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('split a nested field', () =>
{
  const doc = {
    foo: [
      { bar: 'Apples and Oranges' },
      { bar: 'Milk and Cookies' },
    ],
  };

  const e = Utils.construction.makeEngine(doc);

  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List([List(['foo', -1, 'bar'])]),
    {
      newFieldKeyPaths: List([List(['foo', -1, 'a']), List(['foo', -1, 'b'])]),
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
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('cast array to array should be no-op', () =>
{
  const doc = {
    foo: [
      { bar: 'Apples and Oranges' },
      { bar: 'Milk and Cookies' },
    ],
  };
  const e = Utils.construction.makeEngine(doc);

  e.appendTransformation(
    TransformationNodeType.CastNode,
    List([List(['foo'])]),
    {
      toTypename: FieldTypes.Array,
    },
  );
  expect(e.transform(doc)).toEqual(doc);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

// test('delete a field that has transformations', () =>
// {
//   const e = new TransformationEngine();
//   const id1 = e.addField(List(['foo']));
//   e.addField(List(['bar']));
//   e.appendTransformation(TransformationNodeType.CastNode, List([List(['foo'])]),
//     {
//       toTypename: FieldTypes.String,
//     });
//   e.deleteField(id1);
//   const doc = {
//     foo: 'hi',
//     bar: 'yo',
//   };
//   expect(e.transform(doc)).toEqual({ bar: 'yo' });
// });

test('cast on a field inside a nested object inside an array', () =>
{
  const e = new TransformationEngine();
  e.addField(List(['foo']));
  e.addField(List(['foo', -1]));
  const id3 = e.addField(List(['foo', -1, 'bar']));
  e.appendTransformation(
    TransformationNodeType.StringifyNode,
    List([e.getFieldPath(id3)]),
    {
      toTypename: FieldTypes.String,
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

test('hash transformation', () =>
{
  const doc = { email1: 'david@terraindata.com', email2: 'alex@terraindata.com' };
  const e = Utils.construction.makeEngine(doc);
  const salt1 = 'CIerTrDRYQPBAL7FOjxh1pQm';
  const salt2 = 'bQtO7Ne2dfg5qVRNsmCvCzwx';
  e.appendTransformation(TransformationNodeType.HashNode, List([List(['email1'])]), { salt: salt1 });
  e.appendTransformation(TransformationNodeType.HashNode, List([List(['email2'])]), { salt: salt2 });
  expect(e.transform(doc)).toEqual({
    email1: '88dc9d027e21e2b07b506f0f0bfe8ad2b63251e0fae77a8b66b88797ee8e4b35',
    email2: '67b92944abc44598c08ca7c1921c6e6af7f1f8db61694dfb2928f61e3a9aecb6',
  });
});

test('array sum transformation', () =>
{
  const doc = {
    foo: [1, 2, 3, 4],
  };

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.ArraySumNode,
    List<KeyPath>([KeyPath(['foo'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['foosum'])]),
    });
  const r = e.transform(doc);
  expect(r['foosum']).toBe(10);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('duplicate a wildcard array of fields', () =>
{
  const e = new TransformationEngine();
  e.addField(List(['foo']));
  e.addField(List(['foo', -1]));
  const id3 = e.addField(List(['foo', -1, 'bar']));
  e.appendTransformation(
    TransformationNodeType.DuplicateNode,
    List([e.getFieldPath(id3)]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['foo', -1, 'baz'])]),
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
  expect(e.transform(doc)).toEqual({
    foo: [
      {
        bar: 'hello',
        baz: 'hello',
      },
      {
        bar: 'hey there',
        baz: 'hey there',
      },
    ],
  });
});

test('test casting objects to string', () =>
{
  const e = new TransformationEngine();

  e.addField(List(['foo']));
  e.addField(List(['foo', 'bar']));
  e.addField(List(['foo', 'bar', -1]));
  e.addField(List(['foo', 'baz']));
  e.addField(List(['foo', 'baz', 'hey']));

  e.appendTransformation(TransformationNodeType.CastNode, List([List(['foo'])]), { toTypename: FieldTypes.String });

  const doc = {
    foo: {
      bar: [1, 2, 3],
      baz: { hey: 'doggo' },
    },
  };

  expect(e.transform(doc)).toEqual({
    foo: '{"bar":[1,2,3],"baz":{"hey":"doggo"}}',
  });
});

test('test casting strings to objects', () =>
{
  const e = new TransformationEngine();
  e.addField(List(['foo']));
  e.addField(List(['bar']));

  e.appendTransformation(TransformationNodeType.ParseNode, List([List(['foo'])]), { to: 'object' });
  e.appendTransformation(TransformationNodeType.CastNode, List([List(['bar'])]), { toTypename: FieldTypes.Object });

  const doc = {
    foo: '{"bar":[1,2,3],"baz":{"hey":"doggo"}}',
    bar: 'this should fail',
  };

  expect(e.transform(doc, { removeEmptyObjects: false })).toEqual({
    foo: {
      bar: [1, 2, 3],
      baz: { hey: 'doggo' },
    },
    bar: {},
  });
});

test('duplicate a field and then rename that field', () =>
{
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
  const e = Utils.construction.makeEngine(doc);
  e.addField(KeyPath(['foo', 0, 'bar']));
  e.appendTransformation(
    TransformationNodeType.DuplicateNode,
    List<KeyPath>([KeyPath(['foo', 0, 'bar'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['foo', 0, 'baz'])]),
    },
  );
  e.renameField(e.getFieldID(KeyPath(['foo', 0, 'baz'])), KeyPath(['foo', 0, 'nice']));
  expect(e.transform(doc)).toEqual({
    foo: [
      {
        bar: 'hello',
        nice: 'hello',
      },
      {
        bar: 'hey there',
      },
    ],
  });
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('super deep duplication and modify', () =>
{
  const doc = {
    fields1: [
      {
        fields2: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      },
      {
        fields2: [
          [0.5],
          [100],
        ],
      },
    ],
  };
  const e = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.DuplicateNode,
    wrap(['fields1', -1, 'fields2']),
    {
      newFieldKeyPaths: wrap(['fields1', -1, 'fields3']),
    },
  );
  e.appendTransformation(
    TransformationNodeType.AddNode,
    wrap(['fields1', -1, 'fields2', -1, -1]),
    {
      shift: 10,
    },
  );
  const r = e.transform(doc);
  expect(r['fields1'][0]['fields3']).toEqual([
    [1, 2, 3],
    [4, 5, 6],
  ]);
  expect(r['fields1'][0]['fields2']).toEqual([
    [11, 12, 13],
    [14, 15, 16],
  ]);
  expect(r['fields1'][1]['fields2']).toEqual([
    [10.5],
    [110],
  ]);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('suite of numeric transformations', () =>
{
  const doc = {
    foo: [
      {
        bar: [1, 2, 3, 4],
      },
      {
        bar: [3, 2, 1, 0],
      },
      {
        bar: [13.45, 16.5, 131.98],
      },
      {
        bar: [0.8, 17.5, 13.3],
      },
      {
        bar: [1.340294, 32.2942305, 4.129320],
      },
    ],
  };

  const e = Utils.construction.makeEngine(doc);
  Utils.fields.addIndexedField(e, KeyPath(['foo', 0, 'bar', -1]));
  Utils.fields.addIndexedField(e, KeyPath(['foo', 1, 'bar', -1]));
  Utils.fields.addIndexedField(e, KeyPath(['foo', 2, 'bar', -1]));
  Utils.fields.addIndexedField(e, KeyPath(['foo', 3, 'bar', -1]));
  Utils.fields.addIndexedField(e, KeyPath(['foo', 4, 'bar', -1]));
  e.appendTransformation(
    TransformationNodeType.AddNode,
    List<KeyPath>([KeyPath(['foo', 0, 'bar', -1])]),
    {
      shift: 1,
    },
  );
  e.appendTransformation(
    TransformationNodeType.SubtractNode,
    List<KeyPath>([KeyPath(['foo', 1, 'bar', -1])]),
    {
      shift: 1,
    },
  );
  e.appendTransformation(
    TransformationNodeType.MultiplyNode,
    List<KeyPath>([KeyPath(['foo', 0, 'bar', -1])]),
    {
      factor: 3,
    },
  );
  e.appendTransformation(
    TransformationNodeType.DivideNode,
    List<KeyPath>([KeyPath(['foo', 1, 'bar', -1])]),
    {
      factor: 2,
    },
  );
  e.appendTransformation(
    TransformationNodeType.RoundNode,
    List<KeyPath>([KeyPath(['foo', 2, 'bar', -1])]),
    {
      precision: 1,
    },
  );
  e.appendTransformation(
    TransformationNodeType.RoundNode,
    List<KeyPath>([KeyPath(['foo', 3, 'bar', -1])]),
    {
      precision: 0,
    },
  );
  e.appendTransformation(
    TransformationNodeType.RoundNode,
    List<KeyPath>([KeyPath(['foo', 4, 'bar', -1])]),
    {
      precision: 4,
    },
  );
  e.appendTransformation(
    TransformationNodeType.RoundNode,
    List<KeyPath>([KeyPath(['foo', 4, 'bar', -1])]),
    {
      precision: 2,
    },
  );

  expect(e.transform(doc)).toEqual(
    {
      foo: [
        {
          bar: [6, 9, 12, 15],
        },
        {
          bar: [1, 0.5, 0, -0.5],
        },
        {
          bar: [13.5, 16.5, 132.0],
        },
        {
          bar: [1, 18, 13],
        },
        {
          bar: [1.34, 32.29, 4.13],
        },
      ],
    },
  );
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('test set if transformation', () =>
{
  const e = Utils.construction.makeEngine(TestDocs.doc1);

  e.addField(List(['bleep']));

  e.appendTransformation(
    TransformationNodeType.SetIfNode,
    List([List(['name'])]),
    {
      filterValue: 'Bob',
      newValue: 'Tim',
    },
  );

  e.appendTransformation(
    TransformationNodeType.SetIfNode,
    List([List(['bleep'])]),
    {
      filterUndefined: true,
      newValue: 'bloop',
    },
  );

  const r = e.transform(TestDocs.doc1);
  expect(r['name']).toEqual('Tim');
  expect(r['bleep']).not.toEqual('bloop');
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('duplicate a disabled array', () =>
{
  const doc = {
    foo: [1, 2, 3],
  };
  const e = Utils.construction.makeEngine(doc);
  const kp = List(['foo']);
  e.appendTransformation(TransformationNodeType.DuplicateNode, List([kp]), {
    newFieldKeyPaths: List([List(['copy of foo'])]),
  });
  e.disableField(e.getFieldID(kp));
  expect(e.transform(doc)).toEqual({
    'copy of foo': [1, 2, 3],
  });
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('test find replace transformation', () =>
{
  const e = Utils.construction.makeEngine(TestDocs.doc9);

  e.appendTransformation(
    TransformationNodeType.FindReplaceNode,
    List([List(['meta', 'school'])]),
    {
      find: 'n',
      replace: 'b',
    },
  );

  e.appendTransformation(
    TransformationNodeType.FindReplaceNode,
    List([List(['age'])]),
    {
      find: '\\d',
      replace: 'N',
      regex: true,
    },
  );

  const r = e.transform(TestDocs.doc9);
  expect(r['meta']['school']).toEqual('Stabford');
  expect(r['age']).toEqual('NN years');
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('array count transformation', () =>
{
  const doc = {
    foo: [{}, { a: 3 }, { b: 'fo' }, 4, []],
  };

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.ArrayCountNode,
    List<KeyPath>([KeyPath(['foo'])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['foocount'])]),
    });
  const r = e.transform(doc);
  expect(r['foocount']).toBe(5);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('take product of several fields', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc7);
  Utils.fields.addIndexedField(e, KeyPath(['deepArray', 0, 0]));
  Utils.fields.addIndexedField(e, KeyPath(['deepArray', 1, 0]));
  e.appendTransformation(
    TransformationNodeType.ProductNode,
    List<KeyPath>([KeyPath(['deepArray', 0, 0]), KeyPath(['deepArray', 1, 0])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['producto'])]),
    });
  const r = e.transform(TestDocs.doc7);
  expect(r['producto']).toBe(30);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('take quotient of several fields', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc7);
  Utils.fields.addIndexedField(e, KeyPath(['deepArray', 0, 0]));
  Utils.fields.addIndexedField(e, KeyPath(['deepArray', 1, 0]));
  e.appendTransformation(
    TransformationNodeType.QuotientNode,
    List<KeyPath>([KeyPath(['deepArray', 1, 0]), KeyPath(['deepArray', 0, 0])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['quotiento'])]),
    });
  const r = e.transform(TestDocs.doc7);
  expect(r['quotiento']).toBe(1.2);
});

test('take sum of several fields', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc7);
  Utils.fields.addIndexedField(e, KeyPath(['deepArray', 0, 0]));
  Utils.fields.addIndexedField(e, KeyPath(['deepArray', 1, 0]));
  e.appendTransformation(
    TransformationNodeType.SumNode,
    List<KeyPath>([KeyPath(['deepArray', 0, 0]), KeyPath(['deepArray', 1, 0])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['summo'])]),
    });
  const r = e.transform(TestDocs.doc7);
  expect(r['summo']).toBe(11);
});

test('take difference of several fields', () =>
{
  const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc7);
  Utils.fields.addIndexedField(e, KeyPath(['deepArray', 0, 0]));
  Utils.fields.addIndexedField(e, KeyPath(['deepArray', 1, 0]));
  e.appendTransformation(
    TransformationNodeType.DifferenceNode,
    List<KeyPath>([KeyPath(['deepArray', 0, 0]), KeyPath(['deepArray', 1, 0])]),
    {
      newFieldKeyPaths: List<KeyPath>([KeyPath(['differenceo'])]),
    });
  const r = e.transform(TestDocs.doc7);
  expect(r['differenceo']).toBe(-1);
});

// TODO: Refactor tests since private keys are now registered by midway
// test('Encrypt a field', () =>
// {
//   const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc2);
//   e.appendTransformation(
//     TransformationNodeType.EncryptNode,
//     List<KeyPath>([KeyPath(['name'])]),
//   );
//   const r = e.transform(TestDocs.doc2);
//   expect(r['name']).toBe('cd1ae3');
// });

// test('Encrypt and decrypt a field', () =>
// {
//   const e: TransformationEngine = Utils.construction.makeEngine(TestDocs.doc2);
//   e.appendTransformation(
//     TransformationNodeType.EncryptNode,
//     List<KeyPath>([KeyPath(['name'])]),
//   );
//   e.appendTransformation(
//     TransformationNodeType.DecryptNode,
//     List<KeyPath>([KeyPath(['name'])]),
//   );
//   const r = e.transform(TestDocs.doc2);
//   expect(r['name']).toBe('Bob');
// });

test('Duplicate a nested field', () =>
{
  const doc = {
    field: {
      subField: {
        foo: 'bar',
      },
    },
  };
  const e = Utils.construction.makeEngine(doc);
  e.appendTransformation(TransformationNodeType.DuplicateNode, wrap(['field']), {
    newFieldKeyPaths: wrap(['copy1']),
  });

  const sub1 = e.getFieldID(List(['copy1', 'subField']));
  e.disableField(sub1);

  const r = e.transform(doc);
  expect(Object.keys(r['copy1']).length).toEqual(0);
  expect(Object.keys(r['field']).length).toEqual(1);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('split a field that does not always exist', () =>
{
  const doc = {
    id: 'blah',
    size: '8.5\" x 11\"',
  };

  const doc2 = {
    id: 'foo',
  };

  const e = Utils.construction.makeEngine(doc);

  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List([List(['size'])]),
    {
      newFieldKeyPaths: List([List(['w']), List(['h'])]),
      delimiter: ' x ',
    },
  );

  expect(e.transform(doc)).toEqual(
    {
      id: 'blah',
      size: '8.5\" x 11\"',
      w: '8.5\"',
      h: '11\"',
    },
  );

  expect(e.transform(doc2)).toEqual(
    {
      id: 'foo',
    },
  );
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('Group By Transformation', () =>
{

  const doc =
  {
    items: [
      { status: 'active', mlsId: 1 },
      { status: 'sold', mlsId: 2 },
      { status: 'active', mlsId: 3 },
      { status: 'some garbage', mlsId: 5 },
    ],
  };

  const e = Utils.construction.makeEngine(doc);
  e.appendTransformation(TransformationNodeType.GroupByNode, wrap(['items']), {
    newFieldKeyPaths: List([
      List(['activeItems']),
      List(['soldItems']),
    ]),
    subkey: 'status',
    groupValues: ['active', 'sold'],
  });
  expect(e.transform(doc)).toEqual(
    {
      items: [
        { status: 'active', mlsId: 1 },
        { status: 'sold', mlsId: 2 },
        { status: 'active', mlsId: 3 },
        { status: 'some garbage', mlsId: 5 },
      ],
      activeItems: [
        { status: 'active', mlsId: 1 },
        { status: 'active', mlsId: 3 },
      ],
      soldItems: [
        { status: 'sold', mlsId: 2 },
      ],
    },
  );
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('numeric keys', () =>
{
  {
    const doc = { '-1': [{ z: 1, 1: { 2: 1 } }, { z: 2.5 }] };
    const e = Utils.construction.makeEngine(doc);
    Utils.fields.addIndexedField(e, KeyPath(['-1', 0, '1', '2']));
    e.appendTransformation(TransformationNodeType.AddNode, List([List(['-1', 0, '1', '2'])]), { shift: 13 });
    e.appendTransformation(TransformationNodeType.AddNode, List([List(['-1', -1, 'z'])]), { shift: 3 });
    expect(e.transform(doc)).toEqual({ '-1': [{ z: 4, 1: { 2: 14 } }, { z: 5.5 }] });
  }
});

test('transform a zipcode', () =>
{
  const doc = {
    zip1: '10451',
    zip2: '10451',
    zip3: '10451',
    zip4: '10451',
    zip5: '01234',
    zip6: '01234',
    zip7: '96400',
    zip8: '96400',
  };

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(TransformationNodeType.ZipcodeNode, List<KeyPath>([KeyPath(['zip1'])]), { format: 'latlon' });
  e.appendTransformation(TransformationNodeType.ZipcodeNode, List<KeyPath>([KeyPath(['zip2'])]), { format: 'city' });
  e.appendTransformation(TransformationNodeType.ZipcodeNode, List<KeyPath>([KeyPath(['zip3'])]), { format: 'state' });
  e.appendTransformation(TransformationNodeType.ZipcodeNode, List<KeyPath>([KeyPath(['zip4'])]), { format: 'citystate' });
  e.appendTransformation(TransformationNodeType.ZipcodeNode, List<KeyPath>([KeyPath(['zip5'])]), { format: 'city' });
  e.appendTransformation(TransformationNodeType.ZipcodeNode, List<KeyPath>([KeyPath(['zip6'])]), { format: 'latlon' });
  e.appendTransformation(TransformationNodeType.ZipcodeNode, List<KeyPath>([KeyPath(['zip7'])]), { format: 'type' });
  e.appendTransformation(TransformationNodeType.ZipcodeNode, List<KeyPath>([KeyPath(['zip8'])]), { format: 'latlon' });
  const r = e.transform(doc);
  expect(r['zip1']).toEqual({ lat: 40.84, lon: -73.87 });
  expect(r['zip2']).toBe('BRONX');
  expect(r['zip3']).toBe('NY');
  expect(r['zip4']).toBe('BRONX, NY');
  expect(r['zip5']).toBe(null);
  expect(r['zip6']).toBe(null);
  expect(r['zip7']).toBe('MILITARY');
  expect(r['zip8']).toBe(null);
});

test('simple transformation on deep array', () =>
{
  const e = new TransformationEngine();
  e.addField(KeyPath(['numbers']));
  e.addField(KeyPath(['numbers', -1]));
  e.addField(KeyPath(['numbers', -1, -1]));
  e.appendTransformation(TransformationNodeType.AddNode, List([KeyPath(['numbers', -1, -1])]), { shift: 1 });
  const r = e.transform(TestDocs.doc10);
  expect(r['numbers']).toEqual([
    [2, 3, 4],
    [5, 6, 7],
    [8, 9, 10],
  ]);
});

test('remove duplicates test', () =>
{
  const doc = {
    fields: [1, 4, 3, 2, 2, 5, 1],
  };
  const e = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.RemoveDuplicatesNode,
    wrap(['fields']),
    {},
  );
  const r = e.transform(doc);
  expect(r).toEqual({
    fields: [1, 4, 3, 2, 5],
  });
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('remove nested duplicates test', () =>
{
  const doc = {
    fields: [
      [1, 3, 2, 1],
      [2, 3, 3, 4],
      [5, 6, 7],
    ],
  };
  const e = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.RemoveDuplicatesNode,
    wrap(['fields', -1]),
    {},
  );
  const r = e.transform(doc);
  expect(r).toEqual({
    fields: [
      [1, 3, 2],
      [2, 3, 4],
      [5, 6, 7],
    ],
  });
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('filter array test null', () =>
{
  const doc = {
    fields: [3, 2, null, 5, null, undefined],
  };
  const e = Utils.construction.makeEngine(doc);

  e.appendTransformation(
    TransformationNodeType.FilterArrayNode,
    wrap(['fields']),
    { filterNull: true },
  );
  const r = e.transform(doc);
  expect(r).toEqual({
    fields: [3, 2, 5, undefined],
  });
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('filter array test undefined', () =>
{
  const doc = {
    fields: [3, 2, null, 5, null, undefined],
  };
  const e = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.FilterArrayNode,
    wrap(['fields']),
    { filterUndefined: true },
  );
  const r = e.transform(doc);
  expect(r).toEqual({
    fields: [3, 2, null, 5, null],
  });
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('filter array test complex', () =>
{
  const doc = {
    fields: [3, 2, null, 5, null, undefined],
  };
  const e = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.FilterArrayNode,
    wrap(['fields']),
    { filterUndefined: true, filterNull: true },
  );
  const r = e.transform(doc);
  expect(r).toEqual({
    fields: [3, 2, 5],
  });
  expect(e.transform({
    fields: [],
  })).toEqual({
    fields: [],
  });
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});
