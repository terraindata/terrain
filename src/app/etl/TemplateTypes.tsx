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

// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable
import * as Immutable from 'immutable';
const { List, Map } = Immutable;
import { makeConstructor, WithIRecord } from '../Classes';

export enum FILE_TYPE
{
  JSON = 'json',
  JSON_TYPE_OBJECT = 'json [type object]',
  CSV = 'csv'
}

class TemplateEditorStateC
{
  public template: ExportTemplate | ImportTemplate = _ExportTemplate({});
  public originalPreviewData: any; // figure out this type
  public previewData: any;
}

interface TemplateBase
{
  templateId: ID;
  templateName: string;
  filetype: FILE_TYPE;
  fieldMap: List<object>; // was column types
  transformations: List<object>;
  objectKey: string;
  dbid: number;
  dbname: string;
  tablename: string;
}

interface ExportTemplateBase extends TemplateBase
{
  rank: boolean;
}

interface ImportTemplateBase extends TemplateBase
{
  primaryKeys: List<number>;
  primaryKeyDelimiter: string;
}

class ExportTemplateC implements ExportTemplateBase
{
  public templateId = -1;
  public templateName = '';
  public filetype = FILE_TYPE.JSON;
  public fieldMap = List([]);
  public transformations = List([]);
  public objectKey = '';
  public dbid = -1;
  public dbname = '';
  public tablename = '';
  public rank = true;
}
export type ExportTemplate = WithIRecord<ExportTemplateC>;
export const _ExportTemplate = makeConstructor<ExportTemplate>(ExportTemplateC);

class ImportTemplateC implements ImportTemplateBase
{
  public templateId = -1;
  public templateName = '';
  public filetype = FILE_TYPE.JSON;
  public fieldMap = List([]);
  public transformations = List([]);
  public objectKey = '';
  public dbid = -1;
  public dbname = '';
  public tablename = '';
  public primaryKeys = List([]);
  public primaryKeyDelimiter = '-';
}
export type ImportTemplate = WithIRecord<ImportTemplateC>;
export const _ImportTemplate = makeConstructor<ImportTemplate>(ImportTemplateC);
