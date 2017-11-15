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
import Ajax from 'util/Ajax';
import { ItemStatus } from '../../../items/types/Item';
import * as LibraryTypes from './../LibraryTypes';
import ActionTypes, { CleanLibraryActionTypes, LibraryActionTypes } from './LibraryActionTypes';
import { _LibraryState, LibraryState } from './LibraryStore';

const LibraryReducers = {};

const removeItem = (state: LibraryState, id: ID, parentKeyPath: Array<string | ID>, type: string) =>
  state.removeIn([type + 's', id])
    .updateIn(parentKeyPath.concat([type + 'sOrder']), (order) =>
      order.filter((value) => value !== id),
  );

const removeVariant = (state: LibraryState, variant) =>
  removeItem(state, variant.id, ['algorithms', variant.algorithmId], 'variant');
const removeAlgorithm = (state: LibraryState, algorithm) =>
  removeItem(state, algorithm.id, ['groups', algorithm.groupId], 'algorithm');
const removeGroup = (state: LibraryState, group) =>
  removeItem(state, group.id, [], 'group');

const addItem = (state: LibraryState, item, parentKeyPath: Array<string | ID>, type: string, index?: number) =>
{
  state = state.setIn([type + 's', item.id], item)
    .updateIn(parentKeyPath.concat([type + 'sOrder']),
    (order) => order.splice(index === undefined ? order.size : index, 0, item.id));
  return state;
};

// assumes the objec'ts `groupId` and `algorithmId` keys are set
const addVariant = (state: LibraryState, variant, index?: number) =>
  addItem(state, variant, ['algorithms', variant.algorithmId], 'variant', index);
const addAlgorithm = (state: LibraryState, algorithm, index?: number) =>
  addItem(state, algorithm, ['groups', algorithm.groupId], 'algorithm', index);
const addGroup = (state: LibraryState, group, index?: number) =>
  addItem(state, group, [], 'group', index);

LibraryReducers[ActionTypes.groups.create] =
  (state, action: Action<{
    group: LibraryTypes.Group,
  }>) =>
    addGroup(state, action.payload.group);

LibraryReducers[ActionTypes.groups.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.group.id], action.payload.group);

LibraryReducers[ActionTypes.groups.move] =
  (state, action) =>
    addGroup(removeGroup(state, action.payload.group), action.payload.group, action.payload.index);

LibraryReducers[ActionTypes.algorithms.create] =
  (state, action: Action<{
    algorithm: LibraryTypes.Algorithm,
  }>) =>
  {
    return addAlgorithm(
      state,
      action.payload.algorithm,
    );
  };

LibraryReducers[ActionTypes.algorithms.change] =
  (state, action) =>
    state.setIn(
      ['algorithms', action.payload.algorithm.id],
      action.payload.algorithm,
    );

LibraryReducers[ActionTypes.algorithms.move] =
  (state, action) =>
  {
    const { algorithm, groupId } = action.payload;
    if (groupId !== algorithm.groupId)
    {
      state = state.update('variants',
        (variants) => variants.map(
          (variant: LibraryTypes.Variant) =>
          {
            if (variant.algorithmId === algorithm.id)
            {
              return variant.set('groupId', groupId);
            }
            return variant;
          },
        ),
      );
    }

    return addAlgorithm(
      removeAlgorithm(state, algorithm),
      algorithm.set('groupId', groupId).set('parent', groupId),
      action.payload.index,
    );
  };

LibraryReducers[ActionTypes.variants.create] =
  (state, action: Action<{
    variant: LibraryTypes.Variant,
  }>) =>
    addVariant(
      state,
      action.payload.variant,
    );

LibraryReducers[ActionTypes.variants.change] =
  (state, action) =>
  {
    return state.setIn(
      ['variants', action.payload.variant.id],
      action.payload.variant,
    );
  };

LibraryReducers[ActionTypes.variants.status] =
  (state, action) =>
  {
    const { variant, status, confirmed } = action.payload;

    if (variant === null)
    {
      return state.set('changingStatus', false);
    }

    if (
      !confirmed &&
      (status === ItemStatus.Live || variant.status === ItemStatus.Live
        || status === ItemStatus.Default || variant.status === ItemStatus.Default)
    )
    {
      return state
        .set('changingStatus', true)
        .set('changingStatusOf', variant)
        .set('changingStatusTo', status)
        ;
    }

    if (status === 'DEFAULT')
    {
      // remove any currently default variants
      state = state.updateIn(
        ['variants'],
        (variants) =>
          variants.map(
            (v: LibraryTypes.Variant) =>
            {
              if (v.algorithmId === variant.algorithmId && v.status === 'DEFAULT')
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
      ['variants', variant.id],
      (v) => v.set('status', status),
    )
      .set('changingStatus', false);
  };

LibraryReducers[ActionTypes.variants.move] =
  (state, action) =>
    addVariant(
      removeVariant(state, action.payload.variant),
      action.payload.variant
        .set('groupId', action.payload.groupId)
        .set('algorithmId', action.payload.algorithmId)
        .set('parent', action.payload.algorithmId),
      action.payload.index,
    );

LibraryReducers[ActionTypes.loadState] =
  (state, action) =>
    action.payload.state
      .set('loaded', true)
      .set('loading', false)
      .set('prevGroups', action.payload.state.groups)
      .set('prevAlgorithms', action.payload.state.algorithms)
      .set('prevVariants', action.payload.state.variants)
  ;

LibraryReducers[ActionTypes.setDbs] =
  (state, action) =>
    state.set('dbs', action.payload.dbs)
      .set('dbsLoaded', action.payload.dbLoadFinished);

LibraryReducers[ActionTypes.variants.loadVersion] =
  (
    state: LibraryState,
    action: Action<{
      variantId: string,
      variantVersion: LibraryTypes.Variant,
    }>,
  ) =>
    state.setIn(['variants', action.payload.variantId], action.payload.variantVersion);

LibraryReducers[ActionTypes.variants.select] =
  (
    state: LibraryState,
    action: Action<{
      variantId: string,
    }>,
  ) =>
  {
    return state.set('selectedVariant', parseInt(action.payload.variantId, 10));
  };

LibraryReducers[ActionTypes.variants.unselect] =
  (
    state: LibraryState,
    action: Action<{
      variantId: string,
    }>,
  ) =>
  {
    return state.set('selectedVariant', null);
  };

function saveStateOf(current: IMMap<ID, any>, previous: IMMap<ID, any>)
{
  if (current !== previous && current !== null && previous !== null)
  {
    current.map((curItem: any, curId: ID) =>
    {
      const prevItem = previous.get(curId);
      if (curItem !== prevItem)
      {
        // should save
        Ajax.saveItem(curItem);
      }
    });
  }
}

const LibraryReducersWrapper = (state: LibraryState = _LibraryState(), action) =>
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
    saveStateOf(nextState.groups, nextState.prevGroups);
    saveStateOf(nextState.algorithms, nextState.prevAlgorithms);
    saveStateOf(nextState.variants, nextState.prevVariants);
  }

  nextState = nextState
    .set('prevGroups', nextState.groups)
    .set('prevAlgorithms', nextState.algorithms)
    .set('prevVariants', nextState.variants);

  return nextState;
};

export default LibraryReducersWrapper;
