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
        .update('groupsOrdering', ordering => ordering.push(id));
    }

BrowserReducers[ActionTypes.groups.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.group.id], action.payload.group);

BrowserReducers[ActionTypes.algorithms.create] =
  (state, action) =>
    {
      const { groupId } = action.payload;
      var newAlg = BrowserTypes.newAlgorithm(groupId);
      const id = newAlg.id;
      return state
        .setIn(['groups', groupId, 'algorithms', id], newAlg)
        .updateIn(['groups', groupId, 'algorithmsOrdering'],
          ordering => ordering.push(id));
    }

BrowserReducers[ActionTypes.algorithms.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.algorithm.groupId, 'algorithms', action.payload.algorithm.id],
      action.payload.algorithm);

BrowserReducers[ActionTypes.variants.create] =
  (state, action) =>
    {
      const { groupId, algorithmId } = action.payload;
      const v = BrowserTypes.newVariant(algorithmId, groupId);
      const id = v.id;
      return state
        .setIn(['groups', groupId, 'algorithms', algorithmId, 'variants', id], v)
        .updateIn(['groups', groupId, 'algorithms', algorithmId, 'variantsOrdering'],
          ordering => ordering.push(id));
    }

BrowserReducers[ActionTypes.variants.change] =
  (state, action) =>
    state.setIn(['groups', action.payload.variant.groupId, 'algorithms',
        action.payload.variant.algorithmId, 'variants', action.payload.variant.id],
      action.payload.variant);

export default BrowserReducers;
