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
import ActionTypes from './BrowserActionTypes.tsx';
import Util from './../../util/Util.tsx';
import BrowserTypes from './../BrowserTypes.tsx';
var Immutable = require('immutable');

var BrowserReducers = {};

let removeItem = (state, id: ID, parentKeyPath: (string | ID)[], type: string) =>
  state.removeIn(parentKeyPath.concat([type + 's', id]))
    .updateIn(parentKeyPath.concat([type + 'sOrder']), order =>
      order.filter(value => value !== id)
    );

let removeVariant = (state, variant) =>
  removeItem(state, variant.id, ['groups', variant.groupId, 'algorithms', variant.algorithmId], 'variant');
let removeAlgorithm = (state, algorithm) =>
  removeItem(state, algorithm.id, ['groups', algorithm.groupId], 'algorithm');
let removeGroup = (state, group) =>
  removeItem(state, group.id, [], 'group');

let addItem = (state, item, parentKeyPath: (string | ID)[], type: string, index?: number) => {
  state = state.setIn(parentKeyPath.concat([type + 's', item.id]), item)
    .updateIn(parentKeyPath.concat([type + 'sOrder']),
      order => order.splice(index === undefined ? order.size : index, 0, item.id));
  return state;
}

// assumes the objec'ts `groupId` and `algorithmId` keys are set
let addVariant = (state, variant, index?: number) =>
  addItem(state, variant, ['groups', variant.groupId, 'algorithms', variant.algorithmId], 'variant', index);
let addAlgorithm = (state, algorithm, index?: number) =>
  addItem(state, algorithm, ['groups', algorithm.groupId], 'algorithm', index);
let addGroup = (state, group, index?: number) =>
  addItem(state, group, [], 'group', index);

BrowserReducers[ActionTypes.groups.create] =
  (state, action) =>
    addGroup(state, BrowserTypes.newGroup().set('id', Util.getId()));

BrowserReducers[ActionTypes.groups.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.group.id], action.payload.group);

BrowserReducers[ActionTypes.groups.move] =
  (state, action) =>
    addGroup(removeGroup(state, action.payload.group), action.payload.group, action.payload.index);

BrowserReducers[ActionTypes.groups.duplicate] =
  (state, action) =>
  {
    var id = Util.getId();
    var idMap = {};
    var { group } = action.payload;
    return state
      .setIn(['groups', id], group
        .set('id', id)
        .set('name', 'Copy of ' + group.name)
        .update('algorithms', algorithms =>
          algorithms.reduce((memo, algorithm, key) =>
          {
            let aid = Util.getId();
            idMap[key] = aid;
            return memo.set(aid, duplicateAlgorithm(algorithm, aid, id));
          }, Immutable.Map({}))
        )
        .update('algorithmsOrder', order => 
          order.map(oldId => idMap[oldId]))
      )
      .updateIn(['groupsOrder'],
        order => order.splice(action.payload.index, 0, id))
  }



BrowserReducers[ActionTypes.algorithms.create] =
  (state, action) =>
  {
    let algId = Util.getId();
    return addVariant(
      addAlgorithm(state, BrowserTypes.newAlgorithm(action.payload.groupId, algId)),
      BrowserTypes.newVariant(algId, action.payload.groupId)
    );
  }

BrowserReducers[ActionTypes.algorithms.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.algorithm.groupId, 'algorithms', action.payload.algorithm.id],
      action.payload.algorithm);

BrowserReducers[ActionTypes.algorithms.move] =
  (state, action) =>
    addAlgorithm(removeAlgorithm(state, action.payload.algorithm),
      action.payload.algorithm
        .set('groupId', action.payload.groupId)
        .update('variants', variants => variants.map(
          v => v.set('groupId', action.payload.groupId)
        ))
      ,
      action.payload.index);

let duplicateAlgorithm = (algorithm, id, groupId) =>
{
  var idMap = {};
  return algorithm.set('id', id)
    .set('name', 'Copy of ' + algorithm.name)
    .set('groupId', groupId || algorithm.groupId)
    .update('variants', variants => variants.reduce(
      (memo, value, key) =>
      {
        var vid = Util.getId();
        idMap[key] = vid;
        return memo.set(vid, value.set('id', vid)
          .set('groupId', groupId || algorithm.groupId)
          .set('name', 'Copy of ' + value.name)
          .set('algorithmId', id));
      },
      Immutable.Map({})))
    .update('variantsOrder', order => 
      order.map(oldId => idMap[oldId]))
}

BrowserReducers[ActionTypes.algorithms.duplicate] =
  (state, action) =>
    addAlgorithm(state,
      duplicateAlgorithm(action.payload.algorithm, Util.getId(), action.payload.groupId),
      action.payload.index);

BrowserReducers[ActionTypes.variants.create] =
  (state, action) =>
    addVariant(state, BrowserTypes.newVariant(action.payload.algorithmId, action.payload.groupId, Util.getId()));

BrowserReducers[ActionTypes.variants.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.variant.groupId, 'algorithms',
        action.payload.variant.algorithmId, 'variants', action.payload.variant.id],
      action.payload.variant);

BrowserReducers[ActionTypes.variants.move] =
  (state, action) =>
    addVariant(removeVariant(state, action.payload.variant),
      action.payload.variant
        .set('groupId', action.payload.groupId)
        .set('algorithmId', action.payload.algorithmId),
      action.payload.index);

let duplicateVariant = (variant, id, groupId?, algorithmId?) =>
{
  return variant.set('id', id)
    .set('name', 'Copy of ' + variant.name)
    .set('groupId', groupId || variant.groupId)
    .set('algorithmId', algorithmId || variant.algorithmId)
    .set('status', BrowserTypes.EVariantStatus.Build)
    ;
}

BrowserReducers[ActionTypes.variants.duplicate] =
  (state, action) =>
    addVariant(state, 
      duplicateVariant(
        BrowserTypes.touchVariant(action.payload.variant), 
        Util.getId(), action.payload.groupId, action.payload.algorithmId),
      action.payload.index);



BrowserReducers[ActionTypes.loadState] =
  (state, action) => 
    action.payload.state.set('prevGroups', action.payload.state.get('groups'));

export default BrowserReducers;


