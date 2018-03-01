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
  _ElasticFieldSettings, _TemplateField,
  ElasticFieldSettings, TemplateField,
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
import { Algorithm } from 'library/LibraryTypes';
import { MidwayError } from 'shared/error/MidwayError';
import { Sinks, SourceOptionsType, Sources } from 'shared/etl/types/EndpointTypes';
import { ConstrainedMap, GetType, TerrainRedux, Unroll, WrappedPayload } from 'src/app/store/TerrainRedux';

import { fetchDocumentsFromAlgorithm, fetchDocumentsFromFile } from 'etl/templates/DocumentRetrievalUtil';
import { createTreeFromEngine } from 'etl/templates/SyncUtil';

const { List, Map } = Immutable;

import { ModalProps, MultiModal } from 'common/components/overlay/MultiModal';

export interface TemplateEditorActionTypes
{
  setTemplate: {
    actionType: 'setTemplate';
    template: ETLTemplate;
  };
  rebuildFieldMap: {
    actionType: 'rebuildFieldMap';
  };
  setFieldMap: { // this should be the only way to edit the template tree
    actionType: 'setFieldMap';
    fieldMap: FieldMap;
  };
  addModalConfirmation: {
    actionType: 'addModalConfirmation';
    props: ModalProps;
  };
  setModalRequests: {
    actionType: 'setModalRequests';
    requests: List<ModalProps>;
  };
  fetchDocuments: {
    actionType: 'fetchDocuments';
    source: SourceConfig;
    algorithms?: IMMap<ID, Algorithm>; // if its an algorithm TODO replace this with a better midway route
    file?: File; // if its an uploaded file
    mergeKey?: string; // TODO implement
    onFetched?: (hits: List<object>) => void;
  };
  setDisplayState: {
    actionType: 'setDisplayState';
    state: Partial<{
      [k in keyof EditorDisplayState]: EditorDisplayState[k];
    }>;
  };
  closeSettings: {
    actionType: 'closeSettings';
  };
  updateEngineVersion: {
    actionType: 'updateEngineVersion';
  };
  resetState: {
    actionType: 'resetState';
  };
}

class TemplateEditorActionsClass extends TerrainRedux<TemplateEditorActionTypes, TemplateEditorState>
{
  public reducers: ConstrainedMap<TemplateEditorActionTypes, TemplateEditorState> =
    {
      setTemplate: (state, action) =>
      {
        return state.set('isDirty', false).
          set('template', action.payload.template);
      },
      rebuildFieldMap: (state, action) =>
      {
        const newFieldMap = createTreeFromEngine(state.template.transformationEngine);
        return state.set('fieldMap', newFieldMap);
      },
      setFieldMap: (state, action) =>
      {
        return state.set('isDirty', true).set('fieldMap', action.payload.fieldMap);
      },
      addModalConfirmation: (state, action) =>
      {
        return state.setIn(['uiState', 'modalRequests'],
          MultiModal.addRequest(state.uiState.modalRequests, action.payload.props));
      },
      setModalRequests: (state, action) =>
      {
        return state.setIn(['uiState', 'modalRequests'], action.payload.requests);
      },
      fetchDocuments: (state, action) =>
      {
        return state; // do nothing
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
      closeSettings: (state, action) =>
      {
        return state.setIn(['uiState', 'settingsFieldId'], null).setIn(['uiState', 'settingsDisplayKeyPath'], null);
      },
      updateEngineVersion: (state, action) =>
      {
        const oldVersion = state.uiState.engineVersion;
        return state.setIn(['uiState', 'engineVersion'], oldVersion + 1);
      },
      resetState: (state, action) =>
      {
        return _TemplateEditorState();
      },
    };

  public overrideAct(action: Unroll<TemplateEditorActionTypes>)
  {
    switch (action.actionType)
    {
      case 'fetchDocuments':
        return this.fetchDocuments.bind(this, action);
      default:
        return undefined;
    }
  }

  public fetchDocuments(action: TemplateEditorActionType<'fetchDocuments'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'setDisplayState',
      state: {
        loadingDocuments: true,
      },
    });
    const onLoad = (documents: List<object>) =>
    {
      if (action.mergeKey != null)
      {
        // tslint:disable-next-line
        console.error('TODO implement this');
      }
      directDispatch({
        actionType: 'setDisplayState',
        state: {
          documents,
        },
      });
      if (action.onFetched != null)
      {
        action.onFetched(documents);
      }
      directDispatch({
        actionType: 'setDisplayState',
        state: {
          loadingDocuments: false,
        },
      });
    };
    const onError = (ev: string | MidwayError) =>
    {
      // tslint:disable-next-line
      console.error(ev);
      // TODO add a modal message?
      directDispatch({
        actionType: 'setDisplayState',
        state: {
          loadingDocuments: false,
        },
      });
    };
    switch (action.source.type)
    {
      case Sources.Algorithm: {
        const options: SourceOptionsType<Sources.Algorithm> = action.source.options as any;
        const algorithms = action.algorithms;
        const algorithmId = options.algorithmId;
        const algorithm = (algorithms != null && algorithms.has(algorithmId)) ? algorithms.get(algorithmId) : null;
        // TODO errors if algorithm is null
        fetchDocumentsFromAlgorithm(algorithm, onLoad, onError, DefaultDocumentLimit);
        break;
      }
      case Sources.Upload: {
        const file = action.file;
        const config = action.source.fileConfig;
        fetchDocumentsFromFile(file, config, onLoad, onError, DefaultDocumentLimit);
        break;
      }
      default:
        // tslint:disable-next-line
        console.error('Failed to retrieve documents. Unknown source type');
      // TODO modal message?
    }
  }
}

const ReduxInstance = new TemplateEditorActionsClass();
export const TemplateEditorActions = ReduxInstance._actionsForExport();
export const TemplateEditorReducers = ReduxInstance._reducersForExport(_TemplateEditorState);
export declare type TemplateEditorActionType<K extends keyof TemplateEditorActionTypes> =
  GetType<K, TemplateEditorActionTypes>;
