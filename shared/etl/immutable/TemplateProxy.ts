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

import { FileConfig, SinkConfig, SourceConfig } from 'shared/etl/immutable/EndpointRecords';
import { _ReorderableSet, ReorderableSet } from 'shared/etl/immutable/ReorderableSet';
import { ETLTemplate, SinksMap, SourcesMap } from 'shared/etl/immutable/TemplateRecords';
import LanguageController from 'shared/etl/languages/LanguageControllers';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
import EngineUtil from 'shared/transformations/util/EngineUtil';
import { KeyPath as EnginePath, WayPoint } from 'shared/util/KeyPath';

import
{
  _ETLEdge,
  _ETLNode,
  _ETLProcess,
  _MergeJoinOptions,
  ETLEdge,
  ETLNode,
  ETLProcess,
  MergeJoinOptions,
} from 'shared/etl/immutable/ETLProcessRecords';
import { FileTypes, NodeTypes } from 'shared/etl/types/ETLTypes';

export type Mutator<T> = (newItem: T) => void;

export class TemplateProxy
{
  constructor(
    private _template: (() => ETLTemplate),
    private onMutate: Mutator<ETLTemplate> = doNothing,
    private logProgress?: (log: string) => Promise<void>,
  )
  {

  }

  public value()
  {
    return this.template;
  }

  public setSource(key: string, source: SourceConfig)
  {
    this.sources = this.sources.set(key, source);
  }

  public setSink(key: string, sink: SinkConfig)
  {
    this.sinks = this.sinks.set(key, sink);
  }

  public addSource(source: SourceConfig): { sourceKey: string, nodeId: number }
  {
    const key = this.newSourceId();
    this.sources = this.sources.set(key, source);
    const sourceNode = _ETLNode({
      endpoint: key,
      type: NodeTypes.Source,
    });
    const nodeId = this.createNode(sourceNode);
    return { sourceKey: key, nodeId };
  }

  // adds a sink and a node for the sink
  public addSink(sink: SinkConfig): { sinkKey: string, nodeId }
  {
    const key = this.newSinkId();
    this.sinks = this.sinks.set(key, sink);
    const sinkNode = _ETLNode({
      endpoint: key,
      type: NodeTypes.Sink,
    });
    const nodeId = this.createNode(sinkNode);
    return { sinkKey: key, nodeId };
  }

  public createMergeJoin(
    leftEdgeId: number,
    rightEdgeId: number,
    options: {
      leftJoinKey: string,
      rightJoinKey: string,
      outputKey: string,
    },
  )
  {
    const leftEdge = this.template.getEdge(leftEdgeId);
    const rightEdge = this.template.getEdge(rightEdgeId);

    const mergeNode = _ETLNode({
      type: NodeTypes.MergeJoin,
      options: _MergeJoinOptions({
        leftId: leftEdge.from,
        rightId: rightEdge.from,
        leftJoinKey: options.leftJoinKey,
        rightJoinKey: options.rightJoinKey,
        outputKey: options.outputKey,
      }),
    });
    const mergeNodeId = this.createNode(mergeNode);

    this.setEdgeTo(leftEdgeId, mergeNodeId);
    this.setEdgeTo(rightEdgeId, mergeNodeId);

    const newEdgeId = this.addEdge(mergeNodeId, leftEdge.to);
    const newEngine = EngineUtil.mergeJoinEngines(
      leftEdge.transformations,
      rightEdge.transformations,
      options.outputKey,
    );
    this.setEdgeTransformations(newEdgeId, newEngine);
    // this.performTypeDetection(newEdgeId);
  }

  // delete a source and its node
  public deleteSource(key: string)
  {
    this.sources = this.sources.delete(key);
    const nodeToDelete: number = this.template.findNodes(
      (node) => node.type === NodeTypes.Source && node.endpoint === key,
    ).first();
    this.nodes = this.nodes.delete(nodeToDelete);
  }

  // delete a sink and its node
  public deleteSink(key: string)
  {
    this.sinks = this.sinks.delete(key);
    const nodeToDelete: number = this.template.findNodes(
      (node) => node.type === NodeTypes.Sink && node.endpoint === key,
    ).first();
    this.nodes = this.nodes.delete(nodeToDelete);
  }

  public addEdge(from: number, to: number, engine: TransformationEngine = new TransformationEngine())
  {
    const edge = _ETLEdge({
      from,
      to,
      transformations: engine,
    });
    return this.createEdge(edge);
  }

  public async createInitialEdgeEngine(edgeId: number, documents: List<object>)
  {
    const { engine, warnings, softWarnings } = EngineUtil.createEngineFromDocuments(documents);
    let castStringsToPrimitives = false;
    const fromNode = this.template.getNode(this.template.getEdge(edgeId).from);
    if (fromNode.type === NodeTypes.Source)
    {
      const source = this.template.getSource(fromNode.endpoint);
      if (
        source.fileConfig.fileType === FileTypes.Csv
        || source.fileConfig.fileType === FileTypes.Tsv
        || source.fileConfig.fileType === FileTypes.Xml
      )
      {
        castStringsToPrimitives = true;
      }
    }
    this.setEdgeTransformations(edgeId, engine);
    await this.performTypeDetection(edgeId,
      {
        documents,
        castStringsToPrimitives,
      });
    this.cleanFieldOrdering(edgeId);
    return { warnings, softWarnings };
  }

  public setEdgeTransformations(edgeId: number, transformations: TransformationEngine)
  {
    this.edges = this.edges.update(edgeId, (edge) => edge.set('transformations', transformations));
  }

