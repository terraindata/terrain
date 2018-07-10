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
// copied and modified from the DefinitelyTyped Github (maybe do a pull request? :)

import * as GraphLib from 'graphlib';
import TransformationNode from 'shared/transformations/TransformationNode';
import { TransformationEdgeTypes } from './TransformationNodeType';

export interface Edge
{
  v: string;
  w: string;
  /** The name that uniquely identifies a multi-edge. */
  name?: string;
}

export interface TypedGraph<V = any, E = any> extends GraphLib.Graph
{
  /**
   * Creates or updates the value for the node v in the graph. If label is supplied
   * it is set as the value for the node. If label is not supplied and the node was
   * created by this call then the default node label will be assigned. Returns the
   * graph, allowing this to be chained with other functions. Takes O(1) time.
   */
  setNode(name: string, label?: V): TypedGraph<V, E>;

  hasNode(name: string): boolean;

  /**
   * Remove the node with the id v in the graph or do nothing if the node is not in
   * the graph. If the node was removed this function also removes any incident
   * edges. Returns the graph, allowing this to be chained with other functions.
   * Takes O(|E|) time.
   */
  removeNode(name: string): TypedGraph<V, E>;

  nodes(): string[];

  /** Returns the label for this node. */
  node(name: string): V;

  /**
   * Creates or updates the label for the edge (v, w) with the optionally supplied
   * name. If label is supplied it is set as the value for the edge. If label is not
   * supplied and the edge was created by this call then the default edge label will
   * be assigned. The name parameter is only useful with multigraphs. Returns the
   * graph, allowing this to be chained with other functions. Takes O(1) time.
   */
  setEdge(v: string, w: string, label?: E): TypedGraph<V, E>;
  setEdge(edge: Edge, label?: E): TypedGraph<V, E>;

  edges(): Edge[];

  /** Returns the label for this edge. */
  edge(v: string, w: string): E;
  edge(edge: Edge): E;

  /**
   * Return all edges that point to the node v. Optionally filters those edges down to just those
   * coming from node u. Behavior is undefined for undirected graphs - use nodeEdges instead.
   * Returns undefined if node v is not in the graph. Takes O(|E|) time.
   */
  inEdges(v: string, u?: string): Edge[] | void;

  /**
   * Return all edges that are pointed at by node v. Optionally filters those edges down to just
   * those point to w. Behavior is undefined for undirected graphs - use nodeEdges instead.
   * Returns undefined if node v is not in the graph. Takes O(|E|) time.
   */
  outEdges(v: string, w?: string): Edge[] | void;

  /**
   * Returns all edges to or from node v regardless of direction. Optionally filters those edges
   * down to just those between nodes v and w regardless of direction. Returns undefined if node v
   * is not in the graph. Takes O(|E|) time.
   */
  nodeEdges(v: string, w?: string): Edge[] | void;

  /**
   * Return all nodes that are predecessors of the specified node or undefined if node v is not in
   * the graph. Behavior is undefined for undirected graphs - use neighbors instead. Takes O(|V|)
   * time.
   */
  predecessors(node: string): string[] | void;

  /**
   * Return all nodes that are successors of the specified node or undefined if node v is not in
   * the graph. Behavior is undefined for undirected graphs - use neighbors instead. Takes O(|V|)
   * time.
   */
  successors(node: string): string[] | void;

  /**
   * Return all nodes that are predecessors or successors of the specified node or undefined if
   * node v is not in the graph. Takes O(|V|) time.
   */
  neighbors(node: string): string[] | void;

  isDirected(): boolean;
  isMultigraph(): boolean;
  isCompound(): boolean;

  /** Sets the label for the graph to label. */
  setGraph(label: string): TypedGraph<V, E>;

  /**
   * Returns the currently assigned label for the graph. If no label has been assigned,
   * returns undefined.
   */
  graph(): string | void;

  /**
   * Returns the number of nodes in the graph.
   */
  nodeCount(): number;

  /**
   * Returns the number of edges in the graph.
   */
  edgeCount(): number;

  /** Returns those nodes in the graph that have no in-edges. Takes O(|V|) time. */
  sources(): string[];

  /** Returns those nodes in the graph that have no out-edges. Takes O(|V|) time. */
  sinks(): string[];
}

export type TransformationGraph = TypedGraph<TransformationNode, TransformationEdgeTypes>;
