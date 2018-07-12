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
import * as _ from 'lodash';

import { TemplateVersion } from 'shared/etl/migrations/TemplateVersions';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';
import { SinkConfig, SourceConfig } from './EndpointTypes';

import * as Immutable from 'immutable';
const { List, Map } = Immutable;

// languages and filetypes don't follow the same capitalization conventions because of legacy reasons (?)
export enum Languages
{
  Elastic = 'elastic',
  JavaScript = 'JavaScript',
}

export enum FileTypes
{
  Json = 'json',
  Csv = 'csv',
  Tsv = 'tsv',
  Xlsx = 'xlsx',
  Xml = 'xml',
}

export interface TemplateBase
{
  id?: number;
  createdAt: any;
  lastModified: any;
  archived: boolean;
  templateName: string;
  sources: any;
  sinks: any;
  process: any;
  settings: any;
  meta: TemplateMeta;
  uiData: any;
}

export interface TemplateSettings
{
  abortThreshold?: number;
}

// currently unused
export interface TemplateMeta
{
  version: TemplateVersion;
}

export type TemplateObject = {
  [k in keyof TemplateBase]: any;
};

type JSTypes = 'array' | 'object' | 'string' | 'number' | 'boolean';

export enum FieldTypes
{
  Array = 'Array',
  Object = 'Object',
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',
  Date = 'Date',
  Integer = 'Integer',
  GeoPoint = 'GeoPoint',
}

// Displayed in the order they appear
export const etlFieldTypesList = List([
  FieldTypes.String,
  FieldTypes.Number,
  FieldTypes.Integer,
  FieldTypes.Boolean,
  FieldTypes.Date,
  FieldTypes.Array,
  FieldTypes.Object,
  FieldTypes.GeoPoint,
]);

export const etlFieldTypesNames = Immutable.Map<string, string>({
  [FieldTypes.Array]: 'Array',
  [FieldTypes.Object]: 'Nested',
  [FieldTypes.String]: 'Text',
  [FieldTypes.Number]: 'Number',
  [FieldTypes.Boolean]: 'Boolean',
  [FieldTypes.Date]: 'Date',
  [FieldTypes.Integer]: 'Integer',
  [FieldTypes.GeoPoint]: 'Geo Point',
});

// its an array because geo point could eventually also be a string
const ETLToJSType: {
  [k in FieldTypes]: JSTypes[]
} = {
    [FieldTypes.Array]: ['array'],
    [FieldTypes.Object]: ['object'],
    [FieldTypes.String]: ['string'],
    [FieldTypes.Number]: ['number'],
    [FieldTypes.Boolean]: ['boolean'],
    [FieldTypes.Date]: ['string'],
    [FieldTypes.Integer]: ['number'],
    [FieldTypes.GeoPoint]: ['object'],
  };

export function getJSFromETL(type: FieldTypes): JSTypes
{
  return ETLToJSType[type][0];
}

export enum NodeTypes
{
  MergeJoin = 'MergeJoin',
  Source = 'Source',
  Sink = 'Sink',
}

export interface ETLProcess
{
  nodes: {
    [id: number]: ETLNode;
  };
  edges: {
    [id: number]: ETLEdge;
  };
  uidNode: number;
  uidEdge: number;
}

export interface ETLEdge
{
  from: number;
  to: number;
  transformations: TransformationEngine;
}

export interface ETLNode
{
  type: NodeTypes;
  options: MergeJoinOptions;
  endpoint: string;
}

export interface MergeJoinOptions
{
  leftId: number;
  rightId: number;
  leftJoinKey: string;
  rightJoinKey: string;
  outputKey: string;
}

export enum DateFormats
{
  ISOstring = 'ISOstring',
  MMDDYYYY = 'MMDDYYYY',
}
