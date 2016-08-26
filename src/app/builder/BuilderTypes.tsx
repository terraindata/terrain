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
import PureClasss from './../common/components/PureClasss.tsx';
import ScoreBar from './components/charts/ScoreBar.tsx';
import TransformCardComponent from './components/charts/TransformCard.tsx';

export const Directions: string[] = ['ascending', 'descending'];
export const Combinators: string[] = ['&', 'or'];
export const Operators = ['=', '≠', '≥', '>', '≤', '<', 'in', <span className='strike'>in</span>];

export enum DisplayType
{
  TEXT,
  CARDTEXT, // textbox that can be cards, must be coupled with:
  CARDSFORTEXT, // cards that are associated with a textbox
  NUM,
  ROWS,
  CARDS,
  DROPDOWN,
  FLEX,
  COMPONENT,
  LABEL, // strict text to paste in to HTML
}

let {TEXT, NUM, ROWS, CARDS, CARDTEXT, CARDSFORTEXT, DROPDOWN, LABEL, FLEX, COMPONENT} = DisplayType;

export interface Display
{
  displayType: DisplayType;
  key: string;
  
  header?: string;
  options?: List<(string | El)>;
  label?: string;
  placeholder?: string;
  className?: string | ((data: any) => string);
  
  above?: Display;
  below?: Display;
  
  provideParentData?: boolean;
  // if true, it passes the parent data down
  // this will cause unnecessary re-rendering, so avoid if possible
  
  // for rows
  row?: {
    inner: Display | Display[];
    above?: Display | Display[];
    below?: Display | Display[];
  };
  
  flex?: Display | Display[];
  
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
    factoryType: 'filterBlock',
    className: (data => data.filters.size > 1 ? 'filters-multiple' : 'filters-single'),
    row: 
    {
      above:
      {
        displayType: CARDSFORTEXT,
        key: 'first',
      },
      
      below:
      {
        displayType: CARDSFORTEXT,
        key: 'second',
      },
      
      inner:
      [
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
    },
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
  flex:
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
  below:
  {
    key: 'expression',
    displayType: CARDSFORTEXT,
  },
};
  
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
    
  export enum InputType
  {
    TEXT,
    DATE,
    NUMBER,
  }

  // TODO export or include in a common file
  // abstract  
  class IRecord<T>
  {
    id: string = "";
    type: string = "";
    set: (f: string, v: any) => T;
    setIn: (f: string, v: any) => T;
    get: (f: string | number) => any;
    getIn: (f: (string | number)[] | KeyPath) => any;
    delete: (f: string) => T;
    deleteIn: (f: (string | number)[] | KeyPath) => T;
  }
  
  // abstract
  export class ICard<T> extends IRecord<T>
  {
    _isCard: boolean = true;
    
    // the following fields are excluded from the server save    
    colors: string[] = ["#89B4A7", "#C1EADE"];
    title: string = "Card";
    display: Display | Display[];
    preview: string | ((c:ICard<any>) => string) = "[type]";
    // The BuilderTypes.getPreview function constructs
    // a preview from a card object based on this string.
    // It replaces anything within [] with the value for that key.
    // If an array of objects, you can specify: [arrayKey.objectKey]
    // and it will map through and join the values with ", ";
  }
  
  export type ICards = List<ICard<any>>;
  export type CardString = string | ICard<any>;
  
  // private
  class AbstractWrapperCard<T> extends ICard<T>
  {
    cards: ICards = List([]);
    preview: string | ((c:AbstractWrapperCard<any>) => string) = (c:AbstractWrapperCard<any>): string => {
      if(c.cards.size)
      {
        let card = c.cards.get(0);
        return getPreview(F[card.type]());
      }
      return "Nothing";
    }
    
    display: Display | Display[] = wrapperDisplay;
  }

