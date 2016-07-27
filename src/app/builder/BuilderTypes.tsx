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

import * as React from 'react';
import * as Immutable from 'immutable';
let List = Immutable.List;
let Map = Immutable.Map;

export module BuilderTypes
{ 
  export enum Operator {
    EQ,
    NE,
    GE,
    GT,
    LE,
    LT,
    IN,
    NIN,
  }
  
  export enum Direction {
    ASC,
    DESC
  }
  
  export enum Combinator {
    AND,
    OR
  }
  
  
  export var recordFactories: {[key: string]: (obj?:any) => any} = {};
  
  export class ICondition
  {
    first: string = "";
    second: string = "";
    operator: Operator = Operator.EQ;
    
    set: (f: string, v: any) => ICondition;
    setIn: (f: string, v: any) => ICondition;
		_recordClassType = "condition";
  }
  let ICondition_Record = Immutable.Record(new ICondition());
  export const _ICondition = (config?:any) => {
    return new ICondition_Record(config || {}) as any as ICondition;
  }
  recordFactories["condition"] = _ICondition;
  
  export class ISort
  {
    property: string = "";
    direction: Direction = Direction.DESC;
    
    set: (f: string, v: any) => ISort;
    setIn: (f: string, v: any) => ISort;
		_recordClassType = "sort";
  }
  let ISort_Record = Immutable.Record(new ISort());
  export const _ISort = (config?:any) => {
    return new ISort_Record(config || {}) as any as ISort;
  }
  recordFactories["sort"] = _ISort;  
  
  export class IFilter
  {
    combinator: Combinator = Combinator.AND;
    condition: ICondition = _ICondition();
    
    set: (f: string, v: any) => IFilter;
    setIn: (f: string, v: any) => IFilter;
		_recordClassType = "filter";
  }
  let IFilter_Record = Immutable.Record(new IFilter());
  export const _IFilter = (config?:any) => {
    return new IFilter_Record(config || {}) as any as IFilter;
  }
  recordFactories["filter"] = _IFilter;
  
  export class IJoin
  {
    table: string = "";
    filters: List<IFilter> = List([]);
    
    set: (f: string, v: any) => IJoin;
    setIn: (f: string, v: any) => IJoin;
		_recordClassType = "join";
  }
  let IJoin_Record = Immutable.Record(new IJoin());
  export const _IJoin = (config?:any) => {
    return new IJoin_Record(config || {}) as any as IJoin;
  }
  recordFactories["join"] = _IJoin;
  
  
  // TODO
  // abstract
  // export class KeyPathClass
  // {
  //   // keyPath points to parent
  //   // full keyPath to element requires its id
  //   id: string = "";
  //   keyPath: KeyPath = List([]);
  // }

  // abstract
  export class ICard
  {
    id: string = "";
    type: string = "";
    
    set: (f: string, v: any) => ICard;
    setIn: (f: string, v: any) => ICard;
		_recordClassType = "";
    
    _isCard: boolean = true;
  }
  
  export type ICards = List<ICard>;
  
  
  // private
  class AbstractWrapperCard extends ICard
  {
    cards: ICards = List([]);
    
    set: (f: string, v: any) => AbstractWrapperCard;
    setIn: (f: string, v: any) => AbstractWrapperCard;
  }
  
  export class IFromCard extends AbstractWrapperCard
  {
    type = "from";
    table: string = "";
    iterator: string = "";
    joins: List<IJoin> = List([]);
    
    set: (f: string, v: any) => IFromCard;
    setIn: (f: string, v: any) => IFromCard;
		_recordClassType = "from";
  }
  let IFromCard_Record = Immutable.Record(new IFromCard());
  export const _IFromCard = (config?:any) => {
    return new IFromCard_Record(config || { id: 'c-' + Math.random(), }) as any as IFromCard;
  }
  recordFactories["from"] = _IFromCard;
  
  export class ISelectCard extends ICard
  {
    type = "select";
    properties: List<string> = List([]);
    
