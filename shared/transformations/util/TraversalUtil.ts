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
import FriendEngine from 'shared/transformations/FriendEngine';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import * as Utils from 'shared/transformations/util/EngineUtils';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import TransformationNodeType, {
  CommonTransformationOptions,
  IdentityTypes,
  NodeOptionsType,
  TransformationEdgeTypes as EdgeTypes,
} from 'shared/transformations/TransformationNodeType';

import { Edge, TransformationGraph } from 'shared/transformations/TypedGraph';
import DependencyVisitorC from 'shared/transformations/visitors/DependencyVisitor';

const DependencyVisitor = new DependencyVisitorC();

import * as TerrainLog from 'loglevel';

type IdentityOptions = NodeOptionsType<TransformationNodeType.IdentityNode>;
/*
 *  Utility class for performing common operations on
 *    - The graph structure of the transformation nodes
 *    - The tree structure of the fields
 */
export default abstract class Traversal
{
  /**
   *  Find dependencies of this field
   */
  public static findDependencies(engine: TransformationEngine, nodeId: number): number[]
  {
    const graph = (engine as FriendEngine).dag;
    // const startNode = graph.node(String(nodeId));

    const result = [];
    const visited: { [k: number]: boolean } = {};
    const nodeQueue: number[] = [];

    // add a node to the queue of dependencies, the results, and mark it as visited
    const addNode = (id: number) =>
    {
      if (id != null && !visited[id])
      {
        visited[id] = true;
        nodeQueue.push(id);
        result.push(id);
      }
    };
    addNode(nodeId);

    for (let ncount = 0; ncount < graph.nodeCount(); ncount++)
    {
      const toVisit: number = nodeQueue.pop();
      if (toVisit === undefined)
      {
        break;
      }
      const toVisitNode = graph.node(String(toVisit));
      const { synthetic, structural, self } = toVisitNode.accept(DependencyVisitor, { engine });
      synthetic.forEach((id) => addNode(id));
      structural.forEach((id) => addNode(id));
      addNode(self);
    }
    return result;
  }

  /*
   *  Find the source identity node for the given field
   */
  public static findIdentityNode(engine: TransformationEngine, field: number)
  {
    const graph = (engine as FriendEngine).dag;
    for (const nId of graph.nodes())
    {
      const node = graph.node(nId);
      if (node.typeCode === TransformationNodeType.IdentityNode && node.fields.get(0).id === field)
      {
        const { type } = node.meta as NodeOptionsType<TransformationNodeType.IdentityNode>;
        if (type !== IdentityTypes.Rename && type !== IdentityTypes.Removal)
        {
          return node.id;
        }
      }
    }
    return -1;
  }

  /*
   *  Find the transformation node that is responsible for creating the provided identity node
   */
  public static findIdentitySourceNode(engine: TransformationEngine, identity: number): number
  {
    const graph = (engine as FriendEngine).dag;
    const inNodes = graph.predecessors(String(identity));
    let creator: number;
    if (inNodes !== undefined)
    {
      for (const v of inNodes)
      {
        if (graph.edge(v, String(identity)) === EdgeTypes.Synthetic)
        {
          creator = Number(v);
          break;
        }
      }
    }
    return creator;
  }

  /*
   *  Find the source node and rename nodes that should point to the provided keypath
   *  If returns null, then there is no parent field
   *  Provides syntheticSource if parent is synthetic
   */
  public static findInferredSources(engine: TransformationEngine, path: KeyPath)
    : { parentId: number, syntheticSource: number, renames: number[] }
  {
    const graph = (engine as FriendEngine).dag;
    let parentId: number;
    for (let i = path.size - 1; i > 1; i--)
    {
      const parentPath = Utils.path.convertIndices(path.slice(0, i).toList());
      if (Utils.path.isNamed(parentPath))
      {
        const potentialId = engine.getFieldID(parentPath);
        if (potentialId !== undefined)
        {
          parentId = potentialId;
          break;
        }
      }
    }
    if (parentId === undefined)
    {
      return null;
    }
    const creator = Traversal.findIdentitySourceNode(engine, Traversal.findIdentityNode(engine, parentId));
    const identityNodes = Traversal.findAllIdentityNodes(engine, parentId);
    const renameNodes = identityNodes.filter(
      (nId) => (graph.node(String(nId)).meta as IdentityOptions).type === IdentityTypes.Rename,
    );
    return {
      syntheticSource: creator,
      renames: renameNodes,
      parentId,
    };
  }

  public static replayRenames()
  {

  }

  // finds all identity nodes that belong to the field
  public static findAllIdentityNodes(engine: TransformationEngine, fieldId: number): number[]
  {
    const start = Traversal.findIdentityNode(engine, fieldId);
    const graph = (engine as FriendEngine).dag;
    const identityNodes = [start];
    Traversal.walk(engine, start, (edges) =>
    {
      const edge = edges.find((e) => graph.edge(e) !== EdgeTypes.Synthetic);
      if (edge != null && graph.node(edge.w).typeCode === TransformationNodeType.IdentityNode)
      {
        identityNodes.push(Number(edge.w));
      }
      return edge;
    });
    return identityNodes;
  }

  // find the last non-synthetic transformation associated with the field
  public static findEndTransformation(engine: TransformationEngine, field: number): number
  {
    const graph = (engine as FriendEngine).dag;
    const startId = Traversal.findIdentityNode(engine, field);
    if (startId === -1)
    {
      return -1;
    }
    let node = startId;
    Traversal.walk(engine, startId, (edges) =>
    {
      const edge = edges.find((e) => graph.edge(e) !== EdgeTypes.Synthetic);
      if (edge != null)
      {
        node = Number(edge.w);
      }
      return edge;
    });
    return node;
  }

  public static walk(engine: TransformationEngine, startId: number, choosePath: (edges: Edge[]) => Edge)
  {
    const graph = (engine as FriendEngine).dag;

    let node = String(startId);
    for (let i = 0; i < graph.nodeCount(); i++)
    {
      const edges = graph.outEdges(node);
      if (!Array.isArray(edges))
      {
        return;
      }
      else
      {
        const edge = choosePath(edges);
        if (edge == null)
        {
          return;
        }
        node = edge.w;
      }
    }
  }

  public static appendNodeToField(engine: TransformationEngine, fieldId: number, nodeId: number, edgeType: EdgeTypes)
  {
    const endNode = Traversal.findEndTransformation(engine, fieldId);
    const graph = (engine as FriendEngine).dag;
    if (endNode === -1)
    {
      return;
    }
    graph.setEdge(String(endNode), String(nodeId), edgeType);
  }

  public static prependNodeToField(engine: TransformationEngine, fieldId: number, nodeId: number, edgeType: EdgeTypes)
  {
    const startNode = Traversal.findIdentityNode(engine, fieldId);
    const graph = (engine as FriendEngine).dag;
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
  ): IterableIterator<number>
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
  ): IterableIterator<number>
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

  // returns the first child field underneath this field
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