  // BuildingBlocks
  export const Blocks =
  { 
    sortBlock: class Sort extends IRecord<Sort>
    {
      property: string = "";
      direction: Direction = Direction.DESC;
    },
    
    filterBlock: class Filter extends IRecord<Filter>
    {
      first: string = "";
      second: string = "";
      operator: Operator = Operator.EQ;
      combinator: Combinator = Combinator.AND;
    },
    
    table: class Table extends IRecord<Table>
    {
      table: string = "";
      iterator: string = "";
    },
    
    field: class Field extends IRecord<Field>
    {
      field: string = "";
    },
    
    sfw: class SfwCard extends AbstractWrapperCard<SfwCard>
    {
      tables: List<any> = List([]);
      fields: List<any> = List([]);
      filters: List<any> = List([]);
      colors = ["#89B4A7", "#C1EADE"];
      
      title = "Select / From";
      preview = "[tables.table]: [fields.field]";
      
      display = [
        {
          header: 'Select',
          displayType: ROWS,
          key: 'fields',
          english: 'field',
          factoryType: 'field',
          row:
          {
            inner:
            {
              displayType: TEXT,
              key: 'field'
            },
          },
        },
        
        {
          header: 'From',
          displayType: ROWS,
          key: 'tables',
          english: 'table',
          factoryType: 'table',
          row: 
          {
            inner:
            [  
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
            ],
          },
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
          className: 'sfw-cards-area',
        },
      ];
    },
    
    sort: class SortCard extends ICard<SortCard>
    {
      sorts: List<any> = List([]);
      title = "Sort";
      preview = "[sorts.property]";
      colors = ["#C5AFD5", "#EAD9F7"];
      display = {
        displayType: ROWS,
        key: 'sorts',
        english: 'sort',
        factoryType: 'sort',
        row:
        {
          inner:
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
          ],
        },
      };
    },
    
    filter: class FilterCard extends ICard<FilterCard>
    {
      filters: List<any> = List([]);
      title = "Comparison";
      preview = "[filters.length] Condition(s)"
      colors = ["#7EAAB3", "#B9E1E9"];
      display = filtersDisplay;
    },
    
    let: class LetCard extends ICard<LetCard>
    {
      field: string = "";
      expression = "";
      title = "Let";
      preview = "[field]";
      colors = ["#C0C0BE", "#E2E2E0"];
      display = letVarDisplay;
    },

    var: class VarCard extends ICard<VarCard>
    {
      field: string = "";
      expression = "";
      colors = ["#b3a37e", "#d7c7a2"];
      title = "Var";
      preview = "[field]";
      display = letVarDisplay;
    },

    count: class CountCard extends AbstractWrapperCard<CountCard>
    {
      colors = ["#70B1AC", "#D2F3F0"];
      title = "Count";
    },
    
    avg: class AvgCard extends AbstractWrapperCard<AvgCard>
    {
      colors = ["#a2b37e", "#c9daa6"];
      title = "Average";
    },
    
    sum: class SumCard extends AbstractWrapperCard<SumCard>
    {
      colors = ["#8dc4c1", "#bae8e5"];
      title = "Sum";
    },

    min: class MinCard extends AbstractWrapperCard<MinCard>
    {
      colors = ["#cc9898", "#ecbcbc"];
      title = "Min";
    },

    max: class MaxCard extends AbstractWrapperCard<MaxCard>
    {
      colors = ["#8299b8", "#acc6ea"];
      title = "Max";
    },

    exists: class ExistsCard extends AbstractWrapperCard<ExistsCard>
    {
      colors = ["#a98abf", "#cfb3e3"];
      title = "Exists";
    },

    parentheses: class ParenthesesCard extends AbstractWrapperCard<ParenthesesCard>
    {
      colors = ["#b37e7e", "#daa3a3"];
      title = "( )";
    },
    
    weight: class Weight extends IRecord<Weight>
    {
      key: string = "";
      weight: number = 0;  
    },

