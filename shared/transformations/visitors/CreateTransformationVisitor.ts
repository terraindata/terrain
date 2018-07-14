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

import * as Utils from 'shared/etl/util/ETLUtils';

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
  };

  constructor()
  {
    super();
    this.bindVisitors();
  }

  public visitDefault(type: TransformationNodeType, node: TransformationNode, engine: TransformationEngine)
  {
    let edgeType: EdgeTypes = EdgeTypes.Same;
    if (node.meta.newFieldKeyPaths !== undefined && node.meta.newFieldKeyPaths.size > 0)
    {
      edgeType = EdgeTypes.Synthetic;
    }

    node.fields.forEach((field) =>
    {
      Utils.traversal.appendNodeToField(engine, field.id, node.id, edgeType);
    });

    if (edgeType === EdgeTypes.Synthetic)
    {
      node.meta.newFieldKeyPaths.forEach((kp) =>
      {
        if (engine.getFieldID(kp) === undefined)
        {
          engine.addField(kp, {}, node.id);
        }
      });
    }
  }

  protected getNewType(type: TransformationNodeType): string
  {
    return TransformationRegistry.getNewFieldType(type);
  }

  protected visitGroupByNode(type, node: TransformationNode, engine: TransformationEngine): void
  {
    this.visitDefault(type, node, engine);

    const sourceId = node.fields.get(0).id;
    node.meta.newFieldKeyPaths.forEach((kp) =>
    {
      this.duplicateChildFields(engine, sourceId, kp, node.id);
    });
  }

  protected visitDuplicateNode(type, node: TransformationNode, engine: TransformationEngine): void
  {
    this.visitDefault(type, node, engine); // do all the normal stuff
    // add all child fields of the original field

    const sourceId = node.fields.get(0).id;
    const destPath = node.meta.newFieldKeyPaths.get(0);
    this.duplicateChildFields(engine, sourceId, destPath, node.id);
  }

  protected visitIdentityNode(type, node: TransformationNode, engine: TransformationEngine): void
  {

  }

  protected visitRenameNode(type, node: TransformationNode, engine: TransformationEngine): void
  {
    const sourceId = node.fields.get(0).id;
    Utils.traversal.appendNodeToField(engine, sourceId, node.id, EdgeTypes.Synthetic);
  }

  protected duplicateChildFields(engine: TransformationEngine, sourceId: number, rootPath: KeyPath, node: number)
  {
    const sourcePath = Utils.path.convertIndices(engine.getFieldPath(sourceId));
    sourceId = engine.getFieldID(sourcePath);

    Utils.traversal.preorderFields(engine, sourceId, (childId) =>
    {
      if (childId !== sourceId)
      {
        const pathAfterRoot = engine.getFieldPath(childId).slice(sourcePath.size);
        const newFieldPath = rootPath.concat(pathAfterRoot).toList();
        const newFieldId = Utils.engine.copyField(engine, childId, newFieldPath, node);
        const childEnd = Utils.traversal.findEndTransformation(engine, childId);
        Utils.traversal.prependNodeToField(engine, newFieldId, childEnd, EdgeTypes.Synthetic);
      }
    });
  }
}
