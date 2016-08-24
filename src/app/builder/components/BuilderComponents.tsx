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
import {BuilderTypes, Directions, Combinators, Operators} from './../BuilderTypes.tsx';
import ScoreBar from './charts/ScoreBar.tsx';
import TransformCard from './charts/TransformCard.tsx';
import PureClasss from './../../common/components/PureClasss.tsx';
let {CardTypes, BlockTypes} = BuilderTypes;

export enum DisplayType
{
  TEXT,
  CARDTEXT,
  NUM,
  ROWS,
  CARDS,
  DROPDOWN,
  FLEX,
  COMPONENT,
  LABEL, // strict text to paste in to HTML
}

let {TEXT, NUM, ROWS, CARDS, CARDTEXT, DROPDOWN, LABEL, FLEX, COMPONENT} = DisplayType;

export interface Display
{
  displayType: DisplayType;
  key: string;
  
  header?: string;
  options?: List<(string | El)>;
  label?: string;
  placeholder?: string;
  className?: string | ((data: any) => string);
  
  provideParentData?: boolean;
  // if true, it passes the parent data down
  // this will cause unnecessary re-rendering, so avoid if possible
  
  // for rows and flex:
  row?: Display | Display[];
  
  // for rows:
  english?: string;
  factoryType?: string;
  
  // for components
  component?: (typeof PureClasss);
}

let valueDisplay =
{
  displayType: NUM,
  key: 'value',
}

let textDisplay =
{
  displayType: TEXT,
  key: [],
}

let filtersDisplay = 
{
    displayType: ROWS,
    key: 'filters',
    english: 'condition',
    factoryType: BlockTypes.FILTER,
    className: (data => data.filters.size > 1 ? 'filters-multiple' : 'filters-single'),
    row: [
      {
        displayType: CARDTEXT,
        key: 'first',
      },
      {
        displayType: DROPDOWN,
        key: 'operator',
        options: Immutable.List(Operators),
      },
      {
        displayType: CARDTEXT,
        key: 'second',
      },
      {
        displayType: DROPDOWN,
        key: 'combinator',
        options: Immutable.List(Combinators),
        className: 'combinator',
      }
    ],
  };

let wrapperDisplay =
{
  displayType: CARDS,
  key: 'cards',
};

let letVarDisplay =
{
  displayType: FLEX,
  key: null,
  row:
  [
    {
      displayType: TEXT,
      key: 'field',
    },
    {
      displayType: LABEL,
      label: '=',
      key: null,
    },
    {
      displayType: CARDTEXT,
      key: 'expression',
    },
  ],
};

export const BuilderComponents: {[type:string]: Display | Display[]} =
{
  sfw:
  [
    {
      header: 'Select',
      displayType: ROWS,
      key: 'fields',
      english: 'field',
      factoryType: BlockTypes.FIELD,
      row:
      {
        displayType: TEXT,
        key: 'field'
      },
    },
    
    {
      header: 'From',
      displayType: ROWS,
      key: 'tables',
      english: 'table',
      factoryType: BlockTypes.TABLE,
      row: [  
        {
          displayType: TEXT,
          key: 'table',
        },
        {
          displayType: LABEL,
          label: 'as',
          key: null,
        },
        {
          displayType: TEXT,
          key: 'iterator',
        },
      ]
    },
    
    _.extend(
      {
        header: 'Where',
      }, 
      filtersDisplay
    ),
    
    {
      displayType: CARDS,
      key: 'cards',
    },
  ],
  
  // from:
  // {
  //   displayType: TEXT,
  //   key: 'table',
  // },
  
  sort:
  {
    displayType: ROWS,
    key: 'sorts',
    english: 'sort',
    factoryType: BlockTypes.SORT,
    row:
    [
      {
        displayType: TEXT,
        key: 'property'
      },
      {
        displayType: DROPDOWN,
        key: 'direction',
        options: Immutable.List(Directions),
      },
    ]
  },
  
  filter: filtersDisplay,
  
  let: letVarDisplay,
  var: letVarDisplay,
  
  score:
  {
    displayType: ROWS,
    key: 'weights',
    english: 'weight',
    factoryType: BlockTypes.WEIGHT,
    provideParentData: true,
    row:
    [
      {
        displayType: TEXT,
        key: 'key',
        placeholder: 'Field',
      },
      {
        displayType: NUM,
        key: 'weight',
        placeholder: 'Weight',
      },
      {
        displayType: COMPONENT,
        component: ScoreBar,
        key: null,
      },
    ]
  },
  
  transform:
  [
    {
      displayType: TEXT,
      key: 'input',
      placeholder: 'Input field',
    },
    {
      displayType: COMPONENT,
      component: TransformCard,
      key: null,
    },
    // TODO
  ],
  
  // TODO
  // if: {},
  
  take: valueDisplay,
  skip: valueDisplay,
  
  max: wrapperDisplay,
  min: wrapperDisplay,
  sum: wrapperDisplay,
  avg: wrapperDisplay,
  count: wrapperDisplay,
  exists: wrapperDisplay,
  parentheses: wrapperDisplay,
}

export default BuilderComponents;