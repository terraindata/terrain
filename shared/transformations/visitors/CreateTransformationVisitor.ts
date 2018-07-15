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
  NodeOptionsType,
  TransformationEdgeTypes as EdgeTypes,
} from 'shared/transformations/TransformationNodeType';
import TransformationRegistry from 'shared/transformations/TransformationRegistry';
import TransformationNodeVisitor, { VisitorLookupMap } from './TransformationNodeVisitor';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

import { Edge, TransformationGraph } from 'shared/transformations/TypedGraph';

import * as Utils from 'shared/transformations/util/EngineUtils';

/*
 *  This visitor will be called after the transformation engine creates the node in the dag.
 */

export default class CreationVisitor
  extends TransformationNodeVisitor<void, TransformationEngine>
{
  public visitorLookup: VisitorLookupMap<void, TransformationEngine> = {
    [TransformationNodeType.RenameNode]: this.visitRenameNode,
    [TransformationNodeType.IdentityNode]: this.visitIdentityNode,
    [TransformationNodeType.DuplicateNode]: this.visitDuplicateNode,
    [TransformationNodeType.GroupByNode]: this.visitGroupByNode,
  };

  constructor()
  {
    super();
    this.bindVisitors();
  }

  public visitDefault(type: TransformationNodeType, node: TransformationNode, engine: FriendEngine)
  {
    if (node.meta.newFieldKeyPaths != null && node.meta.newFieldKeyPaths.size > 0)
    {
      this.processInputFields(engine, node, EdgeTypes.Synthetic);
      this.processOutputFields(engine, node);
    }
    else
    {
      this.processInputFields(engine, node, EdgeTypes.Same);
    }
  }

  public processInputFields(engine: FriendEngine, node: TransformationNode, edgeType: EdgeTypes)
  {
    const nodeInfo = TransformationRegistry.getInfo(node.typeCode);
    node.fields.forEach((field, index) =>
    {
      Utils.traversal.appendNodeToField(engine, field.id, node.id, edgeType);

      const newSourceType = nodeInfo.computeNewSourceType(engine, node, index);
      // if (newSourceType != null && newSourceType !== currentType)
      // {
      //   node.meta.fromType = currentType;
      //   Utils.fields.setType(engine, field.id, newSourceType);
      // }
      this.changeTypeEffects(engine, node, field.id, newSourceType);
    });
  }

  public processOutputFields(engine: FriendEngine, node: TransformationNode)
  {
    const nodeInfo = TransformationRegistry.getInfo(node.typeCode);
    node.meta.newFieldKeyPaths.forEach((kp, index) =>
    {
      this.createAncestors(engine, kp, node.id);
      const newType = nodeInfo.computeNewFieldType(engine, node, index);
      if (engine.getFieldID(kp) == null)
      {
        engine.addField(kp, { etlType: newType }, node.id);
      }
    });
  }

  public visitGroupByNode(type, node: TransformationNode, engine: FriendEngine): void
  {
    this.visitDefault(type, node, engine);

    const sourceId = node.fields.get(0).id;
    node.meta.newFieldKeyPaths.forEach((kp) =>
    {
      this.copyNestedStructure(engine, sourceId, kp, node.id);
    });
  }

  // what about [foo, -1, bar] to [baz] (extract simple)
  // or [foo, bar, 1] to [baz]
  // or [foo, -1, 1] to [baz]
  public visitDuplicateNode(type, node: TransformationNode, engine: FriendEngine): void
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.DuplicateNode>;
    this.processInputFields(engine, node, EdgeTypes.Synthetic);
    // add all child fields of the original field
    const sourceId = node.fields.get(0).id;
    let sourcePath = node.fields.get(0).path;
    if (opts.extractionPath !== undefined)
    {
      sourcePath = opts.extractionPath;
    }
    const destPath = opts.newFieldKeyPaths.get(0);
    const [r1, r2] = Utils.topology.getRelation(sourcePath, destPath);

    if (r1 === 'one' && r2 === 'one')
    {
      this.processOutputFields(engine, node);
      this.copyNestedStructure(engine, sourceId, destPath, node.id);
    }
    else if (r1 === 'many' && r2 === 'one') // e.g. [foo, -1, bar] to [a, b, baz] (simple extract)
    {
      // [a, b, baz] is an array where [a, b, baz, -1] matches the structure of [foo, -1, bar]
      const nodeInfo = TransformationRegistry.getInfo(node.typeCode);
      this.createAncestors(engine, destPath, node.id);
      engine.addField(destPath, { etlType: FieldTypes.Array }, node.id);
      const newType = nodeInfo.computeNewFieldType(engine, node, 0);
      const arrayedPath = destPath.push(-1);
      engine.addField(arrayedPath, { etlType: newType }, node.id);
      this.copyNestedStructure(engine, sourceId, arrayedPath, node.id);
    }
    else if (r1 === 'one' && r2 === 'many') // e.g. [foo, bar] to [baz, -1, dog]
    {
      // currently unsupported in the UI
    }
    else
    {
      throw new Error('Cannot create a many-to-many duplication');
    }
  }

  public visitIdentityNode(type, node: TransformationNode, engine: FriendEngine): void
  {
    const opts = node.meta as NodeOptionsType<TransformationNodeType.IdentityNode>;
    if (opts.type === 'Removal')
    {
      const fieldId = node.fields.get(0).id;
      Utils.traversal.appendNodeToField(engine, fieldId, node.id, EdgeTypes.Removal);
      engine.setFieldPath(fieldId, List([null]));
    }
  }

  public visitRenameNode(type, node: TransformationNode, engine: FriendEngine): void
  {
    const sourceId = node.fields.get(0).id;
    Utils.traversal.appendNodeToField(engine, sourceId, node.id, EdgeTypes.Synthetic);
    const newPath = node.meta.newFieldKeyPaths.get(0);
    const oldPath = engine.getFieldPath(sourceId);
    const transplantIndex = oldPath.size;
    this.createAncestors(engine, newPath, node.id);
    Utils.traversal.postorderFields(engine, sourceId, (id) =>
    {
      const childPath = engine.getFieldPath(id);
      engine.setFieldPath(id, newPath.concat(childPath.slice(transplantIndex)).toList());
      const identityNode = engine.addIdentity(id, node.id);
      Utils.traversal.appendNodeToField(engine, id, identityNode, EdgeTypes.Rename);
      engine.dag.setEdge(String(node.id), String(identityNode), EdgeTypes.Synthetic);
    });
  }

  /*
   *  if path is [foo, bar, -1, baz] ensure that [foo], [foo, bar], and [foo, bar, -1] exist
   *  if new fields are to be created, nodeId indicates the transformation
   */
  protected createAncestors(engine: FriendEngine, path: KeyPath, nodeId: number)
  {
    for (let i = 1; i < path.size; i++)
    {
      const parentPath = path.slice(0, i).toList();
      if (engine.getFieldID(parentPath) === undefined)
      {
        const nextWaypoint = path.get(i);
        const type = typeof nextWaypoint === 'number' ? FieldTypes.Array : FieldTypes.Object;
        const newId = engine.addField(parentPath, { etlType: type }, nodeId);
      }
    }
  }

  protected copyNestedStructure(engine: FriendEngine, sourceId: number, rootPath: KeyPath, node: number)
  {
    const sourcePath = Utils.path.convertIndices(engine.getFieldPath(sourceId));
    sourceId = engine.getFieldID(sourcePath);

    Utils.traversal.preorderFields(engine, sourceId, (childId) =>
    {
      if (childId !== sourceId)
      {
        const pathAfterRoot = engine.getFieldPath(childId).slice(sourcePath.size);
        const newFieldPath = rootPath.concat(pathAfterRoot).toList();
        const newFieldId = Utils.fields.copyField(engine, childId, newFieldPath, node);
        const childEnd = Utils.traversal.findEndTransformation(engine, childId);
        Utils.traversal.prependNodeToField(engine, newFieldId, childEnd, EdgeTypes.Synthetic);
      }
      else
      {
        Utils.fields.transferFieldData(sourceId, childId, engine, engine);
      }
    });
  }

  protected changeTypeEffects(engine: FriendEngine, node: TransformationNode, fieldId: number, newType: FieldTypes)
  {
    const currentType = Utils.fields.fieldType(fieldId, engine);
    if (newType != null && newType !== currentType)
    {
      node.meta.fromType = currentType;
      Utils.fields.setType(engine, fieldId, newType);
      if (currentType === FieldTypes.Array || currentType === FieldTypes.Object)
      {
        this.killSubfields(engine, node, fieldId);
      }
      if (newType === FieldTypes.Array)
      {
        const kp = engine.getFieldPath(fieldId).push(-1);
        engine.addField(kp, { etlType: FieldTypes.String }, node.id);
      }
    }
  }

  protected killSubfields(engine: FriendEngine, node: TransformationNode, fieldId: number)
  {
    Utils.traversal.postorderFields(engine, fieldId, (childId) =>
    {
      if (fieldId === childId)
      {
        return;
      }
      engine.killField(childId, node.id);
    });
  }
}