    set: (f: string, v: any) => ISelectCard;
    setIn: (f: string, v: any) => ISelectCard;
		_recordClassType = "select";
  }
  let ISelectCard_Record = Immutable.Record(new ISelectCard());
  export const _ISelectCard = (config?:any) => {
    return new ISelectCard_Record(config || { id: 'c-' + Math.random(), }) as any as ISelectCard;
  }
  recordFactories["select"] = _ISelectCard;
  
  
  export class ISortCard extends ICard
  {
    type = "sort";
    sorts: List<ISort> = List([]);
    
    set: (f: string, v: any) => ISortCard;
    setIn: (f: string, v: any) => ISortCard;
		_recordClassType = "sort";
  }
  let ISortCard_Record = Immutable.Record(new ISortCard());
  export const _ISortCard = (config?:any) => {
    return new ISortCard_Record(config || { id: 'c-' + Math.random(), }) as any as ISortCard;
  }
  recordFactories["sort"] = _ISortCard;
  
  export class IFilterCard extends ICard
  {
    type = "filter";
    filters: List<IFilter> = List([]);
    
    set: (f: string, v: any) => IFilterCard;
    setIn: (f: string, v: any) => IFilterCard;
		_recordClassType = "filter";
  }
  let IFilterCard_Record = Immutable.Record(new IFilterCard());
  export const _IFilterCard = (config?:any) => {
    return new IFilterCard_Record(config || { id: 'c-' + Math.random(), }) as any as IFilterCard;
  }
  recordFactories["filter"] = _IFilterCard;
  
  export type CardString = string | IParenthesesCard;
  
  export class ILetCard extends ICard
  {
    type = "let";
    field: string = "";
    expression: CardString = "";
    
    set: (f: string, v: any) => ILetCard;
    setIn: (f: string, v: any) => ILetCard;
		_recordClassType = "let";
  }
  let ILetCard_Record = Immutable.Record(new ILetCard());
  export const _ILetCard = (config?:any) => {
    return new ILetCard_Record(config || { id: 'c-' + Math.random(), }) as any as ILetCard;
  }
  recordFactories["let"] = _ILetCard;

  export class IVarCard extends ICard
  {
    type = "var";
    field: string = "";
    expression: CardString = "";
    
    set: (f: string, v: any) => IVarCard;
    setIn: (f: string, v: any) => IVarCard;
		_recordClassType = "var";
  }
  let IVarCard_Record = Immutable.Record(new IVarCard());
  export const _IVarCard = (config?:any) => {
    return new IVarCard_Record(config || { id: 'c-' + Math.random(), }) as any as IVarCard;
  }
  recordFactories["var"] = _IVarCard;  
  
  
  
  
  export class ICountCard extends AbstractWrapperCard
  {
    type = "count";
    
    set: (f: string, v: any) => ICountCard;
    setIn: (f: string, v: any) => ICountCard;
		_recordClassType = "count";
  }
  let ICountCard_Record = Immutable.Record(new ICountCard());
  export const _ICountCard = (config?:any) => {
    return new ICountCard_Record(config || { id: 'c-' + Math.random(), }) as any as ICountCard;
  }
  recordFactories["count"] = _ICountCard; 
  export class IAvgCard extends AbstractWrapperCard
  {
    type = "avg";
    
    set: (f: string, v: any) => IAvgCard;
    setIn: (f: string, v: any) => IAvgCard;
		_recordClassType = "avg";
  }
  let IAvgCard_Record = Immutable.Record(new IAvgCard());
  export const _IAvgCard = (config?:any) => {
    return new IAvgCard_Record(config || { id: 'c-' + Math.random(), }) as any as IAvgCard;
  }
  recordFactories["avg"] = _IAvgCard; 
  export class ISumCard extends AbstractWrapperCard
  {
    type = "sum";
    
