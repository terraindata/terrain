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
// tslint:disable no-unused-expression
import { List } from 'immutable';
import { DateFormats } from 'shared/etl/types/ETLTypes';
import { KeyPath } from 'shared/util/KeyPath';

enum TransformationNodeType
{
  SplitNode = 'SplitNode',
  JoinNode = 'JoinNode',
  RenameNode = 'RenameNode',
  DuplicateNode = 'DuplicateNode',
  InsertNode = 'InsertNode',
  CaseNode = 'CaseNode',
  SubstringNode = 'SubstringNode',
  CastNode = 'CastNode',
  HashNode = 'HashNode',
  RoundNode = 'RoundNode',
  AddNode = 'AddNode',
  SubtractNode = 'SubtractNode',
  MultiplyNode = 'MultiplyNode',
  DivideNode = 'DivideNode',
  SetIfNode = 'SetIfNode',
  FindReplaceNode = 'FindReplaceNode',
  ArraySumNode = 'ArraySumNode',
  ArrayCountNode = 'ArrayCountNode',
  ProductNode = 'ProductNode',
  QuotientNode = 'QuotientNode',
  SumNode = 'SumNode',
  DifferenceNode = 'DifferenceNode',
  EncryptNode = 'EncryptNode',
  DecryptNode = 'DecryptNode',
  GroupByNode = 'GroupByNode',
  FilterArrayNode = 'FilterArrayNode',
  RemoveDuplicatesNode = 'RemoveDuplicatesNode',
  ZipcodeNode = 'ZipcodeNode',
}

// if this has errors, double check TransformationNodeType's keys are equal to its values
type AssertEnumValuesEqualKeys = {
  [K in keyof typeof TransformationNodeType]: K
};
// noinspection BadExpressionStatementJS
TransformationNodeType as AssertEnumValuesEqualKeys;

// if this has errors, double check TransformationOptionTypes has a key for every TransformationNodeType
// noinspection JSUnusedLocalSymbols
type AssertOptionTypesExhaustive = {
  [K in TransformationNodeType]: TransformationOptionTypes[K];
};

export interface CommonTransformationOptions
{
  newFieldKeyPaths?: List<KeyPath>;
}

interface TransformationOptionTypes
{
  SplitNode: {
    newFieldKeyPaths: List<KeyPath>;
    preserveOldFields: boolean;
    delimiter: string | number;
    regex: boolean;
  };
  JoinNode: {
    newFieldKeyPaths: List<KeyPath>;
    preserveOldFields: boolean;
    delimiter: string;
  };
  RenameNode: {
    newFieldKeyPaths: List<KeyPath>;
  };
  // FilterNode: any;
  DuplicateNode: {
    newFieldKeyPaths: List<KeyPath>;
  };
  InsertNode: {
    at?: number;
    value: string;
  };
  CaseNode: {
    format: string;
  };
  SubstringNode: {
    from: number;
    length: number;
  };
  CastNode: {
    toTypename: string;
    format?: DateFormats;
  };
  HashNode: {
    salt: string;
  };
  RoundNode: {
    precision: number;
  };
  AddNode: {
    shift: number;
  };
  SubtractNode: {
    shift: number;
  };
  MultiplyNode: {
    factor: number;
  };
  DivideNode: {
    factor: number;
  };
  SetIfNode: {
    filterNull?: boolean;
    filterNaN?: boolean;
    filterStringNull?: boolean;
    filterUndefined?: boolean;
    filterValue?: any | undefined;
    invert?: boolean;
    newValue: any;
  };
  FindReplaceNode: {
    find: string;
    replace: string;
    regex: boolean;
  };
  ArraySumNode: {
    newFieldKeyPaths: List<KeyPath>;
  };
  ArrayCountNode: {
    newFieldKeyPaths: List<KeyPath>;
  };
  ProductNode: {
    newFieldKeyPaths: List<KeyPath>;
  };
  QuotientNode: {
    newFieldKeyPaths: List<KeyPath>;
  };
  SumNode: {
    newFieldKeyPaths: List<KeyPath>;
  };
  DifferenceNode: {
    newFieldKeyPaths: List<KeyPath>;
  };
  EncryptNode: {
  };
  DecryptNode: {
  };
  GroupByNode: {
    newFieldKeyPaths: List<KeyPath>;
    subkey: string;
    groupValues: any[];
  };
  FilterArrayNode: {
    filterNull: boolean;
    filterUndefined: boolean;
  };
  RemoveDuplicatesNode: {
  };
  ZipcodeNode: {
    format: string;
  };
}

export type NodeTypes = keyof TransformationOptionTypes;
export type NodeOptionsType<key extends NodeTypes> = TransformationOptionTypes[key] & CommonTransformationOptions;

/*
 *  For each edge (u, v) whose nodes operate on fields u and v (u and v could be multiple fields),
 *  the Edge Labels mean the following:
 *  Synthesis
 *    - fields v1, v2... are synthetic and depend on u1, u2...
 *    - Forks, Combines, Aggregations and Duplicate create these edges
  *  InPlace
 *    - v and u are the same field and have no structural differences
 *    - Simple Transformations fall into this category
 *  Restructure
 *    - v and u are the same field but may have different types
 *    - so far, only Cast Transformation
 *  Rename
 *    - v and u are the same field but have different locations
 *    - so far, only rename node falls into this category
 *
 *  Restructure and Rename only have 1 associated transformation,
 *  but they're special enough cases they should have their own type.
 *
 *  Generally, InPlace transformations can be freely edited, deleted, or created.
 *  When we append transformations to the DAG for some field f, we should find the source node
 *  associated with f (there should only be one). Provided we construct the DAG properly, every node
 *  in the DAG should only ever have 1 non-synthetic edge. We can then traverse from f down all non-synthetic edges
 *  until we reach a sink. We can then append the transformation node to this sink node and label it
 *  with the appropriate label. If there are multiple input fields we do this for all input fields.
 *
 *  If a transformation would create a new field, we add a synthetic identity node, which gets connected to all
 *  associated input fields.
 *
 *  When adding new fields we can easily identify if it should be synthetic or organic by finding an ancestor of the field
 *  and analyzing the graph. For example, when adding [foo, bar, -1, baz], we check if [foo, bar, -1] exists.
 *  If not, we check [foo, bar] and so on. For the existing ancestor, based on the source node and the edge labels we can
 *  determine if the new field should be synthetic or not.
 *
 *  Traversing the DAG to get the execution order should be simple.
 *  We do a topological sort of the DAG and execute them in order.
 */
export enum TransformationEdgeTypes
{
  Synthesis = 'Synthesis',
  InPlace = 'InPlace',
  Restructure = 'Restructure',
  Rename = 'Rename',
}

export default TransformationNodeType;
