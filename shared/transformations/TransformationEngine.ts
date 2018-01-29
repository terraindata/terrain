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
import isPrimitive = require('is-primitive');
import * as _ from 'lodash';
import nestedProperty = require('nested-property');
import * as winston from 'winston';
import { TransformationNode } from './TransformationNode';
import TransformationNodeType from './TransformationNodeType';
import TransformationNodeVisitor from './TransformationNodeVisitor';
import TransformationVisitError from './TransformationVisitError';
import TransformationVisitResult from './TransformationVisitResult';

const Graph = GraphLib.Graph;

export class TransformationEngine
{
  // TODO parse from strings as well (need to recover type information e.g. for nodes)
  public static load(json: object): TransformationEngine
  {
    const parsedJSON = typeof json === 'string' ? JSON.parse(json) : json;
    const e: TransformationEngine = new TransformationEngine();
    const dag: any = GraphLib.json.read(parsedJSON['dag']);
    /*for(let i: number =  0; i < dag.nodes.length; i++)
    {
      console.log('hh');
      dag.nodes[i].value = new TransformationNode(dag.nodes[i].value.id, dag.nodes[i].value.typeCode, dag.nodes[i].value.fieldIDs);
    }*/
    e.dag = dag;
    e.doc = parsedJSON['doc'];
    e.uidField = parsedJSON['uidField'];
    e.uidNode = parsedJSON['uidNode'];
    e.fieldNameToIDMap = new Map<string, number>(parsedJSON['fieldNameToIDMap']);
    e.IDToFieldNameMap = new Map<number, string>(parsedJSON['IDToFieldNameMap']);
    e.fieldTypes = new Map<number, string>(parsedJSON['fieldTypes']);
    return e;
  }

  private dag: any = new Graph({ isDirected: true });
  private doc: object = {};
  private uidField: number = 0;
  private uidNode: number = 0;
  private fieldNameToIDMap: Map<string, number> = new Map<string, number>();
  private IDToFieldNameMap: Map<number, string> = new Map<number, string>();
  private fieldTypes: Map<number, string> = new Map<number, string>();

  constructor(doc?: object)
  {
    if (doc !== undefined)
    {
      this.doc = doc;
      this.generateInitialFieldMaps(this.doc);
      // initial field nodes can be implicit, DAG should only represent actual transformations
    }
    // allow construction without example doc (manually add fields)
  }

  public equals(other: TransformationEngine): boolean
  {
    return JSON.stringify(GraphLib.json.write(this.dag)) === JSON.stringify(GraphLib.json.write(other.dag))
      && JSON.stringify(this.doc) === JSON.stringify(other.doc)
      && this.uidField === other.uidField
      && this.uidNode === other.uidNode
      && JSON.stringify([...this.fieldNameToIDMap]) === JSON.stringify([...other.fieldNameToIDMap])
      && JSON.stringify([...this.IDToFieldNameMap]) === JSON.stringify([...other.IDToFieldNameMap])
      && JSON.stringify([...this.fieldTypes]) === JSON.stringify([...other.fieldTypes]);
  }

  public appendTransformation(nodeType: TransformationNodeType, fieldNames: string[], options?: object, tags?: string[], weight?: number)
  {
    const fieldIDs: number[] = _.map(fieldNames, (name) => this.fieldNameToIDMap.get(name));
    const node = new TransformationNode(this.uidNode, nodeType, fieldIDs, options);
    this.dag.setNode(this.uidNode.toString(), node);
    this.uidNode++;
  }

  public transform(doc: object): object
  {
    let output: object = this.flatten(doc);
    for (const nodeKey of this.dag.sources())
    {
      const toTraverse = GraphLib.alg.preorder(this.dag, nodeKey);
      for (let i = 0; i < toTraverse.length; i++)
      {
        const transformationResult: TransformationVisitResult = TransformationNodeVisitor.visit(this.dag.node(toTraverse[i]), output);
        if (transformationResult.errors !== undefined)
        {
          winston.error('Transformation encountered errors!:');
          transformationResult.errors.forEach((error: TransformationVisitError) =>
          {
            winston.error(`\t -${error.message}`);
          });
          // TODO abort transforming if errors occur?
        }
        output = transformationResult.document;
      }
    }
    return this.unflatten(output);
  }

  public json(): object
  {
    return {
      dag: GraphLib.json.write(this.dag),
      doc: this.doc,
      uidField: this.uidField,
      uidNode: this.uidNode,
      fieldNameToIDMap: [...this.fieldNameToIDMap],
      IDToFieldNameMap: [...this.IDToFieldNameMap],
      fieldTypes: [...this.fieldTypes],
    };
  }

  public addField(fullKeyPath: string, typeName: string): void
  {
    this.fieldNameToIDMap.set(fullKeyPath, this.uidField);
    this.IDToFieldNameMap.set(this.uidField, fullKeyPath);
    this.fieldTypes.set(this.uidField, typeName);

    this.uidField++;
  }

  private generateInitialFieldMaps(obj: object, currentKeyPath: string = ''): void
  {
    for (const key of Object.keys(obj))
    {
      if (isPrimitive(obj[key]))
      {
        this.addField(currentKeyPath + key, typeof obj[key]);
      } else if (Array.isArray(obj[key]))
      {
        for (const item of obj[key])
        {
          // TODO transform arrays in docs
        }
      } else
      {
        this.generateInitialFieldMaps(obj[key], currentKeyPath + key + '.');
      }
    }
  }

  private flatten(obj: object): object
  {
    const output: object = {};
    for (const [key, value] of this.fieldNameToIDMap)
    {
      if (nestedProperty.has(obj, key))
      {
        output[value] = nestedProperty.get(obj, key);
      }
    }
    return output;
  }

  private unflatten(obj: object): object
  {
    const output: object = {};
    for (const [key, value] of this.IDToFieldNameMap)
    {
      if (obj.hasOwnProperty(key))
      {
        nestedProperty.set(output, value, obj[key]);
      }
    }
    return output;
  }
}