    set: (f: string, v: any) => ISumCard;
    setIn: (f: string, v: any) => ISumCard;
		_recordClassType = "sum";
  }
  let ISumCard_Record = Immutable.Record(new ISumCard());
  export const _ISumCard = (config?:any) => {
    return new ISumCard_Record(config || { id: 'c-' + Math.random(), }) as any as ISumCard;
  }
  recordFactories["sum"] = _ISumCard; 
  export class IMinCard extends AbstractWrapperCard
  {
    type = "min";
    
    set: (f: string, v: any) => IMinCard;
    setIn: (f: string, v: any) => IMinCard;
		_recordClassType = "min";
  }
  let IMinCard_Record = Immutable.Record(new IMinCard());
  export const _IMinCard = (config?:any) => {
    return new IMinCard_Record(config || { id: 'c-' + Math.random(), }) as any as IMinCard;
  }
  recordFactories["min"] = _IMinCard; 
  export class IMaxCard extends AbstractWrapperCard
  {
    type = "max";
    
    set: (f: string, v: any) => IMaxCard;
    setIn: (f: string, v: any) => IMaxCard;
		_recordClassType = "max";
  }
  let IMaxCard_Record = Immutable.Record(new IMaxCard());
  export const _IMaxCard = (config?:any) => {
    return new IMaxCard_Record(config || { id: 'c-' + Math.random(), }) as any as IMaxCard;
  }
  recordFactories["max"] = _IMaxCard; 
  export class IExistsCard extends AbstractWrapperCard
  {
    type = "exists";
    
    set: (f: string, v: any) => IExistsCard;
    setIn: (f: string, v: any) => IExistsCard;
		_recordClassType = "exists";
  }
  let IExistsCard_Record = Immutable.Record(new IExistsCard());
  export const _IExistsCard = (config?:any) => {
    return new IExistsCard_Record(config || { id: 'c-' + Math.random(), }) as any as IExistsCard;
  }
  recordFactories["exists"] = _IExistsCard; 
  export class IParenthesesCard extends AbstractWrapperCard
  {
    type = "parentheses";
    
    set: (f: string, v: any) => IParenthesesCard;
    setIn: (f: string, v: any) => IParenthesesCard;
		_recordClassType = "parentheses";
  }
  let IParenthesesCard_Record = Immutable.Record(new IParenthesesCard());
  export const _IParenthesesCard = (config?:any) => {
    return new IParenthesesCard_Record(config || { id: 'c-' + Math.random(), }) as any as IParenthesesCard;
  }
  recordFactories["parentheses"] = _IParenthesesCard;
  
  export class IWeight
  {
    key: string = "";
    weight: number = 0;  
    
    set: (f: string, v: any) => IWeight;
    setIn: (f: string, v: any) => IWeight;
		_recordClassType = "weight";
   }
  let IWeight_Record = Immutable.Record(new IWeight());
  export const _IWeight = (config?:any) => {
    return new IWeight_Record(config || {}) as any as IWeight;
  }
  recordFactories["weight"] = _IWeight;

  
  export class IScoreCard extends ICard
  {
    weights: List<IWeight> = List([]);
    method: string = "";
    
    set: (f: string, v: any) => IScoreCard;
    setIn: (f: string, v: any) => IScoreCard;
		_recordClassType = "score";
  }
  let IScoreCard_Record = Immutable.Record(new IScoreCard());
  export const _IScoreCard = (config?:any) => {
    return new IScoreCard_Record(config || { id: 'c-' + Math.random(), }) as any as IScoreCard;
  }
  recordFactories["score"] = _IScoreCard;
  
  
  export class IBar
  {
    id: string = "";
    count: number = 0;
    percentage: number = 0;
    range: {
      min: number;
      max: number;
    } = {
      min: 0,
      max: 0,
    };
    
    set: (f: string, v: any) => IBar;
    setIn: (f: string, v: any) => IBar;
		_recordClassType = "bar";
   }
  let IBar_Record = Immutable.Record(new IBar());
  export const _IBar = (config?:any) => {
    return new IBar_Record(config || { id: 'c-' + Math.random(), }) as any as IBar;
  }
  recordFactories["bar"] = _IBar;
  
