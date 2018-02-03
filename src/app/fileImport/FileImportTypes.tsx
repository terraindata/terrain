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

// Copyright 2017 Terrain Data, Inc.

// tslint:disable:variable-name max-classes-per-file strict-boolean-expressions no-shadowed-variable

import { List, Map, Record } from 'immutable';
import { BaseClass, New } from '../Classes';

// This type represents the state of the FileImportStore
class FileImportStateC extends BaseClass
{
  public serverId: number = -1;
  public serverName: string = '';
  public dbName: string = '';
  public tableName: string = '';

  public file: File = new File([''], '');
  public filetype: string = '';
  public filesize: number = 0;

  public previewColumns: List<List<string>> = List([]);
  public primaryKeys: List<number> = List([]);
  public primaryKeyDelimiter: string = '-';
  public hasCsvHeader: boolean = false;
  public isNewlineSeparatedJSON: boolean = false;
  public requireJSONHaveAllFields: boolean = true;
  public objectKey: string = 'Products';
  public exportRank: boolean = true;

  public originalNames: List<string> = List([]);
  public columnNames: List<string> = List([]);
  public columnsToInclude: List<boolean> = List([]);
  public columnTypes: List<ColumnTypesTree> = List([]);
  public columnAnalyzers: List<string> = List([]);

  public transforms: List<Transform> = List([]);
  public templates: List<Template> = List([]);

  public uploadInProgress: boolean = false;
  public elasticUpdate: boolean = true;

  public errorMsg: string = '';
  public isDirty: boolean = false;
}
// These two lines are boilerplate that you can copy and paste and adapt for other Immutable-backed classes
//  This first line exports a type that you will actually use in other files.
//  It combines the class we defined above with the Immutable methods specified in IRecord (e.g. set, setIn, getIn)
export type FileImportState = FileImportStateC & IRecord<FileImportStateC>;
//  This second line exports a function to create a new instance of the FileImportState Immutable backed class
//  It's a replacement for a constructor.
//  This is necessary because simply doing `new FileImportStateC` will not create an Immutable version
//   and you can't use `new` simply with Immutable Records.
export const _FileImportState = (config?: { [key: string]: any }) =>
  New<FileImportState>(new FileImportStateC(config), config);

class TransformArgsC
{
  public mergeName?: string = '';            // name of column to be merged
  public newName?: string | string[] = '';   // includes rename name, duplicate name, split names
  public text?: string = '';                 // text to append/prepend, text to split/merge on
  public path?: string = '';                 // field path in the document for extracting fields from documents
}

const TransformArgs_Record = Record(new TransformArgsC());
export interface TransformArgs extends TransformArgsC, IRecord<TransformArgs> { }
export const _TransformArgs = (config?: any) =>
{
  return new TransformArgs_Record(config) as any as TransformArgs;
};

class TransformC
{
  public name: string = '';      // transform name
  public colName: string = '';   // name of column to be transformed
  public args: TransformArgs = _TransformArgs();
}

const Transform_Record = Record(new TransformC());
export interface Transform extends TransformC, IRecord<Transform> { }
export const _Transform =
  (config: {
    name: string,
    colName: string,
    args: TransformArgs,
  }) =>
  {
    return new Transform_Record(config) as any as Transform;
  };

class TemplateC
{
  public export = false;
  public templateId = -1;
  public templateName = '';
  public originalNames: List<string> = List([]);
  public columnTypes: List<ColumnTypesTree> = List([]);
  public transformations: List<Transform> = List([]);
  public primaryKeys: List<number> = List([]);
  public primaryKeyDelimiter: string = '-';
  public objectKey?: string = '';
  public persistentAccessToken?: string = '';
  public dbid?: number = -1;
  public dbname?: string = '';
  public tablename?: string = '';
}

const Template_Record = Record(new TemplateC());
export interface Template extends TemplateC, IRecord<Template> { }
export const _Template =
  (config: {
    export: boolean;
    templateId: number;
    templateName: string;
    originalNames: List<string>;
    columnTypes: Map<string, object>;
    transformations: List<object>;
    primaryKeys: List<number>;
    primaryKeyDelimiter: string;
    objectKey?: string;
    persistentAccessToken?: string;
    dbid?: number;
    dbname?: string;
    tablename?: string;
  }) =>
  {
    return new Template_Record(config) as any as Template;
  };

