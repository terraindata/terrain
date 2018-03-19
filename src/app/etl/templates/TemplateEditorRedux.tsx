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
// tslint:disable:import-spacing
import * as Immutable from 'immutable';
import * as _ from 'lodash';

import { FileConfig, SinkConfig, SourceConfig } from 'etl/EndpointTypes';
import
{
  _TemplateField,
  TemplateField,
} from 'etl/templates/FieldTypes';
import
{
  _TemplateEditorState,
  DefaultDocumentLimit,
  EditorDisplayState,
  ETLTemplate,
  FieldMap,
  TemplateEditorState,
} from 'etl/templates/TemplateTypes';
import { Algorithm, LibraryState } from 'library/LibraryTypes';
import { MidwayError } from 'shared/error/MidwayError';
import { Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { ConstrainedMap, GetType, TerrainRedux, Unroll, WrappedPayload } from 'src/app/store/TerrainRedux';

import { createTreeFromEngine } from 'etl/templates/SyncUtil';
import Ajax from 'util/Ajax';

const { List, Map } = Immutable;

import { ModalProps, MultiModal } from 'common/components/overlay/MultiModal';

export interface TemplateEditorActionTypes
{
  setIsDirty: {
    actionType: 'setIsDirty';
    isDirty: boolean;
  };
  setTemplate: { // this should be the only way to mutate the template graph
    actionType: 'setTemplate';
    template: ETLTemplate;
  };
  rebuildFieldMap: {
    actionType: 'rebuildFieldMap';
  };
  setFieldMap: { // this should be the only way to mutate the template tree
    actionType: 'setFieldMap';
    fieldMap: FieldMap;
  };
  addModal: {
    actionType: 'addModal';
    props: ModalProps;
  };
  setModalRequests: {
    actionType: 'setModalRequests';
    requests: List<ModalProps>;
  };
  setDisplayState: {
    actionType: 'setDisplayState';
    state: Partial<{
      [k in keyof EditorDisplayState]: EditorDisplayState[k];
    }>;
  };
  changeLoadingDocuments: {
    actionType: 'changeLoadingDocuments',
    increment: boolean,
  };
  setInMergeDocuments: {
    actionType: 'setInMergeDocuments',
    key: string,
    documents: List<object>,
  };
  deleteInMergeDocuments: {
    actionType: 'deleteInMergeDocuments',
    key: string,
  };
  closeSettings: {
    actionType: 'closeSettings';
  };
  updateEngineVersion: {
    actionType: 'updateEngineVersion';
  };
  resetState: { // resets the display state
    actionType: 'resetState';
  };
  setCurrentEdge: {
    actionType: 'setCurrentEdge';
    edge: number;
    rebuild?: boolean;
  };
}

class TemplateEditorRedux extends TerrainRedux<TemplateEditorActionTypes, TemplateEditorState>
{
  public namespace: string = 'templateEditor';

  public reducers: ConstrainedMap<TemplateEditorActionTypes, TemplateEditorState> =
    {
      setIsDirty: (state, action) =>
      {
        return state.set('isDirty', action.payload.isDirty);
      },
      setTemplate: (state, action) =>
      {
        return state.set('template', action.payload.template);
      },
      rebuildFieldMap: (state, action) =>
      {
        const engine = state.getCurrentEngine();
        const newFieldMap = createTreeFromEngine(engine);
        return state.set('fieldMap', newFieldMap);
      },
      setFieldMap: (state, action) =>
      {
        return state.set('fieldMap', action.payload.fieldMap);
      },
      addModal: (state, action) =>
      {
        return state.setIn(['uiState', 'modalRequests'],
          MultiModal.addRequest(state.uiState.modalRequests, action.payload.props));
      },
      setModalRequests: (state, action) =>
      {
        return state.setIn(['uiState', 'modalRequests'], action.payload.requests);
      },
      setDisplayState: (state, action) =>
      {
        let newState = state.uiState;
        const toUpdate = action.payload.state;
        for (const k of Object.keys(toUpdate))
        {
          newState = newState.set(k, toUpdate[k]);
        }
        return state.set('uiState', newState);
      },
      changeLoadingDocuments: (state, action) =>
      {
        let value = state.loadingDocuments;
        if (action.payload.increment)
        {
          value++;
        }
        else
        {
          value--;
        }
        return state.set('loadingDocuments', value);
      },
      setInMergeDocuments: (state, action) =>
      {
        return state.setIn(['uiState', 'mergeDocuments', action.payload.key], action.payload.documents);
      },
      deleteInMergeDocuments: (state, action) =>
      {
        return state.deleteIn(['uiState', 'mergeDocuments', action.payload.key]);
      },
      closeSettings: (state, action) =>
      {
        return state.setIn(['uiState', 'settingsFieldId'], null).setIn(['uiState', 'settingsDisplayKeyPath'], null);
      },
      updateEngineVersion: (state, action) =>
      {
        const oldVersion = state.uiState.engineVersion;
        return state.setIn(['uiState', 'engineVersion'], oldVersion + 1)
          .set('isDirty', true);
      },
      resetState: (state, action) =>
      {
        return _TemplateEditorState();
      },
      setCurrentEdge: (state, action) =>
      {
        return state.setIn(['uiState', 'currentEdge'], action.payload.edge);
      },
    };

  public setCurrentEdge(action: TemplateEditorActionType<'setCurrentEdge'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'setCurrentEdge',
      edge: action.edge,
    });
    if (action.rebuild === true)
    {
      directDispatch({
        actionType: 'rebuildFieldMap',
      });
    }
  }

  public overrideAct(action: Unroll<TemplateEditorActionTypes>)
  {
    switch (action.actionType)
    {
      case 'setCurrentEdge':
        return this.setCurrentEdge.bind(this, action);
      default:
        return undefined;
    }
  }
}

const ReduxInstance = new TemplateEditorRedux();
export const TemplateEditorActions = ReduxInstance._actionsForExport();
export const TemplateEditorReducers = ReduxInstance._reducersForExport(_TemplateEditorState);
export declare type TemplateEditorActionType<K extends keyof TemplateEditorActionTypes> =
  GetType<K, TemplateEditorActionTypes>;
