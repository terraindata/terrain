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
import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import * as GraphLib from 'graphlib';

import TransformationNodeType, {
  CommonTransformationOptions,
  IdentityTypes,
  NodeOptionsType,
  TransformationEdgeTypes as EdgeTypes,
} from 'shared/transformations/TransformationNodeType';

import { etlFieldTypesList, FieldTypes } from 'shared/etl/types/ETLTypes';
import FriendEngine from 'shared/transformations/FriendEngine';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNode from 'shared/transformations/TransformationNode';
import * as Utils from 'shared/transformations/util/EngineUtils';
import Topology from 'shared/transformations/util/TopologyUtil';
import { KeyPath } from 'shared/util/KeyPath';

export interface ValidInfo
{
  isValid: boolean;
  message: string;
}

type IdentityOptions = NodeOptionsType<TransformationNodeType.IdentityNode>;

export default abstract class ValidationUtil
{

  public static verifyEngine(eng: TransformationEngine): string[]
  {
    try
    {
      ValidationUtil.verifyFieldIntegrity(eng);
      ValidationUtil.verifyGraphIntegrity(eng);
    }
    catch (e)
    {
      return [`Error in Engine: ${e}`];
    }
    return [];
  }

  /*
   *  The graph is valid if
   *  - the transformation graph is acyclic
   *  - all node ids are the same as their ids in the graph
   *  - all fields have exactly 1 organic or synthetic identity nodes
   *  - all synthetic identity nodes have at least 1 inbound synthetic edge
   *  - all organic identity nodes must be sources, and all sources must be organic identity nodes
   *  - all rename identity nodes must have at least 1 inbound same edge
   *  - all removal identity nodes have no outbound edges
   *  - all fields with nullish paths end in a removal identity node
   *  - there is a single walkable non-synthetic path for all fields
   *  - all edges have valid label
   *  - all fields' last identity node paths are consistent with their mapping
   *  - computing the execution order does not throw errors
   *  It's not possible check every possible thing, but this is a very comprehensive sanity check
   */
  public static verifyGraphIntegrity(eng: TransformationEngine): boolean
  {
    const engine = eng as FriendEngine;
    const dag = engine.dag;
    // check acyclic
    if (!GraphLib.alg.isAcyclic(dag))
    {
      throw new Error(`Graph is not acyclic`);
    }
    // build a cache mapping fields to identity nodes
    const accumulator: { [k: number]: TransformationNode[] } = {};
    const addNode = (nodeId: string) =>
    {
      const node = dag.node(nodeId);
      if (node.typeCode === TransformationNodeType.IdentityNode)
      {
        const opts = node.meta as IdentityOptions;
        const fieldId = node.fields.get(0).id;
        const arr = accumulator[fieldId] !== undefined ? accumulator[fieldId] : [];
        arr.push(node);
        accumulator[fieldId] = arr;
      }
      if (String(node.id) !== nodeId)
      {
        throw new Error(`Node id ${node.id} does not match its id in the graph (${nodeId})`);
      }
    };
    dag.nodes().forEach((nodeId) =>
    {
      addNode(nodeId);
    });
    // ensure no field has too many organic, synthetic, or removal nodes
    for (const key of Object.keys(accumulator))
    {
      const fieldId = Number(key);
      const seen: { [k in IdentityTypes]?: boolean } = {};
      for (const node of accumulator[key])
      {
        const opts = node.meta as IdentityOptions;
        if (seen[opts.type] && opts.type !== IdentityTypes.Rename)
        {
          throw new Error(`Field ${fieldId} has more than 1 ${opts.type} identity node`);
        }
        seen[opts.type] = true;
      }
      if (seen[IdentityTypes.Organic] && seen[IdentityTypes.Synthetic])
      {
        throw new Error(`Field ${fieldId} has both an organic and synthetic identity node`);
      }
      if (!seen[IdentityTypes.Organic] && !seen[IdentityTypes.Synthetic])
      {
        throw new Error(`Field has no organic or synthetic identity node`);
      }
      if (seen[IdentityTypes.Removal])
      {
        if (!engine.isDead(fieldId))
        {
          throw new Error(`Field ${fieldId} has a removal node but it has a live keypath`);
        }
      }
    }
    // now check for the graph connectivity for each identity node for each field
    engine.getAllFieldIDs(true).forEach((fieldId) =>
    {
      if (accumulator[fieldId] === undefined)
      {
        throw new Error(`Field ${fieldId} has no identity nodes`);
      }
      const identities = accumulator[fieldId];
      let firstNode: TransformationNode;
      for (const node of identities)
      {
        const opts = node.meta as IdentityOptions;
        if (opts.type === IdentityTypes.Organic || opts.type === IdentityTypes.Synthetic)
        {
          firstNode = node;
          if (opts.type === IdentityTypes.Organic)
          {
            const inbounds = dag.predecessors(String(node.id));
            if (inbounds !== undefined && inbounds.length > 0)
            {
              throw new Error(`Organic Identity Node for field ${fieldId} should be a source but it has inbound edges`);
            }
          }
          else
          {
            const inbounds = dag.predecessors(String(node.id));
            if (inbounds === undefined || inbounds.length === 0)
            {
              throw new Error(`Synthetic Identity Node for field ${fieldId} should not be a source but it has no edges`);
            }
            if (inbounds.find((v) => dag.edge(v, String(node.id)) === EdgeTypes.Same) !== undefined)
            {
              throw new Error(`Synthetic Identity Node for field ${fieldId} has inbound same edges`);
            }
          }
        }
        else if (opts.type === IdentityTypes.Removal)
        {
          const outbounds = dag.successors(String(node.id));
          if (outbounds !== undefined && outbounds.length > 0)
          {
            throw new Error(`${opts.type} Identity Node for field ${fieldId} should be a sink but it has outbound edges`);
          }
        }
        else if (opts.type === IdentityTypes.Rename)
        {
          const inbounds = dag.predecessors(String(node.id));
          if (inbounds === undefined || inbounds.length === 0)
          {
            throw new Error(`Rename Identity Node for field ${fieldId} should not be a source but it has no edges`);
          }
          if (inbounds.find((v) => dag.edge(v, String(node.id)) === EdgeTypes.Same) === undefined)
          {
            throw new Error(`Rename Identity Node for field ${fieldId} should have an inbound same edge but it has none`);
          }
        }
      }
      const lastNode = dag.node(String(ValidationUtil.throwableWalk(engine, firstNode.id)));
      // ensure last node's field path matches the engine's mapping (except for removal nodes)
      if (
        lastNode.typeCode !== TransformationNodeType.IdentityNode ||
        (lastNode.meta as IdentityOptions).type !== IdentityTypes.Removal
      )
      {
        if (!engine.getFieldPath(fieldId).equals(lastNode.fields.get(0).path))
        {
          throw new Error(`Field ${fieldId} has a mismatched path.`);
        }
      }
    });

    // check all sources are organic identity nodes
    for (const source of dag.sources())
    {
      const node = dag.node(source);
      if (node.typeCode !== TransformationNodeType.IdentityNode)
      {
        throw new Error(`Detected a non-identity node as a DAG source at Node ${node.id} of type ${node.typeCode}`);
      }
      else if ((node.meta as IdentityOptions).type !== IdentityTypes.Organic)
      {
        throw new Error(`Detected a non-organic identity node as a DAG source at Node ${node.id}`);
      }
    }

    for (const edge of dag.edges())
    {
      const label = dag.edge(edge);
      if (label !== EdgeTypes.Same && label !== EdgeTypes.Synthetic)
      {
        throw new Error(`Invalid Edge Label between nodes ${edge.v}, ${edge.w}: ${label}`);
      }
    }
    const nodes = engine.computeExecutionOrder();
    if (!Array.isArray(nodes))
    {
      throw new Error('Compute execution order returned a non-array');
    }

    return true;
  }

