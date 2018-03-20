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

// tslint:disable:restrict-plus-operands  strict-boolean-expressions no-console

import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as TerrainLog from 'loglevel';

import { Colors, getCardColors } from '../../../app/colors/Colors';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { DisplayType } from '../../../blocks/displays/Display';
import { _block, Block, BlockConfig, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card, Card } from '../../../blocks/types/Card';
import { AutocompleteMatchType, ElasticBlockHelpers } from '../../../database/elastic/blocks/ElasticBlockHelpers';

import SpecializedCreateCardTool from 'builder/components/cards/SpecializedCreateCardTool';
import ESClauseType from '../../../../shared/database/elastic/parser/ESClauseType';
import { ESInterpreterDefaultConfig } from '../../../../shared/database/elastic/parser/ESInterpreter';
import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';
import ESJSONType from '../../../../shared/database/elastic/parser/ESJSONType';
import ESPropertyInfo from '../../../../shared/database/elastic/parser/ESPropertyInfo';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';
import ESCardParser from '../conversion/ESCardParser';
import { ElasticBlocks } from './ElasticBlocks';
import { ElasticElasticCards } from './ElasticElasticCards';
import ESParserError from '../../../../shared/database/elastic/parser/ESParserError';
import ESBoolCardParser from '../conversion/ESBoolCardParser';
import {TerrainFilterCardParser} from '../conversion/TerrainFilterCardParser';

export class FilterUtils
{

  public static terrainFilterClauses = ['filter', 'filter_not', 'must', 'must_not', 'should', 'should_not'];

  public static esFilterOperatorsTooltips = {
    '>': "The data's field must be greater than your specified valued.",
    '≥': "The data's field must be greater than or equal to your specified valued.",
    '<': "The data's field must be less than your specified valued.",
    '≤': "The data's field must be less than or equal to your specified valued.",
    '=': "The data's field must match your specified value exactly.",
    '≈': "The data's field must contain your specified value.",
    'in': "The data's field must be an array.",
    'exists': "The data's field must be existed.",
  };

  public static esFilterOperatorsMap = {
    '>': 'gt',
    '≥': 'gte',
    '<': 'lt',
    '≤': 'lte',
    '=': 'term',
    '≈': 'match',
    'in': 'terms',
    'exists': 'exists',
  };

  public static esRangeOperatorMap = {
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    term: '=',
    match: '≈',
    terms: 'in',
    exists: 'exists',
  };

  // ElasticFilterCard is a custom card based on the bool_query clause card.
  public static BoolQueryCard = ElasticElasticCards['eqlbool_query'];

  // Make an elasticFilter card from a bool card
  public static makeCustomFilterCard(blocksConfig: { [type: string]: BlockConfig },
                                     blockType: string, extraConfig?: { [key: string]: any }, skipTemplate?: boolean)
  {
    console.assert(blockType === 'eqlbool_query', 'Unrecognized block type ' + blockType);
    if (extraConfig && extraConfig.doNotCustom === true)
    {
      return BlockUtils.make(blocksConfig, blockType, extraConfig, skipTemplate);
    }
    let filterCard = BlockUtils.make(blocksConfig, 'elasticFilter', extraConfig, skipTemplate);
    // custom this elasticFilter card (FilterUtils.customFilterBlock)
    filterCard = filterCard.static.epilogueInit(filterCard);
    // delete any filter blocks since they are in filter rows now
    return filterCard;
  }

  // Custom the elasticFilter card
  public static customFilterBlock(block: Block)
  {
    // update filter rows if there is any
    // this block should be a bool block
    const boolParser = new ESBoolCardParser(block);
    return boolParser.queryToFilter();
  }

