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

var Immutable = require('immutable');
import ActionTypes from './../../ActionTypes.tsx';
import Util from './../../../util/Util.tsx';
import * as _ from 'underscore';

var NEW_ALGORITHM = 
{
  inputs: [],
  cards: [],
  results: [],
  resultsPage: 1,
  resultsPages: 30,
  algorithmName: 'New Algorithm',
};

var currentparentId = 101;
var AlgorithmReducer = {};

AlgorithmReducer[ActionTypes.algorithm.create] =
  (state, action) => 
    state.setIn(["algorithms", "" + (currentparentId ++)], Immutable.fromJS(_.extend({}, NEW_ALGORITHM, {id: "alg-" + Util.randInt(1234567)})));

AlgorithmReducer[ActionTypes.algorithm.remove] =
  (state, action) =>
    state.deleteIn(["algorithms", action.payload.parentId]);

AlgorithmReducer[ActionTypes.algorithm.duplicate] =
  (state, action) => {
    var changeId = (node) => !node.map ? console.log(node) : node.map((value, key) => 
      key === 'id' ? "i" + Math.random() : 
        (Immutable.Iterable.isIterable(value) ? changeId(value) : value));
    
    var parentId = "alg-" + Math.random();
    return state.setIn(["algorithms", parentId],
        Immutable.fromJS(state.getIn(["algorithms", "" + action.payload.parentId]).toJS())
          .set('id', parentId)
      )
      .setIn(["algorithms", parentId, 'algorithmName'], 'Copy of ' + state.getIn(["algorithms", "" + action.payload.parentId, 'algorithmName']))
      .updateIn(["algorithms", parentId, 'results'], results =>
        results.map(result =>
          result.set('parentId', parentId))
        .map(changeId))
      .updateIn(["algorithms", parentId, 'cards'], cards =>
        cards.map(card =>
          card.set('parentId', parentId))
        .map(changeId))
      .updateIn(["algorithms", parentId, 'inputs'], inputs =>
        inputs.map(input =>
          input.set('parentId', parentId))
        .map(changeId))
      // .updateIn(["algorithms", parentId], algorithm => algorithm.map(changeId))
      ;
  }

AlgorithmReducer[ActionTypes.results.changePage] =
  (state, action) =>
    state.setIn(["algorithms", action.payload.parentId, 'resultsPage'], action.payload.page);

AlgorithmReducer[ActionTypes.algorithm.load] =
  (state, action) =>
    state.set("algorithms", Immutable.fromJS(action.payload.state));

export default AlgorithmReducer;
