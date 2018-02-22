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

// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable import-spacing ordered-imports
import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import { ModalProps } from 'common/components/overlay/MultiModal';
import { FILE_TYPES } from 'shared/etl/ETLTypes';
import { makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import
{
  LANGUAGES, TEMPLATE_TYPES,
  Template as TemplateI,
  ETLConfiguration as ETLConfigurationI,
} from 'shared/etl/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

class TemplateEditorStateC
{
  public template: Template = _Template();
  public rootField: TemplateField = _TemplateField();
  public isDirty: boolean = true;
  public uiState: EditorDisplayState = _EditorDisplayState();
}
export type TemplateEditorState = WithIRecord<TemplateEditorStateC>;
export const _TemplateEditorState = makeConstructor(TemplateEditorStateC);

class EditorDisplayStateC
{
  public documents: List<object> = List([]);
  public modalRequests: List<ModalProps> = List([]);
  public previewIndex: number = -1;
  public loading: boolean = false;
  public settingsKeyPath: KeyPath = null;
  public settingsDisplayKeyPath: KeyPath = null;
  public engineVersion: number = 0;
}
export type EditorDisplayState = WithIRecord<EditorDisplayStateC>;
export const _EditorDisplayState = makeConstructor(EditorDisplayStateC);

class ETLConfigurationC implements ETLConfigurationI
{
  public requireAllFields = false;
  public sources = null;
  public destination = null;
}
export type ETLConfiguration = WithIRecord<ETLConfigurationC>;
export const _ETLConfiguration = makeConstructor(ETLConfigurationC);

class TemplateC implements TemplateI
{
  public id = -1;
  public templateName = '';
  public type = TEMPLATE_TYPES.IMPORT;
  public configuration = _ETLConfiguration();
  public transformationEngine = new TransformationEngine();
}
export type Template = WithIRecord<TemplateC>;
export const _Template = makeExtendedConstructor(TemplateC, false, {
  configuration: _ETLConfiguration,
  transformationEngine: TransformationEngine.load
});

export function destringifySavedTemplate(obj: object): object
{
  const newObj: any = _.extend({}, obj);
  newObj.transformationEngine = JSON.parse(newObj.transformationEngine);
  return newObj;
}

export function templateForSave(template: Template): object
{
  const obj = (template as any).toObject();
  obj.transformationEngine = JSON.stringify(obj.transformationEngine.json());
  return obj;
}
