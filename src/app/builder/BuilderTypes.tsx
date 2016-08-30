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
import {Display, DisplayType, valueDisplay, letVarDisplay, textDisplay, filtersDisplay, wrapperDisplay} from './BuilderDisplays.tsx';

export const Directions: string[] = ['ascending', 'descending'];
export const Combinators: string[] = ['&', 'or'];
export const Operators = ['=', '≠', '≥', '>', '≤', '<', 'in', <span className='strike'>in</span>];

var ManualConfig = require('./../manual/ManualConfig2.json');

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
    // TODO include in a common file
  interface IRecord<T>
  {
    id: string;
    type: string;
    //faded?: boolean;
    //highlighted?: boolean;
    set: (f: string, v: any) => T;
    setIn: (f: string, v: any) => T;
    get: (f: string | number) => any;
    getIn: (f: (string | number)[] | KeyPath) => any;
    delete: (f: string) => T;
    deleteIn: (f: (string | number)[] | KeyPath) => T;

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

  interface IManualEntry
  {
    snippet: string;
    summary: string;
    notation: string;
    syntax: string;
    text: any[];
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
      
      getTerms?: (card: ICard) => string[];
      // given a card, return the "terms" it generates for autocomplete
      
      preview: string | ((c:ICard) => string);
      // The BuilderTypes.getPreview function constructs
      // a preview from a card object based on this string.
      // It replaces anything within [] with the value for that key.
      // If an array of objects, you can specify: [arrayKey.objectKey]
      // and it will map through and join the values with ", ";
      manualEntry: IManualEntry;
    };
  }
  
  export type ICards = List<ICard>;
  export type CardString = string | ICard;


  // BUILDING BLOCKS
  // The following large section defines every card
  //  and every piece of every card.
  
  // IBlock is a card or a distinct piece / group of card pieces
  interface IBlock
  {
    id: string;
    type: string;
    static?: {[key:string]:any}; // fields not saved on server
    
    [field:string]: any;
  }
  
  // helper function to populate common fields for an IBlock
  const _block = (config: {[field:string]:any}): IBlock =>
  {
    return _.extend({
      id: "",
      type: "",
      static: {},
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
      // TODO tql here
      manualEntry: IManualEntry;
      getTerms?: (card: ICard) => string[];
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
    manualEntry: IManualEntry;
    getTerms?: (card: ICard) => string[];
    display?: Display | Display[];
    // TODO tql here
  }
  
  const _wrapperCard = (config:IWrapperCardConfig) =>
  {
    return _card({
      cards: L(),
      
      static:
      {
        title: config.title,
        colors: config.colors,
        getTerms: config.getTerms,
        manualEntry: config.manualEntry,
        preview: (c:IWrapperCard) => {
          if(c.cards.size)
          {
            let card = c.cards.get(0);
            return getPreview(card);
          }
          return "Nothing";
        },
        
        display: (config.display || wrapperDisplay),
      }
    })
  }
  
  const _valueCard = (config:{ title: string, colors: string[], manualEntry: IManualEntry }) => (
    _card({
      value: 0,
      
      static: {
        title: config.title,
        colors: config.colors,
        preview: "[value]",
        display: valueDisplay,
        manualEntry: config.manualEntry
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
    }),
    
    filterBlock: _block(
    {
      first: "",
      second: "",
      operator: Operator.EQ,
      combinator: Combinator.AND,
    }),
    
    table: _block(
    {
      table: "",
      iterator: "",
    }),
    
    field: _block(
    {
      field: "",
    }),
    
    sfw: _card(
    {
      tables: L(),
      fields: L(),
      filters: L(),
      cards: L(),
      
      static:
      {
        manualEntry: ManualConfig[0]['Select / From'],
        colors: ["#89B4A7", "#C1EADE"],
        title: "Select / From",
        preview: "[tables.table]: [fields.field]",
        
        display: [
          {
            header: 'Select',
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
                },
                {
                  displayType: DisplayType.LABEL,
                  label: 'as',
                  key: null,
                },
                {
                  displayType: DisplayType.TEXT,
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
            displayType: DisplayType.CARDS,
            key: 'cards',
            className: 'sfw-cards-area',
          },
        ],
        
        getTerms:
          (card: ICard) => _.flatten(
            card['tables'].map(table =>
            {
              var fields = ['ba', 'ca'];
              return fields.map(f => table.table + '.' + f);
            }).toArray()
          )
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
        manualEntry: ManualConfig[0]['Sort'],
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
                key: 'property'
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
        manualEntry: ManualConfig[0]['Comparison'],
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
        manualEntry: ManualConfig[0]['Let'],
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
        getTerms: (card) => [card['field']],
        manualEntry: ManualConfig[0]['Var'],
      }
    }),

    count: _wrapperCard(
    {
      colors: ["#70B1AC", "#D2F3F0"],
      title: "Count",
      manualEntry: ManualConfig[0]['Count'],
    }),
    
    avg: _wrapperCard(
    {
      colors: ["#a2b37e", "#c9daa6"],
      title: "Average",
      manualEntry: ManualConfig[0]['Average'],
    }),
    
    sum: _wrapperCard(
    {
      colors: ["#8dc4c1", "#bae8e5"],
      title: "Sum",
      manualEntry: ManualConfig[0]['Sum'],
    }),

    min: _wrapperCard(
    {
      colors: ["#cc9898", "#ecbcbc"],
      title: "Min",
      manualEntry: ManualConfig[0]['Min'],
    }),

    max: _wrapperCard(
    {
      colors: ["#8299b8", "#acc6ea"],
      title: "Max",
      manualEntry: ManualConfig[0]['Max'],
    }),

    exists: _wrapperCard(
    {
      colors: ["#a98abf", "#cfb3e3"],
      title: "Exists",
      manualEntry: ManualConfig[0]['Exists'],
    }),

    parentheses: _wrapperCard(
    {
      colors: ["#b37e7e", "#daa3a3"],
      title: "( )",
      manualEntry: ManualConfig[0]['( )'],
    }),
    
    weight: _block(
    {
      key: "",
      weight: 0,  
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
        manualEntry: ManualConfig[0]['Score'],
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
    }),
    
    scorePoint: _block(
    {
      id: "",
      value: 0,
      score: 0,
    }),
    
    transform: _card(
    {
      input: "",
      domain: List([0,100]),
      bars: List([]),
      scorePoints: List([]),
      
      static:
      {
        manualEntry: ManualConfig[0]['Transform'],
        colors: ["#E7BE70", "#EDD8B1"],
        title: "Transform",
        preview: "[input]",
        
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
          console.log('init');
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
          console.log(config);
          return config;
        }
      }
    }),
    
    take: _valueCard(
    {
      colors: ["#CDCF85", "#F5F6B3"],
      title: "Take",
      manualEntry: ManualConfig[0]['Take'],
    }),
    
    skip: _valueCard(
    {
      colors: ["#CDCF85", "#F5F6B3"],
      title: "Skip",
      manualEntry: ManualConfig[0]['Skip'],
    }),
    
    spotlight: _block(
    {
      // TODO some day      
    }),
    
    input: _block(
    {
      key: "",
      value: "",
      inputType: InputType.NUMBER,
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
}

export default BuilderTypes;

