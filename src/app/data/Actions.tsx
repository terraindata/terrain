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

import { CardModels } from './../models/CardModels.tsx';

var $ = (type: string, payload: any) => Store.dispatch({type, payload})

var Actions =
{
  cards:
  {
    create:
      (algorithmId: string, type: string, index: number) => 
        $(ActionTypes.cards.create, {algorithmId, type, index}),

    move: 
      (card: CardModels.Card, index: number) =>
        $(ActionTypes.cards.move, {card, index}),
    
    remove: 
      (card: CardModels.Card) =>
        $(ActionTypes.cards.remove, {card}),

    from:
    {
      changeGroup: 
        (card: CardModels.FromCard, value: Group) =>
          $(ActionTypes.cards.from.changeGroup, {card, value}),

      join:
      {
        create: 
          (card: CardModels.FromCard) =>
            $(ActionTypes.cards.from.join.create, {card}),

        change: 
          (card: CardModels.FromCard, index: number, value: CardModels.Join) =>
            $(ActionTypes.cards.from.join.change, {card, index, value}),

        remove: 
          (card: CardModels.FromCard, index: number) =>
            $(ActionTypes.cards.from.join.remove, {card, index}),
      },
    },
    
    sort: {
      change: 
        (card: CardModels.SortCard, value: CardModels.Sort) =>
          $(ActionTypes.cards.sort.change, {card, value}),
    },

    select:
    {
      moveProperty: 
        (card: CardModels.SelectCard, propertyIndex: number, index: number) =>
          $(ActionTypes.cards.select.moveProperty, {card, propertyIndex, index}),

      changeProperty: 
        (card: CardModels.SelectCard, propertyIndex: number, value: string) =>
          $(ActionTypes.cards.select.changeProperty, {card, propertyIndex, value}),

      removeProperty: 
          (card: CardModels.SelectCard, propertyIndex: number) =>
            $(ActionTypes.cards.select.removeProperty, {card, propertyIndex}),

      createProperty: 
        (card: CardModels.SelectCard, propertyIndex?: number) =>
          $(ActionTypes.cards.select.createProperty, {card, propertyIndex}),
    },
    
    let:
    {
      change: 
        (card: CardModels.LetCard, field: string, expression: string) =>
          $(ActionTypes.cards.let.change, {card, field, expression}),
    },
    
    transform:
    {
      change: 
        (card: CardModels.TransformCard, input: string, output: string) =>
          $(ActionTypes.cards.transform.change, {card, input, output}),
      
      scorePoint: 
        (card: CardModels.TransformCard, scorePointId: string, scorePointScore: any) =>
          $(ActionTypes.cards.transform.scorePoint, {card, scorePointId, scorePointScore}),
    },
    
    score:
    {
      changeWeights: 
        (card: CardModels.ScoreCard, weights: {weight:number, key:string}[]) =>
          $(ActionTypes.cards.score.changeWeights, {card, weights}),
      
      change: 
        (card: CardModels.ScoreCard, method: string, output: string) =>
          $(ActionTypes.cards.score.change, {card, method, output}),
      
      create: 
        (card: CardModels.ScoreCard) =>
          $(ActionTypes.cards.score.create, {card}),
    },

    filter:
    {
     create: 
      (card: CardModels.FilterCard, index?: number) =>
        $(ActionTypes.cards.filter.create, { card, index }),

     change: 
      (card: CardModels.FilterCard, index: number, value: CardModels.Filter) =>
        $(ActionTypes.cards.filter.change, { card, index, value }),

     remove: 
      (card: CardModels.FilterCard, index: number) =>
        $(ActionTypes.cards.filter.remove, { card, index }),
    },
  }, // /cards

  inputs:
  {
    create: 
      (input: any, index: number) =>
        $(ActionTypes.inputs.create, {input, index}),

    move: 
      (input: any, index: number) =>
        $(ActionTypes.inputs.move, {input, index}),

    changeKey: 
      (input: any, value: string) =>
        $(ActionTypes.inputs.changeKey, {input, value}),

    changeValue: 
      (input: any, value: string) =>
        $(ActionTypes.inputs.changeValue, {input, value}),
  }, // /inputs

  results:
  {
    move:
      (result: any, index: number) =>
        $(ActionTypes.results.move, {result, index}),
  },

  newAlgorithm: 
    () =>
      $(ActionTypes.newAlgorithm, {}),
  
  closeAlgorithm: 
    (algorithmId: string) =>
      $(ActionTypes.closeAlgorithm, {algorithmId}),

};

export default Actions;