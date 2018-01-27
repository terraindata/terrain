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

import GraphLib = require('graphlib');
import * as _ from 'lodash';
import TransformNodeVisitor from 'shared/transforms/TransformNodeVisitor';
import TransformNodeType from 'sharedtransforms/TransformNodeType';
import * as winston from 'winston';
import { TransformationNode } from './TransformationNode';

const Graph = GraphLib.Graph;

export class TransformationEngine {
  public static load(json: object): TransformationEngine
  {
    const e: TransformationEngine = new TransformationEngine();
    e.dag = GraphLib.json.read(json);
    return e;
  }

  public static load(jsonString: string): TransformationEngine
  {
    const e: TransformationEngine = new TransformationEngine();
    e.dag = GraphLib.json.read(JSON.parse(jsonString));
    return e;
  }

  private static isPrimitive(obj): boolean {
    if (null === obj) { return true; }
    if (undefined === obj) { return true; }
    if (['string', 'number', 'boolean'].some((type) => type === typeof obj)) { return true; }
    return false;
  }

  private dag: any = new Graph({ isDirected: true });
  private doc: object = undefined;
  private uidField: number = 0;
  private uidNode: number = 0;
  private fieldNameToIDMap: Map<string, int> = new Map<string, int>();
  private IDToFieldNameMap: Map<int, string> = new Map<int, string>();
  private fieldTypes: Map<int, string> = new Map<int, string>();

  constructor(doc: object)
  {
    this.doc = doc;
    this.generateInitialFieldMaps(this.doc);
    // initial field nodes can be implicit, DAG should only represent actual transformations
  }

  public appendTransformation(nodeType: TransformNodeType, fieldNames: string[], options?: object, tags?: string[], weight?: number)
  {
    const fieldIDs: number = _.map(fieldNames, (name) => this.fieldNameToIDMap.get(name));
    const node = new TransformationNode(this.uidNode, nodeType, fieldIDs, options);
    this.dag.setNode(this.uidNode.toString(), node);

    this.uidNode++;
  }

  public transform(doc: object): object
  {
    let output: object = this.flatten(doc);
    const visitor = new TransformNodeVisitor<object>();
    for (const nodeKey of this.dag.sources())
    {
      const toTraverse = GraphLib.alg.preorder(this.dag, nodeKey);
      for (let i = 0; i < toTraverse.length; i++)
      {
        const transformResults = visitor.visit(this.dag.node(toTraverse[i]), output);
        if (transformResults.hasOwnProperty('errors'))
        {
          winston.error('Transformation encountered errors!');
          // TODO abort?
        }
        output = transformResults['document'];
      }
    }
    return this.unflatten(output);
  }

  public json(): string
  {
    return GraphLib.json.write(this.dag);
  }

  public addField(fullKeyPath: string, typeName: string): void
  {
    console.log(fullKeyPath);
    this.fieldNameToIDMap.set(fullKeyPath, this.uidField);
    this.IDToFieldNameMap.set(this.uidField, fullKeyPath);
    this.fieldTypes.set(this.uidField, typeName);

    this.uidField++;
  }

  private generateInitialFieldMaps(obj: object, currentKeyPath?: string = ''): void
  {
    for (const key of Object.keys(obj)) {
      if (TransformationEngine.isPrimitive(obj[key])) {
        console.log('is p ' + key);
        this.addField(currentKeyPath + key, typeof obj[key]);
      } else if (Array.isArray(obj[key])) {
        for (const item of obj[key]) {
          // TODO transform arrays in docs
        }
      } else {
        console.log('r ' + key);
        this.generateInitialFieldMaps(obj[key], currentKeyPath + key + '.');
      }
    }
  }

  private hasOwnNestedProperty(obj, propertyPath): boolean
  {
    if (!propertyPath) {
      return false;
    }

    const properties = propertyPath.split('.');

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];

      if (!obj || !obj.hasOwnProperty(prop)) {
        return false;
      } else {
        obj = obj[prop];
      }
    }

    return true;
  }

  private getNestedProperty(obj, propertyPath): boolean
  {
    if (!propertyPath) {
      return false;
    }

    const properties = propertyPath.split('.');

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];

      if (!obj || !obj.hasOwnProperty(prop)) {
        return false;
      } else {
        obj = obj[prop];
      }
    }

    return obj[prop];
  }

  private flatten(obj: object): object
  {
    console.log(obj);
    const output: object = {};
    for (const [key, value] of this.fieldNameToIDMap) {
      console.log('fkey = ' + key);
      if (this.hasOwnNestedProperty(obj, key))
      {
        output[value] = this.getNestedProperty(obj, key);
      }
    }
    console.log(output);
    return output;
  }

  private unflatten(obj: object): object
  {
    const output: object = {};
    for (const [key, value] of this.IDToFieldNameMap) {
      if (obj.hasOwnProperty(key))
      {
        output[value] = obj[key];
      }
    }
    return output;
  }
}
