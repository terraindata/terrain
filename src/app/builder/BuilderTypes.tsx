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

import * as _ from 'underscore';
import * as React from 'react';
import * as Immutable from 'immutable';
let List = Immutable.List;
let Map = Immutable.Map;

export module BuilderTypes
{ 
  export interface CardProps
  {
    index: number;
    keyPath: KeyPath;
  }
  
  // TODO generate dynamically
  
  export const CardTypes = 
  {
    // FROM: 'from',
    // SELECT: 'select',
    SFW: 'sfw',
    SORT: 'sort',
    FILTER: 'filter',
    LET: 'let',
    SCORE: 'score',
    TRANSFORM: 'transform',
    // IF: 'if',
    MAX: 'max',
    MIN: 'min',
    SUM: 'sum',
    AVG: 'avg',
    COUNT: 'count',
    EXISTS: 'exists',
    PARENTHESES: 'parentheses',
    VAR: 'var',
    TAKE: 'take',
    SKIP: 'skip',
  };
  
  export const BlockTypes =
  {
    // CONDITION: 'conditionblock',
    SORT: 'sortblock',
    FILTER: 'filterblock',
    TABLE: 'tableblock',
    WEIGHT: 'weight',
    BAR: 'bar',
    SCOREPOINT: 'scorepoint',
    SPOTLIGHT: 'spotlight',
    FIELD: 'field',
    
    INPUT: 'input,'    
  };
 

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

  // abstract  
  export class IId
  {
    id: string = "";
  }
  
  let addId = (a: any) => 
  {
    
    if(a)
    {
      _cardFieldsToExcludeFromServer.map(field => {
        if(Immutable.Map.isMap(a))
        {
          a = a.delete(field)
        }
        else
        {
          delete a[field];
        }
      });
    }
    return _.extend({}, 
      {
        id: "id-" + Math.random(),
      }, 
      a
    );
  }
  
  export var recordFactories: {[key: string]: (obj?:any) => any} = {};
  
  export class ISort extends IId
  {
    property: string = "";
    direction: Direction = Direction.DESC;
    
    set: (f: string, v: any) => ISort;
    setIn: (f: string, v: any) => ISort;
		_recordClassType = BlockTypes.SORT;
  }
  let ISort_Record = Immutable.Record(new ISort());
  export const _ISort = (config?:any) => {
    return new ISort_Record(addId(config)) as any as ISort;
  }
  recordFactories[BlockTypes.SORT] = _ISort;  
  
  export class IFilter extends IId
  {
    first: string = "";
    second: string = "";
    operator: Operator = Operator.EQ;
    combinator: Combinator = Combinator.AND;
    
    set: (f: string, v: any) => IFilter;
    setIn: (f: string, v: any) => IFilter;
		_recordClassType = BlockTypes.FILTER;
  }
  let IFilter_Record = Immutable.Record(new IFilter());
  export const _IFilter = (config?:any) => {
    return new IFilter_Record(addId(config)) as any as IFilter;
  }
  recordFactories[BlockTypes.FILTER] = _IFilter;
  
  export class ITable extends IId
  {
    table: string = "";
    iterator: string = "";
    
    set: (f: string, v: any) => ITable;
    setIn: (f: string, v: any) => ITable;
		_recordClassType = BlockTypes.TABLE;
  }
  let ITable_Record = Immutable.Record(new ITable());
  export const _ITable = (config?:any) => {
    return new ITable_Record(addId(config)) as any as ITable;
  }
  recordFactories[BlockTypes.TABLE] = _ITable;
  
  
  // abstract
  export class ICard extends IId
  {
    type: string = "";
    colors: string[] = ["#89B4A7", "#C1EADE"];
    title: string = "Card";
    
    preview: string | ((c:ICard) => string) = "[type]";
    // The BuilderTypes.getPreview function constructs
    // a preview from a card object based on this string.
    // It replaces anything within [] with the value for that key.
    // If an array of objects, you can specify: [arrayKey.objectKey]
    // and it will map through and join the values with ", ";
    
    set: (f: string, v: any) => ICard;
    setIn: (f: string, v: any) => ICard;
		_recordClassType = "";
    
    _isCard: boolean = true;
  }
  
  export type ICards = List<ICard>;
  
  
  // private  
  function wrapperCardPreview(c:AbstractWrapperCard): string
  {
    if(c.cards.size)
    {
      let card = c.cards.get(0);
      return getPreview(recordFactories[card.type]());
    }
    return "Nothing";
  }
  
