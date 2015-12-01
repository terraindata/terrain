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

var Redux = require('redux');
var ActionTypes = require('./ActionTypes.js');
var Util = require('../util/Util.js');

// Important: all reducers must return either
//  - a clone, if any changes were made to the object (do not modify the object passed)
//  - the exact same object, if no changes were made

var cloneArray = (arr) => _.assign([], arr);

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

// accepts a flexible amount of arguments
// first arg is an array
// second arg is the value to change to
// the next args are the key(s) to key in to the array / objects
// returns a copy of arr with the keyed value set
var change = function(arr, value) // needs to be a function to make use of `arguments`
{
	console.log(arguments);
	var newArr = cloneArray(arr);
	var pointer = newArr;
	var i;
	for(i = 2; i < arguments.length - 1; i ++)
	{
		pointer = pointer[arguments[i]];
	}

	pointer[arguments[i]] = value;

	return newArr;
}


var selectCardReducer = (cards = [], action) =>
{
	var cardIndex = cards.indexOf(action.card);
	if(cardIndex === -1)
		return cards;
	// cardIndex points to a real card from now on

	var newCards = cloneArray(cards);
	var select = newCards[cardIndex].select

	switch(action.type)
	{
		case ActionTypes.cards.select.moveField:
			select.fields = move(select.fields, action.curIndex, action.newIndex);
			break;
		case ActionTypes.cards.select.changeField:
			select.fields[action.index] = action.value;
			break;
		case ActionTypes.cards.select.deleteField:
			select.fields.splice(action.index, 1);
			break;
		default:
			// ActionType not applicable, return normal cards
			return cards;
	}

	return newCards;
};

var cardsReducer = (cards = [], action) =>
{
	cards = selectCardReducer(cards, action);

	switch(action.type)
	{
		case ActionTypes.cards.move:
			return move(cards, action.curIndex, action.newIndex);
	}

	return cards;
}

var inputsReducer = (inputs = [], action) =>
{
	var inputIndex = inputs.indexOf(action.input);

	switch(action.type) {
		case ActionTypes.inputs.move:
			return move(inputs, action.curIndex, action.newIndex);
		case ActionTypes.inputs.changeKey:
			return change(inputs, action.text, inputIndex, 'key');
		case ActionTypes.inputs.changeValue:
			return change(inputs, action.text, inputIndex, 'value');
	}

	return inputs;
}

var resultsReducer = (results = {}, action) =>
{
	switch(action.type) {
		case ActionTypes.results.move:
			return move(results, action.curIndex, action.newIndex);
	}

	return results;
}

var defaultState =
{
	cards:  [
						{
							type: 'from',
							from:
							{
								table: 'heroes',
							},
						},
						{
							type: 'select',
							select:
							{
								fields: [
									'name',
									'picture',
									'description',
									'minPrice',
									'numJobs',
								],
							},
						},
						{
							type: 'order',
							order:
							{
								field: 'urbanSitterRating',
							}
						},
						{
							type: 'score',
							score:
							{
								fields:
								[
									'urbanSitterRating',
									'numJobs',
								]
							}
						},
					],
	inputs: [
  					{
  						key: 'search',
  						value: 'the republic',
  					},
  					{
  						key: 'minAge',
  						value: '24',
  					},
  					{
  						key: 'role',
  						value: 'leader',
  					},
  				],
	results: [
						{
							name: 'Leia Skywalker',
						},
						{
							name: 'Lando Calrissian',
						},
						{
							name: 'Obi Wan Kenobi',
						},
						{
							name: 'C-3P0',
						},
						{
							name: 'Luke Skywalker',
						},
						{
							name: 'R2-D2',
						},
						{
							name: 'Han Solo',
						},
					],
};

var stateReducer = (state = defaultState, action) =>
{
	return {
		cards: cardsReducer(state.cards, action),
		inputs: inputsReducer(state.inputs, action),
		results: resultsReducer(state.results, action),
	}
}

let Store = Redux.createStore(stateReducer);

module.exports = Store;