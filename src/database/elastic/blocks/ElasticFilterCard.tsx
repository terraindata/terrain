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
import ESPropertyInfo from '../../../../shared/database/elastic/parser/ESPropertyInfo';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';
import ESCardParser from '../conversion/ESCardParser';
import { ElasticBlocks } from './ElasticBlocks';
import { ElasticElasticCards } from './ElasticElasticCards';

const esFilterOperatorsMap = {
  '>': 'gt',
  '≥': 'gte',
  '<': 'lt',
  '≤': 'lte',
  '=': 'term',
  '≈': 'match',
  'in': 'terms',
};

const esRangeOperatorMap = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  term: '=',
  match: '≈',
  terms: 'in',
};

const esFilterOperatorsTooltips = {
  '>': "The data's field must be greater than your specified valued.",
  '≥': "The data's field must be greater than or equal to your specified valued.",
  '<': "The data's field must be less than your specified valued.",
  '≤': "The data's field must be less than or equal to your specified valued.",
  '=': "The data's field must match your specified value exactly.",
  '≈': "The data's field must contain your specified value.",
  'in': "The data's field must be an array.",
};

export class FilterUtils
{
  // ElasticFilterCard is a custom card based on the bool_query clause card.
  public static BoolQueryCard = ElasticElasticCards['eqlbool_query'];

  // Make a Filter card with parameters of making the bool_query card
  public static makeCustomFilterCard(blocksConfig: { [type: string]: BlockConfig },
    blockType: string, extraConfig?: { [key: string]: any }, skipTemplate?: boolean)
  {
    console.assert(blockType === 'eqlbool_query', 'Unrecognized block type ' + blockType);
    let filterCard = BlockUtils.make(blocksConfig, 'elasticFilter', extraConfig, skipTemplate);
    filterCard = filterCard.static.epilogueInit(filterCard);
    // delete any filter blocks since they are in filter rows now
    return filterCard;
  }

  // Generate the filter rows for a Filter card.
  public static customFilterBlock(block: Block)
  {
    // update filter rows if there is any
    block = FilterUtils.generateFilterRowsFromBlocks(block);
    block = FilterUtils.removeFilterBlocks(block);
    return block;
  }

  // Remove the filter blocks which can be presented as filter rows from a Filter card.
  public static removeFilterBlocks(block: Block): Block
  {
    const cardTree = new ESCardParser(block);
    if (cardTree.hasError())
    {
      return block;
    }
    const boolValueInfo = cardTree.getValueInfo();
    for (const boolOp of ['filter', 'must', 'should', 'must_not'])
    {
      if (boolValueInfo.objectChildren[boolOp])
      {
        const opValueInfo = boolValueInfo.objectChildren[boolOp].propertyValue;
        let nonFilterCards;
        if (opValueInfo.card.type === 'eqlquery')
        {
          const currentQueryCard = opValueInfo.card;
          const allCards = Immutable.List([currentQueryCard]);
          nonFilterCards = allCards.filter((queryBlock) => FilterUtils.isNotFilterBlock(queryBlock));
        } else
        {
          console.assert(opValueInfo.card.type === 'eqlquery[]');
          const allCards = opValueInfo.card.cards;
          nonFilterCards = allCards.filter((queryBlock) => FilterUtils.isNotFilterBlock(queryBlock));
        }

        if (nonFilterCards.size === 0)
        {
          // there is no non-filter cards in this query
          block = block.setIn(opValueInfo.cardPath, null);
        } else
        {
          const opCard = BlockUtils.make(ElasticBlocks, 'eqlquery[]',
            {
              key: boolOp,
              cards: nonFilterCards,
            },
            true);
          block = block.setIn(opValueInfo.cardPath, opCard);
        }
      }
    }
    const newCards = block.cards.filter((card) => card !== null);
    block = block.set('cards', newCards);
    return block;
  }

