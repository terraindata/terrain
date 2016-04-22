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

import { CardModels } from './../../../models/CardModels.tsx';


var CardsReducer = {};

CardsReducer[ActionTypes.cards.create] =
  (state, action) => {
    return Util.immutableCardsUpdate(state, 'cards', action.payload.parentId, cards => {
      var newCard: any = {};
      
      switch(action.payload.type)
      {
        case 'select':
          newCard = 
          {
            properties: [{
              property: '',
              id: '' + Math.random(),
            }],
          };
          break;
        case 'from':
          newCard = 
          {
            type: 'from',
            group: '',
            iterator: '',
            joins: [],
            cards: [],
          };
          break;
        case 'sort':
          newCard =
          {
            sorts:
            [
              {
                id: 's' + Math.random(),
                property: '',
                direction: CardModels.Direction.DESC,
              }
            ]
          };
          break;
        case 'filter':
          newCard =
          {
            filters:
            [
              {
                condition:
                {
                  first: '',
                  second: '',
                  operator: 0,
                },
                combinator: 0,
                id: 'co' + Math.random(),
              }
            ],
          };
          break;
        case 'transform':
          newCard =
          {
            input: '',
            output: '',
          };
          Util.populateTransformDummyData(newCard);
          break;
        case 'let':
        case 'var':
          newCard =
          {
            field: '',
            expression: '',
          };
          break;
        case 'score':
          newCard =
          {
            weights: [],
            method: '',
            output: '',
          };
          break;
        case 'if':
          newCard =
          {
            filters:
            [
              {
                condition:
                {
                  first: '',
                  second: '',
                  operator: 0,
                },
                combinator: 0,
                id: 'co' + Math.random(),
              }
            ],
            cards: [],
            elses: [],
          };
          break;
        case 'sum':
        case 'avg':
        case 'min':
        case 'max':
        case 'count':
        case 'exists':
        case 'parentheses':
          newCard =
          {
            cards: [],
          };
          break;
      }
      
      newCard['type'] = action.payload.type;
      newCard['id'] = "c-"+Util.randInt(4815162342);
      newCard['parentId'] = action.payload.parentId;
      
      return cards.splice(action.payload.index, 0, Immutable.fromJS(newCard));
    });
  };

CardsReducer[ActionTypes.cards.move] =
  (state, action) => {
    var moveFn = (state, cardId) => 
    {
      var keyPath = Util.keyPathForId(state, cardId);
      var card = state.getIn(keyPath);
      state = state.removeIn(keyPath);
      var parentKeyPath = Util.keyPathForId(state, action.payload.parentId);
      if(parentKeyPath)
      {
        var shift = 0;
        keyPath.splice(keyPath.length - 2, 2);
        if(_.isEqual(keyPath, parentKeyPath))
        {
          // same area
          if(keyPath[keyPath.length - 1] < action.payload.index)
          {
            shift = -1;
          }
        }
        return state.updateIn(parentKeyPath.concat(['cards']), cards =>
          cards.splice(action.payload.index + shift, 0, card));
      }
      else
      {
        // we must have removed ourself, just re-insert the card where it was
        var index = keyPath.splice(-1, 1)[0];
        return state.updateIn(keyPath, cards => cards.splice(index, 0, card));
      }
    }
    
    var id = action.payload.card.id;
    var algorithmId = Util.keyPathForId(state, id)[1];
    
    if(state.getIn(['algorithms', algorithmId, 'selectedCardIds', id]))
    {
      // apply to selection
      return state.getIn(['algorithms', algorithmId, 'selectedCardIds'])
        .reduce((state, v, cid) => moveFn(state, cid), state);
    }
    
    return moveFn(state, action.payload.card.id)
      .setIn(['algorithms', algorithmId, 'selectedCardIds'],
        Immutable.fromJS({}));
  }

CardsReducer[ActionTypes.cards.remove] =
  (state, action) =>
  {
    var id = action.payload.card.id;
    var algorithmId = Util.keyPathForId(state, id)[1];
    
    var removeFn = (state, cardId) =>
    {
      var kp = Util.keyPathForId(state, cardId);
      if(!kp)
      {
        // card may have already been removed, e.g. if its parent was removed
        return state;
      }
      var index = kp.splice(-1, 1)[0];
      return state.updateIn(kp, cards => cards.remove(index))
    }
    
    if(state.getIn(['algorithms', algorithmId, 'selectedCardIds', id]))
    {
      // apply to selection
      return state.getIn(['algorithms', algorithmId, 'selectedCardIds'])
        .reduce((state, v, cid) => removeFn(state, cid), state);
    }
    
    return removeFn(state, action.payload.card.id);
  }

CardsReducer[ActionTypes.cards.change] =
  (state, action) =>
    Util.immutableCardsSetIn(state, action.payload.cardId, action.payload.keyPath, action.payload.value);

CardsReducer[ActionTypes.cards.selectCard] =
  (state, action) =>
    {
      var id = action.payload.cardId;
      if(id === null)
      {
        // unselect
        if(!action.payload.altKey && !action.payload.shiftKey)
        {
          return state.update('algorithms', algorithms => algorithms.map(algorithm => algorithm.set('selectedCardIds', Immutable.fromJS({}))));
        }
        return state;
      }
      
      var algorithmId = Util.keyPathForId(state, id)[1];
      var keyPath = ['algorithms', algorithmId, 'selectedCardIds'];
      var alreadySelected = state.getIn(keyPath.concat([id]));
      if(action.payload.altKey || action.payload.shiftKey)
      {
        if(alreadySelected)
        {
          return state.deleteIn(keyPath.concat([id]));
        }
        return state.setIn(keyPath.concat([id]), true);
      }
      
      if(alreadySelected)
      {
        // clicking a selected card does nothing
        return state;
      }
      
      var value = {};
      value[id] = true;
      return state.setIn(keyPath, Immutable.fromJS(value));
    }

export default CardsReducer;