  public setEdgeTo(edgeId: number, toNode: number)
  {
    this.edges = this.edges.update(edgeId, (edge) => edge.set('to', toNode));
  }

  public setFieldOrdering(edgeId: number, order: ReorderableSet<number>)
  {
    const newOrdering = this.template.uiData.engineFieldOrders.set(edgeId, order);
    this.template = this.template.setIn(['uiData', 'engineFieldOrders'], newOrdering);
  }

  public getFieldOrdering(edgeId: number): ReorderableSet<number>
  {
    return this.template.getFieldOrdering(edgeId);
  }

  public cleanFieldOrdering(edgeId: number)
  {
    const engine = this.template.getTransformationEngine(edgeId);
    let order = this.getFieldOrdering(edgeId);

    if (order === undefined)
    {
      order = _ReorderableSet();
    }

    order = order.bulkAdd(engine.getAllFieldIDs());
    order = order.intersect(engine.getAllFieldIDs().toSet());
    this.setFieldOrdering(edgeId, order);

    const toNode = this.template.getNode(this.template.getEdge(edgeId).to);
    if (toNode !== undefined)
    {
      if (toNode.type === NodeTypes.Sink)
      {
        this.setSinkFieldOrdering(toNode.endpoint);
      }
    }
  }

  public setSinkFieldOrdering(key: string)
  {
    const nodes = this.template.findNodes((n) => n.type === NodeTypes.Sink && n.endpoint === key);
    if (nodes.size === 0)
    {
      throw new Error(`No node corresponds to sink ${key}`);
    }
    const nodeId = nodes.get(0);
    const edges = this.template.findEdges((e) => e.to === nodeId);
    if (edges.size === 0)
    {
      return;
    }
    const edgeId = edges.get(0);
    const order = this.getFieldOrdering(edgeId);
    const engine = this.template.getEdge(edgeId).transformations;
    let sink = this.template.getSink(key);
    if (sink === undefined)
    {
      throw new Error(`No sink exists with key ${key}`);
    }
    const rootNames = order.ordering
      .filter((id) => engine.getOutputKeyPath(id).size === 1 && engine.getFieldEnabled(id))
      .map((id) => engine.getOutputKeyPath(id).last());
    sink = sink.setIn(['fileConfig', 'fieldOrdering'], rootNames.toArray());
    this.setSink(key, sink);
  }

  // Add automatic type casts to fields, and apply language specific type checking
  // if documentConfig is provided, do additional type checking / inference
  private async performTypeDetection(
    edgeId: number,
    documentConfig?: {
      documents: List<object>,
      castStringsToPrimitives?: boolean,
    },
  )
  {
    const engine = this.template.getTransformationEngine(edgeId);

    await this.log('Performing Type Detection');
    EngineUtil.interpretETLTypes(engine, documentConfig);
    EngineUtil.addInitialTypeCasts(engine);
  }

  private createNode(node: ETLNode): number
  {
    const id = this.process.uidNode;
    this.nodes = this.nodes.set(id, node.set('id', id));
    this.process = this.process.set('uidNode', id + 1);
    return id;
  }

  // adds an edge to the process. returns -1 if the edge is invalid
  private createEdge(edge: ETLEdge): number
  {
    if (!this.verifyEdge(edge))
    {
      return -1;
    }
    const id = this.process.uidEdge;
    this.edges = this.edges.set(id, edge.set('id', id));
    this.process = this.process.set('uidEdge', id + 1);
    this.setFieldOrdering(id, _ReorderableSet<number>());
    return id;
  }

  private verifyEdge(edge: ETLEdge): boolean
  {
    const { from, to } = edge;
    if (from === to)
    {
      return false;
    }
    if (this.nodes.hasIn([from]) && this.nodes.get(from).type === NodeTypes.Sink)
    {
      return false;
    }
    if (this.process.nodes.hasIn([to]) && this.nodes.get(to).type === NodeTypes.Source)
    {
      return false;
    }
    return true;
  }

  private newSourceId(): string
  {
    if (this.sources.size === 0)
    {
      return '_default';
    }
    else
    {
      return this.randomId();
    }
  }

  private newSinkId(): string
  {
    if (this.sinks.size === 0)
    {
      return '_default';
    }
    else
    {
      return this.randomId();
    }
  }

  private randomId(): string
  {
    return Math.random().toString(36).substring(2);
  }

  private get process()
  {
    return this.template.process;
  }

  private set process(val: ETLProcess)
  {
    this.template = this.template.set('process', val);
  }

  private get nodes(): Immutable.Map<number, ETLNode>
  {
    return this.process.nodes;
  }

  private set nodes(val: Immutable.Map<number, ETLNode>)
  {
    this.process = this.process.set('nodes', val);
  }

  private get edges(): Immutable.Map<number, ETLEdge>
  {
    return this.process.edges;
  }

  private set edges(val: Immutable.Map<number, ETLEdge>)
  {
    this.process = this.process.set('edges', val);
  }

  private get sinks()
  {
    return this.template.getSinks();
  }

  private set sinks(val: SinksMap)
  {
    this.template = this.template.set('sinks', val);
  }

  private get sources()
  {
    return this.template.getSources();
  }

  private set sources(val: SourcesMap)
  {
    this.template = this.template.set('sources', val);
  }

  private get template()
  {
    return this._template();
  }

  private set template(val: ETLTemplate)
  {
    this.onMutate(val);
  }

  private async log(log: string): Promise<void>
  {
    if (this.logProgress === undefined)
    {
      return await new Promise<void>((resolve) => resolve());
    }
    else
    {
      return await this.logProgress(log);
    }
  }
}

const doNothing = () => null;
