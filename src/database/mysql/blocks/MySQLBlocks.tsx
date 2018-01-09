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

// Copyright 2017 Terrain Data, Inc.

// tslint:disable:no-var-requires restrict-plus-operands strict-boolean-expressions max-line-length no-shadowed-variable

import { List } from 'immutable';
const Color = require('color');

import CommonSQL from '../../../../shared/database/mysql/syntax/CommonSQL';
import * as BlockUtils from '../../../blocks/BlockUtils';
import * as CommonBlocks from '../../../blocks/CommonBlocks';
import { DisplayType, firstSecondDisplay } from '../../../blocks/displays/Display';
import { _block, Block } from '../../../blocks/types/Block';
import { _card, Card, CardString } from '../../../blocks/types/Card';
import { InputType } from '../../../blocks/types/Input';

import Util from '../../../app/util/Util';

const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;

const { make } = BlockUtils;

// TODO is there a better way to do these things?
import ScoreBar from '../../../app/builder/components/charts/ScoreBar';
import TransformCard from '../../../app/builder/components/charts/TransformCard';
import Actions from '../../../app/builder/data/BuilderActions';
import Store from '../../../app/builder/data/BuilderStore';

const _acceptsMath = (list: List<string>) =>
  list.concat(
    List([
      'add',
      'subtract',
      'divide',
      'multiply',
    ]),
  ).toList();

const mathsAccept = _acceptsMath(
  List([
    'select',
    'comparison',
    'score',
    'transform',
  ]),
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
  ]),
);

const transformScoreInputTypes =
  List(['score', 'transform', 'sfw']).concat(acceptsAggregates).toList();

