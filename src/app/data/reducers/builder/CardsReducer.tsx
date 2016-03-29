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
            sort:
            {
              property: '',
              direction: CardModels.Direction.DESC,
            }
          };
          break;
        case 'filter':
          newCard =
          {
            filters: [],
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
          newCard =
          {
            field: '',
            expression: '',
            cards: [],
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
        case 'sum':
        case 'avg':
        case 'min':
        case 'max':
        case 'count':
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
    var betweenAreas = false;
    state = Util.immutableCardsUpdate(state, 'cards', action.payload.parentId, cards => {
      if(cards.find((card => card.get('id') === action.payload.card.id)))
      {
        return Util.immutableMove(cards, action.payload.card.id, action.payload.index)
      }
      
      // need to move the card between cards areas
      betweenAreas = true;
      return cards.splice(action.payload.index, 0, Immutable.fromJS(action.payload.card));
    });
    
    if(betweenAreas)
    {
      // remove from old area
      var removeFn = (cardsContainer) =>
      {
        if(cardsContainer.get('cards'))
        {
          return cardsContainer.update('cards', cards => cards.reduce((newContainer, card) => {
            if(card.get('id') !== action.payload.card.id || cardsContainer.get('id') === action.payload.parentId)
            {
              return newContainer.push(removeFn(card));
            }
            return newContainer;
          }, Immutable.fromJS([])));
        }
        
        return cardsContainer;
      }
      
      state = state.map(removeFn);
    }
    
    return state;
  }

CardsReducer[ActionTypes.cards.remove] =
  (state, action) =>
    Util.immutableCardsUpdate(state, 'cards', action.payload.parentId, cards =>
      cards.remove(cards.findIndex((card) => card.get('id') === action.payload.card.id))
    );

export default CardsReducer;