  export class IScorePoint
  {
    id: string = "";
    value: number = 0;
    score: number = 0;
    
    set: (f: string, v: any) => IScorePoint;
    setIn: (f: string, v: any) => IScorePoint;
		_recordClassType = "scorepoint";
   }
  let IScorePoint_Record = Immutable.Record(new IScorePoint());
  export const _IScorePoint = (config?:any) => {
    return new IScorePoint_Record(config || { id: 'c-' + Math.random(), }) as any as IScorePoint;
  }
  recordFactories["scorepoint"] = _IScorePoint;
  
  export class ITransformCard extends ICard
  {
    input: string = "";
    range: number[] = [0,100];
    bars: List<IBar> = List([]);
    scorePoints: List<IScorePoint> = List([]);
    
    set: (f: string, v: any) => ITransformCard;
    setIn: (f: string, v: any) => ITransformCard;
		_recordClassType = "transform";
  }
  let ITransformCard_Record = Immutable.Record(new ITransformCard());
  export const _ITransformCard = (config?:any) => {
    return new ITransformCard_Record(config || { id: 'c-' + Math.random(), }) as any as ITransformCard;
  }
  recordFactories["transform"] = _ITransformCard;
  
  export class IIfCard extends AbstractWrapperCard
  {
    filters: List<IFilter> = List([]);
    elses: List<IIfCard> = List([]);
    
    set: (f: string, v: any) => IIfCard;
    setIn: (f: string, v: any) => IIfCard;
		_recordClassType = "if";
  }
  let IIfCard_Record = Immutable.Record(new IIfCard());
  export const _IIfCard = (config?:any) => {
    return new IIfCard_Record(config || { id: 'c-' + Math.random(), }) as any as IIfCard;
  }
  recordFactories["if"] = _IIfCard;
  
  export class ITakeCard extends ICard
  {
    value: string = "";
    
    set: (f: string, v: any) => ITakeCard;
    setIn: (f: string, v: any) => ITakeCard;
		_recordClassType = "take";
  }
  let ITakeCard_Record = Immutable.Record(new ITakeCard());
  export const _ITakeCard = (config?:any) => {
    return new ITakeCard_Record(config || { id: 'c-' + Math.random(), }) as any as ITakeCard;
  }
  recordFactories["take"] = _ITakeCard;
  
  export class ISkipCard extends ICard
  {
    value: string = "";
    
    set: (f: string, v: any) => ISkipCard;
    setIn: (f: string, v: any) => ISkipCard;
		_recordClassType = "skip";
  }
  let ISkipCard_Record = Immutable.Record(new ISkipCard());
  export const _ISkipCard = (config?:any) => {
    return new ISkipCard_Record(config || { id: 'c-' + Math.random(), }) as any as ISkipCard;
  }
  recordFactories["skip"] = _ISkipCard;
  
  
  export enum InputType
  {
    TEXT,
    DATE,
    NUMBER,
  }
  
  export class IInput
  {
    id: string = "";
    key: string = "";
    value: string = "";
    type: InputType;
    
    set: (f: string, v: any) => IInput;
    setIn: (f: string, v: any) => IInput;
    _recordClassType = "input";
  }
  let IInput_Record = Immutable.Record(new IInput());
  export const _IInput = (config?:any) => {
    return new IInput_Record(config || { id: 'c-' + Math.random(), }) as any as IInput;
  }
  recordFactories["input"] = _IInput;
  
  
  // A query can be viewed and edited in the Builder
  // currently, only Variants are Queries, but that may change
  export interface IQuery
  {
    id: string;
    cards: ICards;
    inputs: List<IInput>;
    tql: string;
    mode: string;
  }
  
  
  export const recordFromJS = (value: any) =>
  {
    if(Immutable.Map.isMap(value) && value.get('_recordClassType'))
    {
      value = value.map(recordFromJS);
      value = recordFactories[value.get('_recordClassType')](value);
    }
    else if(Immutable.Iterable.isIterable(value))
    {
      value = value.map(recordFromJS);
    }
    
    return value;
  }

