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
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { TransformationInfo } from 'shared/transformations/TransformationInfo';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import { KeyPath } from 'shared/util/KeyPath';
import { TestDocs } from './TestDocs';

test('serialize to JSON', () =>
{
  const e: TransformationEngine = new TransformationEngine(TestDocs.doc1);
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['name'])]), { format: 'uppercase' });
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]), { format: 'uppercase' });
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
          value: new (TransformationInfo.getType(TransformationNodeType.CaseNode))
            (0, List<KeyPath>([KeyPath(['name'])]), { format: 'uppercase' }, TransformationNodeType.CaseNode),
        },
        {
          v: '1',
          value: new (TransformationInfo.getType(TransformationNodeType.CaseNode))
            (1, List<KeyPath>([KeyPath(['meta', 'school'])]), { format: 'uppercase' }, TransformationNodeType.CaseNode),
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
  const e: TransformationEngine = new TransformationEngine(TestDocs.doc1);
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['name'])]), { format: 'uppercase' });
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]), { format: 'uppercase' });
  const j = e.toJSON();
  const e2 = TransformationEngine.load(j);
  expect(e.equals(e2)).toBe(true);
  e2.addField(KeyPath(['i']), 'number');
  expect(e.equals(e2)).toBe(false);
});

test('String serialize/deserialize round trip', () =>
{
  const e: TransformationEngine = new TransformationEngine(TestDocs.doc1);
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['name'])]), { format: 'uppercase' });
  e.appendTransformation(TransformationNodeType.CaseNode, List<KeyPath>([KeyPath(['meta', 'school'])]), { format: 'uppercase' });
  const j: string = JSON.stringify(e.toJSON());
  const e2 = TransformationEngine.load(j);
  expect(e.equals(e2)).toBe(true);
  expect(e2.transform(TestDocs.doc1)['name']).toBe('BOB');
  e2.addField(KeyPath(['i']), 'number');
  expect(e.equals(e2)).toBe(false);
});

test('String serialize/deserialize round trip - substring', () =>
{
  const e: TransformationEngine = new TransformationEngine(TestDocs.doc1);
  e.appendTransformation(TransformationNodeType.SubstringNode, List<KeyPath>([KeyPath(['meta', 'school'])]), { from: 1, length: 3 });
  const j: string = JSON.stringify(e.toJSON());
  const e2 = TransformationEngine.load(j);
  expect(e.equals(e2)).toBe(true);
  expect(e2.transform(TestDocs.doc1)['meta']['school']).toBe('tan');
});

test('split a field (regex delimiter) after serialize/deserialize trip', () =>
{
  const doc = {
    foo: 'la dee da',
  };

  const e: TransformationEngine = new TransformationEngine(doc);
  const opts = {
    newFieldKeyPaths: List<KeyPath>([KeyPath(['s1']), KeyPath(['s2']), KeyPath(['s3'])]),
    preserveOldFields: false,
    delimiter: '[\\s,]+',
    regex: true,
  };
  e.appendTransformation(
    TransformationNodeType.SplitNode,
    List<KeyPath>([KeyPath(['foo'])]),
    opts);
  const j: string = JSON.stringify(e.toJSON());
  const e2 = TransformationEngine.load(j);
  const r = e2.transform(doc);
  expect(r['s1']).toBe('la');
  expect(r['s2']).toBe('dee');
  expect(r['s3']).toBe('da');
});
