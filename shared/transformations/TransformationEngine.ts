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

import arrayTypeOfValues = require('array-typeof-values');
import * as GraphLib from 'graphlib';
import { List, Map } from 'immutable';
import isPrimitive = require('is-primitive');
import * as _ from 'lodash';
import TransformationNode from 'shared/transformations/TransformationNode';
import { KeyPath } from '../util/KeyPath';
import * as yadeep from '../util/yadeep';

import DataStore from './DataStore';
import TransformationNodeType, { NodeOptionsType, TransformationEdgeTypes as EdgeTypes } from './TransformationNodeType';
import TransformationRegistry from './TransformationRegistry';
import CreateTransformationVisitor from './visitors/CreateTransformationVisitor';
import TransformationEngineNodeVisitor from './visitors/TransformationEngineNodeVisitor';
import TransformationNodeConstructorVisitor from './visitors/TransformationNodeConstructorVisitor';
import TransformationVisitError from './visitors/TransformationVisitError';
import TransformationVisitResult from './visitors/TransformationVisitResult';

import { TransformationGraph } from 'shared/transformations/TypedGraph';
import * as Utils from 'shared/transformations/util/EngineUtils';

const NodeConstructor = new TransformationNodeConstructorVisitor();
const TransformationCreator = new CreateTransformationVisitor();
const ExecutionVisitor = new TransformationEngineNodeVisitor();

/**
 * A TransformationEngine performs transformations on complex JSON documents.
 *
 * This is used by the ETL import/export system in order to pre-/post-process
 * data, but is a fairly general-purpose system for manipulating deep objects.
 *
 * A TransformationEngine can be initialized from an example document, or fields
 * can manually be registered with the engine.  In either case, once fields are
 * registered, transformations can be added (they are represented as a DAG;
 * transformations may have dependencies).  Once an engine is fully configured,
 * documents with the same/similar schemas may be transformed using the
 * engine's `transform` method.
 */
export class TransformationEngine
{
  public static datastore = new DataStore();

  /**
   * Creates a TransformationEngine from a serialized representation
   * (either a JSON object or stringified JSON object).
   *
   * @param {object | string} json   The serialized representation to
   *                                 deserialize into a working engine.
   * @returns {TransformationEngine} A deserialized, ready-to-go engine.
   */
  public static load(json: object | string): TransformationEngine
  {
    const parsedJSON: object = typeof json === 'string' ? TransformationEngine.parseSerializedString(json as string) : json as object;
    const e: TransformationEngine = new TransformationEngine();
    e.dag = GraphLib.json.read(parsedJSON['dag']) as TransformationGraph;
    e.executionOrder = parsedJSON['executionOrder'];
    e.uidField = parsedJSON['uidField'];
    e.uidNode = parsedJSON['uidNode'];
    e.IDToPathMap = Map<number, KeyPath>(parsedJSON['IDToPathMap']);
    e.fieldEnabled = Map<number, boolean>(parsedJSON['fieldEnabled']);
    e.fieldProps = Map<number, object>(parsedJSON['fieldProps']);
    return e;
  }

  /**
   * A helper function to parse a string representation of a
   * `TransformationEngine` into a working, fully-typed engine
   * (stringified JS objects lose all type information, so it
   * must be restored here...).
   *
   * @param {string} s The serialized string to parse into an engine.
   * @returns {object} An intermediate object that undergoes further
   *                   processing in `load` to finish converting
   *                   to a `TransformationEngine`.
   */
  protected static parseSerializedString(s: string): object
  {
    const parsed: object = JSON.parse(s);
    parsed['IDToPathMap'] = parsed['IDToPathMap'].map((v) => [v[0], KeyPath(v[1])]);
    for (let i: number = 0; i < parsed['dag']['nodes'].length; i++)
    {
      const raw: object = parsed['dag']['nodes'][i]['value'];
      parsed['dag']['nodes'][i]['value'] = NodeConstructor.visit(raw['typeCode'], undefined, {
        id: raw['id'],
        fields: raw['fields'],
        meta: raw['meta'],
        deserialize: true,
      });
    }
    return parsed;
  }