  /*
   *  An engine is valid if:
   *  - all non-null paths are unique.
   *  - all fields have a type
   *  - all non primitive fields have no children
   *  - all fields have ancestors
   */
  public static verifyFieldIntegrity(eng: TransformationEngine): boolean
  {
    const engine = eng as FriendEngine;
    const seenIds: { [k: number]: boolean } = {};
    const seenKps: { [k: string]: boolean } = {};
    const checkField = (fieldId: number) =>
    {
      const kp = engine.getFieldPath(fieldId);
      if (seenIds[fieldId])
      {
        throw new Error(`Field ${fieldId} is not unique`);
      }
      seenIds[fieldId] = true;
      if (seenKps[Utils.path.hash(kp)])
      {
        throw new Error(`Path ${kp.toArray()} is not unique`);
      }
      seenKps[Utils.path.hash(kp)] = true;
    };

    engine.getAllFieldIDs(true).forEach((id) =>
    {
      if (etlFieldTypesList.indexOf(Utils.fields.fieldType(id, engine)) === -1)
      {
        throw new Error(`Field ${id} has an invalid type: ${Utils.fields.fieldType(id, engine)}`);
      }
    });

    const tree = engine.createTree();
    const rootFields = engine.getAllFieldIDs().filter((id) => engine.getFieldPath(id).size === 1);
    rootFields.forEach((fieldId) =>
    {
      for (const childId of Utils.traversal.preorder(tree, fieldId))
      {
        checkField(childId);
        const type = Utils.fields.fieldType(childId, engine);
        if (type !== FieldTypes.Array && type !== FieldTypes.Object && type !== FieldTypes.GeoPoint)
        {
          if (tree.get(childId).size !== 0)
          {
            const msg = `Field ${childId} is a primitive (${type}) but has children. (${engine.getFieldPath(childId).toJS()})`;
            throw new Error(msg);
          }
        }
      }
    });

    engine.getAllFieldIDs().forEach((id) =>
    {
      if (!seenIds[id])
      {
        throw new Error(`Field ${id} with path ${engine.getFieldPath(id)} is disconnected from the tree`);
      }
    });

    return true;
  }

