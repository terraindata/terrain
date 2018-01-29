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

import nestedProperty = require('nested-property');
import { TransformationEngine } from '../../transformations/TransformationEngine';
import { TransformationNode } from '../../transformations/TransformationNode';
import TransformationNodeType from '../../transformations/TransformationNodeType.ts';

const doc1 = {
  name: 'Bob',
  age: 17,
  meta: {
    school: 'Stanford',
  },
};

// test('create basic DAG', () =>
// {
//   const e: TransformationEngine = new TransformationEngine();
//   const t1: TransformationNode = new TransformationNode('t1');
//   const t2: TransformationNode = new TransformationNode('t2');
//   e.appendTransformation(null, t1);
//   console.log(e.json());
//   expect(e.dag.nodes().length === 1);
//   expect(e.dag.hasNode(t1));
//   expect(!e.dag.hasNode(t2));
// });

test('add fields manually', () =>
{
  const e: TransformationEngine = new TransformationEngine();
  e.addField('meta.school', 'string');
  e.appendTransformation(TransformationNodeType.CapitalizeNode, ['meta.school']);
  const r = e.transform(doc1);
  expect(nestedProperty.get(r, 'meta.school') === 'STANFORD');
});

test('capitalization', () =>
{
  const e: TransformationEngine = new TransformationEngine(doc1);
  e.appendTransformation(TransformationNodeType.CapitalizeNode, ['name']);
  e.appendTransformation(TransformationNodeType.CapitalizeNode, ['meta.school']);
  const r = e.transform(doc1);
  expect(r['name'] === 'BOB');
  expect(nestedProperty.get(r, 'meta.school') === 'STANFORD');
});