  // Shuffle filter cards to indexFilters, typeFilters, and otherFilters
  public static reGroupFilterRows(block: Block): Block
  {
    console.assert(block.type === 'elasticFilter', 'Block is not elasticFilter.');
    const filterRows = block['indexFilters'].concat(block['typeFilters']).concat(block['otherFilters']);
    const filterRowList = { indexFilters: [], typeFilters: [], otherFilters: [] };
    filterRows.map((row: Block) =>
    {
      if (row.boolQuery === 'filter' && row.filterOp === '=' && row.field === '_index')
      {
        filterRowList.indexFilters.push(row);
      } else if (row.boolQuery === 'filter' && row.filterOp === '=' && row.field === '_type')
      {
        filterRowList.typeFilters.push(row);
      } else
      {
        filterRowList.otherFilters.push(row);
      }
    });
    // regroup the filter rows first because a new other-filter row added into
    // the index filter list or the type filter list
    for (const index in filterRowList)
    {
      if (filterRowList.hasOwnProperty(index))
      {
        block = block.set(index, Immutable.List(filterRowList[index]));
      }
    }
    return block;
  }

  public static generateFilterRowsFromBlocks(block: Block): Block
  {
    console.assert(block.type === 'elasticFilter', 'Block is not elasticFilter.');
    const cardTree = new ESCardParser(block);
    if (cardTree.hasError())
    {
      return block;
    }
    const boolValueInfo = cardTree.getValueInfo();
    const filterBlocks = FilterUtils.extractFilterBlocks(boolValueInfo);
    const indexFilters = [];
    const typeFilters = [];
    const otherFilters = [];
    filterBlocks.map((filterBlock) =>
    {
      switch (filterBlock.field)
      {
        case '_index':
          indexFilters.push(filterBlock);
          break;
        case '_type':
          typeFilters.push(filterBlock);
          break;
        default:
          otherFilters.push(filterBlock);
      }
    });
    block = block.set('indexFilters', List(indexFilters));
    block = block.set('typeFilters', List(typeFilters));
    block = block.set('otherFilters', List(otherFilters));
    return block;
  }

  public static isNotFilterBlock(queryBlock: Block)
  {
    if (queryBlock.type !== 'eqlquery')
    {
      return true;
    }
    if (queryBlock.cards.find((termBlock) =>
    {
      if (termBlock.key === 'term' && termBlock.type === 'eqlterm_query')
      {
        return this.IsTermClauseFilter(termBlock);
      }
      if (termBlock.key === 'terms' && termBlock.type === 'eqlterms_query')
      {
        return this.IsTermsClauseFilter(termBlock);
      }
      if (termBlock.key === 'range' && termBlock.type === 'eqlrange_query')
      {
        return this.IsRangeClauseFilter(termBlock);
      }
      if (termBlock.key === 'match' && termBlock.type === 'eqlmatch')
      {
        return this.IsMatchClauseFilter(termBlock);
      }
      return false;
    }) === undefined)
    {
      return true;
    }
    return false;
  }

  // Insert query blocks generated from the filter rows to a card
  // Please take care the order when pushing rows to cards
  // [Row1, Row2, ... block's child1, child2...]
  public static insertRowsToBlock(block: Block, rows: Block[])
  {
    const filterCards = [];
    rows.map((rowBlock) =>
    {
      filterCards.push(this.filterRowToQueryCard(rowBlock));
    });
    return Immutable.List(filterCards).concat(block.cards);
  }

  // Generate a new card whose child cards are from combining filter rows and other cards.
  public static mergeFilterBlocksAndRows(block: Block): Block
  {
    console.assert(block.type === 'elasticFilter', 'Block is not elasticFilter.');
    const cardTree = new ESCardParser(block);
    const boolValueInfo = cardTree.getValueInfo();
    const filterRows = block['indexFilters'].concat(block['typeFilters']).concat(block['otherFilters']);
    const filterRowMap = { filter: [], must: [], should: [], must_not: [] };
    filterRows.map((row: Block) =>
    {
      filterRowMap[row.boolQuery].push(row);
    });
    for (const boolOp of ['filter', 'must', 'should', 'must_not'])
    {
      if (filterRowMap[boolOp].length > 0)
      {
        if (boolValueInfo.objectChildren[boolOp] === undefined)
        {
          // create boolOp query[], and insert the rows into the card
          let opCard = BlockUtils.make(ElasticBlocks, 'eqlquery[]',
            {
              key: boolOp,
            },
            true);
          opCard = opCard.set('cards', FilterUtils.insertRowsToBlock(opCard, filterRowMap[boolOp]));
          block = block.set('cards', block.cards.push(opCard));

        } else
        {
          const opValueInfo = boolValueInfo.objectChildren[boolOp].propertyValue;
          if (opValueInfo.card.type === 'eqlquery')
          {
            const currentQueryCard = opValueInfo.card;
            let opCard = BlockUtils.make(ElasticBlocks, 'eqlquery[]',
              {
                key: boolOp,
                cards: Immutable.List([currentQueryCard]),
              },
              true);
            opCard = opCard.set('cards', FilterUtils.insertRowsToBlock(opCard, filterRowMap[boolOp]));
            block = block.setIn(opValueInfo.cardPath, opCard);
          } else
          {
            console.assert(opValueInfo.card.type === 'eqlquery[]');
            let opCard = opValueInfo.card;
            opCard = opCard.set('cards', FilterUtils.insertRowsToBlock(opCard, filterRowMap[boolOp]));
            block = block.setIn(opValueInfo.cardPath, opCard);
          }
        }
      }
    }
    return block;
  }