  protected dag: TransformationGraph = new GraphLib.Graph({ directed: true }) as TransformationGraph;
  protected executionOrder: number[] = [];
  protected uidField: number = 0;
  protected uidNode: number = 0;
  protected fieldEnabled: Map<number, boolean> = Map<number, boolean>();
  protected fieldProps: Map<number, object> = Map<number, object>();
  protected IDToPathMap: Map<number, KeyPath> = Map<number, KeyPath>();

  /**
   * Constructor for `TransformationEngine`.
   *
   * @param {object} doc An optional example document that, if
   *                     passed, is used to generate initial
   *                     field IDs and mappings
   */
  constructor()
  {

  }

  public debug()
  {
    function pathStr(path: KeyPath)
    {
      if (path === undefined || path.size === 0)
      {
        return '';
      }
      let str = String(path.get(0));
      for (let i = 1; i < path.size; i++)
      {
        str += `.${path.get(i)}`;
      }
      return str;
    }
    let res = '';
    function print(str: string)
    {
      res += str + '\n';
    }
    print('-------------------------------');
    this.dag.nodes().forEach((id: any) =>
    {
      id = Number(id);
      const node = this.dag.node(id);
      print(`NODE ${id}: ${node.typeCode}`);
      let inputs = '';
      node.fields.forEach(({ path }) =>
      {
        inputs += `${pathStr(path)}, `;
      });
      print(`  Inputs: ${inputs}`);
      if (node.meta.newFieldKeyPaths !== undefined)
      {
        let outputs = '';
        node.meta.newFieldKeyPaths.forEach((path) =>
        {
          outputs += `${pathStr(path)}, `;
        });
        print(`  Outputs: ${outputs}`);
      }
      const successors = this.dag.successors(id);
      if (successors !== undefined)
      {
        let edges = '';
        successors.forEach((toId) =>
        {
          edges += `${toId} (${this.dag.edge(id, toId)}), `;
        });
        print(`  Out Edges: ${edges}`);
      }
      else
      {
        print('  No Edges');
      }
    });
    return res;
  }

  public clone(): TransformationEngine
  {
    return TransformationEngine.load(this.toJSON());
  }