  // TODO check if this is uneeded and above function will suffice
  export const recordsFromJS = (cardsObj: any[]): BuilderTypes.ICards =>
  {
    var cards = Immutable.fromJS(cardsObj);
    cards = cards.map(recordFromJS);
    return cards as BuilderTypes.ICards;
  }
}



export const Directions: string[] = ['ascending', 'descending'];
export const Combinators: string[] = ['&', 'or'];

export const Operators = ['=', '≠', '≥', '>', '≤', '<', 'in', <span className='strike'>in</span>];

// TODO delete if unneeded
// export const CardTypes = 
// {
//  from:
//   {
//     factory: BuilderTypes._IFromCard,
//     // colors:
//   },
//  select:
//   {
//     factory: BuilderTypes._ISelectCard,
//     // colors:
//   },
//  sort:
//   {
//     factory: BuilderTypes._ISortCard,
//     // colors:
//   },
//  filter:
//   {
//     factory: BuilderTypes._IFilterCard,
//     // colors:
//   },
//  let:
//   {
//     factory: BuilderTypes._ILetCard,
//     // colors:
//   },
//  score:
//   {
//     factory: BuilderTypes._IScoreCard,
//     // colors:
//   },
//  transform:
//   {
//     factory: BuilderTypes._ITransformCard,
//     // colors:
//   },
//  if:
//   {
//     factory: BuilderTypes._IIfCard,
//     // colors:
//   },
//  max:
//   {
//     factory: BuilderTypes._IMaxCard,
//     // colors:
//   },
//  min:
//   {
//     factory: BuilderTypes._IMinCard,
//     // colors:
//   },
//  sum:
//   {
//     factory: BuilderTypes._ISumCard,
//     // colors:
//   },
//  avg:
//   {
//     factory: BuilderTypes._IAvgCard,
//     // colors:
//   },
//  count:
//   {
//     factory: BuilderTypes._ICountCard,
//     // colors:
//   },
//  exists:
//   {
//     factory: BuilderTypes._IExistsCard,
//     // colors:
//   },
//  parentheses:
//   {
//     factory: BuilderTypes._IParenthesesCard,
//     // colors:
//   },
//  var:
//   {
//     factory: BuilderTypes._IVarCard,
//     // colors:
//   },
//  take:
//   {
//     factory: BuilderTypes._ITakeCard,
//     // colors:
//   },
//  skip:
//   {
//     factory: BuilderTypes._ISkipCard,
//     // colors:
//   },
// };


export const CardTypes = 
[
  'from',
  'select',
  'sort',
  'filter',
  'let',
  'score',
  'transform',
  'if',
  'max',
  'min',
  'sum',
  'avg',
  'count',
  'exists',
  'parentheses',
  'var',
  'take',
  'skip',
];

export const CardColors = 
// title is first, body is second
{
  none: ["#B45759", "#EA7E81"],
  from: ["#89B4A7", "#C1EADE"],
  filter: ["#7EAAB3", "#B9E1E9"],
  select: ["#8AC888", "#B7E9B5"],
  let: ["#C0C0BE", "#E2E2E0"],
  transform: ["#E7BE70", "#EDD8B1"],
  score: ["#9DC3B8", "#D1EFE7"],
  sort: ["#C5AFD5", "#EAD9F7"],
  skip: ["#CDCF85", "#F5F6B3"],
  parentheses: ["#b37e7e", "#daa3a3"],
  count: ["#70B1AC", "#D2F3F0"],
  max: ["#8299b8", "#acc6ea"],
  min: ["#cc9898", "#ecbcbc"],
  sum: ["#8dc4c1", "#bae8e5"],
  avg: ["#a2b37e", "#c9daa6"],
  exists: ["#a98abf", "#cfb3e3"],
  if: ["#7eb397", "#a9dec2"],
  var: ["#b3a37e", "#d7c7a2"],
};

export default BuilderTypes;
