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

import { DateFormats, FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import TransformationRegistry from 'shared/transformations/TransformationRegistry';

import { KeyPath, WayPoint } from '../../util/KeyPath';
import * as yadeep from '../../util/yadeep';
import { TestDocs } from './TestDocs';

import * as Utils from 'shared/transformations/util/EngineUtils';

function wrap(kp: any[])
{
  return List([List<string | number>(kp)]);
}

test('identity transformation for nested arrays', () =>
{
  const doc = {
    fields: [
      {
        foo: 'look what',
      },
      {
        blah: [],
      },
      {
        foo: 'the cat dragged in',
      },
    ],
  };

  const copyOfDoc = _.cloneDeep(doc);
  const e = Utils.construction.makeEngine(doc);
  const r = e.transform(doc);
  expect(r).toEqual(copyOfDoc);
});

test('identity transformation for ui-constructed nested arrays', () =>
{
  const doc = {
    fields: [
      {
        foo: 'look what',
      },
      {
        blah: [],
      },
      {
        foo: 'the cat dragged in',
      },
    ],
  };

  const copyOfDoc = _.cloneDeep(doc);
  const e = Utils.construction.makeEngine(doc);
  const r = e.transform(doc);
  expect(r).toEqual(copyOfDoc);
});

test('join transformation where the first field does not exist', () =>
{

  const doc = {
    f2: 'hello',
    f3: 'world',
  };

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.addField(KeyPath(['f1']));
  e.appendTransformation(
    TransformationNodeType.JoinNode,
    List([KeyPath(['f1']), KeyPath(['f2']), KeyPath(['f3'])]),
    {
      newFieldKeyPaths: wrap(['result']),
      delimiter: ' ',
    });
  const r = e.transform(doc);
  expect(r).toEqual({
    f2: 'hello',
    f3: 'world',
    result: 'hello world',
  });
});

test('array sum on a nested array field', () =>
{
  const doc = {
    foo: [
      {
        values: [1, 2, 3, 4, 5],
      },
      {
        values: [3, 2, 1],
      },
    ],
  };

  const e: TransformationEngine = Utils.construction.makeEngine(doc);
  e.appendTransformation(
    TransformationNodeType.ArraySumNode,
    wrap(['foo', -1, 'values']),
    {
      newFieldKeyPaths: wrap(['foo', -1, 'sum']),
    });
  const r = e.transform(doc);
  expect(r).toEqual({
    foo: [
      {
        values: [1, 2, 3, 4, 5],
        sum: 15,
      },
      {
        values: [3, 2, 1],
        sum: 6,
      },
    ],
  });
});

test('extract an array field with duplicate', () =>
{
  const doc = {
    fields: ['foo', 'bar', 'baz'],
  };
  const e = Utils.construction.makeEngine(doc);
  e.addField(KeyPath(['fields', 0]));
  e.appendTransformation(
    TransformationNodeType.DuplicateNode,
    wrap(['fields', 0]),
    { newFieldKeyPaths: wrap(['zeroth']) },
  );
  e.addField(List(['fields', 5]));
  e.appendTransformation(
    TransformationNodeType.DuplicateNode,
    wrap(['fields', 5]),
    { newFieldKeyPaths: wrap(['tooBig']) },
  );

  const r = e.transform(doc);
  expect(r).toEqual({
    fields: ['foo', 'bar', 'baz'],
    zeroth: 'foo',
  });
});

describe('suite of complex duplication tests', () =>
{
  function dupHelper(inKP: WayPoint[], outKP: WayPoint[], inDoc: object): object
  {
    const e = Utils.construction.makeEngine(inDoc);
    e.appendTransformation(
      TransformationNodeType.DuplicateNode,
      wrap(inKP),
      { newFieldKeyPaths: wrap(outKP) },
    );
    const r = e.transform(inDoc);
    return r;
  }

  test('many to one', () =>
  {
    expect(dupHelper(['items', -1, 'foo'], ['allFoos'], {
      items: [
        { foo: 1 },
        { foo: 2 },
        { foo: 3 },
      ],
    })).toEqual({
      items: [
        { foo: 1 },
        { foo: 2 },
        { foo: 3 },
      ],
      allFoos: [1, 2, 3],
    });
  });

  test('nested one to one', () =>
  {
    expect(dupHelper(
      ['items', -1, 'foo'],
      ['items', -1, 'bar'],
      {
        items: [
          { foo: 1 },
          { foo: 2 },
          { notFoo: 3 },
        ],
      },
    )).toEqual(
      {
        items: [
          { foo: 1, bar: 1 },
          { foo: 2, bar: 2 },
          { notFoo: 3 },
        ],
      },
    );
  });

  test('nested array one to one', () =>
  {
    expect(dupHelper(
      ['items', -1, 'foo'],
      ['items', -1, 'bar'],
      {
        items: [
          { foo: [1, 2, 3] },
          { foo: [] },
          { notFoo: 3 },
        ],
      },
    )).toEqual(
      {
        items: [
          { foo: [1, 2, 3], bar: [1, 2, 3] },
          { foo: [], bar: [] },
          { notFoo: 3 },
        ],
      },
    );
  });

  test('super nested one to one', () =>
  {
    expect(dupHelper(
      ['items', -1, 'moreItems', -1, 'foo'],
      ['items', -1, 'moreItems', -1, 'bar'],
      {
        items: [
          {
            moreItems: [
              { foo: 1 },
              { foo: 2 },
              { notFoo: 3 },
            ],
            decoy: 'hello',
          },
          {
            moreItems: [
              { notFoo: 4 },
              { foo: 5 },
              { foo: 6 },
            ],
            decoy: 'hey there',
          },
        ],
      },
    )).toEqual(
      {
        items: [
          {
            moreItems: [
              { foo: 1, bar: 1 },
              { foo: 2, bar: 2 },
              { notFoo: 3 },
            ],
            decoy: 'hello',
          },
          {
            moreItems: [
              { notFoo: 4 },
              { foo: 5, bar: 5 },
              { foo: 6, bar: 6 },
            ],
            decoy: 'hey there',
          },
        ],
      },
    );
  });

  test('one to many', () =>
  {
    expect(dupHelper(
      ['foo'],
      ['items', -1, 'bar'],
      {
        foo: 5,
        items: [
          { foo: 1 },
          { foo: 2 },
          { notFoo: 3 },
        ],
      },
    )).toEqual(
      {
        foo: 5,
        items: [
          { foo: 1, bar: 5 },
          { foo: 2, bar: 5 },
          { notFoo: 3, bar: 5 },
        ],
      },
    );
  });
});

describe('Simple multi rename with an operation', () =>
{
  const doc = {
    nested: {
      foo: 'hi',
    },
  };
  const { engine } = Utils.construction.createEngineFromDocuments(List([doc]));
  const nestedId = engine.getFieldID(KeyPath(['nested']));
  const fooId = engine.getFieldID(KeyPath(['nested', 'foo']));

  engine.renameField(fooId, KeyPath(['nested', 'bar']));
  engine.renameField(nestedId, KeyPath(['thing']));
  engine.appendTransformation(TransformationNodeType.StringifyNode, List([nestedId]));

  expect(engine.transform(doc)).toEqual({
    thing: '{"bar":"hi"}',
  });
});

describe('Complex Stringify and Parse Gauntlet', () =>
{
  const baseDoc = {
    foo: 'hello',
    nested: {
      name: 'bob',
      value: 10,
    },
  };

  /*
   *  This test stringifies an object field, surrounds it with '[' and ']' then parses it.
   */
  function runGauntlet(engine: TransformationEngine, doc: object)
  {
    expect(engine.getFieldID(KeyPath(['nested', 'name']))).toBeDefined();
    expect(engine.getFieldID(KeyPath(['nested', 'value']))).toBeDefined();

    const nestedID = engine.getFieldID(KeyPath(['nested']));
    expect(nestedID).toBeDefined();
    engine.appendTransformation(TransformationNodeType.StringifyNode, List([nestedID]));

    const nestedAsStr = engine.transform(doc)['nested'];
    expect(typeof nestedAsStr).toBe('string');
    expect(JSON.parse(nestedAsStr)).toEqual(baseDoc['nested']);
    expect(Utils.fields.fieldType(nestedID, engine)).toBe(FieldTypes.String);

    expect(engine.getFieldID(KeyPath(['nested', 'name']))).toBeUndefined();
    expect(engine.getFieldID(KeyPath(['nested', 'value']))).toBeUndefined();

    engine.appendTransformation(TransformationNodeType.InsertNode, List([nestedID]), { at: 0, value: '[' });
    engine.appendTransformation(TransformationNodeType.InsertNode, List([nestedID]), { at: -1, value: ']' });
    engine.appendTransformation(TransformationNodeType.ParseNode, List([nestedID]), { to: FieldTypes.Array });
    const finalTransformed = engine.transform(doc);
    const nestedAsArr = finalTransformed['nested'];
    expect(nestedAsArr).toEqual([baseDoc['nested']]);
    expect(finalTransformed['foo']).toBe(baseDoc['foo']);
    expect(Utils.fields.fieldType(nestedID, engine)).toBe(FieldTypes.Array);

    return engine;
  }

  test('Simple Gauntlet', () =>
  {
    const { engine } = Utils.construction.createEngineFromDocuments(List([baseDoc]));
    Utils.transformations.addInitialTypeCasts(engine);
    runGauntlet(engine, baseDoc);
  });

  test('Gauntlet with initial rename', () =>
  {
    const doc = {
      foo: 'hello',
      noosted: {
        fame: 'bob',
        eulav: 10,
      },
    };
    const { engine } = Utils.construction.createEngineFromDocuments(List([doc]));
    Utils.transformations.addInitialTypeCasts(engine);

    const nameId = engine.getFieldID(KeyPath(['noosted', 'fame']));
    engine.renameField(nameId, KeyPath(['noosted', 'name']));

    const nestedId = engine.getFieldID(KeyPath(['noosted']));
    engine.renameField(nestedId, KeyPath(['nested']));

    const valueId = engine.getFieldID(KeyPath(['nested', 'eulav']));
    engine.renameField(valueId, KeyPath(['nested', 'value']));
    runGauntlet(engine, doc);
  });

  test('Gauntlet with in place transformations', () =>
  {
    const doc = {
      foo: 'ello',
      nested: {
        name: 'BOB',
        value: 3,
      },
    };
    const { engine } = Utils.construction.createEngineFromDocuments(List([doc]));
    Utils.transformations.addInitialTypeCasts(engine);

    const nameId = engine.getFieldID(KeyPath(['nested', 'name']));
    const nestedId = engine.getFieldID(KeyPath(['nested']));
    const fooId = engine.getFieldID(KeyPath(['foo']));
    const valueId = engine.getFieldID(KeyPath(['nested', 'value']));

    engine.appendTransformation(TransformationNodeType.CaseNode, List([nameId]), {
      format: 'lowercase', // can't seem to import CaseFormats
    });
    engine.appendTransformation(TransformationNodeType.AddNode, List([valueId]), {
      shift: 7,
    });
    engine.appendTransformation(TransformationNodeType.InsertNode, List([fooId]), {
      at: 0,
      value: 'h',
    });
    runGauntlet(engine, doc);
  });

  test('Gauntlet with combination of joins sums and renames', () =>
  {
    const doc = {
      fooPart1: 'he',
      fooPart2: 'llo',
      nested: {
        name: 'bob',
        value: 3,
        valuePart: 7,
      },
    };
    const { engine } = Utils.construction.createEngineFromDocuments(List([doc]));
    Utils.transformations.addInitialTypeCasts(engine);

    const fooPartId = engine.getFieldID(KeyPath(['fooPart1']));
    const fooPart2Id = engine.getFieldID(KeyPath(['fooPart2']));
    engine.renameField(fooPartId, KeyPath(['fooPartRenamed']));
    engine.appendTransformation(TransformationNodeType.JoinNode, List([fooPartId, fooPart2Id]), {
      delimiter: '',
      newFieldKeyPaths: wrap(['foo']),
    });
    const valueId = engine.getFieldID(KeyPath(['nested', 'value']));
    const valuePartId = engine.getFieldID(KeyPath(['nested', 'valuePart']));
    engine.appendTransformation(TransformationNodeType.SumNode, List([valueId, valuePartId]), {
      newFieldKeyPaths: wrap(['sumvalue']),
    });
    engine.renameField(valueId, KeyPath(['get me out of here']));
    engine.renameField(valuePartId, KeyPath(['get me out of here too']));
    const newFieldId = engine.getFieldID(KeyPath(['sumvalue']));
    engine.renameField(newFieldId, KeyPath(['nested', 'value']));
    runGauntlet(engine, doc);
  });
});