const _mathCard = (config: {
  title: string;
  tqlGlue: string;
  colors: string[];
}) =>
  _card({
    fields: List(),

    static:
      {
        language: 'mysql',
        // manualEntry: null,
        colors: config.colors,
        title: config.title,
        preview:
          (card) =>
            card['fields'].map(
              (field) =>
                typeof field.field !== 'object' ? field.field : BlockUtils.getPreview(field.field),
            ).join(config.tqlGlue),

        tql: '($fields )',
        tqlGlue: config.tqlGlue,

        init: () => ({
          fields: List([
            make(MySQLBlocks, 'field', { field: '' }),
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

export const MySQLBlocks =
  {
    sortBlock: _block(
      {
        property: '',
        direction: CommonSQL.Direction.DESC,
        static: {
          language: 'mysql',
          tql: '\n $property $DIRECTION',
          removeOnCardRemove: true,
        },
      }),

    comparisonBlock: _block(
      {
        first: '',
        second: '',
        operator: CommonSQL.Operator.EQ,

        static: {
          language: 'mysql',
          tql: '\n $first $OPERATOR $second',

          accepts: _acceptsMath(List(['score', 'transform', 'from', 'exists', 'not'])),
        },
      }),

    table: _block(
      {
        table: '',
        alias: '',
        aliasWasSuggested: false,

        static: {
          language: 'mysql',
          tql: (tableBlock: Block) =>
          {
            let suffix = '';
            if (tableBlock['alias'])
            {
              suffix = ' as $alias';
            }
            return '\n $table' + suffix;
          },
        },
      }),

    field: _block(
      {
        field: '',

        static: {
          language: 'mysql',
          tql: '$field',
          accepts: _acceptsMath(List(['min', 'max', 'avg', 'sum', 'count', 'distinct'])),
          removeOnCardRemove: true,
        },
      }),

    sfw: _card(
      {
        fields: List(),
        cards: List(),

        static: {
          language: 'mysql',
          // manualEntry: ManualConfig.cards['sfw'],
          colors: ['#559dcf', Color('#559dcf').alpha(0.7).string()],
          title: 'Select',
          preview: '[fields.field]',
          topTql: 'SELECT\n$fields\n$cards',
          tql: '(\n SELECT\n $fields\n$cards )',

          init: () => ({
            fields: List([
              make(MySQLBlocks, 'field', { field: '*' }),
            ]),
            cards: List([
              make(MySQLBlocks, 'from'),
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
            (card: Card) =>
              card['fields'].reduce(
                (list: List<string>, fieldBlock: { field: CardString }): List<string> =>
                {
                  /* TODO make this better */
                  if (fieldBlock.field['type'] === 'as')
                  {
                    // an as card
                    return list.push(fieldBlock.field['alias']);
                  }
                  return list;
                }, List([]),
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
                      // help: ManualConfig.help['select-field'],
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
      tables: List(),

      static:
        {
          language: 'mysql',
          // manualEntry: ManualConfig.cards['sfw'],
          colors: ['#3a7dcf', Color('#3a7dcf').alpha(0.7).string()],
          title: 'From',
          preview: '[tables.table]',
          tql: 'FROM\n$tables',

          init: () => ({
            tables: List([make(MySQLBlocks, 'table')]),
          }),

          getParentTerms:
            (card: Card, schemaState) =>
              card['tables'].reduce(
                (list: List<string>, tableBlock: { table: string, alias: string }): List<string> =>
                {
                  const dbName = Store.getState().db.name;
                  let columnNames = schemaState.columnNamesByDb.getIn(
                    [dbName, dbName + '.' + tableBlock.table],
                  ) || List([]);
                  columnNames = columnNames.map(
                    (columnName) => tableBlock.alias + '.' + columnName,
                  );
                  return list.concat(columnNames).toList();
                },
                List([]),
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
                        // help: ManualConfig.help['table'],
                        accepts: List(['sfw']),
                        showWhenCards: true,
                        getAutoTerms: (schemaState) =>
                        {
                          const db = Store.getState().db.name; // TODO correct?
                          const tableNames = schemaState.tableNamesByDb.get(db);
                          // if (!tableNames)
                          // {
                          //   const unsubscribe = SchemaStore.subscribe(() =>
                          //   {
                          //     if (SchemaStore.getState().tableNamesByDb.get(db))
                          //     {
                          //       unsubscribe();
                          //       comp.forceUpdate();
                          //     }
                          //   });
                          // }
                          return tableNames;
                        },

                        onFocus: (comp: React.Component<any, any>, value: string) =>
                        {
                          comp.setState({
                            initialTable: value,
                          });
                        },
                        onBlur: (comp: React.Component<any, any>, value: string) =>
                        {
                          const initialTable = comp.state.initialTable;
                          const newTable = value;

                          if (initialTable !== newTable)
                          {
                            const suggestAlias = (table: string) =>
                            {
                              if (table.charAt(table.length - 1).toLowerCase() === 's')
                              {
                                return table.substr(0, table.length - 1);
                              }
                              return table;
                            };

                            const keyPath: KeyPath = comp.props.keyPath;
                            const aliasKeyPath = keyPath.set(keyPath.size - 1, 'alias');
                            const aliasWasSuggestedKeyPath = keyPath.set(keyPath.size - 1, 'aliasWasSuggested');
                            const initialAlias: string = Store.getState().getIn(aliasKeyPath);

                            if (!initialTable || initialTable === ''
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
                        // help: ManualConfig.help['alias'],
                        key: 'alias',
                        autoDisabled: true,

                        onFocus: (comp: React.Component<any, any>, value: string, event: React.FocusEvent<any>) =>
                        {
                          const keyPath: KeyPath = comp.props.keyPath;
                          const wasSuggestedKeyPath = keyPath.set(keyPath.size - 1, 'aliasWasSuggested');
                          if (Store.getState().getIn(wasSuggestedKeyPath))
                          {
                            Util.selectText(event.target, 0, event.target['value'].length);
                            Actions.change(wasSuggestedKeyPath, false);
                          }
                        },
                      },
                    ],
                },
            },
        },
    }),

    where: _wrapperCard({
      title: 'Where',
      colors: ['#86a860', Color('#86a860').alpha(0.7).string()],
      tql: 'WHERE\n$cards',
      // manualEntry: ManualConfig.cards.where,
      singleChild: true,
      language: 'mysql',

      accepts: List([
        'and',
        'or',
        'exists',
        'not',
        'comparison',
      ]),
    }),

    and: _wrapperCard({
      title: 'And',
      tql: '(\n$cards\n)',
      tqlGlue: '\nAND\n',
      // manualEntry: ManualConfig.cards.and,
      colors: ['#824ba1', Color('#824ba1').alpha(0.7).string()],
      accepts: List(['or', 'comparison', 'exists', 'not']),
      language: 'mysql',
    }),

    or: _wrapperCard({
      title: 'Or',
      tql: '(\n$cards\n)',
      tqlGlue: '\nOR\n',
      // manualEntry: ManualConfig.cards.or,
      colors: ['#b161bc', Color('#b161bc').alpha(0.7).string()],
      accepts: List(['and', 'comparison', 'exists', 'not']),
      language: 'mysql',
    }),

    comparison: _card(
      {
        first: '',
        second: '',
        operator: CommonSQL.Operator.EQ,

        static: {
          language: 'mysql',
          title: 'Compare',
          colors: ['#476aa3', Color('#476aa3').alpha(0.7).string()],
          preview: (c: Card) =>
          {
            let first = c['first'];
            let second = c['second'];
            if (first._isCard)
            {
              first = BlockUtils.getPreview(first);
            }
            if (second._isCard)
            {
              second = BlockUtils.getPreview(second);
            }

            return `${first} ${CommonSQL.OperatorTQL[c['operator']]} ${second}`;
          },
          tql: '$first $OPERATOR $second',

          display: firstSecondDisplay(
            {
              displayType: DisplayType.DROPDOWN,
              key: 'operator',
              options: List(CommonSQL.Operators),
              // help: ManualConfig.help['operator'],
              centerDropdown: true,
            },
            _acceptsMath(
              List(['sfw', 'exists', 'not']),
            ),
          ),
          // manualEntry: ManualConfig.cards['filter'],
        },
      }),

    sort: _card(
      {
        sorts: List([]),

        static:
          {
            language: 'mysql',
            title: 'Order By',
            preview: (c: any) =>
            {
              const { sorts } = c;
              if (sorts.size === 1)
              {
                const { property } = sorts.get(0);
                if (typeof property === 'string')
                {
                  return property;
                }
                return BlockUtils.getPreview(property);
              }
              return sorts.size + ' Factors';
            },
            colors: ['#39918b', Color('#39918b').alpha(0.7).string()],
            // manualEntry: ManualConfig.cards['sort'],
            tql: 'ORDER BY $sorts',

            init: () =>
            {
              return {
                sorts: List([
                  make(MySQLBlocks, 'sortBlock'),
                ]),
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
                        // help: ManualConfig.help['property'],
                        key: 'property',
                        accepts: _acceptsMath(List(['score', 'transform'])),
                        showWhenCards: true,
                      },
                      {
                        displayType: DisplayType.DROPDOWN,
                        key: 'direction',
                        options: List(CommonSQL.Directions),
                        // help: ManualConfig.help['direction'],
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
    // language: 'mysql',
    //     title: "Let",
    //     preview: "[field]",
    //     colors: ["#a4b356", Color("#a4b356").alpha(0.7).string()],
    //     display: letVarDisplay,
    //     // manualEntry: ManualConfig.cards['let'],
    //     tql: "let $field = $expression",
    //     getNeighborTerms: (card) => List([card['field']]),
    //   }
    // }),

    // var: _card(
    // {
    //   field: "",
    //   expression: "",

    //   static: {
    // language: 'mysql',
    //     title: "Var",
    //     preview: "[field]",
    //     display: letVarDisplay,
    //     colors: ["#6ca165", Color("#6ca165").alpha(0.7).string()],
    //     // manualEntry: ManualConfig.cards['var'],
    //     getNeighborTerms: (card) => List([card['field']]),
    //     tql: "var $field = $expression",
    //   }
    // }),

    as: _card({
      value: '',
      alias: '',

      static: {
        language: 'mysql',
        title: 'As',
        colors: ['#d24f42', Color('#d24f42').alpha(0.7).string()],
        preview: '[alias]',
        tql: '$value AS $alias',
        // manualEntry: ManualConfig.cards.where,
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
              },
          },
      },
    }),

    count: _aggregateNestedCard(
      {
        title: 'Count',
        colors: ['#d65a44', Color('#d65a44').alpha(0.7).string()],
        // manualEntry: ManualConfig.cards['count'],
        tql: 'COUNT($value)',
        accepts: List(['distinct']),
        init: () => ({ value: '*' }),
        language: 'mysql',
      }),

    avg: _aggregateCard(
      {
        title: 'Average',
        colors: ['#db6746', Color('#db6746').alpha(0.7).string()],
        // manualEntry: ManualConfig.cards['avg'],
        tql: 'AVG($value)',
        language: 'mysql',
      }),

    min: _aggregateCard(
      {
        title: 'Min',
        colors: ['#dd7547', Color('#dd7547').alpha(0.7).string()],
        // manualEntry: ManualConfig.cards['min'],
        tql: 'MIN($value)',
        language: 'mysql',
      }),

    max: _aggregateCard(
      {
        title: 'Max',
        colors: ['#dd8846', Color('#dd8846').alpha(0.7).string()],
        // manualEntry: ManualConfig.cards['max'],
        language: 'mysql',
        tql: 'MAX($value)',
      }),

    sum: _aggregateCard(
      {
        title: 'Sum',
        colors: ['#dba043', Color('#dba043').alpha(0.7).string()],
        // manualEntry: ManualConfig.cards['sum'],
        tql: 'SUM($value)',
        language: 'mysql',
      }),

    distinct: _aggregateCard(
      {
        title: 'Distinct',
        colors: ['#d9b540', Color('#d9b540').alpha(0.7).string()],
        // manualEntry: ManualConfig.cards['count'], // TODO
        tql: 'DISTINCT $value',
        language: 'mysql',
      }),

    exists: _wrapperCard(
      {
        colors: ['#319aa9', Color('#319aa9').alpha(0.7).string()],
        title: 'Exists',
        // manualEntry: ManualConfig.cards['exists'],
        tql: 'EXISTS\n$cards',
        accepts: List(['sfw']),
        language: 'mysql',
      }),

    not: _wrapperCard(
      {
        colors: ['#21aab9', Color('#21aab9').alpha(0.7).string()],
        title: 'Not',
        // manualEntry: ManualConfig.cards['exists'],
        tql: (notCard) =>
        {
          const cards = notCard['cards'];
          if (cards && cards.size && cards.get(0).type === 'exists')
          {
            return 'NOT$cards';
          }
          return 'NOT (\n$cards)';
        },
        accepts: List(['exists', 'compare', 'and', 'or']),
        language: 'mysql',
      }),

    // remove
    parentheses: _wrapperCard(
      {
        colors: ['#6775aa', Color('#6775aa').alpha(0.7).string()],
        title: '( )',
        // manualEntry: ManualConfig.cards['parentheses'],
        tql: '\n(\n$cards)',
        accepts: List(['and', 'or', 'exists', 'tql', 'not']),
        language: 'mysql',
      }),

    weight: _block(
      {
        key: '',
        weight: 1,
        static: {
          language: 'mysql',
          tql: '$weight, $key',
          removeOnCardRemove: true,
        },
      }),

    score: _card(
      {
        weights: List([]),
        method: '',

        static: {
          language: 'mysql',
          title: 'Score',
          colors: ['#3a91a6', Color('#3a91a6').alpha(0.7).string()],
          preview: '[weights.length] Weights',
          // manualEntry: ManualConfig.cards['score'],
          tql: 'linear_score($weights)',
          init: () => ({
            weights: List([
              make(MySQLBlocks, 'weight'),
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
                        // help: ManualConfig.help['key'],
                        placeholder: 'Field',
                        accepts: transformScoreInputTypes,
                        showWhenCards: true,
                      },
                      {
                        displayType: DisplayType.NUM,
                        // help: ManualConfig.help['weight'],
                        key: 'weight',
                        placeholder: 'Weight',
                        // autoDisabled: true,
                      },
                      {
                        displayType: DisplayType.COMPONENT,
                        component: ScoreBar,
                        key: 'score',
                        // help: ManualConfig.help['score'],
                      },
                    ],
                  below:
                    {
                      displayType: DisplayType.CARDSFORTEXT,
                      key: 'key',
                      accepts: transformScoreInputTypes,
                    },
                },
            },
        },
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
          language: 'mysql',
          tql: null, // N/A
        },
      }),

    scorePoint: _block(
      {
        value: 0,
        score: 0,

        static: {
          language: 'mysql',
          tql: '$score, $value',
        },
      }),

    transform: _card(
      {
        input: '',
        scorePoints: List([]),

        domain: List([0, 100]),
        hasCustomDomain: false, // has the user set a custom domain

        static: {
          language: 'mysql',
          // manualEntry: ManualConfig.cards['transform'],
          colors: ['#4b979a', Color('#4b979a').alpha(0.7).string()],
          title: 'Transform',
          preview: (card: any) =>
          {
            if (card.input._isCard)
            {
              return '' + BlockUtils.getPreview(card.input);
            }
            return '' + card.input;
          },
          tql: 'linear_transform($input, $scorePoints)',
          display: [
            {
              displayType: DisplayType.CARDTEXT,
              // help: ManualConfig.help['input'],
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
              component: TransformCard,
              requiresBuilderState: true,
              key: null,
              // help: ManualConfig.help['scorePoints'],
            },
          ],

          init: () => (
            {
              scorePoints:
                List([
                  //   make(MySQLBlocks, 'scorePoint', {
                  //     id: 'a',
                  //     value: 0,
                  //     score: 0.0,
                  //   }),
                  //   make(MySQLBlocks, 'scorePoint', {
                  //     id: 'b',
                  //     value: 50,
                  //     score: 0.5,
                  //   }),
                  //   make(MySQLBlocks, 'scorePoint', {
                  //     id: 'c',
                  //     value: 100,
                  //     score: 1.0,
                  //   }),
                ]),
            }
          ),

          metaFields: ['domain', 'hasCustomDomain'],
        },
      }),

    take: _valueCard(
      {
        colors: ['#2e8c9a', Color('#2e8c9a').alpha(0.7).string()],
        title: 'Limit',
        // manualEntry: ManualConfig.cards['take'],
        tql: 'LIMIT $value',
        defaultValue: 25,
        language: 'mysql',
      }),

    skip: _valueCard(
      {
        colors: ['#2588aa', Color('#2588aa').alpha(0.7).string()],
        title: 'Offset',
        // manualEntry: ManualConfig.cards['skip'],
        tql: 'OFFSET $value',
        defaultValue: 25,
        language: 'mysql',
      }),

    groupBy: _card(
      {
        fields: List(),

        static: {
          language: 'mysql',
          // manualEntry: ManualConfig.cards['sfw'], // TODO
          colors: ['#659f72', Color('#659f72').alpha(0.7).string()],
          title: 'Group By',
          preview: '[fields.field]',
          tql: 'GROUP BY\n$fields',

          init: () => ({
            fields: List([make(MySQLBlocks, 'field')]),
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
                      // help: ManualConfig.help['select-field'],
                      key: 'field',
                    },
                },
            },
        },
      }),

    having: _wrapperCard({
      title: 'Having',
      colors: ['#4b977e', Color('#4b977e').alpha(0.7).string()],
      tql: 'HAVING\n$cards',
      // manualEntry: ManualConfig.cards.where, // TODO

      accepts: List([
        'and',
        'or',
        'exists',
        'comparison',
      ]),
      language: 'mysql',
    }),

    tql: _card({
      clause: '',

      static: {
        language: 'mysql',
        title: 'Expression',
        preview: '[clause]',
        colors: ['#278172', Color('#278172').alpha(0.7).string()],
        tql: '$clause',
        // manualEntry: ManualConfig.cards.tql,
        anythingAccepts: true,

        display: {
          displayType: DisplayType.TEXT,
          key: 'clause',
        },
      },
    }),

    add: _mathCard({
      title: '+',
      tqlGlue: ' + ',
      colors: ['#d24f42', Color('#d24f42').alpha(0.7).string()],
    }),

    subtract: _mathCard({
      title: '-',
      tqlGlue: ' - ',
      colors: ['#d65a44', Color('#d65a44').alpha(0.7).string()],
    }),

    multiply: _mathCard({
      title: '×',
      tqlGlue: ' * ',
      colors: ['#db6746', Color('#db6746').alpha(0.7).string()],
    }),

    divide: _mathCard({
      title: '/',
      tqlGlue: ' / ',
      colors: ['#dd7547', Color('#dd7547').alpha(0.7).string()],
    }),

    spotlight: _block(
      {
        static: {
          language: 'mysql',
          tql: null, // N/A
        },
        // TODO some day
      }),

    input: _block(
      {
        key: '',
        value: '',
        inputType: InputType.NUMBER,
        static: {
          language: 'mysql',
          tql: '',
        },
      }),

    creating: _card( // a placeholder for when a card is being created
      {
        static: {
          language: 'mysql',
          tql: '',
          title: 'New Card',
          colors: ['#777', Color('#777').alpha(0.7).string()],
          preview: '',
          display: null,
          // manualEntry: null,
        },
      }),
  };

BlockUtils.initBlocks(MySQLBlocks);

// TODO remove
const cards = {};
for (const key in MySQLBlocks)
{
  if (MySQLBlocks[key]._isCard && MySQLBlocks[key].static.manualEntry)
  {
    cards[MySQLBlocks[key].static.manualEntry.name] = key;
  }
}
export const cardList = cards;

export default MySQLBlocks;