  /**
   * Checks whether a provides `TransformationEngine` is equal to the current `TransformationEngine` (`this`).
   * Performs a "deep equals" due to the complex nature of this type.
   *
   * NOTE: This feels rather inefficient and should be optimized in the future if it's used frequently
   *       (for example, if many checks are misses, then consider using a hash code comparison first).
   *       Currently this is only used for testing.
   *
   * @param {TransformationEngine} other The `TransformationEngine` against which to compare
   * @returns {boolean} Whether `this` is the same as `other`
   */
  public equals(other: TransformationEngine): boolean
  {
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON());
  }

  /**
   * This is the method by which one adds transformations to the engine.  Use
   * after adding the relevant fields to the engine.  The transformation is
   * appended to the engine's transformation DAG in the appropriate place.
   *
   * @param {TransformationNodeType} nodeType    The type of transformation to create
   * @param {Immutable.List<KeyPath>} inFields A list of field names (not IDs)
   *                                             on which to apply the new transformation
   * @param {object} options                     Any options for the transformation;
   *                                             different transformation types have
   *                                             various specialized options available
   * @returns {number}                           The ID of the newly-created transformation
   */
  public appendTransformation(nodeType: TransformationNodeType, inFields: List<KeyPath | number>,
    options?: object): number
  {
    // should this create new fields?
    const fields = inFields.map((val) =>
    {
      if (typeof val === 'number')
      {
        return {
          id: val,
          path: this.getFieldPath(val),
        };
      }
      else
      {
        return {
          id: this.getFieldID(val),
          path: val,
        };
      }
    }).toList();

    const nodeId = this.uidNode;
    this.uidNode++;
    const node: TransformationNode = NodeConstructor.visit(nodeType, undefined, {
      id: nodeId,
      fields,
      meta: options,
    });
    this.dag.setNode(nodeId.toString(), node);
    this.executionOrder.push(nodeId);
    node.accept(TransformationCreator, this);

    return nodeId;
  }

  /**
   * Transform a document according to the current engine configuration.
   *
   * @param {object} doc The document to transform.
   * @returns {object}   The transformed document, or possibly errors.
   */
  public transform(doc: object): object
  {
    let output = _.cloneDeep(doc);
    const ordered = this.computeExecutionOrder();
    for (const nodeKey of ordered)
    {
      const node: TransformationNode = this.dag.node(nodeKey);
      const transformationResult = node.accept(ExecutionVisitor, output);
      if (transformationResult.errors !== undefined)
      {
        transformationResult.errors.forEach((error: TransformationVisitError) =>
        {
          // winston.error(`\t -${error.message}`);
        });
      }
      const document = transformationResult.document;
      output = document;
    }
    // Exclude disabled fields (must do this as a postprocess, because e.g. join node)
    this.fieldEnabled.map((enabled: boolean, fieldID: number) =>
    {
      if (!enabled)
      {
        yadeep.remove(output, this.getFieldPath(fieldID));
      }
    });
    return output;
  }

  /**
   * Converts the current engine to an equivalent JSON representation.
   *
   * @returns {object} A JSON representation of `this`.
   */
  public toJSON(): object
  {
    // Note: dealing with a lot of Immutable data structures so some
    // slightly verbose syntax is required to convert to plain JS arrays
    return {
      dag: GraphLib.json.write(this.dag),
      executionOrder: this.executionOrder,
      uidField: this.uidField,
      uidNode: this.uidNode,
      IDToPathMap: this.IDToPathMap.map((v: KeyPath, k: number) => [k, v]).toArray(),
      fieldEnabled: this.fieldEnabled.map((v: boolean, k: number) => [k, v]).toArray(),
      fieldProps: this.fieldProps.map((v: object, k: number) => [k, v]).toArray(),
    };
  }

  /**
   * Register a field with the current engine.  This enables adding
   * transformations to the field. If the field already exists, returns
   * the associated id.
   *
   * @param {KeyPath} fullKeyPath The path of the field to add
   * @param {object} options      Any field options (e.g., Elastic analyzers)
   * @returns {number}            The ID of the newly-added field
   */
  public addField(fullKeyPath: KeyPath, options: object = {}, sourceNode?: number): number
  {
    if (this.getFieldID(fullKeyPath) !== undefined)
    {
      throw new Error('Field already exists');
    }

    const id = this.uidField;
    this.uidField++;

    this.IDToPathMap = this.IDToPathMap.set(id, fullKeyPath);
    this.fieldEnabled = this.fieldEnabled.set(id, true);
    this.fieldProps = this.fieldProps.set(id, options);
    const identityId = this.addIdentity(id, sourceNode, sourceNode !== undefined ? 'Synthetic' : undefined);

    return id;
  }

  // todo make this respect the dag
  public deleteField(id: number): void
  {
    // Order matters!  Must do this first, else getTransformations can't work because
    // it relies on the entry in fieldNameToIDMap.
    this.getTransformations(id).forEach((t: number) => this.deleteTransformation(t));
    this.IDToPathMap = this.IDToPathMap.delete(id);
    this.fieldProps = this.fieldProps.delete(id);
    this.fieldEnabled = this.fieldEnabled.delete(id);
  }

  /**
   * Get the IDs of all transformations that act on a given field.
   *
   * @param {KeyPath | number} field   The field whose associated transformations should be identified
   * @returns {Immutable.List<number>} A list of the associated transformations, sorted properly
   */
  public getTransformations(field: number): List<number>
  {
    // Note: This function is O(n) in number of nodes.  Future work
    // could be adding a map e.g. (field ID => List<transformation ID>)
    // to make this function O(1), if it's ever a performance issue.
    const nodes: TransformationNode[] = [];
    _.each(this.dag.nodes(), (node) =>
    {
      if ((this.dag.node(node) as TransformationNode).fields.findIndex((f) => f.id === field) !== -1)
      {
        nodes.push(this.dag.node(node) as TransformationNode);
      }
    });
    // Need to order nodes...
    const allSorted = GraphLib.alg.topsort(this.dag);
    let nodesSorted: List<number> = List<number>();
    for (let i: number = 0; i < allSorted.length; i++)
    {
      if (nodes.includes(this.dag.node(allSorted[i])))
      {
        nodesSorted = nodesSorted.push(parseInt(allSorted[i], 10));
      }
    }
    return nodesSorted;
  }

  /**
   * Returns the actual `TransformationNode` with the specified ID.
   *
   * @param {number} transformationID          ID of the node to retrieve
   * @returns {TransformationNode | undefined} The retrieved node (or undefined if not found)
   */
  public getTransformationInfo(transformationID: number): TransformationNode | undefined
  {
    if (!this.dag.nodes().includes(transformationID.toString()))
    {
      return undefined;
    }
    return this.dag.node(transformationID.toString()) as TransformationNode;
  }

  /**
   * This method allows editing of any/all transformation node properties.
   *
   * @param {number} transformationID Which transformation to update
   * @param {Immutable.List<KeyPath>} fieldNames New field names
   * @param {object} options New options
   */
  public editTransformation(transformationID: number, options?: object): void
  {
    if (!this.dag.nodes().includes(transformationID.toString()))
    {
      return;
    }

    if (options !== undefined)
    {
      (this.dag.node(transformationID.toString()) as TransformationNode).meta = options;
    }
  }

  /**
   * Delete a transformation from the engine/DAG.
   *
   * @param {number} transformationID Which transformation to delete.
   */
  public deleteTransformation(transformationID: number): void
  {
    const inEdges: void | GraphLib.Edge[] = this.dag.inEdges(transformationID.toString());
    const outEdges: void | GraphLib.Edge[] = this.dag.outEdges(transformationID.toString());

    if (typeof inEdges !== 'undefined' && typeof outEdges !== 'undefined')
    {
      if (inEdges.length === 1 && outEdges.length === 1)
      {
        // re-link in node with out node
        this.dag.setEdge(inEdges[0].v, outEdges[0].w);
      } // else not supported yet
    }

    this.dag.removeNode(transformationID.toString());
  }

  public getFieldPath(fieldID: number): KeyPath
  {
    return this.IDToPathMap.get(fieldID);
  }

  public getFieldID(path: KeyPath): number
  {
    return this.IDToPathMap.keyOf(path);
  }

  public renameField(fieldID: number, newPath: KeyPath): number
  {
    const oldPath = this.getFieldPath(fieldID);
    if (oldPath.equals(newPath))
    {
      return null; // invalid
    }

    return this.appendTransformation(
      TransformationNodeType.RenameNode,
      List([fieldID]),
      { newFieldKeyPaths: List([newPath]) },
    );
  }

  public getFieldEnabled(fieldID: number): boolean
  {
    return this.fieldEnabled.get(fieldID) === true;
  }

  public getFieldProp(fieldID: number, prop: KeyPath): any
  {
    return yadeep.get(this.fieldProps.get(fieldID), prop);
  }

  public getFieldProps(fieldID: number): object
  {
    return this.fieldProps.get(fieldID);
  }

  public setFieldProps(fieldID: number, props: object): void
  {
    this.fieldProps = this.fieldProps.set(fieldID, props);
  }

  public setFieldProp(fieldID: number, prop: KeyPath, value: any): void
  {
    const newProps: object = this.fieldProps.get(fieldID);
    yadeep.set(newProps, prop, value, { create: true });
    this.fieldProps = this.fieldProps.set(fieldID, newProps);
  }

  public getAllFieldIDs(includeDead = false): List<number>
  {
    const filtered = includeDead ?
      this.IDToPathMap
      :
      this.IDToPathMap.filter((kp, id) => !this.isDead(kp));
    return filtered.keySeq().toList();
  }

  public isDead(kp: KeyPath): boolean
  {
    return kp.size === 1 && kp.get(0) === null;
  }

  public enableField(fieldID: number): void
  {
    this.fieldEnabled = this.fieldEnabled.set(fieldID, true);
  }

  public disableField(fieldID: number): void
  {
    this.fieldEnabled = this.fieldEnabled.set(fieldID, false);
  }

  public createTree(): Map<number, List<number>>
  {
    const ids = this.getAllFieldIDs();
    // sort the paths to ensure we visit parents before children
    const sortedIds = ids.sort((a, b) => this.getFieldPath(a).size - this.getFieldPath(b).size);

    const enginePathToField: {
      [kp: string]: List<number>,
    } = {};

    sortedIds.forEach((id, index) =>
    {
      const enginePath = this.getFieldPath(id).toJS();
      if (enginePath.length === 0)
      {
        return;
      }
      const parentPath = enginePath.slice(0, -1);
      const parentHash = JSON.stringify(parentPath);
      const parentField: List<number> = enginePathToField[parentHash];
      const newField = List([]);

      if (parentField != null)
      {
        enginePathToField[parentHash] = parentField.push(id);
      }
      enginePathToField[JSON.stringify(enginePath)] = newField;
    });

    const fieldMap: { [k: number]: List<number> } = {};
    sortedIds.forEach((id, index) =>
    {
      const enginePath = this.getFieldPath(id).toJS();
      const field = enginePathToField[JSON.stringify(enginePath)];
      if (field != null)
      {
        fieldMap[id] = field;
      }
    });
    return Map<number, List<number>>(fieldMap)
      .mapKeys((key) => Number(key))
      .toMap();
  }

  protected setFieldPath(fieldID: number, path: KeyPath)
  {
    this.IDToPathMap = this.IDToPathMap.set(fieldID, path);
  }

  /*
   *  Add Identity Node to a newly added field (or a renamed field)
   */
  protected addIdentity(fieldId: number, sourceNode?: number, idType?: 'Removal' | 'Rename' | 'Synthetic'): number
  {
    let type;
    if (sourceNode !== undefined && idType !== undefined)
    {
      type = idType;
    }
    else
    {
      type = 'Organic';
    }
    const options: NodeOptionsType<TransformationNodeType.IdentityNode> = {
      type,
    };
    const identityId = this.appendTransformation(TransformationNodeType.IdentityNode, List([fieldId]), options);
    if (sourceNode !== undefined)
    {
      this.dag.setEdge(String(sourceNode), String(identityId), EdgeTypes.Synthetic);
    }
    return identityId;
  }

  protected killField(fieldID: number, killedByNode: number): number
  {
    return this.addIdentity(fieldID, killedByNode, 'Removal');
  }

  /*
   *  Returns nodes in the order they should be executed
   *
   *  Custom topological sort that also makes sure that edges are sorted in this order:
   *  - Synthetic
   *  - Rename
   *  - Same
   *  - Removal
   *  Note that any node should only have ever 1 inbound and 1 outbound Rename, Same, or Removal edge.
   */
  protected computeExecutionOrder(): string[]
  {
    // copy the dag
    const dag = GraphLib.json.read(GraphLib.json.write(this.dag)) as TransformationGraph;

    for (let i = 1; i < this.executionOrder.length; i++)
    {
      dag.setEdge(String(this.executionOrder[i - 1]), String(this.executionOrder[i]), 'DUMMY' as any);
    }

    // iterate through all rename, same, and removal edges (v, w). For each node v whose synthetic edges are
    // [v, w_synth], create a "helper" edge from w_synth to w. This ensures a topological dependency that enforces that
    // the synthetic nodes w_synth are visited before w.

    for (const edge of dag.edges())
    {
      const label = dag.edge(edge);
      if (label !== EdgeTypes.Synthetic && label !== 'DUMMY' as any)
      {
        const { v, w } = edge;
        const synthSuccessors = dag.successors(v).filter((wTest) => dag.edge(v, wTest) === EdgeTypes.Synthetic);
        for (const wSynth of synthSuccessors)
        {
          if (dag.edge(wSynth, w) === undefined)
          {
            dag.setEdge(wSynth, w, 'DUMMY' as any);
          }
        }
      }
    }

    if (!GraphLib.alg.isAcyclic(dag))
    {
      throw new Error('Could not perform topological sort: Graph is Cyclic');
    }

    const order = GraphLib.alg.topsort(dag)
      .filter((id) => dag.node(id).typeCode !== TransformationNodeType.IdentityNode);
    return order;

  }
}
