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

var cardsCalculator = (cards = [], action) =>
{
	var newCards = _.assign([], cards);
	console.log(action.type);
	switch(action.type) {
		case ActionTypes.cards.move:
			console.log('move card');
			if(! Util.isInt(action.curIndex) || ! Util.isInt(action.newIndex))
			{
				console.log('Error: must pass integer indices in action when moving a card', action);
				return cards;
			}

			var card = newCards.splice(action.curIndex, 1)[0];
			console.log(card);
			var newIndexAdjustment = action.curIndex < action.newIndex ? 0 : 0;
			newCards.splice(action.newIndex + newIndexAdjustment, 0, card);
			console.log(action.newIndex + newIndexAdjustment);

			return newCards;
	}

	return cards;
}

var inputsCalculator = (inputs = [], action) =>
{
	return inputs;
}

var resultsCalculator = (results = {}, action) =>
{
	return results;
}

var defaultState =
{
	cards:  [
						{
							name: 'card 1',
						},
						{
							name: 'card 2',
						},
						{
							name: 'card 3',
						},
						{
							name: 'card 4',
						},
					],
	inputs: [
  					{
  						text: 'input 1',
  					},
  					{
  						text: 'input 2',
  					},
  					{
  						text: 'input 3',
  					},
  				],
	results: {},
};

var stateCalculator = (state = defaultState, action) =>
{
	return {
		cards: cardsCalculator(state.cards, action),
		inputs: inputsCalculator(state.inputs, action),
		results: resultsCalculator(state.results, action),
	}
}

let Store = Redux.createStore(stateCalculator);

module.exports = Store;