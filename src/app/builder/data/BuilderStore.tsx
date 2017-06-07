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
const _ = require('underscore');
import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as ReduxActions from 'redux-actions';
import { CardItem } from '../components/cards/CardComponent';
const Redux = require('redux');
import Util from '../../util/Util';
import { _ResultsState, ResultsState } from '../components/results/ResultsManager';
import { BuilderActionTypes, BuilderCardActionTypes, BuilderDirtyActionTypes } from './BuilderActionTypes';

import { AllBackendsMap } from '../../../../shared/backends/AllBackends';
import BackendInstance from '../../../../shared/backends/types/BackendInstance';
import { Card, Cards } from '../../../../shared/blocks/types/Card';
import Query from '../../../../shared/items/types/Query';

export class BuilderStateClass
{
  variantId: ID = '';
  query: Query = null;

  // for undo/redo
  pastQueries: List<Query> = Immutable.List([]);
  nextQueries: List<Query> = Immutable.List([]);
  lastActionType: string = '';
  lastActionKeyPath: KeyPath = null;
  lastActionTime: number = 0;

  loading: boolean = false;
  loadingXhr: XMLHttpRequest = null;
  loadingVariantId: ID = '';

  hoveringCardId: ID = '';

  selectedCardIds = Map<ID, boolean>({});

  db: BackendInstance = {} as any;

  // TODO move
  manual = Map<ID, Cards>({});
  // Card examples used in the manual are stored here.

  draggingCardItem: CardItem = false;
  draggingOverKeyPath: KeyPath = Immutable.List([]);
  draggingOverIndex: number = -1;

  isDirty: boolean = false;

  resultsState: ResultsState = _ResultsState();
}
export interface BuilderState extends BuilderStateClass, IMap<BuilderState> { }
const BuilderState_Record = Immutable.Record(new BuilderStateClass());
const _BuilderState = (config?: any) =>
{
  return new BuilderState_Record(config || {}) as any as BuilderState;
};

const DefaultState = _BuilderState();

import BuilderReducers from './BuilderReducers';

export const BuilderStore: IStore<BuilderState> = Redux.createStore(
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
      state = state
        .setIn(['query', 'tql'],
        AllBackendsMap[state.query.language].queryToCode(state.query, {}),
      )
        .setIn(['query', 'cardsAndCodeInSync'], true);
    }

    return state;
  }
  , DefaultState);

export default BuilderStore;