    score: class ScoreCard extends ICard<ScoreCard>
    {
      weights: List<any> = List([]);
      method: string = "";
      colors = ["#9DC3B8", "#D1EFE7"];
      title = "Score";
      
      display = {
        displayType: ROWS,
        key: 'weights',
        english: 'weight',
        factoryType: 'weight',
        provideParentData: true,
        row:
        {
          inner:
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
          ],
        },
      };
    },
    
    bar: class Bar extends IRecord<Bar>
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
    },
    
    scorePoint: class ScorePoint extends IRecord<ScorePoint>
    {
      id: string = "";
      value: number = 0;
      score: number = 0;
    },
    
    transform: class TransformCard extends ICard<TransformCard>
    {
      input: string = "";
      domain: List<number> = List([0,100]);
      bars = List([]);
      scorePoints = List([]);
      colors = ["#E7BE70", "#EDD8B1"];
      title = "Transform";
      
      display = [
        {
          displayType: TEXT,
          key: 'input',
          placeholder: 'Input field',
        },
        {
          displayType: COMPONENT,
          component: TransformCardComponent,
          key: 'scorePoints',
        },
      ];
      
      static init = (config?:any) => {
        if(!config)
        {
          config = {};
        }
        if(!config.scorePoints)
        {
          let scorePoints = List([
            F.scorePoint({
              id: "a",
              value: 0,
              score: 0.5,
            }),
            F.scorePoint({
            id: "b",
              value: 50,
              score: 0.5,
            }),
            F.scorePoint({
              id: "c",
              value: 100,
              score: 0.5,
            }),
          ]);
          if(Immutable.Map.isMap(config))
          {
            config = config.set('scorePoints', scorePoints);
          }
          else
          {
            config.scorePoints = scorePoints;
          }
        }
        return config;
      }
    },
    
    take: class TakeCard extends ICard<TakeCard>
    {
      colors = ["#CDCF85", "#F5F6B3"];
      value: string = "";
      title = "Take";
      display = valueDisplay;
    },
    
    skip: class SkipCard extends ICard<SkipCard>
    {
      value: string = "";
      colors = ["#CDCF85", "#F5F6B3"];
      title = "Skip";
      display = valueDisplay;
    },
    
    spotlight: class Spotlight extends IRecord<Spotlight>
    {
      
    },
  }
  
  export const CardTypes = _.compact(_.map(Blocks, (C, k: string) => (new C())._isCard && k ));
  
  export class IInput extends IRecord<IInput>
  {
    type = "input";
    key: string = "";
    value: string = "";
    inputType: InputType = InputType.NUMBER;
  }
  export const _IInput = (config?:any): IInput =>
  {
    let r = Immutable.Record(new IInput());
    return new r(_.extend({}, {id: "input-" + Math.random(), config})) as any as IInput;
  }
  
  // A query can be viewed and edited in the Builder
  // currently, only Variants are Queries, but that may change
  export interface IQuery
  {
    id: string;
    cards: ICards;
    inputs: List<any>;
    tql: string;
    mode: string;
    version: boolean;
    name: string;
    lastEdited: string;
  }
  
  // map of type => constructor
  const AF: {
    [type: string]: (config?:any) => any
  } =
    _.reduce(Blocks, (memo, C: any, type: string) => {
      memo[type] =
        (config?) => _F(C, type, config);
      return memo;
    }, {} as {[type: string]: (config?:any) => any});
  AF['input'] = _IInput;
  
  // usage: F.sort({ ... })
  export const F = AF as any;

  var typeToRecord: any = {}; // for memoize-ing records
  function _F(C, type, config?): any
  {
    if(config)
    {
      _cardFieldsToExcludeFromServer.map(field => {
        if(Immutable.Map.isMap(config))
        {
          config = config.delete(field)
        }
        else
        {
          delete config[field];
        }
      });
    }
    
    if(C.init)
    {
      config = C.init(config);
    }
    
    config = _.extend({}, 
      {
        id: "id-" + Math.random(),
      }, 
      config,
      {
        type,
      }
    );
    
    if(!typeToRecord[type])
    {
      typeToRecord[type] = Immutable.Record(new C());
    }
    return new typeToRecord[type](config);
  }
  
  export const recordFromJS = (value: any) =>
  {
    if(Immutable.Map.isMap(value) && value.get('type'))
    {
      if(F[value.get('type')])
      {
        // console.log(value.get('type'));
        value = value.map(recordFromJS);
        value = F[value.get('type')](value);
        // console.log('f', value);
        // console.log('fs', value);
      }
      else
      {
        console && console.log && console.log('Error: No factory for ' + value.get('type'), value);
      }
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

  export function getPreview(card:ICard<any>):string
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

  const _cardFieldsToExcludeFromServer =
  [
    'preview',
    'title',
    'colors',
    'display',
  ];
}



export default BuilderTypes;

