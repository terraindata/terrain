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

import
{
  _ElasticFieldSettings, _TemplateField,
  ElasticFieldSettings, TemplateField,
} from 'etl/templates/FieldTypes';
import
{
  _TemplateEditorState,
  ETLTemplate,
  TemplateEditorState,
} from 'etl/templates/TemplateTypes';
import { MidwayError } from 'shared/error/MidwayError';
import { ConstrainedMap, GetType, TerrainRedux, Unroll, WrappedPayload } from 'src/app/store/TerrainRedux';
import { AllBackendsMap } from 'src/database/AllBackends';
import BackendInstance from 'src/database/types/BackendInstance';
import MidwayQueryResponse from 'src/database/types/MidwayQueryResponse';
import { _Query, Query, queryForSave } from 'src/items/types/Query';
import { Ajax } from 'util/Ajax';
import { Algorithm } from 'library/LibraryTypes';
import ESInterpreter from 'shared/database/elastic/parser/ESInterpreter';
import { toInputMap } from 'src/blocks/types/Input';

const { List, Map } = Immutable;

import { ModalProps, MultiModal } from 'common/components/overlay/MultiModal';

export interface TemplateEditorActionTypes
{
  setTemplate: {
    actionType: 'setTemplate';
    template: ETLTemplate;
  };
  setRoot: { // this should be the only way to edit the template tree
    actionType: 'setRoot';
    rootField: TemplateField;
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
  fetchDocuments: {
    actionType: 'fetchDocuments';
    source: {
      type: 'algorithm',
      algorithm: Algorithm;
    };
    onFetched?: (hits: List<object>) => void;
  };
  setLoading: {
    actionType: 'setLoading';
    loading: boolean;
  };
  setPreviewIndex: {
    actionType: 'setPreviewIndex';
    index: number;
  };
  setSettingsKeyPath: {
    actionType: 'setSettingsKeyPath';
    keyPath: KeyPath;
    displayKeyPath: KeyPath;
  };
  closeSettings: {
    actionType: 'closeSettings';
  };
}

const ROOT_PATH = List(['rootField']);

class TemplateEditorActionsClass extends TerrainRedux<TemplateEditorActionTypes, TemplateEditorState>
{
  public reducers: ConstrainedMap<TemplateEditorActionTypes, TemplateEditorState> =
    {
      setTemplate: (state, action) =>
      {
        return state.set('isDirty', false).
          set('template', action.payload.template);
      },
      setRoot: (state, action) =>
      {
        return state.set('isDirty', true).setIn(ROOT_PATH, action.payload.rootField);
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
      setDocuments: (state, action) =>
      {
        return state.setIn(['uiState', 'documents'], action.payload.documents);
      },
      fetchDocuments: (state, action) =>
      {
        return state; // do nothing
      },
      setLoading: (state, action) =>
      {
        return state.setIn(['uiState', 'loading'], action.payload.loading);
      },
      setPreviewIndex: (state, action) =>
      {
        return state.setIn(['uiState', 'previewIndex'], action.payload.index);
      },
      setSettingsKeyPath: (state, action) =>
      {
        return state.setIn(['uiState', 'settingsKeyPath'], action.payload.keyPath)
          .setIn(['uiState', 'settingsDisplayKeyPath'], action.payload.displayKeyPath);
      },
      closeSettings: (state, action) =>
      {
        return state.setIn(['uiState', 'settingsKeyPath'], null).setIn(['uiState', 'settingsDisplayKeyPath'], null);
      },
    };

  public overrideAct(action: Unroll<TemplateEditorActionTypes>)
  {
    switch (action.actionType)
    {
      case 'fetchDocuments':
        return this.fetchDocumentsAction.bind(this, action);
      default:
        return undefined;
    }
  }

  public fetchDocumentsAction(action: TemplateEditorActionType<'fetchDocuments'>, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'setLoading',
      loading: true,
    }); // set loading to true

    if (action.source.type === 'algorithm' && action.source.algorithm != null)
    {
      const algorithm = action.source.algorithm;
      let query = algorithm.query;
      query = query.set('parseTree', new ESInterpreter(query.tql, toInputMap(query.inputs)));

      const eql = AllBackendsMap[query.language].parseTreeToQueryString(
        query,
        {
          replaceInputs: true,
        },
      );
      const handleResponse = (response: MidwayQueryResponse) =>
      {
        const hits = List(_.get(response, ['result', 'hits', 'hits'], [])).map((doc, index) => doc['_source']).toList();
        directDispatch({
          actionType: 'setDocuments',
          documents: hits,
        });
        if (action.onFetched != null)
        {
          action.onFetched(hits);
        }
        directDispatch({
          actionType: 'setLoading',
          loading: false,
        });
      };

      const handleError = (ev: string | MidwayError) =>
      {
        // TODO
      }

      const { queryId, xhr } = Ajax.query(
        eql,
        algorithm.db,
        handleResponse,
        handleError,
      );
    }
  }
}

const ReduxInstance = new TemplateEditorActionsClass();
export const TemplateEditorActions = ReduxInstance._actionsForExport();
export const TemplateEditorReducers = ReduxInstance._reducersForExport(_TemplateEditorState);
export declare type TemplateEditorActionType<K extends keyof TemplateEditorActionTypes> =
  GetType<K, TemplateEditorActionTypes>;
