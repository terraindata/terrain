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
import Actions from './data/BuilderActions.tsx';
import Util from '../util/Util.tsx';

// Interestingly, these have to be above the BuilderDisplays import
//  since the import itself imports them
export const Directions: string[] = ['ascending', 'descending'];
export const Combinators: string[] = ['&', 'or'];
export const Operators = ['=', '≠', '≥', '>', '≤', '<', 'in', <span className='strike'>in</span>, 'like'];

import {Display, DisplayType, valueDisplay, letVarDisplay, getCardStringDisplay, firstSecondDisplay, wrapperDisplay, wrapperSingleChildDisplay, stringValueDisplay} from './BuilderDisplays.tsx';  
var ManualConfig = require('./../manual/ManualConfig.json');
import {IResultsConfig} from "./components/results/ResultsConfig.tsx";

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
    LIKE,
  }
  
  export const OperatorTQL = {
    [Operator.EQ]: '=',
    [Operator.NE]: '!=',
    [Operator.GE]: '>=',
    [Operator.GT]: '>',
    [Operator.LE]: '<=',
    [Operator.LT]: '<',
    [Operator.IN]: 'in',
    [Operator.NIN]: 'not in',
    [Operator.LIKE]: 'LIKE',
  }

  export enum Direction {
    ASC,
    DESC
  }
  
  export const DirectionTQL = {
    [Direction.ASC]: 'ASC',
    [Direction.DESC]: 'DESC',
  }

  export enum Combinator {
    AND,
    OR
  }
  
  export const CombinatorTQL = {
    [Combinator.AND]: 'AND',
    [Combinator.OR]: 'OR',
  }
    
  export enum InputType
  {
    TEXT,
    DATE,
    NUMBER,
  }
  
  // A query can be viewed and edited in the Builder
  // currently, only Variants are Queries, but that may change
  export interface IQuery
  {
    id: string;
    cards: ICards;
    inputs: List<any>;
    resultsConfig: IResultsConfig;
    
    tql: string;
    mode: string;
    version: boolean;
    name: string;
    lastEdited: string;
    db: string;
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
    name: string;
    snippet: string;
    summary: string;
    notation: string;
    syntax: string;
    text: any[];
  }
    


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
      tqlGlue?: string;
      topTql?: string;
      accepts?: List<string>;
      
      // remove this block if it contains a card and the card is removed
      //  will not remove field if it is the last in its parents' list
      removeOnCardRemove?: boolean;
      
      [field:string]: any;
    }
    
    [field:string]: any;
  }
  
  export interface ICard extends IRecord<ICard>
  {
    id: string;
    type: string;
    _isCard: boolean;
    closed: boolean;
    
    // the following fields are excluded from the server save    
    static:
    {
      colors: string[];
      title: string;
      display: Display | Display[];
      
      // the format string used for generating tql
      // - insert the value of a card member by prepending the field's name with $, e.g. "$expression" or "$filters"
      // - arrays/Lists are joined with "," by default
      // - to join List with something else, specify a tqlGlue
      // - to map a value to another string, write the field name in all caps. the value will be passed into "[FieldName]TQL" map
      //    e.g. "$DIRECTION" will look up "DirectionTQL" in BuilderTypes and pass the value into it
      // - topTql is the tql to use if this card is at the top level of a query
      tql: string;
      tqlGlue?: string;
      topTql?: string;
      
      // returns an object with default values for a new card
      init?: () => {
        [k:string]: any;
      };
      
      getChildTerms?: (card: ICard) => List<string>;
      getNeighborTerms?: (card: ICard) => List<string>;
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
  
  interface IBlockConfig
  {
    static: {
      tql: string;
      tqlGlue?: string;
      accepts?: List<string>;
      removeOnCardRemove?: boolean;
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
      manualEntry: IManualEntry;
      tql: string;
      tqlGlue?: string;
      topTql?: string;
      accepts?: List<string>;
      
      getChildTerms?: (card: ICard) => List<string>;
      getNeighborTerms?: (card: ICard) => List<string>;
      
      init?: () => {
        [k:string]: any;
      };
    }
  }
  
  // helper function to populate random card fields
  const _card = (config:ICardConfig) =>
    _.extend(config, {
      id: "",
      _isCard: true,
      closed: false,
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
    getChildTerms?: (card: ICard) => List<string>;
    getNeighborTerms?: (card: ICard) => List<string>;
    display?: Display | Display[];
    tql: string;
    tqlGlue?: string;
    accepts: List<string>;
    singleChild?: boolean;
  }
  
  const _wrapperCard = (config:IWrapperCardConfig) =>
  {
    return _card({
      cards: L(),
      
      static:
      {
        title: config.title,
        colors: config.colors,
        accepts: config.accepts,

        manualEntry: config.manualEntry,

        getChildTerms: config.getChildTerms,
        getNeighborTerms: config.getNeighborTerms,
        
        preview: (c:IWrapperCard) => {
          var prefix = config.title + ': ';
          if(c.type === 'parentheses')
          {
            prefix = '';
          }
          if(c.cards.size)
          {
            let card = c.cards.get(0);
            return prefix + getPreview(card);
          }
          return prefix + "Nothing";
        },
        
        display: config.display || (
          config.singleChild ? wrapperSingleChildDisplay : wrapperDisplay
        ),
        
        tql: config.tql,
        tqlGlue: config.tqlGlue,
      }
    })
  }
  
  const _aggregateCard = (config: {
    colors: string[];
    title: string;
    manualEntry: IManualEntry;
    tql: string;
    defaultValue?: string;
  }) => _card({
    value: "",
    
    static:
    {
      title: config.title,
      colors: config.colors,
      manualEntry: config.manualEntry,
      preview: "[value]",
      tql: config.tql,
      
      display: 
        config.defaultValue === undefined
          ? stringValueDisplay
          : _.extend({}, 
              stringValueDisplay,
              {
                defaultValue: config.defaultValue,
              }
            )
      ,
    }
  });
  
  const _aggregateNestedCard = (config: {
    colors: string[];
    title: string;
    manualEntry: IManualEntry;
    tql: string;
    accepts: List<string>;
    init?: () => any;
  }) => _card({
    value: "",
    
    static:
    {
      title: config.title,
      colors: config.colors,
      manualEntry: config.manualEntry,
      preview: "[value]",
      tql: config.tql,
      init: config.init,
      
      display: getCardStringDisplay({
        accepts: config.accepts,
      }),
    }
  });
  
  const _andOrCard = (config: { title: string, english: string, factoryType: string, tqlGlue: string, colors: string[], manualEntry: any }) => _card(
    {
      clauses: L(),
      
      static:
      {
        title: config.title,
        preview: '[clauses.length] ' + config.english + ' clauses',
        colors: config.colors,
        tql: "(\n$clauses\n)",
        tqlGlue: config.tqlGlue,
        manualEntry: config.manualEntry,
        
        init: () => ({
          clauses: List([
            make(Blocks[config.factoryType]),
            make(Blocks[config.factoryType]),
          ]),
        }),
        
        display: {
          displayType: DisplayType.ROWS,
          key: 'clauses',
          english: "'" + config.english + "'",
          factoryType: config.factoryType,
          // className: (card) => {
          //   if(card['clauses'].size && typeof card['clauses'].get(0) !== 'string')
          //   {
          //     return 'multi-field-card-padding';
          //   }
          //   return '';
          // },
          
          row:
          {
            below:
            {
              displayType: DisplayType.CARDSFORTEXT,
              key: 'clause',
            },
            
            inner: 
            {
              displayType: DisplayType.CARDTEXT,
              key: 'clause',
              top: false,
            },
            
            hideToolsWhenNotString: true,
          }
        },
      },
    });
  
  const _valueCard = (config:{ title: string, colors: string[], manualEntry: IManualEntry, tql: string, defaultValue: number, }) => (
    _card({
      value: config.defaultValue,
      
      static: {
        title: config.title,
        colors: config.colors,
        preview: "[value]",
        display: valueDisplay,
        manualEntry: config.manualEntry,
        tql: config.tql,
      }
    })
  );
  
  const acceptsAggregates = List([
    'count',
    'avg',
    'min',
    'max',
    'sum',
    'distinct',
    'score',
  ]);

  // The BuildingBlocks
  export const Blocks =
  { 
    sortBlock: _block(
    {
      property: "",
      direction: Direction.DESC,
      static:
      {
        tql: "\n $property $DIRECTION",
        removeOnCardRemove: true,
      }
    }),
    
    comparisonBlock: _block(
    {
      first: "",
      second: "",
      operator: Operator.EQ,
      
      static: {
        tql: "\n $first $OPERATOR $second",
        
        accepts: List(['score', 'transform', 'from', 'exists']),
      }
    }),
    
    table: _block(
    {
      table: "",
      alias: "",
      aliasWasSuggested: false,
      
      static: {
        tql: "\n $table as $alias",
      }
    }),
    
    field: _block(
    {
      field: "",
      
      static: {
        tql: "\n $field",
        accepts: List(['min', 'max', 'avg', 'sum', 'count', 'distinct']),
        removeOnCardRemove: true,
      },
    }),
    
    sfw: _card(
    {
      tables: L(),
      fields: L(),
      cards: L(),
      
      static:
      {
        manualEntry: ManualConfig.cards['sfw'],
        colors: ["#559dcf", "#c0e0f3"],
        title: "Select",
        preview: "[tables.table]",
        // tql: "(\nSELECT\n$fields\nFROM\n$tables\n$cards)",
        topTql: "SELECT\n$fields\nFROM\n$tables\n$cards",
        tql: "\n(\n SELECT\n$fields\n FROM\n$tables\n$cards)",
        
        init: () => ({
          tables: List([ make(Blocks.table )]),
          fields: List([ make(Blocks.field, { field: '*' })]),
        }),
        
        accepts: List([
          'where',
          'sort',
          'let',
          'take',
          'skip',
          'groupBy',
          'having',
        ]),
        
        getChildTerms:
          (card: ICard) =>
            card['tables'].reduce(
              (list:List<string>, tableBlock: {table: string, alias: string}): List<string> =>
              {
                let cols: List<string> = Store.getState().getIn(['tableColumns', tableBlock.table]);
                if(cols)
                {
                  return list.concat(cols.map(
                    (col) => tableBlock.alias + '.' + col
                  ).toList()).toList();
                }
                return list;
              }
            , List([])),
          
        display: [
          {
            displayType: DisplayType.ROWS,
            key: 'fields',
            english: 'field',
            factoryType: 'field',
            row:
            {
              inner:
              {
                displayType: DisplayType.CARDTEXT,
                help: ManualConfig.help["select-field"],
                key: 'field',
                accepts: acceptsAggregates.push('as'),
              },
              below:
              {
                displayType: DisplayType.CARDSFORTEXT,
                key: 'field',
                accepts: acceptsAggregates.push('as'),
              },
              hideToolsWhenNotString: true,
            },
          },
          
          {
            header: 'From',
            headerClassName: 'sfw-select-header',
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
                  help: ManualConfig.help["table"],
                  key: 'table',
                  getAutoTerms: (comp:React.Component<any, any>) => 
                  {
                    let tables = Store.getState().get('tables');
                    if(!tables)
                    {
                      var unsubscribe = Store.subscribe(() =>
                      {
                        if(Store.getState().get('tables'))
                        {
                          unsubscribe();
                          comp.forceUpdate();
                        }
                      });
                    }
                    return tables;
                  },
                  
                  onFocus: (comp:React.Component<any, any>, value:string) =>
                  {
                    comp.setState({
                      initialTable: value,
                    });
                  },
                  onBlur: (comp:React.Component<any, any>, value:string) =>
                  {
                    let initialTable = comp.state.initialTable;
                    let newTable = value;
                    
                    if(initialTable !== newTable)
                    {
                      let suggestAlias = (table:string) =>
                      {
                        if(table.charAt(table.length - 1).toLowerCase() === 's')
                        {
                          return table.substr(0, table.length - 1);
                        }
                        return table;
                      }
                      
                      let keyPath: KeyPath = comp.props.keyPath;
                      let aliasKeyPath = keyPath.set(keyPath.size - 1, 'alias');
                      let aliasWasSuggestedKeyPath = keyPath.set(keyPath.size - 1, 'aliasWasSuggested');
                      let initialAlias: string = Store.getState().getIn(aliasKeyPath);
                      
                      if(!initialTable || initialTable === '' 
                        || initialAlias === '' || initialAlias === suggestAlias(initialTable))
                      {
                        // alias or table was blank or was the suggested one, so let's suggest an alias
                        Actions.change(aliasKeyPath, suggestAlias(newTable));
                        Actions.change(aliasWasSuggestedKeyPath, true);
                      }
                    }
                  },
                },
                {
                  displayType: DisplayType.LABEL,
                  label: 'as',
                  key: null,
                },
                {
                  displayType: DisplayType.TEXT,
                  help: ManualConfig.help["alias"],
                  key: 'alias',
                  autoDisabled: true,
                  
                  onFocus: (comp:React.Component<any, any>, value:string, event:React.FocusEvent) =>
                  {
                    let keyPath: KeyPath = comp.props.keyPath;
                    let wasSuggestedKeyPath = keyPath.set(keyPath.size - 1, 'aliasWasSuggested');
                    if(Store.getState().getIn(wasSuggestedKeyPath))
                    {
                      Util.selectText(event.target, 0, event.target['value'].length);
                      Actions.change(wasSuggestedKeyPath, false);
                    }
                  },
                },
              ],
            },
          },
          
          {
            displayType: DisplayType.CARDS,
            key: 'cards',
            className: 'sfw-cards-area',
          },
        ],
      },
    }),

    as: _card({
      value: "",
      alias: "",
      
      static:
      {
        title: "As",
        colors: ["rgb(185, 47, 150)", "rgb(245, 197, 230)"],
        preview: '[alias]',
        tql: "($value) as $alias",
        manualEntry: ManualConfig.cards.where,
        display:
        {
          displayType: DisplayType.FLEX,
          key: null,
          
          flex:
          [
            {
              displayType: DisplayType.CARDTEXT,
              key: 'value',
              top: false,
              showWhenCards: true,
              accepts: acceptsAggregates,
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
          
          below: 
          {
            displayType: DisplayType.CARDSFORTEXT,
            key: 'value',
            accepts: acceptsAggregates,
          }
        }
      }
    }),
    
    where: _wrapperCard({
      title: "Where",
      colors: ["#94b96a", "#dbecc8"],
      // colors: ["#44a9cf", "#b9e5f3"],
      tql: "WHERE\n$cards",
      manualEntry: ManualConfig.cards.where,
      singleChild: true,
      
      accepts: List([
        'and',
        'or',
        'exists',
        'comparison',
      ]),
    }),
    
    and: _wrapperCard({
      title: "And",
      tql: '(\n$cards\n)',
      tqlGlue: '\nAND\n',
      manualEntry: ManualConfig.cards.and,
      colors: ["#7f67ab", "#d2c9e4"],
      accepts: List(['or', 'comparison', 'exists']),
    }),
    
    or: _wrapperCard({
      title: "Or",
      tql: '(\n$cards\n)',
      tqlGlue: '\nOR\n',
      manualEntry: ManualConfig.cards.or,
      colors: ["#3c89c3", "#b6d7ee"],
      accepts: List(['and', 'comparison', 'exists']),
    }),
   
    comparison: _card(
    {
      first: "",
      second: "",
      operator: Operator.EQ,
      
      static:
      {
        title: "Compare",
        colors: ["#9f5ca7", "#e0c4e2"],
        preview: (c:ICard) => {
          var first = c['first'];
          var second = c['second'];
          if(typeof first !== 'string')
          {
            first = getPreview(first);
          }
          if(typeof second !== 'string')
          {
            second = getPreview(second);
          }
          
          return `${first} ${Operators[c['operator']]} ${second}`
        },
        tql: "$first $OPERATOR $second",
        
        display: firstSecondDisplay({
          displayType: DisplayType.DROPDOWN,
          key: 'operator',
          options: Immutable.List(Operators),
          help: ManualConfig.help["operator"],
          centerDropdown: true,
        }, List(['sfw'])),
        manualEntry: ManualConfig.cards['filter'],
      },
    }),
     
    sort: _card(
    {
      sorts: List([]),
      
      static: 
      {
        title: "Order By",
        preview: "[sorts.property]",
        colors: ["#6ead6e", "#dbecc8"],
        manualEntry: ManualConfig.cards['sort'],
        tql: "ORDER BY $sorts",        
        
        init: () =>
        {
          return {
            sorts: List([
              make(Blocks.sortBlock)
            ])
          };
        },
        
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
                displayType: DisplayType.CARDTEXT,
                help: ManualConfig.help["property"],
                key: 'property',
                accepts: List(['score', 'transform']),
              },
              {
                displayType: DisplayType.DROPDOWN,
                key: 'direction',
                options: Immutable.List(Directions),
                help: ManualConfig.help["direction"],
              },
            ],
            below:
            {
              displayType: DisplayType.CARDSFORTEXT,
              key: 'property',
              accepts: List(['score', 'transform']),
            },
            hideToolsWhenNotString: false,
            noDataPadding: true,
          },
        },
      },
    }),
    
    let: _card(
    {
      field: "",
      expression: "",
      
      static: {
        title: "Let",
        preview: "[field]",
        colors: ["#bbc760", "#ecf2c4"],
        display: letVarDisplay,
        manualEntry: ManualConfig.cards['let'],
        tql: "let $field = $expression",
        getNeighborTerms: (card) => List([card['field']]),
      }
    }),

    var: _card(
    {
      field: "",
      expression: "",
      
      static: {
        title: "Var",
        preview: "[field]",
        display: letVarDisplay,
        colors: ["#6ead6e", "#dbecc8"],
        manualEntry: ManualConfig.cards['var'],
        getNeighborTerms: (card) => List([card['field']]),
        tql: "var $field = $expression",
      }
    }),

    count: _aggregateNestedCard(
    {
      colors: ["#d9b740", "#f9ebb6"],
      title: "Count",
      manualEntry: ManualConfig.cards['count'],
      tql: "COUNT($value)",
      accepts: List(['distinct']),
      init: () => ({ value: '*' }),
    }),
    
    distinct: _aggregateCard(
    {
      colors: ["#bc4789", "#e3b2de"],
      title: "Distinct",
      manualEntry: ManualConfig.cards['count'], // TODO
      tql: "DISTINCT $value",
    }),
    
    avg: _aggregateCard(
    {
      colors: ["#d99f3e", "#f9e1b5"],
      title: "Average",
      manualEntry: ManualConfig.cards['avg'],
      tql: "AVG($value)",
    }),
    
    sum: _aggregateCard(
    {
      colors: ["#cc5779", "#f3c2ce"],
      title: "Sum",
      manualEntry: ManualConfig.cards['sum'],
      tql: "SUM($value)",
    }),

    min: _aggregateCard(
    {
      colors: ["#d97852", "#f9d0be"],
      title: "Min",
      manualEntry: ManualConfig.cards['min'],
      tql: "MIN($value)",
    }),

    max: _aggregateCard(
    {
      colors: ["#ce645b", "#f4c8c2"],
      title: "Max",
      manualEntry: ManualConfig.cards['max'],
      tql: "MAX($value)",
    }),

    exists: _wrapperCard(
    {
      colors: ["#42b4bc", "#b8eaeb"],
      title: "Exists",
      manualEntry: ManualConfig.cards['exists'],
      tql: "EXISTS\n(\n$cards)",
      accepts: List(['sfw']),
    }),

    parentheses: _wrapperCard(
    {
      colors: ["#6775aa", "#d2c9e4"],
      title: "( )",
      manualEntry: ManualConfig.cards['parentheses'],
      tql: "\n(\n$cards)",
      accepts: List(['and', 'or', 'exists', 'tql']),
    }),
    
    weight: _block(
    {
      key: "",
      weight: 0,
      static: {
        tql: "$weight, $key",
        removeOnCardRemove: true,
      }
    }),

    score: _card(
    {
      weights: List([]),
      method: "",
      
      static:
      {
        title: "Score",
        colors: ["#2996c3", "#aeddee"],
        preview: "[weights.length] Weight(s)",
        manualEntry: ManualConfig.cards['score'],
        tql: "linear_score($weights)",
        init: () => ({
          weights: List([
            make(Blocks.weight),
          ]),
        }),
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
                help: ManualConfig.help["key"],
                placeholder: 'Field',
              },
              {
                displayType: DisplayType.NUM,
                help: ManualConfig.help["weight"],
                key: 'weight',
                placeholder: 'Weight',
              },
              {
                displayType: DisplayType.COMPONENT,
                component: ScoreBar,
                key: 'score',
                help: ManualConfig.help["score"],
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
        manualEntry: ManualConfig.cards['transform'],
        colors: ["#559dcf", "#c0e0f3"],
        title: "Transform",
        preview: "[input]",
        tql: "linearTransform([$scorePoints])",
        display: [
          {
            displayType: DisplayType.TEXT,
            help: ManualConfig.help["input"],
            key: 'input',
            placeholder: 'Input field',
          },
          {
            displayType: DisplayType.COMPONENT,
            component: TransformCardComponent,
            key: 'scorePoints',
            help: ManualConfig.help["scorePoints"],
          },
        ],
        
        init: () => (
          {
            scorePoints:
              List([
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
              ]),
          }
        )
      }
    }),
    
    take: _valueCard(
    {
      colors: ["#569a55", "#c1debf"],
      title: "Limit",
      manualEntry: ManualConfig.cards['take'],
      tql: "LIMIT $value",
      defaultValue: 25,
    }),
    
    skip: _valueCard(
    {
      colors: ["#429e8f", "#b8e0d8"],
      title: "Offset",
      manualEntry: ManualConfig.cards['skip'],
      tql: "OFFSET $value",
      defaultValue: 25,
    }),
    
    groupBy: _card(
    {
      fields: L(),
      
      static:
      {
        manualEntry: ManualConfig.cards['sfw'], // TODO
        colors: ["#27a2aa", "#ade2e3"],
        title: "Group By",
        preview: "[fields.field]",
        tql: "GROUP BY\n$fields",
        
        init: () => ({
          fields: List([ make(Blocks.field)]),
        }),
        
        display:
        {
          displayType: DisplayType.ROWS,
          key: 'fields',
          english: 'field',
          factoryType: 'field',
          row:
          {
            inner:
            {
              displayType: DisplayType.TEXT,
              help: ManualConfig.help["select-field"],
              key: 'field',
            },
          },
        },
      },
    }),
    
    having: _wrapperCard({
      title: "Having",
      colors: ["#2792ba", "#add2f3"],
      tql: "HAVING\n$cards",
      manualEntry: ManualConfig.cards.where, // TODO
      
      accepts: List([
        'and',
        'or',
        'exists',
        'comparison',
      ]),
    }),
    
    
    tql: _card({
      clause: "",
      
      static:
      {
        title: "Expression",
        preview: "\n$clause",
        colors: ["#278a79", "#add8cf"],
        tql: "$clause",
        manualEntry: ManualConfig.cards.tql,
        
        display: {
          displayType: DisplayType.TEXT,
          key: 'clause',
        }
      }
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
    
    creating: _block( // a placeholder for when a card is being created
    {
      static: {
        tql: "",
      },
    }),
  }
  // Set the "type" field for all blocks equal to its key
  _.map(Blocks as ({[card:string]:any}), (v, i) => Blocks[i].type = i);
  
  export const CardsDeckOrdering =
  [
    [
      Blocks.sfw,
    ],
    [
      Blocks.count,
      Blocks.avg,
      Blocks.min,
      Blocks.max,
      Blocks.sum,
      Blocks.distinct,
      Blocks.as,
    ],
    [
      Blocks.where,
      Blocks.sort,
      Blocks.take,
      Blocks.skip,
      Blocks.groupBy,
      Blocks.having,
    ],
    [
      Blocks.comparison,
      Blocks.and,
      Blocks.or,
      Blocks.exists,
    ],
    [
      Blocks.var,
      Blocks.let,
      Blocks.transform,
      Blocks.score,
    ],
    [
      Blocks.tql,
    ],
  ];
  
  // This creates a new instance of a card / block
  // Usage: BuilderTypes.make(BuilderTypes.Blocks.sort)
  export const make = (block:IBlock, extraConfig?:{[key:string]:any}) =>
  {
    let {type} = block;
    
    block = _.extend({}, block); // shallow clone
    
    if(Blocks[type].static.init)
    {
      block = _.extend({}, block, Blocks[type].static.init());
    }
    
    if(extraConfig)
    {
      block = _.extend(block, extraConfig);
    }
    
    if(block.static)
    {
      delete block.static;
    }
    
    if(!block.id || !block.id.length)
    {
      block.id = "block-" + Math.random();
    }
    
    return typeToRecord[type](block);
  }
  
  // array of different card types
  export const CardTypes = _.compact(_.map(Blocks, (block, k: string) => block._isCard && k ));

  // TODO remove
  var cards = {};
  for(var key in Blocks)
  {
    if(Blocks[key]._isCard && Blocks[key].static.manualEntry)
    {
      cards[Blocks[key].static.manualEntry.name] = key;
    }
  }
  export const cardList = cards;
  

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
      
      // conversion, remove when appropriate
      if(value.type === 'multiand' || value.type === 'multior')
      {
        value.type = value.type.substr(5);
        value.cards = value.clauses.map(block =>
        {
          let clause = block.get('clause');
          if(typeof clause === 'string')
          {
            return make(Blocks.tql, { clause });
          }
          return clause;
        });
      }
      
      if(value.type && Blocks[value.type])
      {
        value = make(Blocks[value.type], value);
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
    if(!card)
    {
      return;
    }
    
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
      if(!preview)
      {
        return 'No preview';
      }
      
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

