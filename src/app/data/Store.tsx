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

var Redux = require('redux');
import ActionTypes from './ActionTypes.tsx';
import Util from '../util/Util.tsx';

import { CardModels } from './../models/CardModels.tsx';

import Defaults from './DefaultTypes.tsx';

// Important: all reducers must return either
//  - a clone, if any changes were made to the object (do not modify the object passed)
//  - the exact same object, if no changes were made

var cloneArray = (arr) => _.assign([], arr);
var cloneObj = (obj) => _.assign({}, obj);

// move element from arr from one index to another
// common function, pure function, no side effects, always return a new copy
var move = (arr, curIndex, newIndex) =>
{
	if(! Util.isInt(curIndex) || ! Util.isInt(newIndex))
	{
		console.log('Error: must pass integer indices in action when moving', arr, curIndex, newIndex);
		return arr;
	}

	arr = cloneArray(arr);
	var obj = arr.splice(curIndex, 1)[0];
	arr.splice(newIndex, 0, obj);

	return arr;
}

// find the given element and move it in the arr to a new index
// common function, pure function, no side effects, always return a new copy
var findAndMove = (arr, obj, newIndex) =>
{
	var curIndex = arr.findIndex((candidate) => candidate.id === obj.id );
	if(curIndex === -1)
	{
		// not present in this array
		return arr;
	}
	return move(arr, curIndex, newIndex);
}

// accepts a flexible amount of arguments
// first arg is an array
// second arg is the value to change to
// the next args are the key(s) to key in to the array / objects
// returns a copy of arr with the keyed value set
var change = function<T>(...args: any[]): T // needs to be `function` to make use of `arguments`
{
	var arr = args[0];
	var value = args[1];
	var newArr: T;
	if(Util.isArray(arr))
	{
		newArr = cloneArray(arr);
	}
	else
	{
		newArr = cloneObj(arr);
	}

	var pointer = newArr;
	var i: number;
	for(i = 2; i < arguments.length - 1; i ++)
	{
		pointer = pointer[arguments[i]];
	}

	pointer[arguments[i]] = value;

	return newArr;
}


var transformCardReducer = (cards = [], action) =>
{
  var cardIndex = cards.indexOf(action.payload.card);
  var newCards = cloneArray(cards);
  var card = newCards[cardIndex];
  
  switch(action.type)
  {
    case ActionTypes.cards.transform.change:
      card.input = action.payload.input;
      card.output = action.payload.output;
      break;
    case ActionTypes.cards.transform.scorePoint:
      var scorePointIndex = card.scorePoints.findIndex((scorePoint) => scorePoint.id === action.payload.scorePointId);
      card.scorePoints[scorePointIndex].score = action.payload.scorePointScore;
      break;
    default:
      // not applicable
      return cards;
  }
  
  return newCards;
}


var selectCardReducer = (cards = [], action) =>
{
	var cardIndex = cards.indexOf(action.payload.card);
	var newCards = cloneArray(cards);
	var select = newCards[cardIndex];

	switch(action.type)
	{
		case ActionTypes.cards.select.moveProperty:
			select.properties = move(select.properties, action.payload.propertyIndex, action.payload.index);
			break;
		case ActionTypes.cards.select.changeProperty:
			select.properties[action.payload.propertyIndex] = action.payload.value;
			break;
		case ActionTypes.cards.select.deleteProperty:
			select.properties.splice(action.payload.propertyIndex, 1);
			break;
		case ActionTypes.cards.select.createProperty:
			if(action.payload.propertyIndex === -1 || action.payload.propertyIndex === undefined || action.payload.propertyIndex === null)
			{
				select.properties.push(""); // TODO update with property type
			}
			else
			{
				select.properties.splice(action.payload.propertyIndex, 0, "");  // TODO update with property type
			}
			break;
		default:
			// ActionType not applicable, return normal cards
			return cards;
	}

	return newCards;
};


var fromCardReducer = (cards = [], action) => {
 var cardIndex = cards.indexOf(action.payload.card);
 var newCards = cloneArray(cards);
 var from = newCards[cardIndex];
 if (!from || from.type !== 'from') {
  return cards;
 }
 
 if(!from.joins) {
  from.joins = [];
 }

 switch (action.type) {
  case ActionTypes.cards.from.changeGroup:
   from.group = action.payload.value;
   break;
  case ActionTypes.cards.from.join.create:
   from.joins.push(Defaults.JOIN_DEFAULT);
   break;
  case ActionTypes.cards.from.join.change:
   from.joins[action.payload.index] = action.payload.value;
   break;
  case ActionTypes.cards.from.join.delete:
   from.joins.splice(action.payload.index, 1);
   break;
  default:
   // ActionType not applicable, return normal cards
   return cards;
 }

 return newCards;
};


