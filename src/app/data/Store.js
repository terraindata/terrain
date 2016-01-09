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
var change = function(arr, value) // needs to be a function to make use of `arguments`
{
	var newArr;
	if(typeof arr === 'array')
	{
		newArr = cloneArray(arr);
	}
	if(typeof arr === 'object')
	{
		newArr = cloneObj(arr);
	}

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
			return findAndMove(cards, action.card, action.newIndex);
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
			var curIndex = results.findIndex((result) => result.id === action.result.id);
			return move(results, curIndex, action.newIndex);
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
		console.log('h');
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
var newCards = [
	{
		type: 'from',
		id: 1,
		from:
		{
			table: 'heroes',
		},
	},
	{
		type: 'select',
		id: 2,
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
		id: 3,
		order:
		{
			field: 'urbanSitterRating',
		}
	},
	{
		type: 'score',
		id: 4,
		score:
		{
			fields:
			[
				'urbanSitterRating',
				'numJobs',
			]
		}
	},
];
var newResults = [
	{
		name: 'Sitter 1',
		id: 8,
	},
	{
		name: 'Sitter 2',
		id: 9,
	},
	{
		name: 'Sitter 3',
		id: 10,
	},
	{
		name: 'Sitter 4',
		id: 11,
	},
	{
		name: 'Sitter 5',
		id: 12,
	},
	{
		name: 'Sitter 6',
		id: 13,
	},
	{
		name: 'Sitter 7',
		id: 14,
	},
	{
		name: 'Sitter 8',
		id: 15,
	},
	{
		name: 'Sitter 9',
		id: 16,
	},
	{
		name: 'Sitter 10',
		id: 17,
	},
	{
		name: 'Sitter 11',
		id: 18,
	},
	{
		name: 'Sitter 12',
		id: 19,
	},
	{
		name: 'Sitter 13',
		id: 20,
	},
	{
		name: 'Sitter 14',
		id: 21,
	},
	{
		name: 'Sitter 15',
		id: 24,
	},
	{
		name: 'Sitter 16',
		id: 25,
	},
];

var defaultState =
{
	cardGroups: {
		100: {
			id: 100,
			cards: [
				{
					type: 'from',
					id: 1,
					from:
					{
						table: 'heroes',
					},
				},
				{
					type: 'select',
					id: 2,
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
					id: 3,
					order:
					{
						field: 'urbanSitterRating',
					}
				},
				{
					type: 'score',
					id: 4,
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
		},
		101: {
			id: 101,
			cards: [
				{
					type: 'from',
					id: 101,
					from:
					{
						table: 'heroes',
					},
				},
				{
					type: 'select',
					id: 201,
					select:
					{
						fields: [
							'name',
							'picture',
							'description',
						],
					},
				},
			],
		}
	},
	inputs: [
		{
			key: 'search',
			value: 'responsible babysitter',
			id: 5,
		},
		{
			key: 'minAge',
			value: '24',
			id: 6,
		},
		{
			key: 'attributes',
			value: 'calm, cool, collected',
			id: 7,
		},
	],
	resultGroups: {
		100: {
			id: 100,
			results: 
			[
				{
					name: 'Sitter 1',
					id: 8,
				},
				{
					name: 'Sitter 2',
					id: 9,
				},
				{
					name: 'Sitter 3',
					id: 10,
				},
				{
					name: 'Sitter 4',
					id: 11,
				},
				{
					name: 'Sitter 5',
					id: 12,
				},
				{
					name: 'Sitter 6',
					id: 13,
				},
				{
					name: 'Sitter 7',
					id: 14,
				},
				{
					name: 'Sitter 8',
					id: 15,
				},
				{
					name: 'Sitter 9',
					id: 16,
				},
				{
					name: 'Sitter 10',
					id: 17,
				},
				{
					name: 'Sitter 11',
					id: 18,
				},
				{
					name: 'Sitter 12',
					id: 19,
				},
				{
					name: 'Sitter 13',
					id: 20,
				},
				{
					name: 'Sitter 14',
					id: 21,
				},
				{
					name: 'Sitter 15',
					id: 24,
				},
				{
					name: 'Sitter 16',
					id: 25,
				},
			],
		},
		101: {
			id: 101,
			results: 
			[
				{
					name: 'Sitter 6',
					id: 13,
				},
				{
					name: 'Sitter 2',
					id: 9,
				},
				{
					name: 'Sitter 1',
					id: 8,
				},
				{
					name: 'Sitter 4',
					id: 11,
				},
				{
					name: 'Sitter 3',
					id: 10,
				},
				{
					name: 'Sitter 5',
					id: 12,
				},
				{
					name: 'Sitter 7',
					id: 14,
				},
				{
					name: 'Sitter 10',
					id: 17,
				},
				{
					name: 'Sitter 8',
					id: 15,
				},
				{
					name: 'Sitter 9',
					id: 16,
				},
				{
					name: 'Sitter 11',
					id: 18,
				},
				{
					name: 'Sitter 12',
					id: 19,
				},
				{
					name: 'Sitter 13',
					id: 20,
				},
				{
					name: 'Sitter 14',
					id: 21,
				},
				{
					name: 'Sitter 15',
					id: 24,
				},
				{
					name: 'Sitter 16',
					id: 25,
				},
			],
		}
	}
};

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

module.exports = Store;