  // This function may be outdated
  public static canAddField(engine: TransformationEngine, fieldId: number, path: KeyPath): ValidInfo
  {
    if (path.last() === '')
    {
      return {
        isValid: false,
        message: 'Invalid Name. Names cannot be empty',
      };
    }

    const otherId = engine.getFieldID(path);
    if (otherId !== undefined && otherId !== fieldId)
    {
      return {
        isValid: false,
        message: 'Invalid Name. This field already exists',
      };
    }
    if (fieldId !== undefined && fieldId !== -1)
    {
      const parentType = Utils.fields.fieldType(fieldId, engine);
      if (parentType !== FieldTypes.Object && parentType !== FieldTypes.Array)
      {
        return {
          isValid: false,
          message: 'Invalid Rename. Parent fields is not a nested object',
        };
      }
    }
    return {
      isValid: true,
      message: '',
    };
  }

  // This function may be outdated
  public static canRename(engine: TransformationEngine, fieldId: number, path: KeyPath): ValidInfo
  {
    const existingKp = engine.getFieldPath(fieldId);
    const failIndex = path.findIndex((value) => value === '');
    if (failIndex !== -1)
    {
      return {
        isValid: false,
        message: 'Invalid Rename. Names cannot be empty',
      };
    }
    if (typeof path.last() === 'number')
    {
      return {
        isValid: false,
        message: 'Invalid Rename. Name cannot end with a number',
      };
    }
    const otherId = engine.getFieldID(path);
    if (otherId !== undefined && otherId !== fieldId)
    {
      return {
        isValid: false,
        message: 'Invalid Rename. This field already exists',
      };
    }
    else if (!Utils.path.isNamed(existingKp))
    {
      return {
        isValid: false,
        message: 'Invalid Rename. Cannot rename a dynamic field',
      };
    }

    if (!Utils.topology.areFieldsLocal(existingKp, path))
    {
      return {
        isValid: false,
        message: 'Invalid Rename. Cannot move field between array levels',
      };
    }

    for (let i = 1; i < path.size; i++)
    {
      const kpToTest = path.slice(0, i).toList();
      const parentId = engine.getFieldID(kpToTest);
      if (parentId !== undefined)
      {
        const parentType = Utils.fields.fieldType(parentId, engine);
        if (parentType !== FieldTypes.Object && parentType !== FieldTypes.Array)
        {
          return {
            isValid: false,
            message: 'Invalid Rename. One of the ancestor fields is not a nested object',
          };
        }
      }
    }

    return {
      isValid: true,
      message: '',
    };
  }

  // walks to the sink from the given source identity node. Throws if if encounters more than 1 outbound
  // non-synthetic edge during the walk
  protected static throwableWalk(engine: FriendEngine, identityNode: number): number
  {
    const dag = engine.dag;

    let node = String(identityNode);
    for (let i = 0; i < dag.nodeCount(); i++)
    {
      const outNodes = dag.successors(node);
      if (outNodes === undefined || outNodes.length === 0)
      {
        return Number(node);
      }

      let next;
      for (const nextNode of outNodes)
      {
        const edge = dag.edge(node, nextNode);
        if (edge !== EdgeTypes.Synthetic)
        {
          if (next === undefined)
          {
            next = nextNode;
          }
          else
          {
            throw new Error(`There were multiple outbound non-synthetic edges for node ${node}`);
          }
        }
      }
      if (next === undefined)
      {
        return Number(node);
      }
      node = next;
    }
    throw new Error('Walk should have ended by now');
  }
}
