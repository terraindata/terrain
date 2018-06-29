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
import { TransformationEngine } from '../../transformations/TransformationEngine';
import TransformationNodeType from '../../transformations/TransformationNodeType';
import { KeyPath, WayPoint } from '../../util/KeyPath';
import * as yadeep from '../../util/yadeep';
import { TestDocs } from './TestDocs';

import EngineUtil from 'shared/transformations/util/EngineUtil';

function wrap(kp: any[])
{
  return List([List<string | number>(kp)]);
}

test('join transformation where the first field does not exist', () => {

  const doc = {
    f2: 'hello',
    f3: 'world',
  };

  const e: TransformationEngine = new TransformationEngine(doc);
  e.addField(KeyPath(['f1']), 'string');
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

test('array sum on a nested array field', () => {
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

  const e: TransformationEngine = new TransformationEngine(doc);
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
  const e = new TransformationEngine(doc);
  e.appendTransformation(
    TransformationNodeType.DuplicateNode,
    wrap(['fields', 0]),
    { newFieldKeyPaths: wrap(['zeroth']) },
  );
  e.addField(List(['fields', 5]), 'string');
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

describe('suite of complex duplication tests', () => {
  function dupHelper(inKP: WayPoint[], outKP: WayPoint[], inDoc: object): object
  {
    const e = new TransformationEngine(inDoc);
    e.appendTransformation(
      TransformationNodeType.DuplicateNode,
      wrap(inKP),
      { newFieldKeyPaths: wrap(outKP) },
    );
    const r = e.transform(inDoc);
    return r;
  }

  test('many to one', () => {
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
      allFoos: [ 1, 2, 3 ],
    });
  });

  test('nested one to one', () => {
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

  test('super nested one to one', () => {
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
});