var filterCardReducer = (cards = [], action) => {
 var cardIndex = cards.indexOf(action.payload.card);
 var newCards = cloneArray(cards);
 var filters = newCards[cardIndex].filters;
 if (!filters) {
  return cards;
 }

 switch (action.type) {
  case ActionTypes.cards.filter.create:
   filters.push(Defaults.FILTER_DEFAULT);
   break;
  case ActionTypes.cards.filter.change:
   filters[action.payload.index] = action.payload.value;
   break;
  case ActionTypes.cards.filter.delete:
   filters.splice(action.payload.index, 1);
   break;
  default:
   // ActionType not applicable, return normal cards
   return cards;
 }

 return newCards;
};

var sortCardReducer = (cards = [], action) => {
 var cardIndex = cards.indexOf(action.payload.card);
 var newCards = cloneArray(cards);
 if (!newCards[cardIndex].sort) {
  return cards;
 }

 switch (action.type) {
  case ActionTypes.cards.sort.change:
   newCards[cardIndex].sort = action.payload.value;
   break;
  default:
   // ActionType not applicable, return normal cards
   return cards;
 }

 return newCards;
};

var letCardReducer = (cards = [], action) => {
 var cardIndex = cards.indexOf(action.payload.card);
 var newCards = cloneArray(cards);

 switch (action.type) {
  case ActionTypes.cards.let.change:
   newCards[cardIndex].field = action.payload.field;
   newCards[cardIndex].expression = action.payload.expression;
   break;
  default:
   // ActionType not applicable, return normal cards
   return cards;
 }

 return newCards;
};


var scoreCardReducer = (cards = [], action) => {
 var cardIndex = cards.indexOf(action.payload.card);
 var newCards = cloneArray(cards);

 switch (action.type) {
   case ActionTypes.cards.score.create:
     newCards[cardIndex].weights.push({
       weight: 0,
       key: '',
     });
     break;
   case ActionTypes.cards.score.change:
     newCards[cardIndex].method = action.payload.method;
     newCards[cardIndex].output = action.payload.output;
     break;
   case ActionTypes.cards.score.changeWeights:
     newCards[cardIndex].weights = action.payload.weights;
     break;
   default:
     // ActionType not applicable, return normal cards
     return cards;
 }

 return newCards;
};


var cardsReducer = (cards = [], action, algorithmId) =>
{
	if(!action.payload)
	{
		return cards;
	}
  
  // TODO limit to correct algorithm
  if(action.type === ActionTypes.cards.create)
  {
    if(action.payload.algorithmId !== algorithmId)
    {
      return cards;
    }
    
    var obj = { algorithmId };
    var newCards = cloneArray(cards);
    var newCard = new CardModels.Card(action.payload.type);
    switch(action.payload.type)
    {
      case 'select':
        newCard = new CardModels.SelectCard(obj);
        break;
      case 'from':
        newCard = new CardModels.FromCard(obj);
        break;
      case 'sort':
        newCard = new CardModels.SortCard(obj);
        break;
      case 'filter':
        newCard = new CardModels.FilterCard(obj);
        break;
      case 'transform':
        newCard = new CardModels.TransformCard(obj);
        break;
      case 'let':
        newCard = new CardModels.LetCard(obj);
        break;
      case 'score':
        console.log(obj);
        newCard = new CardModels.ScoreCard(obj);
        break;
    }
    newCards.splice(action.payload.index, 0, newCard);
    return newCards;
  }
  
  var cardIndex = cards.indexOf(action.payload.card);
  if(cardIndex === -1)
  {
    return cards;
  }
  
  if(action.type === ActionTypes.cards.remove)
  {
    var newCards = cloneArray(cards);
    newCards.splice(cardIndex, 1);
    return newCards;
  }

	cards = selectCardReducer(cards, action);
	cards = fromCardReducer(cards, action);
  cards = filterCardReducer(cards, action);
  cards = sortCardReducer(cards, action);
  cards = transformCardReducer(cards, action);
  cards = letCardReducer(cards, action);
  cards = scoreCardReducer(cards, action);

	switch(action.type)
	{
		case ActionTypes.cards.move:
			return findAndMove(cards, action.payload.card, action.payload.index);
	}

	return cards;
}