  public static extractFilterBlocks(boolValueInfo: ESValueInfo): Block[]
  {
    console.assert(boolValueInfo.clause.type === 'bool_query');
    const clauseChildren = boolValueInfo.objectChildren;
    let filters = [];
    for (const key of ['filter', 'must', 'should', 'must_not'])
    {
      if (clauseChildren[key] !== undefined)
      {
        const fs = this.ParseFilterBlockFromValueInfo(clauseChildren[key]);
        if (fs)
        {
          filters = filters.concat(fs);
        }
      }
    }
    return filters;
  }

  /**
   * When we update cards, we extract filter rows from the query blocks, then delete qualified
   * query blocks that are extracted into filter rows.
   * Thus it is important that extracting filter rows uses the same checking function as deleting
   * qualified blocks.
   * @param obj : a term or match query object
   * @returns {boolean} : true if we can turn this query object to a filter row
   */
  private static GetFilterClauseField(filterValueInfo: ESValueInfo)
  {
    console.assert(filterValueInfo.clause.clauseType === ESClauseType.ESMapClause);
    const keys = Object.keys(filterValueInfo.objectChildren);
    if (keys.length > 1)
    {
      TerrainLog.error(filterValueInfo, ' has more than one fields: ' + keys);
    }
    if (keys.length === 0)
    {
      return null;
    }
    return keys[0];
  }

  private static IsRangeClauseFilter(rangeCard: Block)
  {
    const blockValue = new ESCardParser(rangeCard);
    const field = this.GetFilterClauseField(blockValue.getValueInfo());
    if (field === null)
    {
      return false;
    }
    const rangeValue = blockValue.getValueInfo().objectChildren[field].propertyValue;
    for (const k of Object.keys(rangeValue.objectChildren))
    {
      if (esRangeOperatorMap[k] !== undefined)
      {
        return true;
      }
    }
    return false;
  }

  /**
   *
   * @param {ESPropertyInfo} valueInfo: term or range
   * @return elasticFilterBlocks generated from the filter clause
   */
  private static RangeClauseToBlocks(boolTypeName, rangeClause: ESPropertyInfo): Block[]
  {
    const blocks = [];
    const rangeQuery = rangeClause.propertyValue;
    const field = this.GetFilterClauseField(rangeQuery);
    if (field === null)
    {
      return blocks;
    }
    const rangeValue = rangeQuery.objectChildren[field].propertyValue;
    let boost = '';
    if (rangeValue.objectChildren['boost'])
    {
      boost = String(rangeValue.objectChildren['boost'].propertyValue.value);
    }
    for (const k of Object.keys(rangeValue.objectChildren))
    {
      if (esRangeOperatorMap[k] !== undefined)
      {
        // generating a new block from this range filter
        const value = String(rangeValue.objectChildren[k].propertyValue.value);
        blocks.push(
          BlockUtils.make(ElasticBlocks, 'elasticFilterBlock', {
            field,
            value,
            boost,
            boolQuery: boolTypeName,
            filterOp: esRangeOperatorMap[k],
          }, true),
        );
      }
    }
    return blocks;
  }

  private static IsMatchClauseFilter(matchCard: Block): boolean
  {
    const blockValue = new ESCardParser(matchCard);
    const field = this.GetFilterClauseField(blockValue.getValueInfo());
    if (field === null)
    {
      return false;
    }
    const matchValue = blockValue.getValueInfo().objectChildren[field].propertyValue;
    if (matchValue.clause.type === 'match_settings')
    {
      return false;
    }
    return true;
  }