  // private
  class AbstractWrapperCard extends ICard
  {
    cards: ICards = List([]);
    preview: string | ((c: AbstractWrapperCard) => string) = wrapperCardPreview;
    
    set: (f: string, v: any) => AbstractWrapperCard;
    setIn: (f: string, v: any) => AbstractWrapperCard;
  }
  
  // export class IFromCard extends AbstractWrapperCard
  // {
  //   type = CardTypes.FROM;
  //   table: string = "";
  //   iterator: string = "";
  //   tables: List<ITable> = List([]);
    
  //   set: (f: string, v: any) => IFromCard;
  //   setIn: (f: string, v: any) => IFromCard;
  //   _recordClassType = CardTypes.FROM;
  // }
  // let IFromCard_Record = Immutable.Record(new IFromCard());
  // export const _IFromCard = (config?:any) => {
  //   return new IFromCard_Record(addId(config)) as any as IFromCard;
  // }
  // recordFactories[CardTypes.FROM] = _IFromCard;
  
  export class IField extends IId
  {
    type = BlockTypes.FIELD;
    field: string = "";
    id: string = "";
    
    set: (f: string, v: any) => IField;
    setIn: (f: string, v: any) => IField;
    _recordClassType = BlockTypes.FIELD;
  }
  let IField_Record = Immutable.Record(new IField());
  export const _IField = (config?:any) => {
    return new IField_Record(addId(config)) as any as IField;
  }
  recordFactories[BlockTypes.FIELD] = _IField;
  
  export class ISfwCard extends AbstractWrapperCard
  {
    type = CardTypes.SFW;
    tables: List<ITable> = List([]);
    fields: List<IField> = List([]);
    filters: List<IFilter> = List([]);
    colors = ["#89B4A7", "#C1EADE"];
    
    title = "Select/From";
    preview = "[tables.table]: [fields.field]";
    
    set: (f: string, v: any) => ISfwCard;
    setIn: (f: string, v: any) => ISfwCard;
    _recordClassType = CardTypes.SFW;
  }
  let ISfwCard_Record = Immutable.Record(new ISfwCard());
  export const _ISfwCard = (config?:any) => {
    return new ISfwCard_Record(addId(config)) as any as ISfwCard;
  }
  recordFactories[CardTypes.SFW] = _ISfwCard;
  
  // export class ISelectCard extends ICard
  // {
  //   type = CardTypes.SELECT;
  //   properties: List<string> = List([]);
    // colors = ["#8AC888", "#B7E9B5"];
    
  //   set: (f: string, v: any) => ISelectCard;
  //   setIn: (f: string, v: any) => ISelectCard;
		// _recordClassType = CardTypes.SELECT;
  // }
  // let ISelectCard_Record = Immutable.Record(new ISelectCard());
  // export const _ISelectCard = (config?:any) => {
  //   return new ISelectCard_Record(addId(config)) as any as ISelectCard;
  // }
  // recordFactories[CardTypes.SELECT] = _ISelectCard;
  
  export class ISortCard extends ICard
  {
    type = CardTypes.SORT;
    sorts: List<ISort> = List([]);
    title = "Sort";
    preview = "[sorts.property]";
    colors = ["#C5AFD5", "#EAD9F7"];
    
    set: (f: string, v: any) => ISortCard;
    setIn: (f: string, v: any) => ISortCard;
		_recordClassType = CardTypes.SORT;
  }
  let ISortCard_Record = Immutable.Record(new ISortCard());
  export const _ISortCard = (config?:any) => {
    return new ISortCard_Record(addId(config)) as any as ISortCard;
  }
  recordFactories[CardTypes.SORT] = _ISortCard;
  
  export class IFilterCard extends ICard
  {
    type = CardTypes.FILTER;
    filters: List<IFilter> = List([]);
    title = "Comparison";
    preview = "[filters.length] Condition(s)"
    colors = ["#7EAAB3", "#B9E1E9"];
    
    set: (f: string, v: any) => IFilterCard;
    setIn: (f: string, v: any) => IFilterCard;
		_recordClassType = CardTypes.FILTER;
  }
  let IFilterCard_Record = Immutable.Record(new IFilterCard());
  
  export const _IFilterCard = (config?:any) => {
    return new IFilterCard_Record(addId(config)) as any as IFilterCard;
  }
  recordFactories[CardTypes.FILTER] = _IFilterCard;
  
  export type CardString = string | IParenthesesCard;
  
  export class ILetCard extends ICard
  {
    type = CardTypes.LET;
    field: string = "";
    expression: CardString = "";
    title = "Let";
    preview = "[field]";
    colors = ["#C0C0BE", "#E2E2E0"];
    
