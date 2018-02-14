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

import * as Immutable from 'immutable';
import { ItemStatus } from '../../../items/types/Item';
import { _LibraryState, LibraryState } from '../LibraryTypes';
import * as LibraryTypes from './../LibraryTypes';
import ActionTypes, { CleanLibraryActionTypes, LibraryActionTypes } from './LibraryActionTypes';

const LibraryReducers = {};

const removeItem = (state: LibraryState, id: ID, parentKeyPath: Array<string | ID>, type: string) =>
  state.removeIn([type, id])
    .updateIn(parentKeyPath.concat([type + 'Order']), (order) =>
      order.filter((value) => value !== id),
  );

const removeAlgorithm = (state: LibraryState, algorithm) =>
  removeItem(state, algorithm.id, ['groups', algorithm.groupId], 'algorithms');
const removeGroup = (state: LibraryState, group) =>
  removeItem(state, group.id, ['categories', group.categoryId], 'groups');
const removeCategory = (state: LibraryState, category) =>
  removeItem(state, category.id, [], 'categories');

const addItem = (state: LibraryState, item, parentKeyPath: Array<string | ID>, type: string, index?: number) =>
{
  state = state.setIn([type, item.id], item)
    .updateIn(parentKeyPath.concat([type + 'Order']),
      (order) => order.splice(index === undefined ? order.size : index, 0, item.id));
  return state;
};

// assumes the objec'ts `categoryId` and `groupId` keys are set
const addAlgorithm = (state: LibraryState, algorithm, index?: number) =>
  addItem(state, algorithm, ['groups', algorithm.groupId], 'algorithms', index);
const addGroup = (state: LibraryState, group, index?: number) =>
  addItem(state, group, ['categories', group.categoryId], 'groups', index);
const addCategory = (state: LibraryState, category, index?: number) =>
  addItem(state, category, [], 'categories', index);

LibraryReducers[ActionTypes.categories.create] =
  (state, action: Action<{
    category: LibraryTypes.Category,
  }>) =>
    addCategory(state, action.payload.category);

LibraryReducers[ActionTypes.categories.change] =
  (state, action) =>
    state.setIn(['categories', action.payload.category.id], action.payload.category);

LibraryReducers[ActionTypes.categories.move] =
  (state, action) =>
    addCategory(removeCategory(state, action.payload.category), action.payload.category, action.payload.index);

LibraryReducers[ActionTypes.groups.create] =
  (state, action: Action<{
    group: LibraryTypes.Group,
  }>) =>
  {
    return addGroup(
      state,
      action.payload.group,
    );
  };

LibraryReducers[ActionTypes.groups.change] =
  (state, action) =>
    state.setIn(
      ['groups', action.payload.group.id],
      action.payload.group,
    );

LibraryReducers[ActionTypes.groups.move] =
  (state, action) =>
  {
    const { group, categoryId } = action.payload;
    if (categoryId !== group.categoryId)
    {
      state = state.update('algorithms',
        (algorithms) => algorithms.map(
          (algorithm: LibraryTypes.Algorithm) =>
          {
            if (algorithm.groupId === group.id)
            {
              return algorithm.set('categoryId', categoryId);
            }
            return algorithm;
          },
        ),
      );
    }

    return addGroup(
      removeGroup(state, group),
      group.set('categoryId', categoryId).set('parent', categoryId),
      action.payload.index,
    );
  };

LibraryReducers[ActionTypes.algorithms.create] =
  (state, action: Action<{
    algorithm: LibraryTypes.Algorithm,
  }>) =>
    addAlgorithm(
      state,
      action.payload.algorithm,
    );

LibraryReducers[ActionTypes.algorithms.change] =
  (state, action) =>
  {
    return state.setIn(
      ['algorithms', action.payload.algorithm.id],
      action.payload.algorithm,
    );
  };