  /**
   *
   * @param {ESPropertyInfo} valueInfo: term or range
   * @return elasticFilterBlocks generated from the filter clause
   */
  private static MatchClauseToBlocks(boolTypeName, rangeClause: ESPropertyInfo): Block[]
  {
    // term : {field : term_value}
    // term_value: object (term_settings), null ('null'), boolean ('boolean'), number ('number'), string: 'string)
    // term_settings: { value: 'base', boost: 'boost' }
    const blocks = [];
    const termQuery = rangeClause.propertyValue;
    const field = this.GetFilterClauseField(termQuery);
    if (field === null)
    {
      return blocks;
    }
    const termValue = termQuery.objectChildren[field].propertyValue;
    let blockValue;
    switch (termValue.clause.type)
    {
      case 'null':
        blockValue = String(termValue.value);
        break;
      case 'boolean':
        blockValue = String(termValue.value);
        break;
      case 'number':
        blockValue = String(termValue.value);
        break;
      case 'string':
        blockValue = String(termValue.value);
        break;
      default:
        break;
    }

    if (blockValue !== undefined)
    {
      blocks.push(
        BlockUtils.make(ElasticBlocks, 'elasticFilterBlock', {
          field,
          value: blockValue,
          boolQuery: boolTypeName,
          filterOp: '≈',
        }, true),
      );
    }
    return blocks;
  }

  private static IsTermClauseFilter(termCard: Block): boolean
  {
    const blockValue = new ESCardParser(termCard);
    const field = this.GetFilterClauseField(blockValue.getValueInfo());
    if (field === null)
    {
      return false;
    }
    const termValue = blockValue.getValueInfo().objectChildren[field].propertyValue;
    switch (termValue.clause.type)
    {
      case 'term_settings':
        if (termValue.objectChildren['value'] !== undefined)
        {
          return true;
        } else
        {
          return false;
        }
      case 'null':
        return true;
      case 'boolean':
        return true;
      case 'number':
        return true;
      case 'string':
        return true;
      default:
        TerrainLog.error('The type of ', termValue, ' is unknown');
    }
  }

  /**
   *
   * @param {ESPropertyInfo} termClause "term":term_query
   * @return elasticFilterBlocks generated from the filter clause
   */
  private static TermClauseToBlocks(boolTypeName, termClause: ESPropertyInfo): Block[]
  {
    // term : {field : term_value}
    // term_value: object (term_settings), null ('null'), boolean ('boolean'), number ('number'), string: 'string)
    // term_settings: { value: 'base', boost: 'boost' }
    const blocks = [];
    const termQuery = termClause.propertyValue;
    const field = this.GetFilterClauseField(termQuery);
    if (field === null)
    {
      return blocks;
    }
    const termValue = termQuery.objectChildren[field].propertyValue;
    let blockValue;
    let boost = '';
    switch (termValue.clause.type)
    {
      case 'term_settings':
        if (termValue.objectChildren['value'] !== undefined)
        {
          blockValue = String(termValue.value['value']);
          if (termValue.objectChildren['boost'] !== undefined)
          {
            boost = String(termValue.value['boost']);
          }
        }
        break;
      case 'null':
        blockValue = String(termValue.value);
        break;
      case 'boolean':
        blockValue = String(termValue.value);
        break;
      case 'number':
        blockValue = String(termValue.value);
        break;
      case 'string':
        blockValue = String(termValue.value);
        break;
      default:
        break;
    }

    if (blockValue !== undefined)
    {
      blocks.push(
        BlockUtils.make(ElasticBlocks, 'elasticFilterBlock', {
          field,
          value: blockValue,
          boolQuery: boolTypeName,
          filterOp: '=',
          boost,
        }, true),
      );
    }
    return blocks;
  }

  private static IsTermsClauseFilter(termsCard: Block): boolean
  {
    const cardParser = new ESCardParser(termsCard);
    const termsValueInfo = cardParser.getValueInfo();
    const nrFields = termsValueInfo.childrenSize();
    if (nrFields === 0 || nrFields > 2)
    {
      return false;
    }

    let ret = true;

    termsValueInfo.forEachProperty((kv: ESPropertyInfo) =>
    {
      if (kv.propertyValue.clause.type === 'terms_settings')
      {
        ret = false;
      }
    });
    return ret;
  }

