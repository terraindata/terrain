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
import ActionTypes from './BuilderActionTypes.tsx';
import Store from './BuilderStore.tsx';

import { BuilderTypes } from './../BuilderTypes.tsx';
import * as Immutable from 'immutable';
import List = Immutable.List;
import Map = Immutable.Map;

var $ = (type: string, payload: any) => Store.dispatch({type, payload})

var BuilderActions =
{
  cards:
  {
    create:
      (parentId: string, type: string, index: number) => 
        $(ActionTypes.cards.create, {parentId, type, index}),

    move: 
      (card: BuilderTypes.ICard, index: number, parentId: string) =>
        $(ActionTypes.cards.move, {card, index, parentId}),
    
    change:
      (cardId: string, keyPath: (string | number)[], value: any) =>
        $(ActionTypes.cards.change, {cardId, keyPath, value}),
    
    remove: 
      (card: BuilderTypes.ICard, parentId: string) =>
        $(ActionTypes.cards.remove, {card, parentId}),
    
    selectCard:
      (cardId: string, altKey: boolean, shiftKey: boolean) =>
        $(ActionTypes.cards.selectCard, {cardId, altKey, shiftKey}),

    from:
    {
      change: 
        (card: BuilderTypes.IFromCard, group: string, iterator: string) =>
          $(ActionTypes.cards.from.change, {card, group, iterator}),

      join:
      {
        create: 
          (card: BuilderTypes.IFromCard) =>
            $(ActionTypes.cards.from.join.create, {card}),

        change: 
          (card: BuilderTypes.IFromCard, index: number, value: BuilderTypes.IJoin) =>
            $(ActionTypes.cards.from.join.change, {card, index, value}),

        remove: 
          (card: BuilderTypes.IFromCard, index: number) =>
            $(ActionTypes.cards.from.join.remove, {card, index}),
      },
    },
    
    sort: {
      create: 
        (card: BuilderTypes.ISortCard, index?: number) =>
          $(ActionTypes.cards.sort.create, {card, index}),
          
      change: 
        (card: BuilderTypes.ISortCard, index: number, value: BuilderTypes.ISort) =>
          $(ActionTypes.cards.sort.change, {card, index, value}),
          
      move: 
        (card: BuilderTypes.ISortCard, sort: BuilderTypes.ISort, index: number) =>
          $(ActionTypes.cards.sort.move, {card, sort, index}),

      remove: 
          (card: BuilderTypes.ISortCard, index: number) =>
            $(ActionTypes.cards.sort.remove, {card, index}),
    },

    select:
    {
      move: 
        (card: BuilderTypes.ISelectCard, property: BuilderTypes.IProperty, index: number) =>
          $(ActionTypes.cards.select.move, {card, property, index}),

      change: 
        (card: BuilderTypes.ISelectCard, index: number, value: BuilderTypes.IProperty) =>
          $(ActionTypes.cards.select.change, {card, index, value}),

      remove: 
          (card: BuilderTypes.ISelectCard, index: number) =>
            $(ActionTypes.cards.select.remove, {card, index}),

      create: 
        (card: BuilderTypes.ISelectCard, index?: number) =>
          $(ActionTypes.cards.select.create, {card, index}),
    },
    
    let:
    {
      change: 
        (card: BuilderTypes.ILetCard, field: string, expression: string) =>
          $(ActionTypes.cards.let.change, {card, field, expression}),
    },
    
    transform:
    {
      change: 
        (card: BuilderTypes.ITransformCard, input: string) =>
          $(ActionTypes.cards.transform.change, {card, input}),
      
      scorePoint: 
        (card: BuilderTypes.ITransformCard, scorePoint: BuilderTypes.IScorePoint) =>
          $(ActionTypes.cards.transform.scorePoint, {card, scorePoint}),
      
      scorePoints: 
        (card: BuilderTypes.ITransformCard, scorePoints: BuilderTypes.IScorePoint[]) =>
          $(ActionTypes.cards.transform.scorePoints, {card, scorePoints}),
    },
    
    score:
    {
      changeWeights: 
        (card: BuilderTypes.IScoreCard, weights: {weight:number, key:string}[]) =>
          $(ActionTypes.cards.score.changeWeights, {card, weights}),
      
      change: 
        (card: BuilderTypes.IScoreCard, method: string) =>
          $(ActionTypes.cards.score.change, {card, method}),
      
      create: 
        (card: BuilderTypes.IScoreCard, index?: number) =>
          $(ActionTypes.cards.score.create, {card, index}),
    },

    filter:
    {
     create: 
      (card: BuilderTypes.IFilterCard, index?: number) =>
        $(ActionTypes.cards.filter.create, { card, index }),

     change: 
      (card: BuilderTypes.IFilterCard, index: number, value: BuilderTypes.IFilter) =>
        $(ActionTypes.cards.filter.change, { card, index, value }),
     
     move:
       (card: BuilderTypes.IFilterCard, filter: BuilderTypes.IFilter, index: number) =>
         $(ActionTypes.cards.filter.move, { card, filter, index }),
     
     remove: 
      (card: BuilderTypes.IFilterCard, index: number) =>
        $(ActionTypes.cards.filter.remove, { card, index }),
    },
    
    if:
    {
      change:
        (card: BuilderTypes.IIfCard, filters: BuilderTypes.IFilter[]) => //, elses: BuilderTypes.IElse[]) =>
          $(ActionTypes.cards.if.change, { card, filters }), //, elses }),
      
      else:
        (card: BuilderTypes.IIfCard, indexToRemove?: number) =>
          $(ActionTypes.cards.if.else, { card, indexToRemove }),
    },
  }, // /cards

  inputs:
  {
    create: 
      (parentId: string, index: number) =>
        $(ActionTypes.inputs.create, {parentId, index}),

    move: 
      (input: any, index: number) =>
        $(ActionTypes.inputs.move, {input, index}),

    changeKey: 
      (input: any, value: string, index: number) =>
        $(ActionTypes.inputs.changeKey, {input, value, index}),

    changeValue: 
      (input: any, value: string, index: number) =>
        $(ActionTypes.inputs.changeValue, {input, value, index}),
    
    changeType:
      (input: BuilderTypes.IInput, value: BuilderTypes.InputType, index: number) =>
        $(ActionTypes.inputs.changeType, {input, value, index}),
    
    remove:
      (input: BuilderTypes.IInput) =>
        $(ActionTypes.inputs.remove, {input}),
  }, // /inputs

  results:
  {
    move:
      (result: any, index: number) =>
        $(ActionTypes.results.move, {result, index}),
    
    spotlight:
      (result: any, value: boolean | string) =>
        $(ActionTypes.results.spotlight, {result, value}),
    
    pin:
      (result: any, value: boolean) =>
        $(ActionTypes.results.pin, {result, value}),
    
    changePage:
      (parentId: string, page: number) =>
        $(ActionTypes.results.changePage, {parentId, page}),
    
    query:
      (algorithmId: string) =>
        $(ActionTypes.results.query, {algorithmId}),
    
    set:
      (algorithmId: string, results: any) =>
        $(ActionTypes.results.query, {algorithmId, results}),
  },

  // algorithm:
  // {
  //   create: 
  //     () =>
  //       $(ActionTypes.algorithm.create, {}),
    
  //   remove: 
  //     (parentId: string) =>
  //       $(ActionTypes.algorithm.remove, {parentId}),
    
  //   duplicate:
  //     (parentId: string) =>
  //       $(ActionTypes.algorithm.duplicate, {parentId}),
    
  //   load:
  //     (state: any) =>
  //       $(ActionTypes.algorithm.load, {state}),
  // },
  
  fetch:
    (variantIds: List<ID>) =>
      $(ActionTypes.fetch, { variantIds }),
  
  setVariant:
    (variantId: ID, variant) =>
      $(ActionTypes.setVariant, { variantId, variant }),
};

export default BuilderActions;