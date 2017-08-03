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
import * as Immutable from 'immutable';
import * as _ from 'underscore';
import { BaseClass, New } from '../Classes';
import Util from './../util/Util';
const { List } = Immutable;

// This type represents the state of the FileImportStore
class FileImportStateC extends BaseClass
{
  public connectionId: number = -1;
  public serverText: string = '';
  public dbText: string = '';
  public tableText: string = '';
  public fileContents: string = '';       // use when file small enough to upload through ajax post
  public filetype: string = '';

  public previewRows: List<List<string>> = List([]);
  public columnsCount: number = 0;
  public primaryKey: number = -1;

  public originalNames: List<string> = List([]);
  public columnNames: List<string> = List([]);
  public columnsToInclude: List<boolean> = List([]);
  public columnTypes: List<IMMap<string, any>> = List([]); // TODO: change 'any,' how to specify type of nested IMMap?

  public transforms: List<Transform> = List([]);
  public templates: List<Template> = List([]);
  public file: File = null;
  public streaming: boolean = false;

  public chunkQueue: List<object> = List([]);
  public uploadInProgress: boolean = false;
  public elasticUpdate: boolean = true;
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

export interface Transform
{
  name: string;                         // transform name
  colName: string;                      // name of column to be transformed
  args: {
    mergeName?: string;                 // name of column to be merged
    newName?: string | string[];        // rename name, duplicate name, split names
    text?: string;                      // text to append/prepend, text to split/merge on
  };
}

export interface Template
{
  id: number;
  name: string;
  originalNames: List<string>;
  columnTypes: Immutable.Map<string, object>;
  transformations: List<object>;
  csvHeaderMissing: boolean;
  primaryKey: number;
}

// supports nested types, i.e. an array of array of dates
export interface ColumnTypesTree
{
  type: string | number;
  innerType?: ColumnTypesTree;
}

export const NUMBER_PREVIEW_ROWS = 5;

export const CHUNK_SIZE = 10000000;    // assume this chunk size contains number of preview rows

export const FILE_TYPES =
  [
    'json',
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
    ],
    ['duplicate'],    // long
    ['duplicate'],    // boolean
    ['duplicate'],    // date
    ['duplicate'],    // array
    ['duplicate'],    // double
    ['duplicate'],    // short
    ['duplicate'],    // byte
    ['duplicate'],    // integer
    ['duplicate'],    // half_float
    ['duplicate'],    // float
  ];

export const STEP_NAMES =
  [
    'Step 1',
    'Step 2',
    'Step 3',
    'Step 4',
    'Step 5',
  ];

export const STEP_TITLES =
  [
    'Select a File',
    'Select a Server',
    'Select a Database',
    'Select a Table',
    'Select and Rename Columns you\'d like to Import',
  ];
