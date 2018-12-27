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
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import { KeyPath, WayPoint } from 'terrain-keypath';
import * as yadeep from 'yadeep';

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import FriendEngine from 'shared/transformations/FriendEngine';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNode from 'shared/transformations/TransformationNode';
import TransformationNodeType,
{ IdentityTypes, NodeOptionsType, TransformationEdgeTypes as EdgeTypes } from 'shared/transformations/TransformationNodeType';
import { TransformationEngine as V5Engine, TransformationNode as V5Node } from 'shared/transformations/V5TransformationEngine';

import TransformationRegistry from 'shared/transformations/TransformationRegistry';
import TransformationNodeVisitor from 'shared/transformations/visitors/TransformationNodeVisitor';

import { Edge, TransformationGraph, TypedGraph } from 'shared/transformations/TypedGraph';

import * as Utils from 'shared/transformations/util/EngineUtils';

/*
 *  Utility to take an old transformation engine and convert to the new visitor & dag based one.
 *  This is complex enough of an operation that it needs its own file
 */

export function convertV5Engine(old: V5Engine): TransformationEngine
{
  const converter = new EngineConverter(old);
  return converter.build();
}

interface RawField
{
  ikp: KeyPath;
  okp: KeyPath;
  type: FieldTypes;
  rawId: number;
  enabled: boolean;
  fieldProps: object;
  synthetic?: boolean;
}

interface RawTransformation
{
  id: number;
  type: string;
  fields: List<KeyPath>;
  meta: object;
}

class EngineConverter
{
  private rawFields: { [id: number]: RawField } = {};
  private rawTransformation: { [id: number]: RawTransformation } = {};
  private oldEngine: V5Engine;
  private newEngine: TransformationEngine;

  private reverseMaps: { output: Map<KeyPath, number>, input: Map<number, KeyPath> };
  private idsNewToOld: { [id: number]: number } = {};
  private idsOldToNew: { [id: number]: number } = {};

  constructor(oldEngine: V5Engine)
  {
    this.oldEngine = oldEngine;
  }

  public build(): TransformationEngine
  {
    this.generateRawReverseMaps();
    this.populateRawFields();
    this.determineRawSynthetics();

    this.initializeBuildProcess();
    this.addOrganicFields();
    this.buildCrossFieldMap();
    this.renameOrganicFields();
    this.addTransformations();

    this.transferProperties();
    // make sure fields are the right type
    // check for errors!

    const errors = Utils.validation.verifyEngine(this.newEngine);
    if (errors.length > 0)
    {
      throw new Error(`Resulting Engine is Malformed: ${errors}`);
    }
    return this.newEngine;
  }

  /*
   *  Create cache maps for old engine
   */
  private generateRawReverseMaps()
  {
    const reverseOutputMap: Map<KeyPath, number> = this.oldEngine.IDToFieldNameMap
      .mapEntries<KeyPath, number>(([id, kp]) => [KeyPath(kp), id]).toMap();
    const reverseInputMap: Map<number, KeyPath> = this.oldEngine.fieldNameToIDMap
      .mapEntries<number, KeyPath>(([kp, id]) => [id, KeyPath(kp)]).toMap();

    this.reverseMaps = {
      output: reverseOutputMap,
      input: reverseInputMap,
    };
  }

  private populateRawFields()
  {
    const idToPath = this.oldEngine.IDToFieldNameMap;
    const fieldProps = this.oldEngine.fieldProps;
    const enabledMap = this.oldEngine.fieldEnabled;

    idToPath.forEach((kp, id) =>
    {
      const props = fieldProps.get(id);
      let etlType = props['etlType'];
      if (etlType == null)
      {
        const fType = this.oldEngine.fieldTypes.get(id);
        const vType = props['valueType'];
        etlType = this.legacyRepresentedType(kp, fType, vType);
      }

      const field: RawField = {
        rawId: id,
        ikp: this.getInputKeyPath(id),
        okp: kp,
        type: etlType,
        enabled: enabledMap.get(id),
        fieldProps: props,
      };
      this.rawFields[id] = field;
    });
  }

  /*
   *  Compute which fields are synthetic and which are organic
   */
  private determineRawSynthetics()
  {
    const graph = this.oldEngine.dag as TypedGraph<V5Node, any>;

    // use newFieldKeyPaths to exclusively determine if a field is synthetic
    for (const nid of graph.nodes())
    {
      const node = graph.node(nid);
      const nfkp: List<KeyPath> = node.meta['newFieldKeyPaths'];
      if (nfkp !== undefined && nfkp.size > 0)
      {
        nfkp.forEach((kp) =>
        {
          const rawId: number = this.getOutputFieldID(kp);
          this.rawFields[rawId].synthetic = true;
        });
      }
    }

    // walk backwards on each keypath to determine if a parent is synthetic
    for (const id of this.getRawFieldIds())
    {
      const rawField = this.getRawField(id);
      for (let i = 1; i < rawField.okp.size; i++)
      {
        const parentPath = rawField.okp.setSize(i);
        const parentId = this.getOutputFieldID(parentPath);
        if (parentId !== undefined)
        {
          if (this.getRawField(parentId).synthetic)
          {
            rawField.synthetic = true;
          }
          break;
        }
      }
    }
  }

