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

// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable import-spacing
import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;
import { ModalProps } from 'common/components/overlay/MultiModal';
import { makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

import { _SinkConfig, _SourceConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import { _TemplateField, TemplateField } from 'etl/templates/FieldTypes';
import { Languages, TemplateBase, TemplateObject } from 'shared/etl/types/ETLTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

export type FieldMap = Immutable.Map<number, TemplateField>;
class TemplateEditorStateC
{
  public template: ETLTemplate = _ETLTemplate();
  public fieldMap: FieldMap = Map();
  public isDirty: boolean = true;
  public uiState: EditorDisplayState = _EditorDisplayState();
}
export type TemplateEditorState = WithIRecord<TemplateEditorStateC>;
export const _TemplateEditorState = makeConstructor(TemplateEditorStateC);

class EditorDisplayStateC
{
  public documents: List<object> = List([]);
  public mergeDocuments: Immutable.Map<string, List<object>> = Map({});
  public modalRequests: List<ModalProps> = List([]);
  public previewIndex: number = -1;
  public loadingDocuments: boolean = false;
  public settingsFieldId: number = null;
  public settingsDisplayKeyPath: KeyPath = null;
  public engineVersion: number = 0;
}
export type EditorDisplayState = WithIRecord<EditorDisplayStateC>;
export const _EditorDisplayState = makeConstructor(EditorDisplayStateC);

interface ETLTemplateI extends TemplateBase
{
  sources: Immutable.Map<string, SourceConfig>;
  sinks: Immutable.Map<string, SinkConfig>;
}

class ETLTemplateC implements ETLTemplateI
{
  public id = -1;
  public templateName = '';
  public transformationEngine = new TransformationEngine();
  public transformationConfig = '';
  public sources = Map<string, SourceConfig>();
  public sinks = Map<string, SinkConfig>();
}
export type ETLTemplate = WithIRecord<ETLTemplateC>;
export const _ETLTemplate = makeExtendedConstructor(ETLTemplateC, false, {
  transformationEngine: TransformationEngine.load,
  // transformationConfig // todo
  sources: (sources) =>
  {
    return Map<string, SourceConfig>(sources)
      .map((obj, key) => _SourceConfig(obj, true))
      .toMap();
  },
  sinks: (sinks) =>
  {
    return Map<string, SinkConfig>(sinks)
      .map((obj, key) => _SinkConfig(obj, true))
      .toMap();
  },
});

export function templateForBackend(template: ETLTemplate): TemplateBase
{
  const obj: TemplateObject = (template as any).toObject(); // shallow js object
  obj.transformationEngine = obj.transformationEngine.toJSON();
  // obj.transformationConfig = recordForSave(obj.transformationConfig); TODO
  obj.sources = recordForSave(obj.sources);
  obj.sinks = recordForSave(obj.sinks);
  return obj;
}

export const DefaultDocumentLimit = 10;
