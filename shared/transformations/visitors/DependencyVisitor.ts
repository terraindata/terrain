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
import * as GraphLib from 'graphlib';
import { List } from 'immutable';
import * as _ from 'lodash';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import { DateFormats, FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import FriendEngine from 'shared/transformations/FriendEngine';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeType, {
  CommonTransformationOptions,
  IdentityTypes,
  NodeOptionsType,
  TransformationEdgeTypes as EdgeTypes,
} from 'shared/transformations/TransformationNodeType';
import TransformationRegistry from 'shared/transformations/TransformationRegistry';
import TransformationNodeVisitor, { VisitorLookupMap } from './TransformationNodeVisitor';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

import { Edge, TransformationGraph } from 'shared/transformations/TypedGraph';

import * as Utils from 'shared/transformations/util/EngineUtils';

interface VisitorArgs
{
  engine: TransformationEngine;
}

interface ReturnType
{
  synthetic: number[]; // dependencies as a result of transformations
  structural: number[]; // dependencies that are a result of parent-child relationships
  self: number; // the next node that operates on this node's field
}

export default class DependencyVisitor
  extends TransformationNodeVisitor<ReturnType, VisitorArgs>
{
  public visitorLookup: VisitorLookupMap<ReturnType, VisitorArgs> = {
    [TransformationNodeType.IdentityNode]: this.visitIdentityNode,
  };

  constructor()
  {
    super();
    this.bindVisitors();
  }

  public visitDefault(type: TransformationNodeType, node: TransformationNode, args: VisitorArgs): ReturnType
  {
    const engine = args.engine as FriendEngine;
    const nexts = engine.dag.successors(String(node.id));
    if (nexts === undefined || nexts.length === 0)
    {
      return {
        synthetic: [],
        structural: [],
        self: null,
      };
    }

    const synthetic = [];
    const structural = [];
    let self = null;

    for (const nextNode of nexts)
    {
      const edge = engine.dag.edge(String(node.id), nextNode);
      if (edge === EdgeTypes.Synthetic)
      {
        synthetic.push(Number(nextNode));
      }
      else if (edge === EdgeTypes.Same)
      {
        self = Number(nextNode);
      }
    }

    return {
      synthetic,
      structural,
      self,
    };
  }

  public visitIdentityNode(type: TransformationNodeType, node: TransformationNode, args: VisitorArgs): ReturnType
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.IdentityNode>;
    const engine = args.engine as FriendEngine;
    const result = this.visitDefault(type, node, args);
    if (opts.type === IdentityTypes.Organic)
    {
      const kp = node.fields.get(0).path;
    }
    return result;
  }
}
