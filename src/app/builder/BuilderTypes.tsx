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

// TODO update naming

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
  
  
  export interface IId
  {
    id: string;
  }
  
  export interface IParentId
  {
    parentId: string;
  }
  
  export interface ICondition
  {
    first: string;
    second: string;
    operator: Operator;
  }
  
  export interface IJoin extends IId
  {
    group: string;
    condition: ICondition;
  }
  
  export interface ISort extends IId
  {
    property: string;
    direction: Direction;
  }
  
  export interface IFilter extends IId
  {
    combinator: Combinator;
    condition: ICondition;
  }
  
  export interface ICard extends IId, IParentId
  {
    type: string;
  }
  
  export type CardString = string | IParenthesesCard;
  
  export interface ICardsContainer
  {
    cards: ICard[];
  }
  
  export interface IFromCard extends ICard, ICardsContainer
  {
    group: string;
    iterator: string;
    joins: IJoin[];
  }
  
  export interface ISFWCard extends ICard, ICardsContainer
  {
    properties: IProperty[];
    filters: IFilter[];
    group: string;
    iterator: string;
    joins: IJoin[];
  }
  
  export interface IJoinCard extends ICard
  {
    group: string;
    condition: ICondition;
  }
  
  export interface IProperty extends IId
  {
    property: string;
  }
  
  export interface ISelectCard extends ICard
  {
    properties: IProperty[];
  }
  
  export interface ISortCard extends ICard
  {
    sorts: ISort[];
  }
  
  export interface IFilterCard extends ICard
  {
    filters: IFilter[];
  }
  
  export interface ILetCard extends ICard
  {
    field: string;
    expression: CardString;
  }
  
  export interface IVarCard extends ICard
  {
    field: string;
    expression: CardString;
  }
  
  export interface ICountCard extends ICard, ICardsContainer {}
  export interface IAvgCard extends ICard, ICardsContainer {}
  export interface ISumCard extends ICard, ICardsContainer {}
  export interface IMinCard extends ICard, ICardsContainer {}
  export interface IMaxCard extends ICard, ICardsContainer {}
  export interface IExistsCard extends ICard, ICardsContainer {}
  export interface IParenthesesCard extends ICard, ICardsContainer {}
  
  export interface IWeight
  {
    key: string;
    weight: number;
  }
  
  export interface IScoreCard extends ICard
  {
    weights: IWeight[];
    method: string;
  }
  
  export interface IBar extends IId
  {
    count: number;
    percentage: number;
    range: {
      min: number;
      max: number;
    }
  }
  
  export interface IScorePoint extends IId
  {
    value: number;
    score: number;
  }
  
  export interface ITransformCard extends ICard
  {
    input: string;
    
    range: number[];
    bars: IBar[];
    scorePoints: IScorePoint[];
  }
  
  // export interface IElse extends IId, ICardsContainer
  // {
  //   condition?: ICondition; // no condition means it's an unconditional else
  // }
  
  export interface IIfCard extends ICard, ICardsContainer
  {
    filters: IFilter[]; // no filters means it's an unconditional else
    elses: IIfCard[];
  }
  
  export interface IValueCard extends ICard
  {
    value: string;  
  }
  
  export interface ITakeCard extends IValueCard {}
  export interface ISkipCard extends IValueCard {}
  
  export enum InputType
  {
    TEXT,
    DATE,
    NUMBER,
  }
  
  export interface IInput extends IId, IParentId
  {
    type: InputType;
    key: string;
    value: string;
  }
  
  export interface IExe
  {
    cards: ICard[];
    inputs: IInput[];
  }
}
