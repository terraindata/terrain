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

import * as Utils from 'shared/transformations/util/EngineUtils';

import { FieldTypes } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { KeyPath, WayPoint } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';

import * as TerrainLog from 'loglevel';

import { TypeTracker } from './TypeTracker';

interface FieldNode
{
  path: KeyPath;
  name: WayPoint; // null if root
  type?: FieldTypes;
  arrChild?: FieldNode;
  fields: { [k: string]: FieldNode };
}

export default abstract class ConstructionUtil
{
  // take two engines and return an engine whose fields most closely resembles the result of the merge
  public static mergeJoinEngines(
    leftEngine: TransformationEngine,
    rightEngine: TransformationEngine,
    outputKey: string,
  ): TransformationEngine
  {
    const newEngine = new TransformationEngine();
    leftEngine.getAllFieldIDs().forEach((id) =>
    {
      const keypath = leftEngine.getFieldPath(id);
      const newId = Utils.fields.copyField(leftEngine, id, keypath, undefined, newEngine);
    });
    const fieldPathBase = List([outputKey, -1]);
    const outputFieldId = Utils.fields.addFieldToEngine(newEngine, List([outputKey]), FieldTypes.Array);
    const outputFieldWildcardId = Utils.fields.addFieldToEngine(newEngine, fieldPathBase, FieldTypes.Object);

    rightEngine.getAllFieldIDs().forEach((id) =>
    {
      const newKeyPath = fieldPathBase.concat(rightEngine.getFieldPath(id)).toList();
      const newId = Utils.fields.copyField(rightEngine, id, newKeyPath, undefined, newEngine);
    });
    return newEngine;
  }

  public static createEngineFromDocuments(documents: List<object>, interpretText = false):
    { engine: TransformationEngine, errors: string[] }
  {
    const pathTypes: { [k: string]: TypeTracker } = {};
    const errAccumulator = ConstructionUtil.errorAccumulator();
    documents.forEach((doc, docIndex) =>
    {
      for (const leaf of yadeep.traverse(doc, { primitivesOnly: true, arrayLimit: 20 }))
      {
        const { location, value } = leaf;
        const path = Utils.path.convertIndices(location);
        const hash = Utils.path.hash(path);
        if (pathTypes[hash] === undefined)
        {
          pathTypes[hash] = new TypeTracker(path, errAccumulator.fn, interpretText);
        }
        pathTypes[hash].push(value);
      }
    });

    const tree = ConstructionUtil.buildTreeFromPathTypes(pathTypes, errAccumulator.fn);

    const engine = new TransformationEngine();
    for (const match of yadeep.traverse(tree, { primitivesOnly: true }))
    {
      const { value, location } = match;
      if (location.last() === 'type')
      {
        const kp = yadeep.get(tree, location.set(-1, 'path'));
        const type = value;
        if (kp.size !== 0)
        {
          engine.addField(kp, { etlType: type });
        }
      }
    }

    return {
      engine,
      errors: errAccumulator.errors,
    };
  }

  public static makeEngine(doc: object): TransformationEngine
  {
    return ConstructionUtil.createEngineFromDocuments(List([doc])).engine;
  }

  private static buildTreeFromPathTypes(pathTypes: { [k: string]: TypeTracker }, onConflict: (msg: string) => void): FieldNode
  {
    const tree: FieldNode = {
      path: KeyPath([]),
      name: null,
      fields: {},
    };

    const walk = (kp: KeyPath, desiredType: FieldTypes) =>
    {
      let node: FieldNode = tree;
      for (let i = 0; i < kp.size; i++)
      {
        const waypoint = kp.get(i);
        if (waypoint === -1)
        {
          if (node.type === undefined)
          {
            node.type = FieldTypes.Array;
          }
          if (node.type !== FieldTypes.Array)
          {
            const message = `Encountered a ${node.type} field where an array field was expected`;
            node.type = FieldTypes.String;
            node.arrChild = undefined;
            node.fields = {};
            return message;
          }
          else if (node.arrChild === undefined)
          {
            node.type = FieldTypes.Array;
            node.arrChild = {
              path: node.path.push(-1),
              name: -1,
              fields: {},
            };
            node = node.arrChild;
          }
          else
          {
            node = node.arrChild;
          }
        }
        else
        {
          if (node.type === undefined)
          {
            node.type = FieldTypes.Object;
          }
          if (node.type !== FieldTypes.Object)
          {
            const message = `Encountered a ${node.type} field where an object field was expected`;
            node.type = FieldTypes.String;
            node.arrChild = undefined;
            node.fields = {};
            return message;
          }
          else if (node.fields[waypoint] === undefined)
          {
            node.type = FieldTypes.Object;
            node.fields[waypoint] = {
              path: node.path.push(waypoint),
              name: waypoint,
              fields: {},
            };
            node = node.fields[waypoint];
          }
          else
          {
            node = node.fields[waypoint];
          }
        }
      }
      if (Object.keys(node.fields).length > 0 || node.arrChild !== undefined)
      {
        node.type = FieldTypes.String;
        node.fields = {};
        node.arrChild = undefined;
        return `Field with primitive type cannot be an array or object`;
      }
      else
      {
        node.type = desiredType;
      }
      return true;
    };

    for (const key of Object.keys(pathTypes))
    {
      const kp = Utils.path.unhash(key);
      const errors = walk(kp, pathTypes[key].getType());
      if (errors !== true)
      {
        onConflict(errors);
      }
    }
    return tree;
  }

  private static errorAccumulator(maxErrors: number = 5): { numErrors: number, errors: string[], fn: (err) => void }
  {
    const errors = [];
    let total = 0;
    return {
      errors,
      numErrors: total,
      fn: (err) =>
      {
        total++;
        if (errors.length <= maxErrors)
        {
          errors.push(err);
        }
      },
    };
  }
}
