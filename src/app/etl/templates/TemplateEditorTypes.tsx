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
import { ModalProps } from 'common/components/overlay/MultiModal';
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import memoizeOne from 'memoize-one';
import { instanceFnDecorator, makeConstructor, makeExtendedConstructor, WithIRecord } from 'shared/util/Classes';

import { _HistoryStack, HistoryStack } from 'etl/common/HistoryStack';
import { TemplateField } from 'etl/templates/FieldTypes';
import { ReorderableSet } from 'shared/etl/immutable/ReorderableSet';
import { _ETLTemplate, ETLTemplate } from 'shared/etl/immutable/TemplateRecords';
import { FieldVerification } from 'shared/etl/languages/LanguageControllers';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

export type FieldMap = Immutable.Map<number, TemplateField>;

export interface TemplateEditorHistory
{
  template: ETLTemplate;
  uiState: EditorDisplayState;
}

class TemplateEditorStateC
{
  public template: ETLTemplate = _ETLTemplate();
  public fieldMap: FieldMap = Map();
  public history: HistoryStack<TemplateEditorHistory> = _HistoryStack<TemplateEditorHistory>();
  public isDirty: boolean = true;
  public loadingDocuments: number = 0;
  public uiState: EditorDisplayState = _EditorDisplayState();

  public getPreviewDocuments()
  {
    return this.uiState.documents;
  }

  public getCurrentEngine(): TransformationEngine
  {
    const currentEdge = this.getCurrentEdgeId();
    return this.template.getTransformationEngine(currentEdge);
  }

  public getCurrentFieldOrdering(): ReorderableSet<number>
  {
    const currentEdge = this.getCurrentEdgeId();
    return this.template.getFieldOrdering(currentEdge);
  }

  public getCurrentComparator(): (a: number, b: number) => number
  {
    return this.memoizedComparator(this.getCurrentFieldOrdering());
  }

  public getCurrentEdgeId()
  {
    return this.uiState.currentEdge;
  }

  public getSourceFetchStatus(id: string): FetchStatus
  {
    return this.uiState.fetchStatuses.get(id, FetchStatus.Unloaded);
  }

  public getSourceDocuments(id: string): List<object>
  {
    return this.uiState.mergeDocuments.get(id, List([]));
  }

  @instanceFnDecorator(memoizeOne)
  private memoizedComparator(order: ReorderableSet<number>)
  {
    if (order === undefined)
    {
      return (a, b) => 0;
    }
    return order.createComparator();
  }
}
export type TemplateEditorState = WithIRecord<TemplateEditorStateC>;
export const _TemplateEditorState = makeExtendedConstructor(TemplateEditorStateC, true);

export enum ColumnOptions
{
  Preview = 'Preview',
  Endpoints = 'Source/Destination',
  Steps = 'Steps',
  Options = 'Options',
}

export const columnOptions = List([
  ColumnOptions.Preview,
  ColumnOptions.Endpoints,
  ColumnOptions.Steps,
  ColumnOptions.Options,
]);

export enum FetchStatus
{
  Unloaded,
  Loading,
  Loaded,
  Error,
}

export class TempCallback
{
  public valid: boolean = true;
  public fn: () => void;

  constructor(func: () => void)
  {
    this.fn = func;
  }

  public call()
  {
    if (this.valid)
    {
      this.fn();
    }
  }

  public invalidate()
  {
    this.valid = false;
  }
}

class EditorDisplayStateC
{
  public documents: List<object> = List([]);
  public fetchStatuses: Immutable.Map<string, FetchStatus> = Map({});
  public mergeDocuments: Immutable.Map<string, List<object>> = Map({});
  public modalRequests: List<ModalProps> = List([]);
  public previewIndex: number = 0; // which preview document we are looking at

  public settingsState: {
    fieldId: number,
    dkp: KeyPath,
    closeCallback: TempCallback,
  } = {
      fieldId: null,
      dkp: null,
      closeCallback: null,
    };

  public fieldVerifications: Immutable.Map<number, List<FieldVerification>> = Map() as any;
  public currentEdge: number = -1;
  public engineVersion: number = 0;
  public columnState: ColumnOptions = ColumnOptions.Endpoints;
  public moveFieldId: number = null;
  public addFieldId: number = null;
  public mergeIntoEdgeId: number = null;
  public checkedFields: Immutable.Map<number, boolean> = null; // if null then don't display checkboxes
  public fileCache: { [k: string]: File };
  public extractField: {
    fieldId: number,
    index: number,
    isIndexExtract: boolean,
  } = null;
  public promoteFieldRoot: number = null;
  public addUnrecognizedPath: KeyPath = null;
}
export type EditorDisplayState = WithIRecord<EditorDisplayStateC>;
export const _EditorDisplayState = makeConstructor(EditorDisplayStateC);
