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

import { FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { TemplateField } from 'etl/templates/FieldTypes';
import { updateFieldFromEngine } from 'etl/templates/SyncUtil';
import { ETLTemplate, SinksMap, SourcesMap } from 'etl/templates/TemplateTypes';
import { Sinks, Sources } from 'shared/etl/types/EndpointTypes';
import { FieldTypes, Languages } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import TransformationNodeType from 'shared/transformations/TransformationNodeType';
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
} from 'etl/templates/ETLProcess';
import { NodeTypes } from 'shared/etl/types/ETLTypes';

export type Mutator<T> = (newItem: T) => void;

export class TemplateProxy
{
  private cacheTemplate: boolean;

  constructor(
    private _template: (() => ETLTemplate) | ETLTemplate,
    private onMutate: Mutator<ETLTemplate> = doNothing,
  )
  {
    this.cacheTemplate = typeof _template !== 'function';
  }

  public getTemplate()
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

  public addSource(key: string, source: SourceConfig): number
  {
    this.sources = this.sources.set(key, source);
    const sourceNode = _ETLNode({
      endpoint: key,
      type: NodeTypes.Source,
    });
    return this.createNode(sourceNode);
  }

  public addSink(key: string, sink: SinkConfig): number
  {
    this.sinks = this.sinks.set(key, sink);
    const sinkNode = _ETLNode({
      endpoint: key,
      type: NodeTypes.Sink,
    });
    return this.createNode(sinkNode);
  }

  public addMerge(leftId: number, rightId: number, leftJoinKey: string, rightJoinKey: string, outputKey: string): number
  {
    const mergeNode = _ETLNode({
      type: NodeTypes.MergeJoin,
      options: _MergeJoinOptions({
        leftId,
        rightId,
        leftJoinKey,
        rightJoinKey,
        outputKey,
      }),
    });
    return this.createNode(mergeNode);
  }

  public deleteSource(key: string)
  {
    this.sources = this.sources.delete(key);
    const nodeToDelete: number = this.template.findNodes(
      (node) => node.type === NodeTypes.Source && node.endpoint === key,
    ).first();
    this.nodes = this.nodes.delete(nodeToDelete);
  }

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

  public setEdgeTransformations(edgeId: number, transformations: TransformationEngine)
  {
    this.edges = this.edges.update(edgeId, (edge) => edge.set('transformations', transformations));
  }

  public setEdgeTo(edgeId: number, toNode: number)
  {
    this.edges = this.edges.update(edgeId, (edge) => edge.set('to', toNode));
  }

  public splitEdge(edgeId: number)
  {
    // TODO
  }

  private createNode(node: ETLNode): number
  {
    const id = this.process.uidNode;
    this.nodes = this.nodes.set(id, node);
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
    this.edges = this.edges.set(id, edge);
    this.process = this.process.set('uidEdge', id + 1);
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
    if (this.cacheTemplate)
    {
      return this._template as ETLTemplate;
    }
    else
    {
      return (this._template as () => ETLTemplate)();
    }
  }

  private set template(val: ETLTemplate)
  {
    if (this.cacheTemplate)
    {
      this._template = val;
    }
    else
    {
      this.onMutate(val);
    }
  }
}

const doNothing = () => null;
