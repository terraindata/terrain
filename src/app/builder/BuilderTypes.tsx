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

import TransformCardComponent from './components/charts/TransformCard';
import ScoreBar from './components/charts/ScoreBar';
import Store from './data/BuilderStore';
import SchemaStore from '../schema/data/SchemaStore';
import Util from '../util/Util';

// These have to be above the BuilderDisplays import
//  since the import itself imports them
export const Directions: string[] = ['ascending', 'descending'];
export const Combinators: string[] = ['&', 'or'];
export const Operators = ['=', '≠', '≥', '>', '≤', '<', 'in', <span className='strike'>in</span>, 'like'];

import {Display, DisplayType, valueDisplay, letVarDisplay, getCardStringDisplay, firstSecondDisplay, wrapperDisplay, wrapperSingleChildDisplay, stringValueDisplay} from './BuilderDisplays';  
var ManualConfig = require('./../manual/ManualConfig.json');

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
    [Operator.IN]: 'IN',
    [Operator.NIN]: 'NOT IN',
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
  // currently, only Variants have Queries, 1:1, but that may change
  class QueryC
  {
    id: ID = "";
    variantId: ID = "";
    
    cards: ICards = List([]);
    inputs: List<any> = List([]);
    resultsConfig: IResultsConfig = null;
    tql: string = "";
    deckOpen: boolean = true;
    
    tqlCardsInSync: boolean = false;
    parseTreeError: string = null;
  }
  const Query_Record = Immutable.Record(new QueryC());
  export interface Query extends QueryC, IRecord<Query> {}
  export const _Query = (config?: Object) => {
    config = Util.extendId(config || {});
    config['cards'] = BuilderTypes.recordFromJS(config['cards'] || [])
    config['inputs'] = BuilderTypes.recordFromJS(config['inputs'] || [])
    config['resultsConfig'] = _IResultsConfig(config['resultsConfig']);
    
    let query = new Query_Record(config) as any as Query;
    
    switch(config['mode'])
    {
      case 'tql':
        // since tql to cards conversion is async and we don't know where this
        //  query will be used, this is all we can do for now.
        // When this is loaded into the Builder, it will do the conversion.
        query = query.set('tqlCardsInSync', false);
        break;
      case 'cards':
        query = query
          .set('tql', TQLConverter.toTQL(query))
          .set('tqlCardsInSync', true);
        break;
    }
    
    return query;
  }
  
  export function queryForSave(query: Query): Object
  {
    query = query
      .set('cards', cardsForServer(query.cards))
      .set('resultsConfig', query.resultsConfig.toJS());
    return query.toJS();
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
    _isBlock: boolean;
    
    // fields not saved on server
    static: {
      tql: (string | ((block:IBlock) => string));
      tqlGlue?: string;
      topTql?: string;
      accepts?: List<string>;
      
      // remove this block if it contains a card and the card is removed
      //  will not remove field if it is the last in its parents' list
      removeOnCardRemove?: boolean;
      
      metaFields: string[];
      
      [field:string]: any;
    }
    
    [field:string]: any;
  }
  
  export interface ICard extends IRecord<ICard>
  {
    id: string;
    type: string;
    _isCard: boolean;
    _isBlock: boolean;
    closed: boolean;
    
    // the following fields are excluded from the server save    
    static: {
      colors: string[];
      title: string;
      display: Display | Display[];
      
      isAggregate: boolean;
      
      // the format string used for generating tql
      // - insert the value of a card member by prepending the field's name with $, e.g. "$expression" or "$filters"
      // - arrays/Lists are joined with "," by default
      // - to join List with something else, specify a tqlGlue
      // - to map a value to another string, write the field name in all caps. the value will be passed into "[FieldName]TQL" map
      //    e.g. "$DIRECTION" will look up "DirectionTQL" in BuilderTypes and pass the value into it
      // - topTql is the tql to use if this card is at the top level of a query
      tql: string | ((block:IBlock) => string);
      tqlGlue?: string;
      topTql?: string;
      
      anythingAccepts?: boolean;
      
      // returns an object with default values for a new card
      init?: () => {
        [k:string]: any;
      };
      
      // given a card, return the "terms" it generates for autocomplete
      getChildTerms?: (card: ICard) => List<string>;
      getNeighborTerms?: (card: ICard) => List<string>;
      getParentTerms?: (card: ICard) => List<string>;
        // returns terms for its parent and its neighbors (but not its parent's neighbors)
      
      preview: string | ((c:ICard) => string);
      // The BuilderTypes.getPreview function constructs
      // a preview from a card object based on this string.
      // It replaces anything within [] with the value for that key.
      // If an array of objects, you can specify: [arrayKey.objectKey]
      // and it will map through and join the values with ", ";
      manualEntry: IManualEntry;
      
      // a list of which fields on this card are just metadata, e.g. 'closed'
      metaFields: string[];
    };
  }
  
  export type ICards = List<ICard>;
  export type CardString = string | ICard;
  
  interface IBlockConfig
  {
    static: {
      tql: TQLFn;
      tqlGlue?: string;
      accepts?: List<string>;
      removeOnCardRemove?: boolean;
      metaFields?: string[];
    }
    
    [field:string]:any;
  }
  
  const allBlocksMetaFields = ['id'];
  
  // helper function to populate common fields for an IBlock
  const _block = (config: IBlockConfig): IBlock =>
  {
    let blockConfig: IBlock = _.extend({
      id: "",
      type: "",
      _isBlock: true,
    }, config);
    
    if(blockConfig.static.metaFields)
    {
      blockConfig.static.metaFields = blockConfig.static.metaFields.concat(allBlocksMetaFields);
    }
    else
    {
      blockConfig.static.metaFields = allBlocksMetaFields;
    }
    
    return blockConfig;
  }
    
  type TQLFn = string | ((block:IBlock) => string);  
    
  // Every Card definition must follow this interface
  interface ICardConfig
  {
    [field:string]: any;
    
    static: {
      colors: string[];
      title: string;
      preview: string | ((c:ICard) => string);
      display: Display | Display[];
      isAggregate?: boolean;
      manualEntry: IManualEntry;
      tql: TQLFn;
      tqlGlue?: string;
      topTql?: string | ((block:IBlock) => string);
      accepts?: List<string>;
      anythingAccepts?: boolean; // if any card accepts this card
      
      getChildTerms?: (card: ICard) => List<string>;
      getNeighborTerms?: (card: ICard) => List<string>;
      getParentTerms?: (card: ICard) => List<string>;
      
      metaFields?: string[];
      
      init?: () => {
        [k:string]: any;
      };
    }
  }
  
  const allCardsMetaFields = allBlocksMetaFields.concat(['closed']);
  
  // helper function to populate random card fields
  const _card = (config:ICardConfig) =>
  {
    config = _.extend(config, {
      id: "",
      _isCard: true,
      _isBlock: true,
      closed: false,
    });
    
    if(config.static.metaFields)
    {
      config.static.metaFields = config.static.metaFields.concat(allCardsMetaFields);
    }
    else
    {
      config.static.metaFields = allCardsMetaFields;
    }
    
    return config;
  }
  
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
    tql: TQLFn;
    tqlGlue?: string;
    accepts: List<string>;
    singleChild?: boolean;
    isAggregate?: boolean;
  }
  
  const _wrapperCard = (config:IWrapperCardConfig) =>
  {
    return _card({
      cards: L(),
      
      static: {
        title: config.title,
        colors: config.colors,
        accepts: config.accepts,

        manualEntry: config.manualEntry,

        getChildTerms: config.getChildTerms,
        getNeighborTerms: config.getNeighborTerms,
        
        preview: (c:IWrapperCard) => {
          // var prefix = config.title + ': ';
          // if(c.type === 'parentheses')
          // {
          //   prefix = '';
          // }
          if(c.cards.size)
          {
            let card = c.cards.get(0);
            return getPreview(card);
          }
          return "Nothing";
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
    
    static: {
      title: config.title,
      colors: config.colors,
      manualEntry: config.manualEntry,
      preview: "[value]",
      tql: config.tql,
      isAggregate: true,
      
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
    colors: string[],
    title: string,
    manualEntry: IManualEntry,
    tql: string,
    accepts: List<string>,
    init?: () => any,
  }) => _card({
    value: "",
    
    static: {
      title: config.title,
      colors: config.colors,
      manualEntry: config.manualEntry,
      preview: "[value]",
      tql: config.tql,
      init: config.init,
      isAggregate: true,
      
      display: getCardStringDisplay({
        accepts: config.accepts,
      }),
    }
  });
  
  const _andOrCard = (config: { title: string, english: string, factoryType: string, tqlGlue: string, colors: string[], manualEntry: any }) => _card({
      clauses: L(),
      
      static: {
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
          
          row: {
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
  
  const _acceptsMath = (list: List<string>) =>
    list.concat(
      List([
        'add',
        'subtract',
        'divide',
        'multiply',
      ])
    ).toList();
  
  const mathsAccept = _acceptsMath(
    List([
      'select',
      'comparison',
      'score',
      'transform',
    ])
  );
  
  const acceptsAggregates = _acceptsMath(
    List([
      'count',
      'avg',
      'min',
      'max',
      'sum',
      'distinct',
      'score',
      'transform',
      'sfw',
      'exists',
      'not',
      'add',
    ])
  );
  
  const transformScoreInputTypes = 
    List(['score', 'transform', 'sfw']).concat(acceptsAggregates).toList();
    
  const _mathCard = (config: {
    title: string;
    tqlGlue: string;
    colors: string[];
  }) =>
    _card({
      fields: L(),
      
      static:
      {
        manualEntry: null,
        colors: config.colors,
        title: config.title,
        preview: 
          (card) =>
            card['fields'].map(
              field =>
                typeof field.field !== 'object' ? field.field : getPreview(field.field)
            ).join(config.tqlGlue),
            
        tql: "($fields )",
        tqlGlue: config.tqlGlue,
        
        init: () => ({
          fields: List([ 
            make(Blocks.field, { field: '' })
          ]),
        }),
        
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
                key: 'field',
                accepts: mathsAccept,
                showWhenCards: true,
              },
              below:
              {
                displayType: DisplayType.CARDSFORTEXT,
                key: 'field',
                accepts: mathsAccept,
              },
              // hideToolsWhenNotString: true,
              noDataPadding: true,
            },
          },
        ],
      },
    });
  
  // The BuildingBlocks
  export const Blocks =
  { 
    sortBlock: _block(
    {
      property: "",
      direction: Direction.DESC,
      static: {
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
        
        accepts: _acceptsMath(List(['score', 'transform', 'from', 'exists', 'not'])),
      }
    }),
    
    table: _block(
    {
      table: "",
      alias: "",
      aliasWasSuggested: false,
      
      static: {
        tql: (tableBlock: IBlock) =>
        {
          let suffix = "";
          if(tableBlock['alias'])
          {
            suffix = " as $alias";
          }
          return "\n $table" + suffix;
        }
      }
    }),
    
    field: _block(
    {
      field: "",
      
      static: {
        tql: "$field",
        accepts: _acceptsMath(List(['min', 'max', 'avg', 'sum', 'count', 'distinct'])),
        removeOnCardRemove: true,
      },
    }),
    
    sfw: _card(
    {
      fields: L(),
      cards: L(),
      
      static: {
        manualEntry: ManualConfig.cards['sfw'],
        colors: ["#559dcf", "#b4dbf6"],
        title: "Select",
        preview: "[fields.field]",
        topTql: "SELECT\n$fields\n$cards",
        tql: "(\n SELECT\n $fields\n$cards )",
        
        init: () => ({
          fields: List([ 
            make(Blocks.field, { field: '*' })
          ]),
          cards: List([
            make(Blocks.from)
          ]),
        }),
        
        accepts: List([
          'from',
          'where',
          'sort',
          'take',
          'skip',
          'groupBy',
          'having',
        ]),
        
        getChildTerms:
          (card: ICard) =>
            card['fields'].reduce(
              (list:List<string>, fieldBlock: {field: CardString}): List<string> =>
              {
                 /* TODO make this better */
                if(fieldBlock.field['type'] === 'as')
                {
                  // an as card
                  return list.push(fieldBlock.field['alias']);
                }
                return list;
              }, List([])
            ),
          
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
                showWhenCards: true,
              },
              below:
              {
                displayType: DisplayType.CARDSFORTEXT,
                key: 'field',
                accepts: acceptsAggregates.push('as'),
              },
              // hideToolsWhenNotString: true,
              noDataPadding: true,
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

    from: _card({
      tables: L(),
      
      static: {
        manualEntry: ManualConfig.cards['sfw'],
        colors: ["#3a7dcf", "#94b9f6"],
        title: "From",
        preview: "[tables.table]",
        tql: "FROM\n$tables",
        
        init: () => ({
          tables: List([ make(Blocks.table )]),
        }),
        
        getParentTerms:
          (card: ICard) =>
            card['tables'].reduce(
              (list:List<string>, tableBlock: {table: string, alias: string}): List<string> =>
              {
                let dbName = Store.getState().db;
                let columnNames = SchemaStore.getState().columnNamesByDb.getIn([dbName, dbName + '.' + tableBlock.table]) 
                  || Immutable.List([]);
                columnNames = columnNames.map(
                  columnName => tableBlock.alias + '.' + columnName
                );
                return list.concat(columnNames).toList();
              },
              List([])
            ),
        
        display:
        {
          displayType: DisplayType.ROWS,
          key: 'tables',
          english: 'table',
          factoryType: 'table',
          row: 
          {
            below: 
            {
              displayType: DisplayType.CARDSFORTEXT,
              key: 'table',
              accepts: List(['sfw']),
            },
            noDataPadding: true,
            inner:
            [  
              {
                displayType: DisplayType.CARDTEXT,
                key: 'table',
                help: ManualConfig.help["table"],
                accepts: List(['sfw']),
                showWhenCards: true,
                getAutoTerms: (comp:React.Component<any, any>) => 
                {
                  let db = Store.getState().db;
                  let tableNames = SchemaStore.getState().tableNamesByDb.get(db);
                  if(!tableNames)
                  {
                    var unsubscribe = SchemaStore.subscribe(() =>
                    {
                      if(SchemaStore.getState().tableNamesByDb.get(db))
                      {
                        unsubscribe();
                        comp.forceUpdate();
                      }
                    });
                  }
                  return tableNames;
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
      }
    }),
    
    where: _wrapperCard({
      title: "Where",
      colors: ["#86a860", "#d3e5be"],
      tql: "WHERE\n$cards",
      manualEntry: ManualConfig.cards.where,
      singleChild: true,
      
      accepts: List([
        'and',
        'or',
        'exists',
        'not',
        'comparison',
      ]),
    }),
    
    and: _wrapperCard({
      title: "And",
      tql: '(\n$cards\n)',
      tqlGlue: '\nAND\n',
      manualEntry: ManualConfig.cards.and,
      colors: ["#824ba1", "#ecc9ff"],
      accepts: List(['or', 'comparison', 'exists', 'not']),
    }),
    
    or: _wrapperCard({
      title: "Or",
      tql: '(\n$cards\n)',
      tqlGlue: '\nOR\n',
      manualEntry: ManualConfig.cards.or,
      colors: ["#b161bc", "#f8cefe"],
      accepts: List(['and', 'comparison', 'exists', 'not']),
    }),
   
    comparison: _card(
    {
      first: "",
      second: "",
      operator: Operator.EQ,
      
      static: {
        title: "Compare",
        colors: ["#476aa3", "#a5c6fc"],
        preview: (c:ICard) => {
          var first = c['first'];
          var second = c['second'];
          if(first._isCard)
          {
            first = getPreview(first);
          }
          if(second._isCard)
          {
            second = getPreview(second);
          }
          
          return `${first} ${OperatorTQL[c['operator']]} ${second}`
        },
        tql: "$first $OPERATOR $second",
        
        display: firstSecondDisplay(
          {
            displayType: DisplayType.DROPDOWN,
            key: 'operator',
            options: Immutable.List(Operators),
            help: ManualConfig.help["operator"],
            centerDropdown: true,
          }, 
          _acceptsMath(
            List(['sfw', 'exists', 'not'])
          )
        ),
        manualEntry: ManualConfig.cards['filter'],
      },
    }),
     
    sort: _card(
    {
      sorts: List([]),
      
      static: 
      {
        title: "Order By",
        preview: (c:any) =>
        {
          let {sorts} = c;
          if(sorts.size === 1)
          {
            let {property} = sorts.get(0);
            if(typeof property === 'string')
            {
              return property;
            }
            return getPreview(property);
          }
          return sorts.size + ' Factors';
        },
        colors: ["#39918b", "#99e4df"],
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
                accepts: _acceptsMath(List(['score', 'transform'])),
                showWhenCards: true,
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
              accepts: _acceptsMath(List(['score', 'transform'])),
            },
            hideToolsWhenNotString: false,
            noDataPadding: true,
          },
        },
      },
    }),
    
    // let: _card(
    // {
    //   field: "",
    //   expression: "",
      
    //   static: {
    //     title: "Let",
    //     preview: "[field]",
    //     colors: ["#a4b356", "#f1fbbf"],
    //     display: letVarDisplay,
    //     manualEntry: ManualConfig.cards['let'],
    //     tql: "let $field = $expression",
    //     getNeighborTerms: (card) => List([card['field']]),
    //   }
    // }),

    // var: _card(
    // {
    //   field: "",
    //   expression: "",
      
    //   static: {
    //     title: "Var",
    //     preview: "[field]",
    //     display: letVarDisplay,
    //     colors: ["#6ca165", "#c8f2c3"],
    //     manualEntry: ManualConfig.cards['var'],
    //     getNeighborTerms: (card) => List([card['field']]),
    //     tql: "var $field = $expression",
    //   }
    // }),

    as: _card({
      value: "",
      alias: "",
      
      static: {
        title: "As",
        colors: ["#d24f42", "#f9cba8"],
        preview: '[alias]',
        tql: "$value AS $alias",
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
              autoDisabled: true,
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
    
    count: _aggregateNestedCard(
    {
      title: "Count",
      colors: ["#d65a44", "#fbc1b7"],
      manualEntry: ManualConfig.cards['count'],
      tql: "COUNT($value)",
      accepts: List(['distinct']),
      init: () => ({ value: '*' }),
    }),
    
    avg: _aggregateCard(
    {
      title: "Average",
      colors: ["#db6746", "#f9bcab"],
      manualEntry: ManualConfig.cards['avg'],
      tql: "AVG($value)",
    }),

    min: _aggregateCard(
    {
      title: "Min",
      colors: ["#dd7547", "#fdcdb8"],
      manualEntry: ManualConfig.cards['min'],
      tql: "MIN($value)",
    }),
    
    max: _aggregateCard(
    {
      title: "Max",
      colors: ["#dd8846", "#f9cba8"],
      manualEntry: ManualConfig.cards['max'],
      tql: "MAX($value)",
    }),
    
    sum: _aggregateCard(
    {
      title: "Sum",
      colors: ["#dba043", "#eedebe"],
      manualEntry: ManualConfig.cards['sum'],
      tql: "SUM($value)",
    }),

    distinct: _aggregateCard(
    {
      title: "Distinct",
      colors: ["#d9b540", "#f8e8b3"],
      manualEntry: ManualConfig.cards['count'], // TODO
      tql: "DISTINCT $value",
    }),


    exists: _wrapperCard(
    {
      colors: ["#319aa9", "#bbdddc"],
      title: "Exists",
      manualEntry: ManualConfig.cards['exists'],
      tql: "EXISTS\n$cards",
      accepts: List(['sfw']),
    }),

    not: _wrapperCard(
    {
      colors: ["#21aab9", "#abedec"],
      title: "Not",
      manualEntry: ManualConfig.cards['exists'],
      tql: (notCard) =>
      {
        let cards = notCard['cards'];
        if(cards && cards.size && cards.get(0).type === 'exists')
        {
          return 'NOT$cards';
        }
        return 'NOT (\n$cards)';
      },
      accepts: List(['exists', 'compare', 'and', 'or']),
    }),


    // remove
    parentheses: _wrapperCard(
    {
      colors: ["#6775aa", "#d2c9e4"],
      title: "( )",
      manualEntry: ManualConfig.cards['parentheses'],
      tql: "\n(\n$cards)",
      accepts: List(['and', 'or', 'exists', 'tql', 'not']),
    }),
    
    weight: _block(
    {
      key: "",
      weight: 1,
      static: {
        tql: "$weight, $key",
        removeOnCardRemove: true,
      }
    }),

    score: _card(
    {
      weights: List([]),
      method: "",
      
      static: {
        title: "Score",
        colors: ["#3a91a6", "#a1eafb"],
        preview: "[weights.length] Weights",
        manualEntry: ManualConfig.cards['score'],
        tql: "linear_score($weights)",
        init: () => ({
          weights: List([
            make(Blocks.weight),
          ]),
        }),
        display:
        {
          displayType: DisplayType.ROWS,
          key: 'weights',
          english: 'weight',
          factoryType: 'weight',
          provideParentData: true,
          row:
          {
            noDataPadding: true,
            inner:
            [
              {
                displayType: DisplayType.CARDTEXT,
                key: 'key',
                help: ManualConfig.help["key"],
                placeholder: 'Field',
                accepts: transformScoreInputTypes,
                showWhenCards: true,
              },
              {
                displayType: DisplayType.NUM,
                help: ManualConfig.help["weight"],
                key: 'weight',
                placeholder: 'Weight',
                // autoDisabled: true,
              },
              {
                displayType: DisplayType.COMPONENT,
                component: ScoreBar,
                key: 'score',
                help: ManualConfig.help["score"],
              },
            ],
            below:
            {
              displayType: DisplayType.CARDSFORTEXT,
              key: 'key',
              accepts: transformScoreInputTypes,
            }
          },
        },
      }
    }),
    
    
    bar: _block(
    {
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
      value: 0,
      score: 0,
      
      static: {
        tql: "$score, $value",
      }
    }),
    
    transform: _card(
    {
      input: "",
      scorePoints: List([]),
      
      domain: List([0,100]),
      hasCustomDomain: false, // has the user set a custom domain
      
      static: {
        manualEntry: ManualConfig.cards['transform'],
        colors: ["#4b979a", "#aef3f6"],
        title: "Transform",
        preview: (card:any) => {
          if(card.input._isCard)
          {
            return '' + getPreview(card.input);
          }
          return '' + card.input;
        },
        tql: "linear_transform($input, $scorePoints)",
        display: [
          {
            displayType: DisplayType.CARDTEXT,
            help: ManualConfig.help["input"],
            key: 'input',
            placeholder: 'Input field',
            accepts: transformScoreInputTypes,
            showWhenCards: true,
          },
          {
            displayType: DisplayType.CARDSFORTEXT,
            key: 'input',
            accepts: transformScoreInputTypes,
          },
          {
            displayType: DisplayType.COMPONENT,
            component: TransformCardComponent,
            key: null,
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
                  score: 0.0,
                }),
                make(Blocks.scorePoint, {
                id: "b",
                  value: 50,
                  score: 0.5,
                }),
                make(Blocks.scorePoint, {
                  id: "c",
                  value: 100,
                  score: 1.0,
                }),
              ]),
          }
        ),
        
        metaFields: ['domain', 'hasCustomDomain'],
      }
    }),
    
    take: _valueCard(
    {
      colors: ["#2e8c9a", "#8adeea"],
      title: "Limit",
      manualEntry: ManualConfig.cards['take'],
      tql: "LIMIT $value",
      defaultValue: 25,
    }),
    
    skip: _valueCard(
    {
      colors: ["#2588aa", "#a2e5fc"],
      title: "Offset",
      manualEntry: ManualConfig.cards['skip'],
      tql: "OFFSET $value",
      defaultValue: 25,
    }),
    
    groupBy: _card(
    {
      fields: L(),
      
      static: {
        manualEntry: ManualConfig.cards['sfw'], // TODO
        colors: ["#659f72", "#c4e1ca"],
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
      colors: ["#4b977e", "#c4e1ca"],
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
      
      static: {
        title: "Expression",
        preview: "[clause]",
        colors: ["#278172", "#aefcef"],
        tql: "$clause",
        manualEntry: ManualConfig.cards.tql,
        anythingAccepts: true,
        
        display: {
          displayType: DisplayType.TEXT,
          key: 'clause',
        }
      }
    }),
    
    add: _mathCard({
      title: '+',
      tqlGlue: ' + ',
      colors: ["#d24f42", "#f9cba8"],
    }),
    
    subtract: _mathCard({
      title: '-',
      tqlGlue: ' - ',
      colors: ["#d65a44", "#fbc1b7"],
    }),
    
    multiply: _mathCard({
      title: '×',
      tqlGlue: ' * ',
      colors: ["#db6746", "#f9bcab"],
    }),
    
    divide: _mathCard({
      title: '/',
      tqlGlue: ' / ',
      colors: ["#dd7547", "#fdcdb8"],
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
        tql: "VAR $key = $value;",
      }
    }),
    
    creating: _card( // a placeholder for when a card is being created
    {
      static: {
        tql: "",
        title: 'New Card',
        colors: ['#777', '#777'],
        preview: '',
        display: null,
        manualEntry: null,
      },
    }),
  };

  // Set the "type" field for all blocks equal to its key
  _.map(Blocks as ({[card:string]:any}), (v, i) => Blocks[i].type = i);
  
  export const CardsDeckOrdering =
  [
    [
      Blocks.sfw,
      Blocks.from,
    ],
    [
      Blocks.as,
      Blocks.count,
      Blocks.avg,
      Blocks.min,
      Blocks.max,
      Blocks.sum,
      Blocks.distinct,
    ],
    [
      Blocks.where,
      Blocks.groupBy,
      Blocks.having,
      Blocks.sort,
      Blocks.take,
      Blocks.skip,
    ],
    [
      Blocks.comparison,
      Blocks.and,
      Blocks.or,
      Blocks.exists,
      Blocks.not,
    ],
    [
      Blocks.transform,
      Blocks.score,
    ],
    [
      Blocks.add,
      Blocks.subtract,
      Blocks.multiply,
      Blocks.divide,
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
      
      if(block.type === 'sfw' && block['tables'] && block['tables'].size && block['tables'].get(0).table !== 'none')
      {
        // convert old format, where tables were included, to new format with separate from card
        // TODO remove once sufficiently antiquated
        block['cards'] = block['cards'].unshift(
          make(Blocks.from, {
            tables: block['tables']
          })
        );
      }
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
    if(value && value.static && Immutable.Iterable.isIterable(value))
    {
      // already a block / record
      // TODO change to a better way of checking
      return value;
    }
    
    if(Array.isArray(value) || typeof value === 'object')
    {
      if(Immutable.Iterable.isIterable(value))
      {
        value = value.map(v => recordFromJS(v));
      }
      else
      {
        value = _.reduce(value, (memo, v, key) =>
        {
          memo[key] = recordFromJS(v);
          return memo;
        }, Array.isArray(value) ? [] : {});
      }
      
      // conversion, remove when appropriate
      // if(value.type === 'multiand' || value.type === 'multior')
      // {
      //   value.type = value.type.substr(5);
      //   value.cards = value.clauses.map(block =>
      //   {
      //     let clause = block.get('clause');
      //     if(typeof clause === 'string')
      //     {
      //       return make(Blocks.tql, { clause });
      //     }
      //     return clause;
      //   });
      // }
      
      let type = value.type || (typeof value.get === 'function' && value.get('type'));
      if(type && Blocks[type])
      {
        value = make(Blocks[type], value);
      }
      else
      {
        value = Immutable.fromJS(value);
      }
    }
    
    return value;
  }
  
  // Prepare cards/records for save, trimming static values
  export const cardsForServer = (value: any) =>
  {
    if(Immutable.Iterable.isIterable(value))
    {
      value = value.toJS();
    }
    
    if(value && value.static)
    {
      delete value.static;
    }
    
    if(Array.isArray(value))
    {
      value.map(cardsForServer);
    }
    else if(typeof value === 'object')
    {
      for(var v of value)
      {
        cardsForServer(v);
      }
    }
    
    return value;
  }

  // returns preview for a given card
  export function getPreview(card:ICard):string
  {
    if(!card)
    {
      return;
    }
    
    if(!card.static)
    {
      if(typeof card === 'string' || typeof card === 'number')
      {
        return card + "";
      }
      
      try {
        return JSON.stringify(card);
      } catch(e) {
        return 'No preview';
      }
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
          let value = card[keys[0]];
          if(value['_isCard'])
          {
            return getPreview(value);
          }
          return value;
        }
        if(keys[1] === 'length' || keys[1] === 'size')
        {
          return card[keys[0]].size;
        }
        return card[keys[0]].toArray().map(
          v => 
            getPreview(v[keys[1]])
        ).join(", ");
      });
    }
    else if(typeof preview === 'function')
    {
      return preview(card);
    }
    return 'No preview';
  }  
  
  export function getChildIds(_block:IBlock):IMMap<ID, boolean>
  {
    var map = Map<ID, boolean>({});
    
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
  
  export function forAllCards(
    block:IBlock | List<IBlock>, 
    fn: (card:ICard, keyPath: KeyPath) => void
  ) {
    forAllBlocks(
      block,
      (block: IBlock, keyPath: KeyPath) =>
      {
        if(block['_isCard'])
        {
          fn(block as any, keyPath);
        }
      }
    );
  }
  
  export function forAllBlocks(
    block: IBlock | List<IBlock>, 
    fn: (block: IBlock, keyPath: KeyPath) => void, 
    keyPath: KeyPath = List([]), 
    stopAtFirstBlock?: boolean, 
    excludeWrappedCards?: boolean
  ) 
  {
    if(block)
    {
      if(block['_isBlock'])
      {
        fn(block as IBlock, keyPath);
      }
      if(
        Immutable.Iterable.isIterable(block)
        && (!stopAtFirstBlock || !block['_isBlock'] || !keyPath.size)
      )
      {
        (block.toMap() as any).map(
          (b, key) =>
          {
            if(!excludeWrappedCards || key !== 'cards')
            {
              forAllBlocks(
                b as IBlock, 
                fn, 
                keyPath.push(key), 
                stopAtFirstBlock, 
                excludeWrappedCards
              );
            }
          }
        );
      }
    }
  }
   
  export function transformAlias(transformCard:ICard):string
  {
    return 'transform' + transformCard.id.replace(/[^a-zA-Z0-9]/g, "");
  }
}

import Actions from './data/BuilderActions';
import {IResultsConfig, _IResultsConfig} from "./components/results/ResultsConfig";

export default BuilderTypes;

import TQLToCards from '../tql/TQLToCards';
import TQLConverter from '../tql/TQLConverter';