    set: (f: string, v: any) => ILetCard;
    setIn: (f: string, v: any) => ILetCard;
    _recordClassType = CardTypes.LET;
  }
  let ILetCard_Record = Immutable.Record(new ILetCard());
  export const _ILetCard = (config?:any) => {
    return new ILetCard_Record(addId(config)) as any as ILetCard;
  }
  recordFactories[CardTypes.LET] = _ILetCard;

  export class IVarCard extends ICard
  {
    type = CardTypes.VAR;
    field: string = "";
    expression: CardString = "";
    colors = ["#b3a37e", "#d7c7a2"];
    title = "Var";
    preview = "[field]";
    
    set: (f: string, v: any) => IVarCard;
    setIn: (f: string, v: any) => IVarCard;
    _recordClassType = CardTypes.VAR;
  }
  let IVarCard_Record = Immutable.Record(new IVarCard());
  export const _IVarCard = (config?:any) => {
    return new IVarCard_Record(addId(config)) as any as IVarCard;
  }
  recordFactories[CardTypes.VAR] = _IVarCard;  
  export class ICountCard extends AbstractWrapperCard
  {
    type = CardTypes.COUNT;
    colors = ["#70B1AC", "#D2F3F0"];
    title = "Count";
    
    set: (f: string, v: any) => ICountCard;
    setIn: (f: string, v: any) => ICountCard;
		_recordClassType = CardTypes.COUNT;
  }
  let ICountCard_Record = Immutable.Record(new ICountCard());
  export const _ICountCard = (config?:any) => {
    return new ICountCard_Record(addId(config)) as any as ICountCard;
  }
  recordFactories[CardTypes.COUNT] = _ICountCard; 
  
  export class IAvgCard extends AbstractWrapperCard
  {
    type = CardTypes.AVG;
    colors = ["#a2b37e", "#c9daa6"];
    title = "Average";
    
    set: (f: string, v: any) => IAvgCard;
    setIn: (f: string, v: any) => IAvgCard;
		_recordClassType = CardTypes.AVG;
  }
  let IAvgCard_Record = Immutable.Record(new IAvgCard());
  export const _IAvgCard = (config?:any) => {
    return new IAvgCard_Record(addId(config)) as any as IAvgCard;
  }
  recordFactories[CardTypes.AVG] = _IAvgCard; 
  
  export class ISumCard extends AbstractWrapperCard
  {
    type = CardTypes.SUM;
    colors = ["#8dc4c1", "#bae8e5"];
    title = "Sum";
    
    set: (f: string, v: any) => ISumCard;
    setIn: (f: string, v: any) => ISumCard;
		_recordClassType = CardTypes.SUM;
  }
  let ISumCard_Record = Immutable.Record(new ISumCard());
  export const _ISumCard = (config?:any) => {
    return new ISumCard_Record(addId(config)) as any as ISumCard;
  }
  recordFactories[CardTypes.SUM] = _ISumCard; 
  export class IMinCard extends AbstractWrapperCard
  {
    type = CardTypes.MIN;
    colors = ["#cc9898", "#ecbcbc"];
    title = "Min";
    
    set: (f: string, v: any) => IMinCard;
    setIn: (f: string, v: any) => IMinCard;
		_recordClassType = CardTypes.MIN;
  }
  let IMinCard_Record = Immutable.Record(new IMinCard());
  export const _IMinCard = (config?:any) => {
    return new IMinCard_Record(addId(config)) as any as IMinCard;
  }
  recordFactories[CardTypes.MIN] = _IMinCard; 
  export class IMaxCard extends AbstractWrapperCard
  {
    type = CardTypes.MAX;
    colors = ["#8299b8", "#acc6ea"];
    title = "Max";
    
    set: (f: string, v: any) => IMaxCard;
    setIn: (f: string, v: any) => IMaxCard;
		_recordClassType = CardTypes.MAX;
  }
  let IMaxCard_Record = Immutable.Record(new IMaxCard());
  export const _IMaxCard = (config?:any) => {
    return new IMaxCard_Record(addId(config)) as any as IMaxCard;
  }
  recordFactories[CardTypes.MAX] = _IMaxCard; 
  export class IExistsCard extends AbstractWrapperCard
  {
    type = CardTypes.EXISTS;
    colors = ["#a98abf", "#cfb3e3"];
    title = "Exists";
    
