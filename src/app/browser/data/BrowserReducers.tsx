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

BrowserReducers[ActionTypes.groups.create] =
  (state, action) =>
    {
      var newGroup = BrowserTypes.newGroup();
      const id = newGroup.get('id');
      return state
        .setIn(['groups', id], newGroup)
        .update('groupsOrder', order => order.push(id));
    }

BrowserReducers[ActionTypes.groups.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.group.id], action.payload.group);

BrowserReducers[ActionTypes.groups.move] =
  (state, action) =>
  {
    let id = state.getIn(['groupsOrder', action.payload.index]);
    return state
      .updateIn(['groupsOrder'], order => 
        order.splice(action.payload.index, 1)
          .splice(action.payload.newIndex + Util.moveIndexOffset(action.payload.index, action.payload.newIndex), 0, id)
        )
  }

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
      const { groupId } = action.payload;
      var newAlg = BrowserTypes.newAlgorithm(groupId);
      const id = newAlg.id;
      return state
        .setIn(['groups', groupId, 'algorithms', id], newAlg)
        .updateIn(['groups', groupId, 'algorithmsOrder'],
          order => order.push(id));
    }

BrowserReducers[ActionTypes.algorithms.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.algorithm.groupId, 'algorithms', action.payload.algorithm.id],
      action.payload.algorithm);

BrowserReducers[ActionTypes.algorithms.move] =
  (state, action) =>
  {
    let id = state.getIn(['groups', action.payload.groupId, 'algorithmsOrder', action.payload.index]);
    return state
      .updateIn(['groups', action.payload.groupId, 'algorithmsOrder'], order => 
        order.splice(action.payload.index, 1)
          .splice(action.payload.newIndex + Util.moveIndexOffset(action.payload.index, action.payload.newIndex), 0, id)
        )
  }

let duplicateAlgorithm = (algorithm, id, groupId) =>
{
  var idMap = {};
  return algorithm.set('id', id)
    .set('name', 'Copy of ' + algorithm.name)
    .set('groupId', groupId)
    .update('variants', variants => variants.reduce(
      (memo, value, key) =>
      {
        var vid = Util.getId();
        idMap[key] = vid;
        return memo.set(vid, value.set('id', vid)
          .set('groupId', groupId)
          .set('name', 'Copy of ' + value.name)
          .set('algorithmId', id));
      },
      Immutable.Map({})))
    .update('variantsOrder', order => 
      order.map(oldId => idMap[oldId]))
}

BrowserReducers[ActionTypes.algorithms.duplicate] =
  (state, action) =>
  {
    var id = Util.getId();
    let { algorithm } = action.payload;
    return state
      .setIn(['groups', algorithm.groupId, 'algorithms', id], 
        duplicateAlgorithm(algorithm, id, algorithm.groupId))
      .updateIn(['groups', action.payload.algorithm.groupId, 'algorithmsOrder'],
        order => order.splice(action.payload.index, 0, id))
  }


BrowserReducers[ActionTypes.variants.create] =
  (state, action) =>
    {
      const { groupId, algorithmId } = action.payload;
      const v = BrowserTypes.newVariant(algorithmId, groupId);
      const id = v.id;
      return state
        .setIn(['groups', groupId, 'algorithms', algorithmId, 'variants', id], v)
        .updateIn(['groups', groupId, 'algorithms', algorithmId, 'variantsOrder'],
          order => order.push(id));
    }

BrowserReducers[ActionTypes.variants.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.variant.groupId, 'algorithms',
        action.payload.variant.algorithmId, 'variants', action.payload.variant.id],
      action.payload.variant);

BrowserReducers[ActionTypes.variants.move] =
  (state, action) =>
  {
    let { groupId, algorithmId, index, newIndex } = action.payload;
    let id = state.getIn(['groups', groupId, 'algorithms', algorithmId, 'variantsOrder', index]);
    return state
      .updateIn(['groups', groupId, 'algorithms', algorithmId, 'variantsOrder'], order => 
        order.splice(index, 1)
          .splice(newIndex + Util.moveIndexOffset(index, newIndex), 0, id)
        )
  }

BrowserReducers[ActionTypes.variants.duplicate] =
  (state, action) =>
  {
    var id = Util.getId();
    return state
      .setIn(['groups', action.payload.variant.groupId, 'algorithms', action.payload.variant.algorithmId, 'variants', id],
        action.payload.variant.set('id', id)
          .set('name', 'Copy of ' + action.payload.variant.name))
      .updateIn(['groups', action.payload.variant.groupId, 'algorithms', action.payload.variant.algorithmId, 'variantsOrder'],
        order => order.splice(action.payload.index, 0, id))
  }
  
  
export default BrowserReducers;
