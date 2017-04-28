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

import * as _ from 'underscore';
import Util from './../../util/Util';
import LibraryTypes from './../LibraryTypes';
import ActionTypes from './LibraryActionTypes';
import {LibraryState} from './LibraryStore';
const {EVariantStatus} = LibraryTypes;

const Immutable = require('immutable');

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

const addItem = (state: LibraryState, item, parentKeyPath: Array<string | ID>, type: string, index?: number) => {
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
  (state, action) =>
    addGroup(state, LibraryTypes._Group());

LibraryReducers[ActionTypes.groups.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.group.id], action.payload.group);

LibraryReducers[ActionTypes.groups.move] =
  (state, action) =>
    addGroup(removeGroup(state, action.payload.group), action.payload.group, action.payload.index);

// LibraryReducers[ActionTypes.groups.duplicate] =
//   (state, action) =>
//   {
//     var id = Util.getId();
//     var idMap = {};
//     var { group } = action.payload;
//     return state
//       .update('algorithms', algorithms =>
//         algorithms.reduce((memo, algorithm, key) =>
//         {
//           if(algorithm.groupId === action.payload.groupId)
//           {
//             let aid = Util.getId();
//             idMap[key] = aid;
//             memo = memo.set(aid, duplicateAlgorithm(algorithm, aid, id));
//           }
//           return memo.set(algorithm.id, algorithm);
//         }, Immutable.Map({}))
//       )
//       .setIn(['groups', id], group
//         .set('id', id)
//         .set('name', 'Copy of ' + group.name)
//         .update('algorithmsOrder', order =>
//           order.map(oldId => idMap[oldId]))
//       )
//       .updateIn(['groupsOrder'],
//         order => order.splice(action.payload.index, 0, id))
//   }

LibraryReducers[ActionTypes.algorithms.create] =
  (state, action) =>
  {
    const algId = Util.getId();
    const db = state.groups.get(action.payload.groupId).db || undefined;
    return addVariant(
      addAlgorithm(
        state,
        LibraryTypes._Algorithm({
          groupId: action.payload.groupId,
          id: algId,
          db,
        }),
      ),
      LibraryTypes._Variant({
        algorithmId: algId,
        groupId: action.payload.groupId,
        db,
      }),
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
    const {algorithm, groupId} = action.payload;
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
        algorithm.set('groupId', groupId),
        action.payload.index,
    );
  };

const duplicateAlgorithm = (algorithm, id, groupId, variantIdMap) =>
{
  return algorithm
    .set('id', id)
    .set('name', 'Copy of ' + algorithm.name)
    .set('groupId', groupId || algorithm.groupId)
    .update('variantsOrder',
      (order) =>
        order.map((oldId) => variantIdMap[oldId]),
    );
};

LibraryReducers[ActionTypes.algorithms.duplicate] =
  (state, action) =>
  {
    let {algorithm, groupId, index} = action.payload;
    groupId = groupId || algorithm.groupId;
    const variantIdMap = {};
    const newAlgorithmId = Util.getId();

    state = state.update(
      'variants',
      (variants) =>
        variants.reduce(
          (variantsMemo, variant, variantId) =>
          {
            if (variant.algorithmId === algorithm.id)
            {
              const newId = Util.getId();
              variantIdMap[variantId] = newId;
              variantsMemo = variantsMemo
                .set(
                  newId,
                  variant
                    .set('id', newId)
                    .set('groupId', groupId)
                    .set('algorithmId', newAlgorithmId),
                );
            }
            return variantsMemo
              .set(variantId, variant);
          },
          Immutable.Map({}),
        ),
    );
    return addAlgorithm(
      state,
      duplicateAlgorithm(
        algorithm,
        newAlgorithmId,
        groupId,
        variantIdMap,
      ),
      index,
    );
  };

LibraryReducers[ActionTypes.variants.create] =
  (state, action) =>
    addVariant(state,
      LibraryTypes._Variant({
        algorithmId: action.payload.algorithmId,
        groupId: action.payload.groupId,
        db: state.algorithms.get(action.payload.algorithmId).db || undefined,
      }),
    );

LibraryReducers[ActionTypes.variants.change] =
  (state, action) =>
    state.setIn(
      ['variants', action.payload.variant.id],
      action.payload.variant,
    );

LibraryReducers[ActionTypes.variants.status] =
  (state, action) =>
  {
    let {variant, status, confirmed, isDefault} = action.payload;
    isDefault = !! isDefault;

    if (variant === null)
    {
      return state.set('changingStatus', false);
    }

    if (
      !confirmed &&
      (status === EVariantStatus.Live || variant.status === EVariantStatus.Live)
    )
    {
      return state
        .set('changingStatus', true)
        .set('changingStatusOf', variant)
        .set('changingStatusTo', status)
        .set('changingStatusDefault', isDefault)
        ;
    }

    if (isDefault)
    {
      // remove any currently default variants
      state = state.updateIn(
        ['variants'],
        (variants) =>
          variants.map(
            (v: LibraryTypes.Variant) =>
              v.algorithmId === variant.algorithmId ?
                v.set('isDefault', false)
              :
                v,
          ),
        );
    }

    return state
      .updateIn(
        ['variants', variant.id],
        (v) => v.set('status', status)
                .set('isDefault', isDefault),
      )
      .set('changingStatus', false);
  };

LibraryReducers[ActionTypes.variants.move] =
  (state, action) =>
    addVariant(removeVariant(state, action.payload.variant),
      action.payload.variant
        .set('groupId', action.payload.groupId)
        .set('algorithmId', action.payload.algorithmId),
      action.payload.index);

const duplicateVariant = (variant, id, groupId?, algorithmId?) =>
{
  return variant.set('id', id)
    .set('name', 'Copy of ' + variant.name)
    .set('groupId', groupId || variant.groupId)
    .set('algorithmId', algorithmId || variant.algorithmId)
    .set('status', LibraryTypes.EVariantStatus.Build)
    .set('isDefault', false)
    ;
};

LibraryReducers[ActionTypes.variants.duplicate] =
  (state, action) =>
    addVariant(state,
      duplicateVariant(
        LibraryTypes.touchVariant(action.payload.variant),
        Util.getId(), action.payload.groupId, action.payload.algorithmId),
      action.payload.index);

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
    state.set('dbs', action.payload.dbs);

LibraryReducers[ActionTypes.variants.loadVersion] =
  (
    state: LibraryState,
    action: Action<{
      variantId: string,
      variantVersion: LibraryTypes.Variant,
    }>,
  ) =>
    state.setIn(['variants', action.payload.variantId], action.payload.variantVersion);

export default LibraryReducers;
