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
  FilterNode = 'FilterNode',
  DuplicateNode = 'DuplicateNode',
  InsertNode = 'InsertNode',
  UppercaseNode = 'UppercaseNode',
  SubstringNode = 'SubstringNode',
  CastNode = 'CastNode',
  HashNode = 'HashNode',
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
  [K in TransformationNodeType]: TransformationOptionTypes[K]
};

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
  FilterNode: any;
  DuplicateNode: {
    newFieldKeyPaths: List<KeyPath>;
  };
  InsertNode: {
    at?: number;
    value: string | KeyPath;
  };
  UppercaseNode: {
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
    filterNull: boolean;
    filterNaN: boolean;
    filterStringNull: boolean;
    filterUndefined: boolean;
    filterValue: any | undefined;
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
  ZipcodeNode: {
    format: string;
  };
}

export type NodeTypes = keyof TransformationOptionTypes;
export type NodeOptionsType<key extends NodeTypes> = TransformationOptionTypes[key];

export default TransformationNodeType;