  private initializeBuildProcess()
  {
    this.newEngine = new TransformationEngine();
  }

  /*
   *  Add only the organic fields to the new engine
   */
  private addOrganicFields()
  {
    const rawFields = Array.from(this.getRawFieldIds())
      .map((rawId) => this.getRawField(rawId))
      .filter((field) => !field.synthetic)
      .sort((a, b) => a.ikp.size - b.ikp.size);
    for (const rawField of rawFields)
    {
      const newId = this.newEngine.addField(rawField.ikp, {
        etlType: rawField.type,
      });
    }
  }

  /*
   *  Generate a map that maps new ids to old ids and vice versa
   */
  private buildCrossFieldMap()
  {
    this.newEngine.getAllFieldIDs().forEach((newId) =>
    {
      const path = this.newEngine.getFieldPath(newId);
      const oldId = this.oldEngine.fieldNameToIDMap.get(path);
      this.idsOldToNew[oldId] = newId;
      this.idsNewToOld[newId] = oldId;
    });
  }

  private renameOrganicFields()
  {
    this.newEngine.getAllFieldIDs()
      .sort((a, b) => this.newEngine.getFieldPath(a).size - this.newEngine.getFieldPath(b).size)
      .forEach((newId) =>
      {
        const rawId = this.idsNewToOld[newId];
        const rawField = this.getRawField(rawId);
        const currentPath = this.newEngine.getFieldPath(newId);
        if (!currentPath.equals(rawField.okp))
        {
          this.newEngine.renameField(newId, rawField.okp);
        }
      });
  }

  // add transformations from the old engine to the new one
  private addTransformations()
  {
    const oldGraph = this.oldEngine.dag as TypedGraph<V5Node, any>;
    const idsToAdd = this.oldEngine.dag.nodes().sort((a, b) => Number(a) - Number(b));
    for (const oldNodeId of idsToAdd)
    {
      const oldNode = oldGraph.node(oldNodeId);
      this.addTransformation(oldNode);
    }
  }

  private addTransformation(oldNode: V5Node)
  {
    let typeCode = oldNode.typeCode;
    let fields = oldNode.fields;
    const meta = oldNode.meta;

    if (typeCode === 'CastNode')
    {
      typeCode = TransformationNodeType.DeprecatedNode;
      (meta as NodeOptionsType<TransformationNodeType.DeprecatedNode>).deprecatedType = 'CastNode';
    }

    fields = fields.map((kp) =>
    {
      const rawId = this.oldEngine.fieldNameToIDMap.get(kp);
      const rawField = this.getRawField(rawId);
      if (this.newEngine.getFieldID(rawField.okp) === undefined)
      {
        if (Utils.path.isSpecified(rawField.okp))
        {
          Utils.fields.addIndexedField(this.newEngine, rawField.okp);
        }
        else
        {
          Utils.fields.addInferredField(this.newEngine, rawField.okp, FieldTypes.String);
        }
      }
      return rawField.okp;
    }).toList();

    if (typeCode === TransformationNodeType.DeprecatedNode)
    {
      if (meta['toTypename'] === 'array')
      {
        const wildPath = fields.get(0).push(-1);
        if (this.newEngine.getFieldID(wildPath) === undefined)
        {
          this.newEngine.addField(wildPath, {
            etlType: FieldTypes.String,
          });
        }
      }
    }

    this.newEngine.appendTransformation(typeCode, fields, meta);
  }

  private transferProperties()
  {
    this.newEngine.getAllFieldIDs().forEach((newId) =>
    {
      const rawId = this.getOutputFieldID(this.newEngine.getFieldPath(newId));
      const rawField = this.getRawField(rawId);
      if (rawField.enabled)
      {
        this.newEngine.enableField(newId);
      }
      else
      {
        this.newEngine.disableField(newId);
      }
      const oldProps = rawField.fieldProps;
      const currentProps = this.newEngine.getFieldProps(newId);
      const newProps = _.omit(oldProps, ['etlType', 'valueType']);
      newProps['etlType'] = rawField.type == null ? currentProps['etlType'] : rawField.type;
      this.newEngine.setFieldProps(newId, newProps);
    });
  }

  private getRawField(rawId: number): RawField
  {
    return this.rawFields[rawId];
  }

  private getOutputFieldID(kp: KeyPath): number
  {
    return this.reverseMaps.output.get(kp);
  }

  private getInputKeyPath(id: number): KeyPath
  {
    return this.reverseMaps.input.get(id);
  }

  private * getRawFieldIds(): IterableIterator<number>
  {
    for (const id of Object.keys(this.rawFields))
    {
      yield (Number(id));
    }
  }

  private legacyRepresentedType(kp: KeyPath, type: string, valueType: string): FieldTypes
  {
    let typeToUse = type;
    if (Utils.path.isWildcard(kp))
    {
      typeToUse = valueType;
    }
    switch (typeToUse)
    {
      case 'array':
        return FieldTypes.Array;
      case 'object':
        return FieldTypes.Object;
      case 'number':
        return FieldTypes.Number;
      case 'string':
        return FieldTypes.String;
      case 'boolean':
        return FieldTypes.Boolean;
      default:
        return FieldTypes.Object;
    }
  }
}