  /**
   *
   * @param boolTypeName: [must, must_not, should, filter]
   * @param {ESPropertyInfo}: termClause : {terms: TERMS_QUERY}
   * @returns {Block[]}: a list of elasticFilterBlock
   * @constructor
   */
  private static TermsClauseToBlocks(boolTypeName, termsClause: ESPropertyInfo): Block[]
  {
    // terms: {field : terms_value, boost : boost, _name : string}
    const blocks = [];
    const termsQuery = termsClause.propertyValue;
    const termsQueryKVs = termsQuery.objectChildren;
    let boost = '';
    let field;
    let blockValue;
    for (const k of Object.keys(termsQueryKVs))
    {
      if (k === 'boost')
      {
        boost = String(termsQueryKVs[k].propertyValue.value);
      } else
      {
        console.assert(termsQueryKVs[k].propertyValue.clause.type === 'base[]');
        field = k;
        blockValue = JSON.stringify(termsQueryKVs[k].propertyValue.value);
      }
    }
    if (blockValue !== undefined)
    {
      blocks.push(
        BlockUtils.make(ElasticBlocks, 'elasticFilterBlock', {
          field,
          value: blockValue,
          boolQuery: boolTypeName,
          filterOp: 'in',
          boost,
        }, true),
      );
    }

    return blocks;
  }