// supports nested types, i.e. an array of array of dates
class ColumnTypesTreeC
{
  public type = 'text';
  public index = 'analyzed';
  public analyzer = 'standard';
  public innerType?: ColumnTypesTree = null;
}

const ColumnTypesTree_Record = Record(new ColumnTypesTreeC());
export interface ColumnTypesTree extends ColumnTypesTreeC, IRecord<ColumnTypesTree> { }
export const _ColumnTypesTree = (config?: any) =>
{
  config = config || {};
  config.type = config.type || 'text';
  config.index = config.index || (config.type === 'text' ? 'analyzed' : 'not_analyzed');
  config.analyzer = config.analyzer || (config.type === 'text' ? 'standard' : null);
  config.innerType = config.innerType || null;

  return new ColumnTypesTree_Record(config) as any as ColumnTypesTree;
};

export const NUMBER_PREVIEW_ROWS = 5;
export const PREVIEW_CHUNK_SIZE = 10000000; // (10mb) amount to read in order to extract preview rows
export const MIN_PROGRESSBAR_FILESIZE = 500000; // (500kb) threshold to display progressbar

export const FILE_TYPES =
  [
    'json',
    'json [type object]',
    'csv',
  ];

export const ELASTIC_TYPES =
  [
    'text',
    'long',
    'boolean',
    'date',
    'array',
    'double',
    'short',
    'byte',
    'integer',
    'half_float',
    'float',
    'geo_point',
    'nested',
  ];

export const ELASTIC_TYPE_INDEXES =
  [
    'analyzed',
    'not_analyzed',
    'no',
  ];

export const ELASTIC_TYPE_ANALYZERS = // left blank to be populated by a call to midway
  [
  ];

// contains set of transforms applicable to each elastic type
export const TRANSFORM_TYPES =
  [
    [                 // text
      'duplicate',
      'append',
      'prepend',
      'split',
      'merge',
      'extract',
    ],
    ['duplicate', 'extract'],    // long
    ['duplicate', 'extract'],    // boolean
    ['duplicate', 'extract'],    // date
    ['duplicate', 'extract'],    // array
    ['duplicate', 'extract'],    // double
    ['duplicate', 'extract'],    // short
    ['duplicate', 'extract'],    // byte
    ['duplicate', 'extract'],    // integer
    ['duplicate', 'extract'],    // half_float
    ['duplicate', 'extract'],    // float
    ['duplicate', 'extract'],    // geopoint
  ];

export const STEP_NAMES =
  [
    'Step 1',
    'Step 2',
    'Step 3',
    'Step 4',
    'Step 5',
    'Step 6',
  ];

export const STEP_TITLES =
  [
    'Select a CSV or JSON file to import into Terrain',
    '',
    'Select an ElasticSearch Cluster',
    'Select an ElasticSearch Index',
    'Select an ElasticSearch Type',
    'Select and Rename Columns you\'d like to Import',
  ];

export const STEP_TWO_TITLES =
  [
    'Does your CSV have a header row?',
    'What format is your JSON file?',
  ];

export const STEP_SUBTEXT =
  {
    DATABASE_SUBTEXT: 'Use the field above to either choose an existing database or name a new one that will be created',
    TABLE_SUBTEXT: 'Use the field above to either choose an existing table or name a new one that will be created',
  };

export const TRANSFORM_TEXT =
  {
    DUPLICATE: 'Duplicate this column and its rows',
    APPEND: 'Append text to every row in this column',
    PREPEND: 'Prepend text to every row in this column',
    SPLIT: 'Split this column\'s rows by a common delimiter',
    MERGE: 'Merge this column\'s rows with another column\'s rows',
    EXTRACT: 'Extract a subfield from this column\'s rows as a new column',
  };

export const enum Steps
{
  ChooseFile,
  CsvJsonOptions,
  SelectServer,
  SelectDb,
  SelectTable,
  Preview,
  Success,
}
