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

export module CardModels
{
  export enum Operator {
    EQ,
    GE,
    GT,
    LE,
    LT,
    IN,
    NE
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
  
  export interface IAlgorithmId
  {
    algorithmId: string;
  }
  
  export interface IComparison
  {
    first: string;
    second: string;
    operator: Operator;
  }
  
  export interface IJoin extends IId
  {
    group: string;
    comparison: IComparison;
  }
  
  export interface ISort
  {
    property: Property;
    direction: Direction;
  }
  
  export interface IFilter extends IId
  {
    combinator: Combinator;
    comparison: IComparison;
  }
  
  export interface ICard extends IId, IAlgorithmId
  {
    type: string;
  }
  
  export interface IFromCard extends ICard
  {
    group: string;
    joins: IJoin[];
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
    sort: ISort;
  }
  
  export interface IFilterCard extends ICard
  {
    filters: IFilter[];
  }
  
  export interface ILetCard extends ICard
  {
    field: string;
    expression: string;
  }
  
  export interface IWeight
  {
    key: string;
    weight: number;
    color: string;
  }
  
  export interface IScoreCard extends ICard
  {
    weights: IWeight[];
    method: string;
    output: string;
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
    output: string;
    
    range: number[];
    bars: IBar[];
    scorePoints: IScorePoint[];
  }
  
  export enum InputType
  {
    TEXT,
    DATE,
  }
  
  export interface IInput extends IId, IAlgorithmId
  {
    type: InputType;
    key: string;
    value: string;
  }
}