  // Shuffle filter cards to indexFilters, otherFilters
  // This functions is called after a card mutation.
  public static reGroupFilterRows(block: Block, allBlocks?: Block[]): Block
  {
    console.assert(block.type === 'elasticFilter', 'Block is not elasticFilter.');
    let filterRows;

    if (allBlocks)
    {
      filterRows = allBlocks;
    } else
    {
      filterRows = block['indexFilters'].concat(block['otherFilters']);
    }

    const indexFilters: Block[] = [];
    const otherFilters: Block[] = [];
    filterRows.map((row: Block) =>
    {
      if (row.boolQuery === 'filter' && row.filterOp === '=' && row.field === '_index')
      {
        indexFilters.push(row);
      } else
      {
        otherFilters.push(row);
      }
    });
    // regroup the filter rows first because a new other-filter row added into
    // the index filter list or the type filter list
    block = block.set('indexFilters', Immutable.List(indexFilters));
    block = block.set('otherFilters', Immutable.List(otherFilters));

    // update the cached currentIndex;
    let indexField = '';
    if (block['indexFilters'].size > 0)
    {
      indexField = block['indexFilters'].get(0).value;
    }
    block = block.set('currentIndex', indexField);

    return block;
  }
}


export const elasticFilterBlock = _block(
  {
    field: '',
    value: '',
    key: 'term',
    boolQuery: 'must',
    filterOp: '=',
    boost: '',
    static: {
      language: 'elastic',
      tql: null,
      // the shape of elasticFilterBlock is similar with the eqlquery card.
      clause: ESInterpreterDefaultConfig.getClause('query'),
      // this tql is same as tql of other clause cards.
      removeOnCardRemove: true,
      // this is called before parsing/interpreting cards, so we have to update the cards fields.
      init: (blocksConfig, extraConfig?, skipTemplate?) =>
      {
        const config = {};
        config['field'] = (extraConfig && extraConfig.field !== undefined && extraConfig.field !== null)
          ? extraConfig.field : '';
        config['value'] = (extraConfig && extraConfig.value !== undefined && extraConfig.value !== null)
          ? extraConfig.value : '';
        config['boost'] = (extraConfig && extraConfig.boost !== undefined && extraConfig.value !== null)
          ? extraConfig.boost : '';
        config['boolQuery'] = (extraConfig && extraConfig.boolQuery) || 'must';
        config['filterOp'] = (extraConfig && extraConfig.filterOp) || '=';
        return config;
      },
    },
  });