    set: (f: string, v: any) => IExistsCard;
    setIn: (f: string, v: any) => IExistsCard;
		_recordClassType = CardTypes.EXISTS;
  }
  let IExistsCard_Record = Immutable.Record(new IExistsCard());
  export const _IExistsCard = (config?:any) => {
    return new IExistsCard_Record(addId(config)) as any as IExistsCard;
  }
  recordFactories[CardTypes.EXISTS] = _IExistsCard; 
  export class IParenthesesCard extends AbstractWrapperCard
  {
    type = CardTypes.PARENTHESES;
    colors = ["#b37e7e", "#daa3a3"];
    title = "( )";
    
    set: (f: string, v: any) => IParenthesesCard;
    setIn: (f: string, v: any) => IParenthesesCard;
		_recordClassType = CardTypes.PARENTHESES;
  }
  let IParenthesesCard_Record = Immutable.Record(new IParenthesesCard());
  export const _IParenthesesCard = (config?:any) => {
    return new IParenthesesCard_Record(addId(config)) as any as IParenthesesCard;
  }
  recordFactories[CardTypes.PARENTHESES] = _IParenthesesCard;
  
  export class IWeight extends IId
  {
    type = BlockTypes.WEIGHT;
    key: string = "";
    weight: number = 0;  
    
    set: (f: string, v: any) => IWeight;
    setIn: (f: string, v: any) => IWeight;
		_recordClassType = BlockTypes.WEIGHT;
   }
  let IWeight_Record = Immutable.Record(new IWeight());
  export const _IWeight = (config?:any) => {
    return new IWeight_Record(addId(config)) as any as IWeight;
  }
  recordFactories[BlockTypes.WEIGHT] = _IWeight;

  
  export class IScoreCard extends ICard
  {
    type = CardTypes.SCORE;
    weights: List<IWeight> = List([]);
    method: string = "";
    colors = ["#9DC3B8", "#D1EFE7"];
    title = "Score";
    
    set: (f: string, v: any) => IScoreCard;
    setIn: (f: string, v: any) => IScoreCard;
		_recordClassType = CardTypes.SCORE;
  }
  let IScoreCard_Record = Immutable.Record(new IScoreCard());
  export const _IScoreCard = (config?:any) => {
    return new IScoreCard_Record(addId(config)) as any as IScoreCard;
  }
  recordFactories[CardTypes.SCORE] = _IScoreCard;
  
  
  export class IBar extends IId
  {
    type = BlockTypes.BAR;
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
		_recordClassType = BlockTypes.BAR;
   }
  let IBar_Record = Immutable.Record(new IBar());
  export const _IBar = (config?:any) => {
    return new IBar_Record(addId(config)) as any as IBar;
  }
  recordFactories[BlockTypes.BAR] = _IBar;
  
  export class IScorePoint extends IId
  {
    type = BlockTypes.SCOREPOINT;
    id: string = "";
    value: number = 0;
    score: number = 0;
    
    set: (f: string, v: any) => IScorePoint;
    setIn: (f: string, v: any) => IScorePoint;
		_recordClassType = BlockTypes.SCOREPOINT;
   }
  let IScorePoint_Record = Immutable.Record(new IScorePoint());
  export const _IScorePoint = (config?:any) => {
    return new IScorePoint_Record(addId(config)) as any as IScorePoint;
  }
  recordFactories[BlockTypes.SCOREPOINT] = _IScorePoint;
  
  export class ITransformCard extends ICard
  {
    type = CardTypes.TRANSFORM;
    input: string = "";
    range: number[] = [0,100];
    bars: List<IBar> = List([]);
    scorePoints: List<IScorePoint> = List([]);
    colors = ["#E7BE70", "#EDD8B1"];
    title = "Transform";
    
    set: (f: string, v: any) => ITransformCard;
    setIn: (f: string, v: any) => ITransformCard;
		_recordClassType = CardTypes.TRANSFORM;
  }
  let ITransformCard_Record = Immutable.Record(new ITransformCard());
  export const _ITransformCard = (config?:any) => {
    return new ITransformCard_Record(addId(config)) as any as ITransformCard;
  }
  recordFactories[CardTypes.TRANSFORM] = _ITransformCard;
  
  // export class IIfCard extends AbstractWrapperCard
  // {
  //   type = CardTypes.IF;
  //   filters: List<IFilter> = List([]);
  //   elses: List<IIfCard> = List([]);
  //   colors = ["#7eb397", "#a9dec2"];
  //   title = "If/Else";
    
  //   set: (f: string, v: any) => IIfCard;
  //   setIn: (f: string, v: any) => IIfCard;
		// _recordClassType = CardTypes.IF;
  // }
  // let IIfCard_Record = Immutable.Record(new IIfCard());
  // export const _IIfCard = (config?:any) => {
  //   return new IIfCard_Record(addId(config)) as any as IIfCard;
  // }
  // recordFactories[CardTypes.IF] = _IIfCard;
  