LibraryReducers[ActionTypes.algorithms.status] =
  (state, action) =>
  {
    const { algorithm, status, confirmed } = action.payload;

    if (algorithm === null)
    {
      return state.set('changingStatus', false);
    }

    if (
      !confirmed &&
      (status === ItemStatus.Live || algorithm.status === ItemStatus.Live
        || status === ItemStatus.Default || algorithm.status === ItemStatus.Default)
    )
    {
      return state
        .set('changingStatus', true)
        .set('changingStatusOf', algorithm)
        .set('changingStatusTo', status)
        ;
    }

    if (status === 'DEFAULT')
    {
      // remove any currently default algorithms
      state = state.updateIn(
        ['algorithms'],
        (algorithms) =>
          algorithms.map(
            (v: LibraryTypes.Algorithm) =>
            {
              if (v.groupId === algorithm.groupId && v.status === 'DEFAULT')
              {
                return v.set('status', 'LIVE');
              }
              return v;
            },
          ),
      );
    }

    return state
      .updateIn(
        ['algorithms', algorithm.id],
        (v) => v.set('status', status),
    )
      .set('changingStatus', false);
  };

LibraryReducers[ActionTypes.algorithms.move] =
  (state, action) =>
    addAlgorithm(
      removeAlgorithm(state, action.payload.algorithm),
      action.payload.algorithm
        .set('categoryId', action.payload.categoryId)
        .set('groupId', action.payload.groupId)
        .set('parent', action.payload.groupId),
      action.payload.index,
    );

LibraryReducers[ActionTypes.loadState] =
  (state, action) =>
  {
    return action.payload.state
      .set('loaded', true)
      .set('loading', false)
      .set('prevCategories', action.payload.state.categories)
      .set('prevGroups', action.payload.state.groups)
      .set('prevAlgorithms', action.payload.state.algorithms)
      ;
  };

LibraryReducers[ActionTypes.setDbs] =
  (state, action) =>
    state.set('dbs', action.payload.dbs)
      .set('dbsLoaded', action.payload.dbLoadFinished);

LibraryReducers[ActionTypes.algorithms.loadVersion] =
  (
    state: LibraryState,
    action: Action<{
      algorithmId: string,
      algorithmVersion: LibraryTypes.Algorithm,
    }>,
  ) =>
    state.setIn(['algorithms', action.payload.algorithmId], action.payload.algorithmVersion);

LibraryReducers[ActionTypes.algorithms.select] =
  (
    state: LibraryState,
    action: Action<{
      algorithmId: string,
    }>,
  ) =>
  {
    return state.set('selectedAlgorithm', parseInt(action.payload.algorithmId, 10));
  };

LibraryReducers[ActionTypes.algorithms.unselect] =
  (
    state: LibraryState,
    action: Action<{}>,
  ) =>
  {
    return state.set('selectedAlgorithm', null);
  };

function saveStateOf(current: IMMap<ID, any>, previous: IMMap<ID, any>, api)
{
  if (current !== previous && current !== null && previous !== null)
  {
    current.map((curItem: any, curId: ID) =>
    {
      const prevItem = previous.get(curId);
      if (curItem !== prevItem)
      {
        // should save
        api.saveItem(curItem);
      }
    });
  }
}

const LibraryReducersWrapper = (state: LibraryState = LibraryTypes._LibraryState(), action) =>
{
  const versioning = action.payload !== undefined ? action.payload.versioning : false;
  let nextState = state;
  if (LibraryReducers[action.type])
  {
    nextState = LibraryReducers[action.type](state, action);
  }

  if (versioning === true && CleanLibraryActionTypes.indexOf(action.type) === -1)
  {
    // save the new state
    saveStateOf(nextState.categories, nextState.prevCategories, state.api);
    saveStateOf(nextState.groups, nextState.prevGroups, state.api);
    saveStateOf(nextState.algorithms, nextState.prevAlgorithms, state.api);
  }
  nextState = nextState
    .set('prevCategories', nextState.categories)
    .set('prevGroups', nextState.groups)
    .set('prevAlgorithms', nextState.algorithms);

  return nextState;
};

export default LibraryReducersWrapper;
