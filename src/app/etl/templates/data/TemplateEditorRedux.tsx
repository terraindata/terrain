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
// tslint:disable:import-spacing
import * as Immutable from 'immutable';
import * as _ from 'lodash';

import
{
  _TemplateEditorState,
  ETLTemplate,
  TemplateEditorState,
  TemplateField,
} from 'etl/templates/TemplateTypes';
import { ConstrainedMap, GetType, TerrainRedux, Unroll } from 'src/app/store/TerrainRedux';
const { List, Map } = Immutable;

import { ModalProps, MultiModal } from 'common/components/overlay/MultiModal';

export interface TemplateEditorActionTypes
{
  loadTemplate: { // load a new template to edit / view
    actionType: 'loadTemplate';
    template: ETLTemplate;
  };
  createField: {
    actionType: 'createField';
    sourcePath: KeyPath;
    field?: TemplateField;
  };
  updateField: {
    actionType: 'updateField';
    sourcePath: KeyPath;
    key: string | number;
    value: any;
  };
  deleteField: {
    actionType: 'deleteField';
    sourcePath: KeyPath;
  };
  addModalConfirmation: {
    actionType: 'addModalConfirmation';
    props: ModalProps;
  };
  setModalRequests: {
    actionType: 'setModalRequests';
    requests: List<ModalProps>;
  };
  setDocuments: {
    actionType: 'setDocuments';
    documents: List<object>
  };
  setPreviewIndex: {
    actionType: 'setPreviewIndex';
    index: number;
  };
}

class TemplateEditorActionsClass extends TerrainRedux<TemplateEditorActionTypes, TemplateEditorState>
{
  public reducers: ConstrainedMap<TemplateEditorActionTypes, TemplateEditorState> =
    {
      loadTemplate: (state, action) =>
      {
        return state.set('isDirty', false).
          set('template', action.payload.template);
      },
      createField: (state, action) =>
      {
        const fieldKeyPath = List<string | number>(['template', 'rootField'])
          .push(...action.payload.sourcePath.toJS());
        const creatingField: TemplateField = state.getIn(fieldKeyPath);
        const nextIndex = creatingField.children.size;
        return state.set('isDirty', true).
          setIn(fieldKeyPath.push('children', nextIndex), action.payload.field);
      },
      updateField: (state, action) =>
      {
        const keyPath = List<string | number>(['template', 'rootField'])
          .push(...action.payload.sourcePath.toJS(), action.payload.key);
        return state.set('isDirty', true).
          setIn(keyPath, action.payload.value);
      },
      deleteField: (state, action) =>
      {
        const fieldKeyPath = List<string | number>(['template', 'rootField'])
          .push(...action.payload.sourcePath.toJS());
        return state.deleteIn(fieldKeyPath);
      },
      addModalConfirmation: (state, action) =>
      {
        return state.set('modalRequests',
          MultiModal.addRequest(state.modalRequests, action.payload.props));
      },
      setModalRequests: (state, action) =>
      {
        return state.set('modalRequests', action.payload.requests);
      },
      setDocuments: (state, action) =>
      {
        return state.set('documents', action.payload.documents);
      },
      setPreviewIndex: (state, action) =>
      {
        return state.set('previewIndex', action.payload.index);
      },
    };
}

const ReduxInstance = new TemplateEditorActionsClass();
export const TemplateEditorActions = ReduxInstance._actionsForExport();
export const TemplateEditorReducers = ReduxInstance._reducersForExport(_TemplateEditorState);
export declare type TemplateEditorActionType<K extends keyof TemplateEditorActionTypes> =
  GetType<K, TemplateEditorActionTypes>;
