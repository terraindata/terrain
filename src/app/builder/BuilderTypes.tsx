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
let L = () => List([]);
let Map = Immutable.Map;

import ScoreBar from './components/charts/ScoreBar.tsx';
import TransformCardComponent from './components/charts/TransformCard.tsx';
import Store from './data/BuilderStore.tsx';

// Interestingly, these have to be above the BuilderDisplays import
//  since the import itself imports them
export const Directions: string[] = ['ascending', 'descending'];
export const Combinators: string[] = ['&', 'or'];
export const Operators = ['=', '≠', '≥', '>', '≤', '<', 'in', <span className='strike'>in</span>];

import {Display, DisplayType, valueDisplay, letVarDisplay, textDisplay, filtersDisplay, wrapperDisplay} from './BuilderDisplays.tsx';
  
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
  
  export const OperatorTQL = {
    // [Operator.EQ]: '=', //**
    [Operator.EQ]: '==',
    [Operator.NE]: '!=',
    [Operator.GE]: '>=',
    [Operator.GT]: '>',
    [Operator.LE]: '<=',
    [Operator.LT]: '<',
    [Operator.IN]: 'in',
    [Operator.NIN]: 'notIn',
  }

  export enum Direction {
    ASC,
    DESC
  }
  
  export const DirectionTQL = {
    // [Direction.ASC]: 'ASC',
    // [Direction.DESC]: 'DESC', // **
    [Direction.ASC]: 'asc',
    [Direction.DESC]: 'desc',
  }

  export enum Combinator {
    AND,
    OR
  }
  
  export const CombinatorTQL = {
    // [Combinator.AND]: 'AND',
    // [Combinator.OR]: 'OR', // **
    [Combinator.AND]: '&&',
    [Combinator.OR]: '||',
  }
    
  export enum InputType
  {
    TEXT,
    DATE,
    NUMBER,
  }
    // TODO include in a common file
  interface IRecord<T>
  {
    id: string;
    type: string;
    set: (f: string, v: any) => T;
    setIn: (f: string, v: any) => T;
    get: (f: string | number) => any;
    getIn: (f: (string | number)[] | KeyPath) => any;
    delete: (f: string) => T;
    deleteIn: (f: (string | number)[] | KeyPath) => T;
    toMap: () => Map<string, any>;
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
  
  export interface IInput extends IRecord<IInput>
  {
    type: string;
    key: string;
    value: string;
    inputType: InputType;
  }
    
  export interface ICard extends IRecord<ICard>
  {
    id: string;
    type: string;
    _isCard: boolean;
    
    // the following fields are excluded from the server save    
    static:
    {
      colors: string[];
      title: string;
      display: Display | Display[];
      
      // the format string used for generating tql
      // - insert the value of a card member by prepending the field's name with $, e.g. "$expression" or "$filters"
      // - arrays/Lists are joined with "," by default
      // - to join List with something else, specify a tqlJoiner
      // - to map a value to another string, write the field name in all caps. the value will be passed into "[FieldName]TQL" map
      //    e.g. "$DIRECTION" will look up "DirectionTQL" in BuilderTypes and pass the value into it
      tql: string;
      tqlJoiner?: string; // DOESNT WORK
      
      getChildTerms?: (card: ICard) => List<string>;
      getNeighborTerms?: (card: ICard) => List<string>;
      // given a card, return the "terms" it generates for autocomplete
      
      preview: string | ((c:ICard) => string);
      // The BuilderTypes.getPreview function constructs
      // a preview from a card object based on this string.
      // It replaces anything within [] with the value for that key.
      // If an array of objects, you can specify: [arrayKey.objectKey]
      // and it will map through and join the values with ", ";
    };
  }
  
  export type ICards = List<ICard>;
  export type CardString = string | ICard;


  // BUILDING BLOCKS
  // The following large section defines every card
  //  and every piece of every card.
  
  // IBlock is a card or a distinct piece / group of card pieces
  export interface IBlock extends IRecord<IBlock>
  {
    id: string;
    type: string;
    
    // fields not saved on server
    static:
    {
      tql: string;
      tqlJoiner?: string;
      [field:string]: any;
    }
    
    [field:string]: any;
  }
  
  interface IBlockConfig
  {
    static: {
      tql: string;
      tqlJoiner?: string;
    }
    
    [field:string]:any;
  }
  
  // helper function to populate common fields for an IBlock
  const _block = (config: IBlockConfig): IBlock =>
  {
    return _.extend({
      id: "",
      type: "",
    }, config);
  }
  
  // Every Card definition must follow this interface
  interface ICardConfig
  {
    [field:string]: any;
    
    static: {
      colors: string[];
      title: string;
      preview: string | ((c:ICard) => string);
      display: Display | Display[];
      tql: string;
      tqlJoiner?: string;
      
      getChildTerms?: (card: ICard) => List<string>;
      getNeighborTerms?: (card: ICard) => List<string>;
      init?: (config?:any) => any;
    }
  }
  
  // helper function to populate random card fields
  const _card = (config:ICardConfig) =>
    _.extend(config, {
      id: "",
      _isCard: true,
    });
  
  // a card that contains other cards
  export interface IWrapperCard extends ICard
  {
    cards: ICards;
  }
  
  // config to define such a card
  interface IWrapperCardConfig
  {
    colors: string[];
    title: string;
    getChildTerms?: (card: ICard) => List<string>;
    getNeighborTerms?: (card: ICard) => List<string>;
    display?: Display | Display[];
    tql: string;
    tqlJoiner?: string;
  }
  
  const _wrapperCard = (config:IWrapperCardConfig) =>
  {
    return _card({
      cards: L(),
      
      static:
      {
        title: config.title,
        colors: config.colors,
        getChildTerms: config.getChildTerms,
        getNeighborTerms: config.getNeighborTerms,
        
        preview: (c:IWrapperCard) => {
          if(c.cards.size)
          {
            let card = c.cards.get(0);
            return getPreview(card);
          }
          return "Nothing";
        },
        
        display: (config.display || wrapperDisplay),
        
        tql: config.tql,
      }
    })
  }
  
  const _valueCard = (config:{ title: string, colors: string[], tql: string }) => (
    _card({
      value: 0,
      
      static: {
        title: config.title,
        colors: config.colors,
        preview: "[value]",
        display: valueDisplay,
        tql: config.tql,
      }
    })
  );

  // The BuildingBlocks
  export const Blocks =
  { 
    sortBlock: _block(
    {
      property: "",
      direction: Direction.DESC,
      static:
      {
        tql: "$property $DIRECTION",
      }
    }),
    
    filterBlock: _block(
    {
      first: "",
      second: "",
      operator: Operator.EQ,
      combinator: Combinator.AND,
      
      static: {
        tql: "$first $OPERATOR $second",
      }
    }),
    
    table: _block(
    {
      table: "",
      alias: "",
      
      static: {
        // tql: "$table as $alias",
        tql: "'$table' as $alias", // **
      }
    }),
    
    field: _block(
    {
      field: "",
      
      static: {
        tql: "$field",
      }
    }),
    
    sfw: _card(
    {
      tables: L(),
      fields: L(),
      filters: L(),
      cards: L(),
      
      static:
      {
        colors: ["#89B4A7", "#C1EADE"],
        title: "Select / From",
        preview: "[tables.table]: [fields.length]",
        // tql: "SELECT $fields \nFROM $tables \nWHERE $filters \n$cards",
        tql: "from $tables \nfilter $filters \n$cards \nselect $fields",  // **
        
        getChildTerms:
          (card: ICard) =>
            card['tables'].reduce(
              (list:List<string>, tableBlock: {table: string, alias: string}): List<string> =>
              {
                let cols: List<string> = Store.getState().getIn(['tableColumns', tableBlock.table]);
                if(cols)
                {
                  return list.merge(cols.map(
                    (col) => tableBlock.alias + '.' + col
                  ).toList());
                }
                return list;
              }
            , List([])),
          
        display: [
          {
            header: 'Select',
            headerClassName: 'sfw-select-header',
            displayType: DisplayType.ROWS,
            key: 'fields',
            english: 'field',
            factoryType: 'field',
            row:
            {
              inner:
              {
                displayType: DisplayType.TEXT,
                key: 'field'
              },
            },
          },
          
          {
            header: 'From',
            displayType: DisplayType.ROWS,
            key: 'tables',
            english: 'table',
            factoryType: 'table',
            row: 
            {
              inner:
              [  
                {
                  displayType: DisplayType.TEXT,
                  key: 'table',
                  getAutoTerms: () => Store.getState().get('tables'),
                },
                {
                  displayType: DisplayType.LABEL,
                  label: 'as',
                  key: null,
                },
                {
                  displayType: DisplayType.TEXT,
                  key: 'alias',
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
            displayType: DisplayType.CARDS,
            key: 'cards',
            className: 'sfw-cards-area',
          },
        ],
      },
    }),
    
    sort: _card(
    {
      sorts: List([]),
      
      static: 
      {
        title: "Sort",
        preview: "[sorts.property]",
        colors: ["#C5AFD5", "#EAD9F7"],
        tql: "sort $sorts",
        // tql: "ORDER BY $sorts",
        
        display: {
          displayType: DisplayType.ROWS,
          key: 'sorts',
          english: 'sort',
          factoryType: 'sortBlock',
          row:
          {
            inner:
            [
              {
                displayType: DisplayType.TEXT,
                key: 'property',
              },
              {
                displayType: DisplayType.DROPDOWN,
                key: 'direction',
                options: Immutable.List(Directions),
              },
            ],
          },
        },
      },
    }),
    
    filter: _card(
    {
      filters: List([]),
      
      static:
      {
        title: "Comparison",
        preview: "[filters.length] Condition(s)",
        colors: ["#7EAAB3", "#B9E1E9"],
        display: filtersDisplay,
        tql: "$filters",
      },
    }),
    
    let: _card(
    {
      field: "",
      expression: "",
      
      static: {
        title: "Let",
        preview: "[field]",
        colors: ["#C0C0BE", "#E2E2E0"],
        display: letVarDisplay,
        tql: "let $field = $expression",
        // tql: "LET $field = $expression", // **
        getNeighborTerms: (card) => List([card['field']]),
      }
    }),

    var: _card(
    {
      field: "",
      expression: "",
      
      static: {
        colors: ["#b3a37e", "#d7c7a2"],
        title: "Var",
        preview: "[field]",
        display: letVarDisplay,
        getNeighborTerms: (card) => List([card['field']]),
        // tql: "VAR $field = $expression",
        tql: "var $field = $expression", // **
      }
    }),

    count: _wrapperCard(
    {
      colors: ["#70B1AC", "#D2F3F0"],
      title: "Count",
      tql: "COUNT $cards",
    }),
    
    avg: _wrapperCard(
    {
      colors: ["#a2b37e", "#c9daa6"],
      title: "Average",
      tql: "AVG $cards",
    }),
    
    sum: _wrapperCard(
    {
      colors: ["#8dc4c1", "#bae8e5"],
      title: "Sum",
      tql: "SUM $cards",
    }),

    min: _wrapperCard(
    {
      colors: ["#cc9898", "#ecbcbc"],
      title: "Min",
      tql: "MIN $cards",
    }),

    max: _wrapperCard(
    {
      colors: ["#8299b8", "#acc6ea"],
      title: "Max",
      tql: "MAX $cards",
    }),

    exists: _wrapperCard(
    {
      colors: ["#a98abf", "#cfb3e3"],
      title: "Exists",
      tql: "EXISTS $cards",
    }),

    parentheses: _wrapperCard(
    {
      colors: ["#b37e7e", "#daa3a3"],
      title: "( )",
      tql: "($cards)",
    }),
    
    weight: _block(
    {
      key: "",
      weight: 0,
      static: {
        tql: "[$weight, $key]",
      }
    }),

    score: _card(
    {
      weights: List([]),
      method: "",
      
      static:
      {
        colors: ["#9DC3B8", "#D1EFE7"],
        title: "Score",
        preview: "[weights.length] Weight(s)",
        tql: "linearScore([$weights])",
        display: {
          displayType: DisplayType.ROWS,
          key: 'weights',
          english: 'weight',
          factoryType: 'weight',
          provideParentData: true,
          row:
          {
            inner:
            [
              {
                displayType: DisplayType.TEXT,
                key: 'key',
                placeholder: 'Field',
              },
              {
                displayType: DisplayType.NUM,
                key: 'weight',
                placeholder: 'Weight',
              },
              {
                displayType: DisplayType.COMPONENT,
                component: ScoreBar,
                key: null,
              },
            ],
          },
        },
      }
    }),
    
    
    
    
    bar: _block(
    {
      id: "",
      count: 0,
      percentage: 0,
      range: {
        min: 0,
        max: 0,
      },
      
      static: {
        tql: null, // N/A
      }
    }),
    
    scorePoint: _block(
    {
      id: "",
      value: 0,
      score: 0,
      
      static: {
        tql: "[$score, $value]"
      }
    }),
    
    transform: _card(
    {
      input: "",
      domain: List([0,100]),
      bars: List([]),
      scorePoints: List([]),
      
      static:
      {
        colors: ["#E7BE70", "#EDD8B1"],
        title: "Transform",
        preview: "[input]",
        tql: "linearTransform([$scorePoints])",
        display: [
          {
            displayType: DisplayType.TEXT,
            key: 'input',
            placeholder: 'Input field',
          },
          {
            displayType: DisplayType.COMPONENT,
            component: TransformCardComponent,
            key: 'scorePoints',
          },
        ],
        
        init: (config?:{[key:string]:any}) => {
          if(!config)
          {
            config = {};
          }
          if(!config['scorePoints'] || !config['scorePoints'].size)
          {
            config['scorePoints'] = List([
              make(Blocks.scorePoint, {
                id: "a",
                value: 0,
                score: 0.5,
              }),
              make(Blocks.scorePoint, {
              id: "b",
                value: 50,
                score: 0.5,
              }),
              make(Blocks.scorePoint, {
                id: "c",
                value: 100,
                score: 0.5,
              }),
            ]);
          }
          return config;
        }
      }
    }),
    
    take: _valueCard(
    {
      colors: ["#CDCF85", "#F5F6B3"],
      title: "Take / Limit",
      // tql: "LIMIT $value",
      tql: "take $value", // **
    }),
    
    skip: _valueCard(
    {
      colors: ["#CDCF85", "#F5F6B3"],
      title: "Skip / Offset",
      // tql: "OFFSET $value",
      tql: "skip $value", // **
    }),
    
    spotlight: _block(
    {
      static: {
        tql: null, // N/A
      }
      // TODO some day      
    }),
    
    input: _block(
    {
      key: "",
      value: "",
      inputType: InputType.NUMBER,
      static: {
        tql: "VAR $key = $value;"
      }
    }),
  }
  // Set the "type" field for all blocks equal to its key
  _.map(Blocks as ({[card:string]:any}), (v, i) => Blocks[i].type = i);
  
  // This creates a new instance of a card / block
  // Usage: BuilderTypes.make(BuilderTypes.Blocks.sort)
  export const make = (block:IBlock, extraConfig?:{[key:string]:any}) =>
  {
    block = _.extend({}, block); // shallow clone
    if(extraConfig)
    {
      block = _.extend(block, extraConfig);
    }
    
    if(block.static)
    {
      delete block.static;
    }
    if(!block.id.length)
    {
      block.id = "block-" + Math.random();
    }
    
    let {type} = block;
    if(Blocks[type].static.init)
    {
      block = Blocks[type].static.init(block);
    }
    
    return typeToRecord[type](block);
  }
  
  // array of different card types
  export const CardTypes = _.compact(_.map(Blocks, (block, k: string) => block._isCard && k ));
  
  // private, maps a type (string) to the backing Immutable Record
  let typeToRecord = _.reduce(Blocks as ({[card:string]:any}), 
    (memo, v, i) => {
      memo[i] = Immutable.Record(v)
      return memo;
    }
  , {});

  // Given a plain JS object, construct the Record for it and its children  
  export const recordFromJS = (value: any) =>
  {
    if(Array.isArray(value) || typeof value === 'object')
    {
      value = _.reduce(value, (memo, v, key) =>
      {
        memo[key] = recordFromJS(v);
        return memo;
      }, Array.isArray(value) ? [] : {});
      
      if(value.type && Blocks[value.type])
      {
        value = make(value);
      }
      else
      {
        value = Immutable.fromJS(value);
      }
    }
    
    return value;
  }
  
  // Prepare cards/records for save, trimming static values
  export const recordsForServer = (value: any) =>
  {
    if(Immutable.Iterable.isIterable(value))
    {
      let v = value.map(recordsForServer);
      if(!v)
      {
        // records have a map function, but it returns undefined. WTF?
        v = value.toMap().map(recordsForServer);
      }
      value = v;
    }
    
    if(value && value.delete)
    {
      value = value.delete('static');
    }
    
    return Immutable.fromJS(value);
  }

  // returns preview for a given card
  export function getPreview(card:ICard):string
  {
    let {preview} = card.static;
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
  
  export function getChildIds(_block:IBlock):Map<ID, boolean>
  {
    var map: Map<ID, boolean> = Map({});
    
    if(Immutable.Iterable.isIterable(_block))
    {
      let block = _block.toMap();
      if(block.get('id'))
      {
        map = map.set(block.get('id'), true);
      }
      block.map(value => map = map.merge(getChildIds(value)));
    }
    
    return map;
  }
}

export default BuilderTypes;