  /**
   *
   * @param {string} queryName : must, must_not, filter, should
   * @param {ESValueInfo} valueInfo
   * @returns {Block[]}
   * @constructor
   */
  private static ParseFilterBlockFromValueInfo(boolTypeClause: ESPropertyInfo): Block[]
  {
    const boolTypeName = boolTypeClause.propertyName.value;
    // 'query[]' or 'query'
    const filters = boolTypeClause.propertyValue;
    let queries: ESValueInfo[];
    let blocks = [];
    if (filters.clause.type === 'query[]')
    {
      queries = filters.arrayChildren;
    } else
    {
      console.assert(filters.clause.type === 'query');
      queries = [filters];
    }
    for (const query of queries)
    {
      let newBlocks = [];
      if (query.objectChildren['term'])
      {
        newBlocks = this.TermClauseToBlocks(boolTypeName, query.objectChildren['term']);
      } else if (query.objectChildren['terms'])
      {
        newBlocks = this.TermsClauseToBlocks(boolTypeName, query.objectChildren['terms']);
      }
      else if (query.objectChildren['range'])
      {
        newBlocks = this.RangeClauseToBlocks(boolTypeName, query.objectChildren['range']);
      } else if (query.objectChildren['match'])
      {
        newBlocks = this.MatchClauseToBlocks(boolTypeName, query.objectChildren['match']);
      }
      if (newBlocks.length > 0)
      {
        TerrainLog.debug(boolTypeClause, 'generates blocks ', newBlocks);
        blocks = blocks.concat(newBlocks);
      }
    }
    return blocks;
  }
  // generate matched query cards from filter rows
  private static filterRowToQueryCard(block: Block): Block
  {
    console.assert(block.type === 'elasticFilterBlock', 'Rows of the Elastic filter card must be elasticFilterBlock');
    let queryCard;
    // detect the type of the value string
    let valueType = ':string';
    const valueString = String(block['value']);
    const boost = block['boost'];
    const valueParser = new ESJSONParser(valueString);

    if (valueParser.hasError() === false)
    {
      if (typeof valueParser.getValue() === 'number')
      {
        valueType = ':number';
      }
    }
    const templateField = String(block['field']) + valueType;

    // term
    if (block['filterOp'] === '=')
    {
      if (boost !== '')
      {
        const termSettingField = String(block['field']) + ':term_settings';
        const valueField = 'value' + valueType;
        queryCard = BlockUtils.make(ElasticBlocks,
          'eqlquery',
          {
            template: {
              'term:term_query': {
                [termSettingField]: {
                  [valueField]: valueString,
                  'boost:boost': boost,
                },
              },
            },
          });
      } else
      {
        queryCard = BlockUtils.make(ElasticBlocks,
          'eqlquery',
          {
            template: {
              'term:term_query': {
                [templateField]: valueString,
              },
            },
          });
      }
    } else if (block['filterOp'] === '≈')
    {
      queryCard = BlockUtils.make(ElasticBlocks,
        'eqlquery',
        {
          template: {
            'match:match': {
              [templateField]: valueString,
            },
          },
        });
    } else if (block['filterOp'] === 'in')
    {
      if (boost !== '')
      {
        const valueField = block['field'] + ':base[]';
        queryCard = BlockUtils.make(ElasticBlocks,
          'eqlquery',
          {
            template: {
              'terms:terms_query': {
                [valueField]: JSON.parse(block['value']),
                'boost:boost': boost,
              },
            },
          });
      } else
      {
        const valueField = block['field'] + ':base[]';
        queryCard = BlockUtils.make(ElasticBlocks,
          'eqlquery',
          {
            template: {
              'terms:terms_query': {
                [valueField]: JSON.parse(block['value']),
              },
            },
          });
      }
    } else
    {
      // range
      // match
      const rangeField = String(block['field']) + ':range_value';
      const rangeOp = String(esFilterOperatorsMap[block['filterOp']]) + ':base';
      if (boost !== '')
      {
        queryCard = BlockUtils.make(ElasticBlocks,
          'eqlquery',
          {
            template: {
              'range:range_query': {
                [rangeField]: {
                  [rangeOp]: valueString,
                  'boost:boost': boost,
                },
              },
            },
          });
      } else
      {
        queryCard = BlockUtils.make(ElasticBlocks,
          'eqlquery',
          {
            template: {
              'range:range_query': {
                [rangeField]: {
                  [rangeOp]: valueString,
                },
              },
            },
          });
      }
    }
    return queryCard;
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
  indexFilters: List(),
  typeFilters: List(),
  otherFilters: List(),
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
      return String(c['indexFilters'].size + c['typeFilters'].size + c['otherFilters'].size + c['cards'].size) + ' Filters';
    },
    // this tql is same as tql of other clause cards.
    tql: (block, tqlTranslationFn, tqlConfig) =>
    {
      const json: object = {};
      const mergedBlock = FilterUtils.mergeFilterBlocksAndRows(block);
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
      // updating cached index and type
      if (block['indexFilters'].size > 0)
      {
        const indexField = block['indexFilters'].get(0).value;
        block = block.set('currentIndex', indexField);
      }
      if (block['typeFilters'].size > 0)
      {
        const typeField = block['typeFilters'].get(0).value;
        block = block.set('currentType', typeField);
      }
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
        // display _type filters second, so that 1) type filters are always following the index filters.
        // 2) we can auto-complete the value with type schema options.
        {
          displayType: DisplayType.ROWS,
          key: 'typeFilters',
          english: 'Filter',
          factoryType: 'elasticFilterBlock',
          row:
            {
              inner:
                [
                  {
                    displayType: DisplayType.LABEL,
                    label: 'Type:',
                    key: null,
                  },
                  {
                    displayType: DisplayType.TEXT,
                    key: 'value',
                    getAutoTerms: (schemaState, builderState) =>
                    {
                      return ElasticBlockHelpers.autocompleteMatches(schemaState, builderState, AutocompleteMatchType.Type);
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
                      [
                        'must',
                        'must_not',
                        'should',
                        'filter',
                      ],
                      // Can consider using this, but it includes "minmum_should_match," which
                      //  doesn't make sense in this context
                      // Object.keys(ESInterpreterDefaultConfig.getClause('bool_query')['structure'])
                    ),
                    optionsDisplayName: Immutable.Map<any, string>(
                      {
                        must: 'Must',
                        must_not: 'Must Not',
                        should: 'Should',
                        filter: 'Filter',
                      } as any,
                    ),
                    dropdownTooltips: List([
                      'A result must pass the equation you specify to be included in the final results.',
                      'A result must not pass the equation you specify to be included in the final results.',
                      'A result must pass at least one of the "should" equations you specify to be included in the final results.',
                      'A result must pass the equation you specify to be included in the final results, ' +
                      "but this equation won't be included in calculating the Elastic _score.",
                    ]),
                    dropdownUsesRawValues: true,
                    autoDisabled: true,
                    centerDropdown: true,
                    style: {
                      maxWidth: 125,
                      minWidth: 105,
                      marginRight: 3,
                    },
                  },
                  {
                    displayType: DisplayType.DROPDOWN,
                    key: 'filterOp',
                    options: List(
                      _.keys(esFilterOperatorsMap) as string[],
                      // can consider using this, but it includes 'boost', and uses raw text values
                      // Object.keys(ESInterpreterDefaultConfig.getClause('range_value')['structure'])),
                    ),
                    dropdownTooltips: List(_.values(esFilterOperatorsTooltips)),
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
