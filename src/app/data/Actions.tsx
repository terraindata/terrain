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
import ActionTypes from './ActionTypes.tsx';
import Store from './Store.tsx';

import * as ReduxActions from 'redux-actions';
var createAction = ReduxActions.createAction;

import { CardModels } from './../models/CardModels.tsx';

// object of action creators
const create = 
{
	cards:
	{
		create: createAction<CreateCardPayload>(
			ActionTypes.cards.create,
			(algorithmId: string, type: string, index: number) => ({algorithmId, type, index})
		),

		move: createAction<MoveCardPayload>(
			ActionTypes.cards.move,
			(card: any, index: number) => ({card, index})
		),
    
    remove: createAction<RemoveCardPayload>(
      ActionTypes.cards.remove,
      (card: any) => ({card})
    ),

		from:
		{
			changeGroup: createAction<ChangeFromCardGroupPayload>(
				ActionTypes.cards.from.changeGroup,
				(card: any, value: Group) => ({card, value})
			),

			join:
			{
				create: createAction<CreateJoinPayload>(
					ActionTypes.cards.from.join.create,
					(card: any, index: number, value: Group) => ({card, index, value})
				),

				change: createAction<ChangeJoinPayload>(
					ActionTypes.cards.from.join.change,
					(card: CardModels.FromCard, index: number, value: CardModels.Join) => ({card, index, value})
				),

				delete: createAction<DeleteJoinPayload>(
					ActionTypes.cards.from.join.delete,
					(card: any, index: number) => ({card, index})
				),
			},
		},
    
    sort: {
      change: createAction<ChangeSortCardPayload>(
        ActionTypes.cards.sort.change,
        (card: any, value: CardModels.Sort) => ({card, value})
      ),
    },

		select:
		{
			moveProperty: createAction<MoveSelectCardPropertyPayload>(
				ActionTypes.cards.select.moveProperty,
				(card: any, propertyIndex: number, index: number) => ({card, propertyIndex, index})
			),

			changeProperty: createAction<ChangeSelectCardPropertyPayload>(
				ActionTypes.cards.select.changeProperty,
				(card: any, propertyIndex: number, value: string) => ({card, propertyIndex, value})
			),

			deleteProperty: createAction<DeleteSelectCardPropertyPayload>(
   	   	ActionTypes.cards.select.deleteProperty,
      	(card: any, propertyIndex: number) => ({card, propertyIndex})
			),

			createProperty: createAction<CreateSelectCardPropertyPayload>(
				ActionTypes.cards.select.createProperty,
				(card: any, propertyIndex: number) => ({card, propertyIndex})
			),
		},

  filter:
  {
   create: createAction<CreateFilterPayload>(
    ActionTypes.cards.filter.create,
    (card: any, index: number) => ({ card, index })
   ),

   change: createAction<ChangeFilterPayload>(
    ActionTypes.cards.filter.change,
    (card: any, index: number, value: CardModels.Filter) => ({ card, index, value })
   ),

   delete: createAction<DeleteFilterPayload>(
    ActionTypes.cards.filter.delete,
    (card: any, index: number) => ({ card, index })
   ),
  },
	}, // /cards

	inputs:
	{
		create: createAction<CreateInputPayload>(
			ActionTypes.inputs.create,
			(input: any, index: number) => ({input, index})
		),

		move: createAction<MoveInputPayload>(
      ActionTypes.inputs.move,
      (input: any, index: number) => ({input, index})
		),

		changeKey: createAction<ChangeInputKeyPayload>(
      ActionTypes.inputs.changeKey,
      (input: any, value: string) => ({input, value})
		),

		changeValue: createAction<ChangeInputValuePayload>(
      ActionTypes.inputs.changeValue,
      (input: any, value: string) => ({input, value})
		),
	}, // /inputs

	moveResult: createAction<MoveResultPayload>(
    ActionTypes.results.move,
    (result: any, index: number) => ({result, index})
	),

	newAlgorithm: createAction<NewAlgorithmPayload>(
    ActionTypes.newAlgorithm,
    () => ({})
	),
};

var actionCreatorsToDispatchers = (actionCreators) => 
{
	return _.mapObject(actionCreators, (actionCreator) =>
	{
		if(typeof actionCreator === 'function') 
		{
			return function() {
				return Store.dispatch(actionCreator.apply(this, arguments));
			}
		}

		if(typeof actionCreator === 'object')
		{
			return actionCreatorsToDispatchers(actionCreator);
		}

		console.log('Unrecognized actionCreator', actionCreator);
		return null;
	});
};



// object of action dispatchers
// use: Actions.dispatch.moveCard(4, 8)
var dispatch = actionCreatorsToDispatchers(create);

var Actions =
{
	types: ActionTypes,
	create: create,
	dispatch: dispatch,
};

export default Actions;