  export class ITakeCard extends ICard
  {
    type = CardTypes.TAKE;
    value: string = "";
    title = "Take";
    
    set: (f: string, v: any) => ITakeCard;
    setIn: (f: string, v: any) => ITakeCard;
		_recordClassType = CardTypes.TAKE;
  }
  let ITakeCard_Record = Immutable.Record(new ITakeCard());
  export const _ITakeCard = (config?:any) => {
    return new ITakeCard_Record(addId(config)) as any as ITakeCard;
  }
  recordFactories[CardTypes.TAKE] = _ITakeCard;
  
  export class ISkipCard extends ICard
  {
    type = CardTypes.SKIP;
    value: string = "";
    colors = ["#CDCF85", "#F5F6B3"];
    title = "Skip";
    
    set: (f: string, v: any) => ISkipCard;
    setIn: (f: string, v: any) => ISkipCard;
		_recordClassType = CardTypes.SKIP;
  }
  let ISkipCard_Record = Immutable.Record(new ISkipCard());
  export const _ISkipCard = (config?:any) => {
    return new ISkipCard_Record(addId(config)) as any as ISkipCard;
  }
  recordFactories[CardTypes.SKIP] = _ISkipCard;
  
  export class ISpotlight extends IId
  {
    type = BlockTypes.SPOTLIGHT;
    // TODO
    
    set: (f: string, v: any) => ISpotlight;
    setIn: (f: string, v: any) => ISpotlight;
    _recordClassType = BlockTypes.SPOTLIGHT;
  }
  const ISpotlight_Record = Immutable.Record(new ISpotlight());
  export const _ISpotlight = (config?:any) => {
    return new ISpotlight_Record(addId(config)) as any as ISpotlight;
  }
  recordFactories[BlockTypes.SPOTLIGHT] = _ISpotlight;
  
  export type ISpotlights = List<ISpotlight>
  
  
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
    type: InputType = InputType.NUMBER; // maybe inputType?
    
    set: (f: string, v: any) => IInput;
    setIn: (f: string, v: any) => IInput;
    _recordClassType = BlockTypes.INPUT;
  }
  let IInput_Record = Immutable.Record(new IInput());
  export const _IInput = (config?:any) => {
    return new IInput_Record(addId(config)) as any as IInput;
  }
  recordFactories[BlockTypes.INPUT] = _IInput;
  
  
  // A query can be viewed and edited in the Builder
  // currently, only Variants are Queries, but that may change
  export interface IQuery
  {
    id: string;
    cards: ICards;
    inputs: List<IInput>;
    tql: string;
    mode: string;
    version: boolean;
    name: string;
    lastEdited: string;
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
  
  export function getPreview(card:ICard):string
  {
    let {preview} = card;
    if(typeof preview === 'string')
    {
      return preview.replace(/\[[a-z\.]*\]/g, str =>
      {
        let pattern = str.substr(1, str.length - 2);
        let keys = pattern.split(".");
        if(keys.length === 1)
        {
          return card[keys[0]];
        }
        if(keys[1] === 'length')
        {
          return card[keys[0]].size;
        }
        return card[keys[0]].toArray().map(v => v[keys[1]]).join(", ");
      });
    }
    else
    {
      return preview(card);
    }
  }
  
  export const _cardFieldsToExcludeFromServer =
  [
    'preview',
    'title',
    'colors',
  ];

}



export const Directions: string[] = ['ascending', 'descending'];
export const Combinators: string[] = ['&', 'or'];
export const Operators = ['=', '≠', '≥', '>', '≤', '<', 'in', <span className='strike'>in</span>];

export default BuilderTypes;


// TODO try this

class A
{
  a = "first";
  b = "second";
}
class B
{
  a = "third";
  c = "fourth";
}
function F(c, config: {[k:string]: any} = {}): any
{
  // TODO set _recordClassType in here
  let r = Immutable.Record(new c());
  return new r(config);
}
function FT<T>(c, config: {[k:string]: any} = {}): T
{
  return F(c, config) as T;
}
console.log(typeof A, FT<A>(A, {a: 'abc'}));

// class Factory<T>
// {
//   static _(c, config: {[k:string]: any} = {}): T
//   {
//     // set _recordClassType in here
//     let r = Immutable.Record(new c());
//     return new r(config) as any as T;
//   }
// }

// console.log((new Factory<A>())._(A));
