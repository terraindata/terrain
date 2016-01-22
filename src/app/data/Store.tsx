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


var selectCardReducer = (cards = [], action) =>
{
	var cardIndex = cards.indexOf(action.payload.card);
	var newCards = cloneArray(cards);
	var select = newCards[cardIndex].select;
	if(!select)
	{
		return cards;
	}

	switch(action.type)
	{
		case ActionTypes.cards.select.moveField:
			select.fields = move(select.fields, action.payload.fieldIndex, action.payload.index);
			break;
		case ActionTypes.cards.select.changeField:
			select.fields[action.payload.fieldIndex] = action.payload.value;
			break;
		case ActionTypes.cards.select.deleteField:
			select.fields.splice(action.payload.fieldIndex, 1);
			break;
		case ActionTypes.cards.select.createField:
			if(action.payload.fieldIndex === -1 || action.payload.fieldIndex === undefined || action.payload.fieldIndex === null)
			{
				select.fields.push(""); // TODO update with field type
			}
			else
			{
				select.fields.splice(action.payload.fieldIndex, 0, "");  // TODO update with field type
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
 var from = newCards[cardIndex].from;
 if (!from) {
  return cards;
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
 var filter = newCards[cardIndex].filter;
 if (!filter) {
  return cards;
 }
 var filters = filter.filters;

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


var cardsReducer = (cards = [], action) =>
{
	if(!action.payload)
	{
		return cards;
	}
	var cardIndex = cards.indexOf(action.payload.card);
	if(cardIndex === -1)
	{
		return cards;
	}

	cards = selectCardReducer(cards, action);
	cards = fromCardReducer(cards, action);
  cards = filterCardReducer(cards, action);
  cards = sortCardReducer(cards, action);

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
		var newValue = reducer(group[groupKey], action);
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
	return groupsReducer(cardGroups, action, 'cards', cardsReducer, newCards);
}

var currentGroupId = 101;
var newCards = require('./json/_cards.json');
var newResults = require('./json/_results.json');
var defaultState = require('./json/_state.json');

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