export const elasticFilter = _card({
  // caching the index.
  currentIndex: '',
  // caching the type
  currentType: '',
  // filters divided as index/other filters
  indexFilters: List([]),
  otherFilters: List([]),
  cards: Immutable.List([]),
  getChildOptions: FilterUtils.BoolQueryCard.getChildOptions,
  childOptionClickHandler: FilterUtils.BoolQueryCard.childOptionClickHandler,
  childrenHaveKeys: true,
  key: 'bool',

  static: {
    // this makes the shape of elasticFilterBlock similar with the bool_query clause card.
    clause: ESInterpreterDefaultConfig.getClause('bool_query'),
    language: 'elastic',
    title: 'Filter',
    description: 'Terrain\'s custom card for filtering results in a human-readable way.',
    colors: getCardColors('filter', Colors().builder.cards.structureClause),
    preview: (c: Card) =>
    {
      return String(c['indexFilters'].size + c['otherFilters'].size + c['cards'].size) + ' Filters';
    },
    // this tql is same as tql of other clause cards.
    tql: (block, tqlTranslationFn, tqlConfig) =>
    {
      const json: object = {};
      const mergedBlock = TerrainFilterCardParser.mergeFilterBlocksAndRows(block);
      mergedBlock['cards'].map(
        (card) =>
        {
          _.extend(json, {
            [card['key']]: tqlTranslationFn(card, tqlConfig),
          });
        },
      );
      return json;
    },
    // this is called before parsing/interpreting cards, so we have to update the cards fields.
    updateCards: (rootBlock: Block, block: Block, blockPath: KeyPath) =>
    {
      block = FilterUtils.reGroupFilterRows(block);
      return block;
    },

    init: FilterUtils.BoolQueryCard.static.init,
    epilogueInit: FilterUtils.customFilterBlock,

    display:
      [
        // display _index filters first, so that 1) index filters are always at the beginning
        // 2) we can auto-complete the value with index schema options.
        {
          displayType: DisplayType.ROWS,
          key: 'indexFilters',
          english: 'Index',
          factoryType: 'elasticFilterBlock',
          row:
            {
              inner:
                [
                  {
                    displayType: DisplayType.LABEL,
                    label: 'Index:',
                    key: null,
                  },
                  {
                    displayType: DisplayType.TEXT,
                    key: 'value',
                    getAutoTerms: (schemaState, builderState) =>
                    {
                      return ElasticBlockHelpers.autocompleteMatches(schemaState, builderState, AutocompleteMatchType.Index);
                    },
                  },
                ],
            },
        },
        // finally display all other filters.
        {
          displayType: DisplayType.ROWS,
          key: 'otherFilters',
          english: 'Index',
          factoryType: 'elasticFilterBlock',
          row:
            {
              inner:
                [
                  {
                    displayType: DisplayType.TEXT,
                    key: 'field',
                    getAutoTerms: (schemaState, builderState) =>
                    {
                      return ElasticBlockHelpers.autocompleteMatches(schemaState, builderState, AutocompleteMatchType.Field);
                    },
                  },
                  {
                    displayType: DisplayType.DROPDOWN,
                    key: 'boolQuery',
                    options: List(
                      FilterUtils.terrainFilterClauses,
                      // Can consider using this, but it includes "minmum_should_match," which
                      //  doesn't make sense in this context
                      // Object.keys(ESInterpreterDefaultConfig.getClause('bool_query')['structure'])
                    ),
                    optionsDisplayName: Immutable.Map<any, string>(
                      {
                        must: 'Must',
                        must_not: 'Must Not',
                        should: 'Should',
                        should_not: 'Snot',
                        filter: 'Filter',
                        filter_not: 'Fnot',
                      } as any,
                    ),
                    dropdownTooltips: List([
                      'A result must pass the equation you specify to be included in the final results.',
                      'A result must not pass the equation you specify to be included in the final results.',
                      'A result must pass at least one of the "should" equations you specify to be included in the final results.',
                      'A result must not pass at least one of the "should" equations you specify to be included in the final results.',
                      'A result must pass the equation you specify to be included in the final results, ' +
                      "but this equation won't be included in calculating the Elastic _score.",
                      'A result must not pass the equation you specify to be included in the final results, ' +
                      "but this equation won't be included in calculating the Elastic _score.",
                    ]),
                    dropdownUsesRawValues: true,
                    autoDisabled: true,
                    centerDropdown: true,
                    style: {
                      maxWidth: 150,
                      minWidth: 105,
                      marginRight: 3,
                    },
                  },
                  {
                    displayType: DisplayType.DROPDOWN,
                    key: 'filterOp',
                    options: List(
                      _.keys(FilterUtils.esFilterOperatorsMap) as string[],
                      // can consider using this, but it includes 'boost', and uses raw text values
                      // Object.keys(ESInterpreterDefaultConfig.getClause('range_value')['structure'])),
                    ),
                    dropdownTooltips: List(_.values(FilterUtils.esFilterOperatorsTooltips)),
                    dropdownUsesRawValues: true,
                    centerDropdown: true,
                    autoDisabled: true,
                    style: {
                      maxWidth: 75,
                    },
                  },
                  {
                    displayType: DisplayType.TEXT,
                    key: 'value',
                  },
                ],
            },
        },
        {
          displayType: DisplayType.CARDS,
          key: 'cards',
          hideCreateCardTool: true,
        },
        {
          provideParentData: true, // need this to grey out the type dropdown
          displayType: DisplayType.COMPONENT,
          component: SpecializedCreateCardTool,
          key: null,
          // help: ManualConfig.help['score'],
        },
      ],
  },
});

export default elasticFilter;
