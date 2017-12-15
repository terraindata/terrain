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
import { ModalProps } from 'common/components/overlay/MultiModal';
import { FILE_TYPES } from 'etl/ETLTypes';
import { makeConstructor, New, WithIRecord } from 'src/app/Classes';

import { ELASTIC_TYPES, TEMPLATE_TYPES } from 'shared/etl/templates/TemplateTypes';

class TemplateEditorStateC
{
  public template: ExportTemplate | ImportTemplate = _ExportTemplate({});
  public isDirty: boolean = true;
  public modalRequests: List<ModalProps> = List([]);
}
export type TemplateEditorState = WithIRecord<TemplateEditorStateC>;
export const _TemplateEditorState = makeConstructor(TemplateEditorStateC);

interface TemplateBase
{
  templateId: ID;
  templateName: string;
  type: TEMPLATE_TYPES;
  filetype: FILE_TYPES;
  rootField: TemplateField; // was column types
  transformations: any;
  objectKey: string;
  dbid: number;
  dbname: string;
  tablename: string;
}

interface ExportTemplateBase extends TemplateBase
{
  type: TEMPLATE_TYPES.EXPORT;
  rank: boolean;
}

interface ImportTemplateBase extends TemplateBase
{
  type: TEMPLATE_TYPES.IMPORT;
  primaryKeys: List<number>;
  primaryKeyDelimiter: string;
}

class ExportTemplateC implements ExportTemplateBase
{
  public templateId = -1;
  public templateName = '';
  public readonly type = TEMPLATE_TYPES.EXPORT;
  public filetype = FILE_TYPES.JSON;
  public rootField = _TemplateField();
  public transformations = List([]);
  public objectKey = '';
  public dbid = -1;
  public dbname = '';
  public tablename = '';
  public rank = true;
}
export type ExportTemplate = WithIRecord<ExportTemplateC>;
export const _ExportTemplate = makeConstructor(ExportTemplateC);

class ImportTemplateC implements ImportTemplateBase
{
  public templateId = -1;
  public templateName = '';
  public readonly type = TEMPLATE_TYPES.IMPORT;
  public filetype = FILE_TYPES.JSON;
  public rootField = _TemplateField();
  public transformations = List([]);
  public objectKey = '';
  public dbid = -1;
  public dbname = '';
  public tablename = '';
  public primaryKeys = List([]);
  public primaryKeyDelimiter = '-';
}
export type ImportTemplate = WithIRecord<ImportTemplateC>;
export const _ImportTemplate = makeConstructor(ImportTemplateC);

export type ETLTemplate = ImportTemplate | ExportTemplate;

class TemplateFieldC
{
  public isPrimaryKey: boolean = false; // import only
  public isAnalyzed: boolean = true; // import only
  public isIncluded: boolean = true;
  public type: ELASTIC_TYPES = ELASTIC_TYPES.TEXT;
  public arrayType: List<ELASTIC_TYPES> = List([ELASTIC_TYPES.TEXT]);
  // if type is array. e.g. array of text, or array of array of text
  public analyzer: string = '';
  public originalName: string = ''; // this may change based on how we implement transformations
  public name: string = '';
  public children: List<TemplateField> = List([]);
}
export type TemplateField = WithIRecord<TemplateFieldC>;
export const _TemplateField = (cfg?: any) =>
{
  const config = cfg || {};
  config.type = config.type || ELASTIC_TYPES.TEXT;
  config.analyzer = config.analyzer || (config.type === ELASTIC_TYPES.TEXT ? 'standard' : null);
  config.originalName = config.originalName || config.name || '';
  config.name = config.name || config.originalName;

  return New<WithIRecord<TemplateFieldC>>(new TemplateFieldC(), config);
};
