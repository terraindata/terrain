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

import { List, Set } from 'immutable';
import * as _ from 'lodash';

import { DateFormats, FieldTypes } from 'shared/etl/types/ETLTypes';
import FriendEngine from 'shared/transformations/FriendEngine';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import TransformationRegistry from 'shared/transformations/TransformationRegistry';

import { KeyPath, WayPoint } from '../../util/KeyPath';
import * as yadeep from '../../util/yadeep';
import { TestDocs } from './TestDocs';

import * as Utils from 'shared/transformations/util/EngineUtils';

// just a convenient shorthand
function wrap(kp: any[])
{
  return List([List<string | number>(kp)]);
}

// just a convenient shorthand
function getId(engine: TransformationEngine, kp: any[])
{
  return engine.getFieldID(KeyPath(kp));
}

function getFieldDependents(eng: TransformationEngine, fieldId: number): number[]
{
  const engine = eng as FriendEngine;
  const identity = Utils.traversal.findIdentityNode(engine, fieldId);
  return Utils.traversal.findDependencies(engine, identity);
}

// intersection of field identity node dependencies
function dependencyIntersection(eng: TransformationEngine, field1: number, field2: number): Set<number>
{
  const nodes1 = Set(getFieldDependents(eng, field1));
  const nodes2 = Set(getFieldDependents(eng, field2));
  return nodes1.intersect(nodes2);
}

// intersection of transformation node dependencies
function nodeIntersection(eng: TransformationEngine, node1: number, node2: number): Set<number>
{
  const nodes1 = Set(Utils.traversal.findDependencies(eng, node1));
  const nodes2 = Set(Utils.traversal.findDependencies(eng, node2));
  return nodes1.intersect(nodes2);
}

