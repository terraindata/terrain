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
  state.removeIn([type, id])
    .updateIn(parentKeyPath.concat([type + 'Order']), (order) =>
      order.filter((value) => value !== id),
  );

const removeVariant = (state: LibraryState, variant) =>
  removeItem(state, variant.id, ['groups', variant.groupId], 'variants');
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
const addVariant = (state: LibraryState, variant, index?: number) =>
  addItem(state, variant, ['groups', variant.groupId], 'variants', index);
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
      state = state.update('variants',
        (variants) => variants.map(
          (variant: LibraryTypes.Variant) =>
          {
            if (variant.groupId === group.id)
            {
              return variant.set('categoryId', categoryId);
            }
            return variant;
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
              if (v.groupId === variant.groupId && v.status === 'DEFAULT')
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
      .set('prevVariants', action.payload.state.variants)
      ;
  };

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
    saveStateOf(nextState.categories, nextState.prevCategories);
    saveStateOf(nextState.groups, nextState.prevGroups);
    saveStateOf(nextState.variants, nextState.prevVariants);
  }
  nextState = nextState
    .set('prevCategories', nextState.categories)
    .set('prevGroups', nextState.groups)
    .set('prevVariants', nextState.variants);

  return nextState;
};

export default LibraryReducersWrapper;
