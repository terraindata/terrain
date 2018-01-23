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
import * as _ from 'lodash';
import BackendInstance from '../../../database/types/BackendInstance';
import Query from '../../../items/types/Query';
import * as FileImportTypes from '../../fileImport/FileImportTypes';
import { CardItem } from '../components/cards/CardComponent';
import ActionTypes from './BuilderActionTypes';

const $ = (type: string, payload: any) =>
{
  return { type, payload };
};

const BuilderActions =
  {
    change: // reserved for cards only
      (keyPath: KeyPath, value: any, notDirty = false) =>
      (dispatch) =>
        dispatch($(ActionTypes.change, { keyPath, value, notDirty })),

    changeQuery:
      (query: Query) =>
        $(ActionTypes.changeQuery, { query }),

    create:
      (keyPath: KeyPath, index: number, factoryType: string, data?: any) =>
        $(ActionTypes.create, { keyPath, factoryType, index, data }),

    move:
      (keyPath: KeyPath, index: number, newIndex: number) =>
        $(ActionTypes.move, { keyPath, index, newIndex }),

    nestedMove:
      (itemKeyPath: KeyPath, itemIndex: number, newKeyPath: KeyPath, newIndex: number) =>
        $(ActionTypes.nestedMove, { itemKeyPath, itemIndex, newKeyPath, newIndex }),

    remove:
      (keyPath: KeyPath, index: number) =>
        $(ActionTypes.remove, { keyPath, index }),

    dragCard:
      (cardItem: CardItem | null) =>
        $(ActionTypes.dragCard, { cardItem }),

    dragCardOver:
      (keyPath: KeyPath, index: number) =>
        $(ActionTypes.dragCardOver, { keyPath, index }),

    dropCard:
      () =>
        $(ActionTypes.dropCard, {}),

    changeTQL:
      (tql: string) =>
        $(ActionTypes.changeTQL, { tql, changeQuery: BuilderActions.changeQuery }),

    hoverCard:
      (cardId: ID) =>
        $(ActionTypes.hoverCard, { cardId }),

    selectCard:
      (cardId: ID, shiftKey: boolean, ctrlKey: boolean) =>
        $(ActionTypes.selectCard, { cardId, shiftKey, ctrlKey }),

    toggleDeck:
      (open: boolean) =>
        $(ActionTypes.toggleDeck, { open }),

    // fetches the query from the server
    fetchQuery:
      (algorithmId: ID, handleNoAlgorithm: (algorithmId: ID) => void, db: BackendInstance) =>
      (dispatch) =>
        dispatch($(ActionTypes.fetchQuery, {
          algorithmId,
          handleNoAlgorithm,
          db,
          dispatch,
          onRequestDone: (query, xhr, db) => dispatch(BuilderActions.queryLoaded(query, xhr, db)),
          changeQuery: BuilderActions.changeQuery;
      })),

    // load query from server into state
    queryLoaded:
      (query: Query, xhr: XMLHttpRequest, db: BackendInstance) =>
      (dispatch) =>
        dispatch($(ActionTypes.queryLoaded, { query, xhr, db, dispatch })),

    save:
      (failed?: boolean) =>
        $(ActionTypes.save, { failed }),

    undo:
      () =>
        $(ActionTypes.undo, {}),

    redo:
      () =>
        $(ActionTypes.redo, {}),

    checkpoint:
      () =>
        $(ActionTypes.checkpoint, {}),

    changeResultsConfig:
      (resultsConfig) =>
        $(ActionTypes.changeResultsConfig, {
          resultsConfig,
        }),

    updateKeyPath:
      (id, keyPath) =>
        $(ActionTypes.updateKeyPath, {
          id,
          keyPath,
        }),

    results:
      (resultsState) =>
        $(ActionTypes.results, {
          resultsState,
        }),
  };

export default BuilderActions;
