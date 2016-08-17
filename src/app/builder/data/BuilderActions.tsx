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
type CardProps = BuilderTypes.CardProps;

var $ = (type: string, payload: any) => Store.dispatch({type, payload})

var BuilderActions =
{
  change:
    (keyPath: KeyPath, value: any) =>
      $(ActionTypes.change, { keyPath, value }),
  
  create:
    (keyPath: KeyPath, index: number, factoryType: string) =>
      $(ActionTypes.create, { keyPath, factoryType, index }),
  
  move:
    (keyPath: KeyPath, index: number, newIndex: number) =>
      $(ActionTypes.move, { keyPath, index, newIndex }),
  
  remove:
    (keyPath: KeyPath, index: number) =>
      $(ActionTypes.remove, { keyPath, index }),
  
  
  // TODO search and destroy
  
  cards:
  {
    create:
      (keyPath: KeyPath, type: string, index: number) => 
        $(ActionTypes.cards.create, {keyPath, type, index}),

    // TODO
    move: 
      (props: CardProps, index: number, parentId: string) =>
        $(ActionTypes.cards.move, {props, index, parentId}),
    
    // TODO remove?
    change:
      (props: CardProps, keyPath: (string | number)[], value: any) =>
        $(ActionTypes.cards.change, {props, keyPath, value}),
    
    moveField:
      (props: CardProps, keyPath: (string | number)[], curIndex: number, newIndex: number) =>
        $(ActionTypes.cards.change, {props, keyPath, curIndex, newIndex}),
    
    createField:
      (props: CardProps, keyPath: (string | number)[], index: number, blockType: string) =>
        $(ActionTypes.cards.change, {props, keyPath, index, blockType}),
    
    remove: 
      (props: CardProps, parentId: string) =>
        $(ActionTypes.cards.remove, {props, parentId}),
    
    selectCard:
      (cardId: string, altKey: boolean, shiftKey: boolean) =>
        $(ActionTypes.cards.selectCard, {cardId, altKey, shiftKey}),
    
    sort:
    {
      create: 
        (props: CardProps, index?: number) =>
          $(ActionTypes.cards.sort.create, {props, index}),
          
      change: 
        (props: CardProps, index: number, value: BuilderTypes.ISort) =>
          $(ActionTypes.cards.sort.change, {props, index, value}),
          
      move: 
        (props: CardProps, sort: BuilderTypes.ISort, index: number) =>
          $(ActionTypes.cards.sort.move, {props, sort, index}),

      remove: 
          (props: CardProps, index: number) =>
            $(ActionTypes.cards.sort.remove, {props, index}),
    },

    select:
    {
      move: 
        (props: CardProps, property: string, index: number) =>
          $(ActionTypes.cards.select.move, {props, property, index}),

      change: 
        (props: CardProps, index: number, value: string) =>
          $(ActionTypes.cards.select.change, {props, index, value}),

      remove: 
          (props: CardProps, index: number) =>
            $(ActionTypes.cards.select.remove, {props, index}),

      create: 
        (props: CardProps, index?: number) =>
          $(ActionTypes.cards.select.create, {props, index}),
    },
    
    let:
    {
      change: 
        (props: CardProps, field: string, expression: string) =>
          $(ActionTypes.cards.let.change, {props, field, expression}),
    },
    
    transform:
    {
      change: 
        (props: CardProps, input: string) =>
          $(ActionTypes.cards.transform.change, {props, input}),
      
      scorePoint: 
        (props: CardProps, scorePoint: BuilderTypes.IScorePoint) =>
          $(ActionTypes.cards.transform.scorePoint, {props, scorePoint}),
      
      scorePoints: 
        (props: CardProps, scorePoints: BuilderTypes.IScorePoint[]) =>
          $(ActionTypes.cards.transform.scorePoints, {props, scorePoints}),
    },
    
    score:
    {
      changeWeights: 
        (props: CardProps, weights: {weight:number, key:string}[]) =>
          $(ActionTypes.cards.score.changeWeights, {props, weights}),
      
      change: 
        (props: CardProps, method: string) =>
          $(ActionTypes.cards.score.change, {props, method}),
      
      create: 
        (props: CardProps, index?: number) =>
          $(ActionTypes.cards.score.create, {props, index}),
    },

    filter:
    {
     create: 
      (props: CardProps, index?: number) =>
        $(ActionTypes.cards.filter.create, { props, index }),

     change: 
      (props: CardProps, index: number, value: BuilderTypes.IFilter) =>
        $(ActionTypes.cards.filter.change, { props, index, value }),
     
     move:
       (props: CardProps, filter: BuilderTypes.IFilter, index: number) =>
         $(ActionTypes.cards.filter.move, { props, filter, index }),
     
     remove: 
      (props: CardProps, index: number) =>
        $(ActionTypes.cards.filter.remove, { props, index }),
    },
    
    if:
    {
      change:
        (props: CardProps, filters: BuilderTypes.IFilter[]) => //, elses: BuilderTypes.IElse[]) =>
          $(ActionTypes.cards.if.change, { props, filters }), //, elses }),
      
      else:
        (props: CardProps, indexToRemove?: number) =>
          $(ActionTypes.cards.if.else, { props, indexToRemove }),
    },
  }, // /cards

  inputs:
  {
    create: 
      (queryId: string, index: number) =>
        $(ActionTypes.inputs.create, {queryId, index}),

    move: 
      (queryId: ID, input: BuilderTypes.IInput, index: number) =>
        $(ActionTypes.inputs.move, {queryId, input, index}),
    
    changeType:
      (queryId: ID, value: BuilderTypes.InputType, index: number) =>
        $(ActionTypes.inputs.changeType, {queryId, value, index}),
    
    remove:
      (queryId: ID, index: number) =>
        $(ActionTypes.inputs.remove, {queryId, index}),
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
  
  setVariantField:
    (variantId: ID, field: string, value: any) =>
      $(ActionTypes.setVariantField, { variantId, field, value }),
};

export default BuilderActions;