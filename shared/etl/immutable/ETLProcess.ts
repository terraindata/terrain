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

// Copyright 2017 Terrain Data, Inc.

// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
const { List, Map } = Immutable;
import { instanceFnDecorator, makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'shared/util/Classes';

import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import
{
  ETLEdge as ETLEdgeI,
  ETLNode as ETLNodeI,
  ETLProcess as ETLProcessI,
  Languages,
  MergeJoinOptions as MergeJoinOptionsI,
  NodeTypes,
  TemplateBase,
  TemplateObject,
} from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

class ETLProcessC implements ETLProcessI
{
  public readonly nodes: Immutable.Map<number, ETLNode> = Map();
  public readonly edges: Immutable.Map<number, ETLEdge> = Map();
  public readonly uidNode: number = 0;
  public readonly uidEdge: number = 0;
}
export type ETLProcess = WithIRecord<ETLProcessC>;
export const _ETLProcess = makeExtendedConstructor(ETLProcessC, true, {
  nodes: (nodes) =>
  {
    return Map(nodes).mapEntries<number, ETLNode>(
      ([key, obj]) => [Number(key), _ETLNode(obj, true)],
    ).toMap();
  },
  edges: (edges) =>
  {
    return Map(edges).mapEntries<number, ETLEdge>(
      ([key, obj]) => [Number(key), _ETLEdge(obj, true)],
    ).toMap();
  },
});

class ETLEdgeC implements ETLEdgeI
{
  public id: number = -1;
  public from: number = -1;
  public to: number = -1;
  public transformations: TransformationEngine = null;
}
export type ETLEdge = WithIRecord<ETLEdgeC>;
export const _ETLEdge = makeExtendedConstructor(ETLEdgeC, true, {
  transformations: TransformationEngine.load,
});

class MergeJoinOptionsC implements MergeJoinOptionsI
{
  public leftId: number = -1; // id of the left node
  public rightId: number = -1; // id of the right node
  public leftJoinKey: string = '';
  public rightJoinKey: string = '';
  public outputKey: string = '';
}
export type MergeJoinOptions = WithIRecord<MergeJoinOptionsC>;
export const _MergeJoinOptions = makeExtendedConstructor(MergeJoinOptionsC);

class ETLNodeC implements ETLNodeI
{
  public id: number = -1;
  public type: NodeTypes = NodeTypes.MergeJoin;
  public options: MergeJoinOptions = _MergeJoinOptions();
  public endpoint: string = ''; // if source or sink, which one is it?
}
export type ETLNode = WithIRecord<ETLNodeC>;
export const _ETLNode = makeExtendedConstructor(ETLNodeC, true, {
  options: _MergeJoinOptions,
});
