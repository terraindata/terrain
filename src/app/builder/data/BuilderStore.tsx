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

// tslint:disable:no-var-requires strict-boolean-expressions variable-name

import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import { applyMiddleware, createStore, Dispatch, MiddlewareAPI } from 'redux';
import { _FileImportState, FileImportState } from '../../fileImport/FileImportTypes';
import { CardItem } from '../components/cards/CardComponent';
import { _ResultsState, ResultsState } from '../components/results/ResultTypes';
import { BuilderActionTypes, BuilderCardActionTypes, BuilderDirtyActionTypes } from './BuilderActionTypes';

import { createRecordType } from '../../Classes';

import BuilderStoreLogger from 'builder/data/BuilderStoreLogger';

import { Cards } from '../../../blocks/types/Card';
import { AllBackendsMap } from '../../../database/AllBackends';
import BackendInstance from '../../../database/types/BackendInstance';
import Query, { Query_Record } from '../../../items/types/Query';

import * as TerrainLog from 'loglevel';

export const BuilderStateUsedRecords = [Query_Record];

export class BuilderStateClass
{
  public algorithmId: ID = '';
  public query: Query = null;

  // for undo/redo
  public pastQueries: List<Query> = Immutable.List([]);
  public nextQueries: List<Query> = Immutable.List([]);
  public lastActionType: string = '';
  public lastActionKeyPath: KeyPath = null;
  public lastActionTime: number = 0;

  public loading: boolean = false;
  public loadingXhr: XMLHttpRequest = null;
  public loadingAlgorithmId: ID = '';

  public hoveringCardId: ID = '';

  public selectedCardIds = Map<ID, boolean>({});

  public db: BackendInstance = {} as any;

  // TODO move
  public manual = Map<ID, Cards>({});
  // Card examples used in the manual are stored here.

  public draggingCardItem: CardItem | null = null;
  public draggingOverKeyPath: KeyPath = Immutable.List([]);
  public draggingOverIndex: number = -1;

  public isDirty: boolean = false;

  public resultsState: ResultsState = _ResultsState();
  public exportState: FileImportState = _FileImportState();

  public modelVersion = 3;
}
export interface BuilderState extends BuilderStateClass, IMap<BuilderState> { }
const BuilderState_Record = createRecordType(new BuilderStateClass(), 'BuilderStateClass');
const _BuilderState = (config?: any) =>
{
  return new BuilderState_Record(config || {}) as any as BuilderState;
};

const DefaultState = _BuilderState();

import BuilderReducers from './BuilderReducers';

import ESCardParser from '../../../database/elastic/conversion/ESCardParser';

export const BuilderStore: IStore<BuilderState> = createStore(
  (
    state: BuilderState = DefaultState,
    action: Action<{
      keyPath: KeyPath;
      notDirty: boolean;
    }>,
  ) =>
  {
    if (BuilderDirtyActionTypes[action.type] && !action.payload.notDirty)
    {
      state = state
        .set('isDirty', true);

      // back up for undo, check time to prevent overloading the undo stack
      const time = (new Date()).getTime();
      if (
        action.type !== BuilderActionTypes.change
        || action.type !== state.lastActionType
        || action.payload.keyPath !== state.lastActionKeyPath
        || time - state.lastActionTime > 1500
      )
      {
        state = state
          .set('lastActionType', action.type)
          .set('lastActionTime', time)
          .set('lastActionKeyPath', action.payload.keyPath)
          .set('pastQueries', state.pastQueries.unshift(state.query));
      }

      if (state.nextQueries.size)
      {
        state = state.set('nextQueries', Immutable.List([]));
      }
    }

    if (typeof BuilderReducers[action.type] === 'function')
    {
      state = (BuilderReducers[action.type] as any)(state, action);
    }

    if (BuilderCardActionTypes[action.type])
    {
      // a card changed and we need to re-translate the tql
      //  needs to be after the card change has affected the state
      const newCards = ESCardParser.parseAndUpdateCards(state.query.cards);
      state = state.setIn(['query', 'cards'], newCards);
      state = state
        .setIn(['query', 'tql'], AllBackendsMap[state.query.language].queryToCode(state.query, {}));
      state = state
        .setIn(['query', 'parseTree'], AllBackendsMap[state.query.language].parseQuery(state.query))
        .setIn(['query', 'lastMutation'], state.query.lastMutation + 1)
        .setIn(['query', 'cardsAndCodeInSync'], true);
    }

    if (!state.modelVersion || state.modelVersion < 3)
    {
      state = state.set('modelVersion', 3);
      state = state.set('algorithmId', (state as any).variantId);
      state = state.set('loadingAlgorithmId', (state as any).loadingVariantId);
    }
    return state;
  }
  , DefaultState, applyMiddleware(BuilderStoreLogger.reduxMiddleWare));

export default BuilderStore;