test('test organic fields', () =>
{
  const doc = {
    foo: 'hello',
    bar: 5,
    a: [1, 2, 3],
    b: {
      c: 'hi',
      d: 'yo',
    },
  };
  const e = Utils.construction.makeEngine(doc);

  const fooId = getId(e, ['foo']);
  const barId = getId(e, ['bar']);
  const aId = getId(e, ['a']);
  const aSubId = getId(e, ['a', -1]);
  const bId = getId(e, ['b']);
  const cId = getId(e, ['b', 'c']);
  const dId = getId(e, ['b', 'd']);

  expect(dependencyIntersection(e, fooId, barId).size).toBe(0);
  expect(dependencyIntersection(e, aId, aSubId).size).toBeGreaterThan(0);
  expect(dependencyIntersection(e, bId, cId).size).toBeGreaterThan(0);
  expect(dependencyIntersection(e, bId, dId).size).toBeGreaterThan(0);
  expect(dependencyIntersection(e, aId, dId).size).toBe(0);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

test('test synthetic dependent fields', () =>
{
  const doc = {
    foo: 'hello',
    bar: 'hey there',
  };
  const e = Utils.construction.makeEngine(doc);
  const fooId = getId(e, ['foo']);
  const barId = getId(e, ['bar']);
  const joinNodeId = e.appendTransformation(TransformationNodeType.JoinNode, List([fooId, barId]), {
    delimiter: '-',
    newFieldKeyPaths: wrap(['joined']),
  });
  const joinFieldId = getId(e, ['joined']);
  const hashId = e.appendTransformation(TransformationNodeType.HashNode, List([joinFieldId]), {
    salt: 'abc',
  });
  const joinedFieldNodeId = Utils.traversal.findIdentityNode(e, joinFieldId);
  const appendToFooId = e.appendTransformation(TransformationNodeType.InsertNode, List([fooId]), {
    at: -1,
    value: '...',
  });

  const intersection = dependencyIntersection(e, fooId, barId);

  expect(intersection.has(joinNodeId)).toBe(true);
  expect(intersection.has(joinedFieldNodeId)).toBe(true);
  expect(intersection.has(hashId)).toBe(true);
  expect(intersection.has(appendToFooId)).toBe(false);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

describe('rename structural tests', () =>
{
  const doc = {
    foo: 'hello',
    b: {
      c: 'hi',
      d: 'yo',
    },
  };

  const engine = Utils.construction.makeEngine(doc);
  const fooId = getId(engine, ['foo']);
  const cId = getId(engine, ['b', 'c']);
  const dId = getId(engine, ['b', 'd']);
  const bId = getId(engine, ['b']);

  test('nested renamed fields that should have shared dependencies', () =>
  {
    const e = engine.clone();
    const renameId = e.renameField(bId, KeyPath(['lol']));

    expect(dependencyIntersection(e, bId, cId).size).toBeGreaterThan(0);
    expect(dependencyIntersection(e, bId, fooId).size).toBe(0);

    expect(nodeIntersection(e, renameId, Utils.traversal.findIdentityNode(e, bId)).size).toBeGreaterThan(0);
    expect(nodeIntersection(e, renameId, Utils.traversal.findIdentityNode(e, cId)).size).toBeGreaterThan(0);
    expect(nodeIntersection(e, renameId, Utils.traversal.findIdentityNode(e, dId)).size).toBeGreaterThan(0);
    expect(Utils.validation.verifyEngine(e)).toEqual([]);
  });

  test('renamed fields that should not have shared dependencies', () =>
  {
    const e = engine.clone();

    const rename1 = e.renameField(fooId, KeyPath(['b', 'foo']));
    expect(dependencyIntersection(e, fooId, bId).size).toBe(0);
    const rename2 = e.renameField(fooId, KeyPath(['foo']));
    expect(dependencyIntersection(e, fooId, bId).size).toBe(0);
    expect(getFieldDependents(e, fooId)).toContain(rename1);
    expect(getFieldDependents(e, fooId)).toContain(rename2);
    expect(Utils.validation.verifyEngine(e)).toEqual([]);
  });

  test('multi-rename dependency', () =>
  {
    const e = engine.clone();
    const rename1 = e.renameField(fooId, KeyPath(['b', 'foo']));
    expect(nodeIntersection(e, rename1, Utils.traversal.findIdentityNode(e, bId)).size).toBe(0);
    const rename2 = e.renameField(bId, KeyPath(['newB']));
    expect(dependencyIntersection(e, fooId, bId).size).toBeGreaterThan(0);
    expect(nodeIntersection(e, rename2, Utils.traversal.findIdentityNode(e, bId)).size).toBeGreaterThan(0);
    expect(Utils.validation.verifyEngine(e)).toEqual([]);
  });
});

describe('synthetic graph tests', () =>
{
  const doc = {
    a: 'what',
    b: 'in',
    c: 'the',
    d: 'world',
  };

  test('tournament style graph', () =>
  {
    const e = Utils.construction.makeEngine(doc);
    const aId = getId(e, ['a']);
    const bId = getId(e, ['b']);
    const cId = getId(e, ['c']);
    const dId = getId(e, ['d']);
    const a = Utils.traversal.findIdentityNode(e, aId);
    const b = Utils.traversal.findIdentityNode(e, bId);
    const c = Utils.traversal.findIdentityNode(e, cId);
    const d = Utils.traversal.findIdentityNode(e, dId);
    // semifinals
    const abJoin = e.appendTransformation(TransformationNodeType.JoinNode, List([aId, bId]), {
      delimiter: '-',
      newFieldKeyPaths: wrap(['ab']),
    });
    const abId = getId(e, ['ab']);
    const ab = Utils.traversal.findIdentityNode(e, abId);
    const cdJoin = e.appendTransformation(TransformationNodeType.JoinNode, List([cId, dId]), {
      delimiter: '-',
      newFieldKeyPaths: wrap(['cd']),
    });
    const cdId = getId(e, ['cd']);
    const cd = Utils.traversal.findIdentityNode(e, cdId);
    const pairIntersection = nodeIntersection(e, a, b);
    expect(pairIntersection.toArray()).toContain(abJoin);
    expect(pairIntersection.toArray()).toContain(ab);
    expect(pairIntersection.size).toBe(2); // join node and the synthId node
    expect(nodeIntersection(e, c, d).size).toBe(2);
    expect(nodeIntersection(e, a, d).size).toBe(0);
    // finals
    const abcdJoin = e.appendTransformation(TransformationNodeType.JoinNode, List([abId, cdId]), {
      delimiter: '-',
      newFieldKeyPaths: wrap(['abcd']),
    });
    const abcd = Utils.traversal.findIdentityNode(e, getId(e, ['abcd']));
    const crossIntersection = nodeIntersection(e, a, d);
    expect(crossIntersection.toArray()).toContain(abcd);
    expect(crossIntersection.toArray()).toContain(abcdJoin);
    expect(crossIntersection.size).toBe(2);
    expect(Utils.validation.verifyEngine(e)).toEqual([]);
  });

  test('tournament style with trick renames', () =>
  {
    const e = Utils.construction.makeEngine(doc);

    e.renameField(getId(e, ['b']), KeyPath(['temp']));
    e.renameField(getId(e, ['c']), KeyPath(['b']));
    e.renameField(getId(e, ['temp']), KeyPath(['c']));

    const aId = getId(e, ['a']);
    const bId = getId(e, ['b']);
    const cId = getId(e, ['c']);
    const dId = getId(e, ['d']);
    const a = Utils.traversal.findIdentityNode(e, aId);
    const b = Utils.traversal.findIdentityNode(e, bId);
    const c = Utils.traversal.findIdentityNode(e, cId);
    const d = Utils.traversal.findIdentityNode(e, dId);

    // semifinals
    const abJoin = e.appendTransformation(TransformationNodeType.JoinNode, List([aId, bId]), {
      delimiter: '-',
      newFieldKeyPaths: wrap(['ab']),
    });
    const abId = getId(e, ['ab']);
    const ab = Utils.traversal.findIdentityNode(e, abId);
    const cdJoin = e.appendTransformation(TransformationNodeType.JoinNode, List([cId, dId]), {
      delimiter: '-',
      newFieldKeyPaths: wrap(['cd']),
    });
    const cdId = getId(e, ['cd']);
    const cd = Utils.traversal.findIdentityNode(e, cdId);
    const pairIntersection = nodeIntersection(e, a, b);
    expect(pairIntersection.toArray()).toContain(abJoin);
    expect(pairIntersection.toArray()).toContain(ab);
    expect(pairIntersection.size).toBe(2); // join node and the synthId node
    expect(nodeIntersection(e, c, d).size).toBe(2);
    expect(nodeIntersection(e, a, d).size).toBe(0);
    // finals
    const abcdJoin = e.appendTransformation(TransformationNodeType.JoinNode, List([abId, cdId]), {
      delimiter: '-',
      newFieldKeyPaths: wrap(['abcd']),
    });
    const abcd = Utils.traversal.findIdentityNode(e, getId(e, ['abcd']));
    const crossIntersection = nodeIntersection(e, a, d);
    expect(crossIntersection.toArray()).toContain(abcd);
    expect(crossIntersection.toArray()).toContain(abcdJoin);
    expect(crossIntersection.size).toBe(2);
    expect(Utils.validation.verifyEngine(e)).toEqual([]);
  });
});

test('test index specified fields', () =>
{
  const doc = {
    item: [0, 1, 2],
    foo: 5,
  };

  const e = Utils.construction.makeEngine(doc);
  const itemId = getId(e, ['item']);
  const index1Id = Utils.fields.addIndexedField(e, KeyPath(['item', 1]));
  const fooId = getId(e, ['foo']);

  e.appendTransformation(TransformationNodeType.DuplicateNode, List([index1Id]), {
    newFieldKeyPaths: wrap(['extracted']),
  });

  const extractedId = getId(e, ['extracted']);
  const extractedNodeId = Utils.traversal.findIdentityNode(e, extractedId);
  const index1NodeId = Utils.traversal.findIdentityNode(e, index1Id);
  expect(Utils.traversal.findDependencies(e, index1NodeId)).toContain(extractedNodeId);
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});

describe('inferred field tests', () =>
{
  const doc = {
    foo: 'hello',
    b: {
      c: 'hi',
    },
  };

  test('add inferred new organic field', () =>
  {
    const e = Utils.construction.makeEngine(doc);
    const bId = getId(e, ['b']);
    const cId = getId(e, ['b', 'c']);
    const fooId = getId(e, ['foo']);
    const dId = Utils.fields.addInferredField(e, KeyPath(['b', 'd']), FieldTypes.String);
    expect(dependencyIntersection(e, bId, dId).toArray()).toContain(Utils.traversal.findIdentityNode(e, dId));
    expect(dependencyIntersection(e, bId, dId).size).toBe(1);
    expect(Utils.fields.isOrganic(e, dId)).toBe(true);
    expect(dependencyIntersection(e, cId, dId).size).toBe(0);
    expect(Utils.validation.verifyEngine(e)).toEqual([]);
  });

  test('add inferred new organic field no parent', () =>
  {
    const e = Utils.construction.makeEngine(doc);
    const bId = getId(e, ['b']);
    const cId = getId(e, ['b', 'c']);
    const fooId = getId(e, ['foo']);
    const barId = Utils.fields.addInferredField(e, KeyPath(['bar']), FieldTypes.String);
    expect(dependencyIntersection(e, barId, cId).size).toBe(0);
    expect(dependencyIntersection(e, barId, bId).size).toBe(0);
    expect(dependencyIntersection(e, barId, fooId).size).toBe(0);
    expect(Utils.fields.isOrganic(e, barId)).toBe(true);
    expect(Utils.validation.verifyEngine(e)).toEqual([]);
  });

  test('add inferred new organic field with rename', () =>
  {
    const e = Utils.construction.makeEngine(doc);

    const bId = getId(e, ['b']);
    const cId = getId(e, ['b', 'c']);
    const fooId = getId(e, ['foo']);
    const renameId = e.renameField(bId, KeyPath(['newB']));
    const dId = Utils.fields.addInferredField(e, KeyPath(['newB', 'd']), FieldTypes.String);

    expect(dependencyIntersection(e, bId, dId).toArray()).toContain(Utils.traversal.findIdentityNode(e, dId));
    expect(dependencyIntersection(e, bId, dId).size).toBeGreaterThan(1);
    expect(Utils.fields.isOrganic(e, dId)).toBe(true);
    expect(dependencyIntersection(e, cId, dId).size).toBe(0);
    e.appendTransformation(TransformationNodeType.InsertNode, List([dId]), {
      at: -1,
      value: '...',
    });
    expect(Utils.validation.verifyEngine(e)).toEqual([]);
    expect(e.transform({
      foo: 'hello',
      b: {
        c: 'hi',
        d: 'surprise',
      },
    })).toEqual({
      foo: 'hello',
      newB: {
        c: 'hi',
        d: 'surprise...',
      },
    });
  });

  test('add inferred new synthetic field with rename', () =>
  {
    const e = Utils.construction.makeEngine(doc);
    const bId = getId(e, ['b']);
    const cId = getId(e, ['b', 'c']);
    const fooId = getId(e, ['foo']);
    const renameBId = e.renameField(bId, KeyPath(['newB']));
    const renameCId = e.renameField(cId, KeyPath(['newB', 'newC']));
    const dupId = e.appendTransformation(TransformationNodeType.DuplicateNode, List([bId]), { newFieldKeyPaths: wrap(['copiedB']) });
    const dId = Utils.fields.addInferredField(e, KeyPath(['copiedB', 'd']), FieldTypes.String);
    const copiedBId = getId(e, ['copiedB']);
    const dupCid = getId(e, ['copiedB', 'newC']);
    e.appendTransformation(TransformationNodeType.InsertNode, List([dupCid]), {
      at: -1,
      value: '!',
    });
    const join = e.appendTransformation(TransformationNodeType.JoinNode, List([dId, dupCid]),
      { newFieldKeyPaths: wrap(['joined']), delimiter: '-' });

    expect(nodeIntersection(e, dupId, Utils.traversal.findIdentityNode(e, dId)).size).toBeGreaterThan(0);
    expect(Utils.fields.isOrganic(e, dId)).toBe(false);
    expect(dependencyIntersection(e, dId, dupCid).toArray()).toContain(join);
    expect(dependencyIntersection(e, dId, dupCid).toArray()).toContain(Utils.traversal.findIdentityNode(e, getId(e, ['joined'])));
    expect(Utils.validation.verifyEngine(e)).toEqual([]);
    expect(e.transform({
      b: {
        c: 'hi',
        d: 'yo',
      },
    }, { includeUnknown: true })).toEqual({
      newB: {
        newC: 'hi',
        d: 'yo',
      },
      copiedB: {
        newC: 'hi!',
        d: 'yo',
      },
      joined: 'yo-hi!',
    });
  });
});

test('test duplication dependencies', () =>
{
  const doc = {
    foo: {
      a: 'hi',
      b: 'yo',
    },
  };

  const e = Utils.construction.makeEngine(doc);
  const aId = getId(e, ['foo', 'a']);
  const bId = getId(e, ['foo', 'b']);
  const fooId = getId(e, ['foo']);
  const dupId = e.appendTransformation(TransformationNodeType.DuplicateNode, List([fooId]), {
    newFieldKeyPaths: wrap(['fooCopied']),
  });
  const fooCopiedId = getId(e, ['fooCopied']);
  const bIdentity = Utils.traversal.findIdentityNode(e, bId);
  const intersection = nodeIntersection(e, dupId, bIdentity);
  expect(intersection.toArray()).not.toContain(dupId);
  expect(intersection.toArray()).not.toContain(bIdentity);
  expect(intersection.toArray()).toContain(Utils.traversal.findIdentityNode(e, getId(e, ['fooCopied', 'b'])));
  expect(Utils.validation.verifyEngine(e)).toEqual([]);
});