// TODO consider an input type class
var inputsReducer = (inputs = [], action: Action) =>
{
	if(!action.payload)
	{
		return inputs;
	}
	var inputIndex: number = inputs.indexOf(action.payload.input);
	if(inputIndex === -1)
	{
		return inputs;
	}

	switch(action.type) {
		case ActionTypes.inputs.move:
			return move(inputs, inputIndex, action.payload.index);
		case ActionTypes.inputs.changeKey:
			return change<Array<any>>(inputs, action.payload.value, inputIndex, 'key');
		case ActionTypes.inputs.changeValue:
			return change<Array<any>>(inputs, action.payload.value, inputIndex, 'value');
	}

	return inputs;
}

var resultsReducer = (results:Array<any> = [], action) =>
{
	if(!action.payload)
	{
		return results;
	}

	switch(action.type) {
		case ActionTypes.results.move:
			var curIndex = results.findIndex((result) => result.id === action.payload.result.id);
			return move(results, curIndex, action.payload.index);
	}

	return results;
}

var groupsReducer = (groups = {}, action, groupKey, reducer, newValModel) =>
{
	var changed = false;
	var newGroups = _.reduce(groups, (newGroups, group, key) => 
	{
		var newValue = reducer(group[groupKey], action, key);
		if(newValue !== group[groupKey])
		{
			changed = true;
			newGroups[key] = change(group, newValue, groupKey);
		}
		else
		{
			newGroups[key] = group;
		}
		return newGroups;
	}, {});

	if(action.type === ActionTypes.newAlgorithm)
	{
		var newGroup = {
			id: currentGroupId,
		};
		newGroup[groupKey] = cloneArray(newValModel);
		newGroups[currentGroupId] = newGroup;
		changed = true;
	}
  
  if(action.type === ActionTypes.closeAlgorithm)
  {
    delete newGroups[action.payload.algorithmId];
    changed = true;
  }

	if(changed)
	{
		return newGroups;
	}
	// no change, return original object
	//  note: keeping track of whether the object changed is important for redux --
	//        which requires us to return the orginal object if no change occured
	//        if you know a simpler way to achieve this, implement it
	return groups;
}

var resultGroupsReducer = (resultGroups = {}, action) =>
{
	return groupsReducer(resultGroups, action, 'results', resultsReducer, newResults);
}

var cardGroupsReducer = (cardGroups = {}, action) =>
{
	return groupsReducer(cardGroups, action, 'cards', cardsReducer, []);
}

var currentGroupId = 101;
var newResults = require('./json/_results.json');
var defaultStateJson = require('./json/_state.json');

var cardGroups = {};
_.map(defaultStateJson.cardGroups, (cardGroup, key) => {
  var cards = cardGroup.cards.map((card) => {
    var card = _.extend(card, {algorithmId: key});
    switch(card.type) {
      case 'from':
        return new CardModels.FromCard(card);
        break;
      case 'select':
        return new CardModels.SelectCard(card);
        break;
      case 'sort':
        return new CardModels.SortCard(card);
        break;
      case 'filter':
        return new CardModels.FilterCard(card);
        break;
      case 'transform':
        return new CardModels.TransformCard(card);
        break;
      case 'score':
        return new CardModels.ScoreCard(card);
        break;
      default:
        return new CardModels.Card(card.type, card);
    }
  });
  
  cardGroups[key] = {
    id: cardGroup.id,
    cards: cards,
  }
});

var defaultState = 
{
  inputs: defaultStateJson.inputs,
  resultGroups: defaultStateJson.resultGroups,
  cardGroups: cardGroups,
}

var stateReducer = (state = defaultState, action) =>
{
	if(action.type === ActionTypes.newAlgorithm)
	{
		currentGroupId ++;
	}

	return {
		cardGroups: cardGroupsReducer(state.cardGroups, action),
		inputs: inputsReducer(state.inputs, action),
		resultGroups: resultGroupsReducer(state.resultGroups, action),
	}
}

let Store = Redux.createStore(stateReducer);

export default Store;