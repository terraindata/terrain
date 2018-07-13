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
// tslint:disable:max-classes-per-file

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import TransformationNodeType, {
  CommonTransformationOptions,
  NodeOptionsType,
  TransformationEdgeTypes as EdgeTypes,
} from 'shared/transformations/TransformationNodeType';

import { Edge, TransformationGraph } from 'shared/transformations/TypedGraph';

import * as TerrainLog from 'loglevel';

export default abstract class Traversal
{
  // in the absence of "friend" modifiers, let's do this
  public static getGraph(engine: TransformationEngine): TransformationGraph
  {
    return engine['dag'];
  }

  public static findIdentityNode(engine: TransformationEngine, field: number)
  {
    const graph = Traversal.getGraph(engine);
    for (const nId of graph.nodes())
    {
      const node = graph.node(nId);
      if (node.typeCode === TransformationNodeType.IdentityNode && node.fields.get(0).id === field)
      {
        return node.id;
      }
    }
    return -1;
  }

  public static findEndTransformation(engine: TransformationEngine, field: number): number
  {
    const graph = Traversal.getGraph(engine);
    const startId = Traversal.findIdentityNode(engine, field);
    if (startId === -1)
    {
      return -1;
    }

    let node = String(startId);
    for (let i = 0; i < graph.nodeCount(); i++)
    {
      const edges = graph.outEdges(node);
      if (!Array.isArray(edges))
      {
        return Number(node);
      }
      else
      {
        const edge = edges.find((e) => graph.edge(e) !== EdgeTypes.Synthetic);
        if (edge == null)
        {
          return Number(node);
        }
        node = edge.w;
      }
    }
    return -1;
  }

  public static appendNodeToField(engine: TransformationEngine, fieldId: number, nodeId: number, edgeType: EdgeTypes)
  {
    const endNode = Traversal.findEndTransformation(engine, fieldId);
    const graph = Traversal.getGraph(engine);
    if (endNode === -1)
    {
      return;
    }
    graph.setEdge(String(endNode), String(nodeId), edgeType);
  }

  public static prependNodeToField(engine: TransformationEngine, fieldId: number, nodeId: number, edgeType: EdgeTypes)
  {
    const startNode = Traversal.findIdentityNode(engine, fieldId);
    const graph = Traversal.getGraph(engine);
    if (startNode === -1)
    {
      return;
    }
    graph.setEdge(String(nodeId), String(startNode), edgeType);
  }

  public static postorderFields(
    engine: TransformationEngine,
    fromId: number,
    fn: (id: number) => void,
  )
  {
    const tree = engine.createTree();
    for (const id of Traversal.postorder(tree, fromId))
    {
      fn(id);
    }
  }

  public static preorderFields(
    engine: TransformationEngine,
    fromId: number,
    fn: (id: number) => void,
  )
  {
    const tree = engine.createTree();
    for (const id of Traversal.preorder(tree, fromId))
    {
      fn(id);
    }
  }

  public static * postorder(
    tree: Immutable.Map<number, List<number>>,
    id: number,
    shouldExplore: (id) => boolean = () => true,
  )
  {
    const children = tree.get(id);
    if (children !== undefined && shouldExplore(id))
    {
      for (let i = 0; i < children.size; i++)
      {
        yield* Traversal.postorder(tree, children.get(i), shouldExplore);
      }
      yield id;
    }
  }

  public static * preorder(
    tree: Immutable.Map<number, List<number>>,
    id: number,
    shouldExplore: (id) => boolean = () => true,
  )
  {
    const children = tree.get(id);
    if (children !== undefined && shouldExplore(id))
    {
      yield id;
      for (let i = 0; i < children.size; i++)
      {
        yield* Traversal.preorder(tree, children.get(i), shouldExplore);
      }
    }
  }

  // returns the first child field
  public static findChildField(fieldId: number, engine: TransformationEngine): number | undefined
  {
    const myKP = engine.getFieldPath(fieldId);
    const key = engine.getAllFieldIDs().findKey((id: number) =>
    {
      const childKP = engine.getFieldPath(id);
      if (childKP.size === myKP.size + 1)
      {
        return childKP.slice(0, -1).equals(myKP);
      }
      else
      {
        return false;
      }
    });
    return key;
  }
}
