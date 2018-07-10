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

import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeType, {
  CommonTransformationOptions,
  NodeOptionsType,
  TransformationEdgeTypes as EdgeTypes,
} from 'shared/transformations/TransformationNodeType';
import TransformationRegistry from 'shared/transformations/TransformationRegistry';
import TransformationNodeVisitor, { VisitorLookupMap } from './TransformationNodeVisitor';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

import { Edge, TransformationGraph } from 'shared/transformations/TypedGraph';

/*
 *  This visitor will be called after the transformation engine creates the node in the dag.
 */

interface Args
{
  engine: TransformationEngine;
  graph: TransformationGraph;
}

export default class CreationVisitor
  extends TransformationNodeVisitor<void, Args>
{
  public visitorLookup: VisitorLookupMap<void, Args> = {
    [TransformationNodeType.RenameNode]: this.visitRenameNode,
    [TransformationNodeType.CastNode]: this.visitCastNode,
    [TransformationNodeType.IdentityNode]: this.visitIdentityNode,
  };

  constructor()
  {
    super();
    this.bindVisitors();
  }

  public visitDefault(type: TransformationNodeType, node: TransformationNode, args: Args)
  {
    const { engine, graph } = args;
    let edgeType: EdgeTypes = EdgeTypes.InPlace;
    if (node.meta.newFieldKeyPaths !== undefined && node.meta.newFieldKeyPaths.size > 0)
    {
      edgeType = EdgeTypes.Synthetic;
    }

    node.fields.forEach((field) =>
    {
      this.appendNodeToField(args, field.id, node.id, edgeType);
    });

    if (edgeType === EdgeTypes.Synthetic)
    {
      node.meta.newFieldKeyPaths.forEach((kp) =>
      {
        if (engine.getFieldID(kp) === undefined)
        {
          let newType = this.getNewType(type);
          if (newType === 'same')
          {
            newType = engine.getFieldType(node.fields.get(0).id);
          }
          const synthId = engine.addField(kp, newType, {}, edgeType === EdgeTypes.Synthetic);
          this.prependNodeToField(args, synthId, node.id, edgeType);
        }
      });
    }
  }

  protected getNewType(type: TransformationNodeType): string
  {
    return TransformationRegistry.getNewFieldType(type);
  }

  protected appendNodeToField(args: Args, fieldId: number, nodeId: number, edgeType: EdgeTypes)
  {
    const endNode = this.findEndTransformation(args, fieldId);
    if (endNode === -1)
    {
      return;
    }
    args.graph.setEdge(String(endNode), String(nodeId), edgeType);
  }

  protected prependNodeToField(args: Args, fieldId: number, nodeId: number, edgeType: EdgeTypes)
  {
    const startNode = this.findStartTransformation(args, fieldId);
    if (startNode === -1)
    {
      return;
    }
    args.graph.setEdge(String(nodeId), String(startNode), edgeType);
  }

  protected findStartTransformation(args: Args, field: number): number
  {
    for (const nId of args.graph.nodes())
    {
      const node = args.graph.node(nId);
      if (node.typeCode === TransformationNodeType.IdentityNode && node.fields.get(0).id === field)
      {
        return node.id;
      }
    }
    return -1;
  }

  protected findEndTransformation(args: Args, field: number): number
  {
    const startId = this.findStartTransformation(args, field);
    if (startId === -1)
    {
      return -1;
    }

    let node = String(startId);
    for (let i = 0; i < args.graph.nodeCount(); i++)
    {
      const edges = args.graph.outEdges(node);
      if (!Array.isArray(edges))
      {
        return Number(node);
      }
      else
      {
        const edge = edges.find((e) => args.graph.edge(e) !== EdgeTypes.Synthetic);
        if (edge == null)
        {
          return Number(node);
        }
        node = edge.w;
      }
    }
    return -1;
  }

  protected visitIdentityNode(type: TransformationNodeType, node: TransformationNode, args: Args): void
  {

  }

  protected visitRenameNode(type: TransformationNodeType, node: TransformationNode, args: Args): void
  {
    this.appendNodeToField(args, node.fields.get(0).id, node.id, EdgeTypes.Rename);
  }

  protected visitCastNode(type: TransformationNodeType, node: TransformationNode, args: Args): void
  {
    this.appendNodeToField(args, node.fields.get(0).id, node.id, EdgeTypes.Restructure);
  }
}
