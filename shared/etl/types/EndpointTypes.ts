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
// tslint:disable:max-classes-per-file no-unused-expression

import { FileTypes, Languages } from './ETLTypes';

export enum Sources
{
  Upload = 'Upload', // from a browser
  Algorithm = 'Algorithm',
  Sftp = 'Sftp',
  Http = 'Http',
}

export enum Sinks
{
  Download = 'Download', // to a browser
  Database = 'Database',
  Sftp = 'Sftp',
  Http = 'Http',
}

export interface FileConfig
{
  fileType: FileTypes;
  hasCsvHeader?: boolean;
  jsonNewlines?: boolean;
}

export interface SourceConfig
{
  type: SourceTypes;
  fileConfig: FileConfig;
  options: SourceOptionsType<SourceTypes>;
  // a union of all possible option types
}

export interface SinkConfig
{
  type: SinkTypes;
  fileConfig: FileConfig;
  options: SinkOptionsType<SinkTypes>;
  // a union of all possible option types
}

// so far sources and options are different
interface SourceOptionsTypes // TODO check that these are right
{
  Upload: {
    file?: File;
  };
  Algorithm: {
    algorithmId: ID;
  };
  Sftp: SftpOptions;
  Http: HttpOptions;
}

interface SinkOptionsTypes
{
  Download: {
    filename?: string;
  };
  Database: {
    language: Languages;
    serverId: ID;
    database: string;
    table: string;
    elasticConfig?: any; // if Language is elastic
  };
  Sftp: SftpOptions;
  Http: HttpOptions;
}

export interface SftpOptions
{
  ip: string;
  port: number;
  filepath: string;
  credentialId: ID;
  meta?: any;
}

export interface HttpOptions
{
  url: string;
  methods: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: {
    accept: string;
    contentType: string;
  };
}

export type SourceTypes = keyof SourceOptionsTypes;
export type SourceOptionsType<key extends SourceTypes> = SourceOptionsTypes[key];
export type SinkTypes = keyof SinkOptionsTypes;
export type SinkOptionsType<key extends SinkTypes> = SinkOptionsTypes[key];

// Some type wizadry to assert the above types stay correct
// if there are errors in this section make sure that
// 1: The source and sink enum names are the same as their values
// 2: Each sink and source has a defined option type
type SourceNamingAssertion = {
  [K in keyof typeof Sources]: K
};
Sources as SourceNamingAssertion;

type SourceAssertOptionTypesExhaustive = {
  [K in Sources]: SourceOptionsTypes[K]
};

type SinkNamingAssertion = {
  [K in keyof typeof Sinks]: K
};
Sinks as SinkNamingAssertion;

type SinkAssertOptionTypesExhaustive = {
  [K in Sinks]: SinkOptionsTypes[K]
};
