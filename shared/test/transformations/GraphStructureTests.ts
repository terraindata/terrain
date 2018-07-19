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

function getDependents(eng: TransformationEngine, fieldId: number): number[]
{
  const engine = eng as FriendEngine;
  const identity = Utils.traversal.findIdentityNode(engine, fieldId);
  return Utils.traversal.findDependencies(engine, identity);
}

function dependencyIntersection(eng: TransformationEngine, field1: number, field2: number): Set<number>
{
  const nodes1 = Set(getDependents(eng, field1));
  const nodes2 = Set(getDependents(eng, field2));
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
