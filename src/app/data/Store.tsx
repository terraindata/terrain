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

var _ = require('underscore');
var Immutable = require('immutable');
import * as ReduxActions from 'redux-actions';

var Redux = require('redux');
import ActionTypes from './ActionTypes.tsx';
import Util from '../util/Util.tsx';

import { CardModels } from './../models/CardModels.tsx';

var defaultStateJson = require('./json/_state.json');
var descriptions = require('./json/_descriptions.json');

_.map(defaultStateJson, (algorithm, parentId) => {

  var initCard = (card) => {
    var card = _.extend(card, {parentId: parentId});
    if(card.type === 'transform')
    {
      Util.populateTransformDummyData(card);
    }
    if(card.cards)
    {
      card.cards = card.cards.map(initCard);
    }
    return card;
  }

  algorithm.cards = algorithm.cards.map(initCard);
  
  algorithm.inputs.map((input) => input.parentId = parentId);
  algorithm.results.map((result, index) => 
    {
      result.parentId = parentId
      result.score = 100 - index * 4;
      result.description = descriptions[index];
    });
});

var DefaultState = Immutable.fromJS(defaultStateJson);

import AlgorithmReducer from './reducers/builder/AlgorithmReducer.tsx';
import InputsReducer from './reducers/builder/InputsReducer.tsx';
import ResultsReducer from './reducers/builder/ResultsReducer.tsx';
import CardsReducer from './reducers/builder/CardsReducer.tsx';
import FromCardReducer from './reducers/builder/FromCardReducer.tsx';
import ScoreCardReducer from './reducers/builder/ScoreCardReducer.tsx';
import LetCardReducer from './reducers/builder/LetCardReducer.tsx';
import SortCardReducer from './reducers/builder/SortCardReducer.tsx';
import FilterCardReducer from './reducers/builder/FilterCardReducer.tsx';
import SelectCardReducer from './reducers/builder/SelectCardReducer.tsx';
import TransformCardReducer from './reducers/builder/TransformCardReducer.tsx';

let Store = Redux.createStore(ReduxActions.handleActions(_.extend({},
  AlgorithmReducer,
  ResultsReducer,
  CardsReducer,
  FromCardReducer,
  InputsReducer,
  ScoreCardReducer,
  LetCardReducer,
  SortCardReducer,
  FilterCardReducer,
  SelectCardReducer,
  TransformCardReducer,
{})), DefaultState);

export default Store;