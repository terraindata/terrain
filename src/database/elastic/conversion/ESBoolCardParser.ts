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

// Copyright 2018 Terrain Data, Inc.
// tslint:disable:restrict-plus-operands strict-boolean-expressions max-line-length member-ordering no-console

import { List } from 'immutable';
import * as TerrainLog from 'loglevel';
import ESJSONType from '../../../../shared/database/elastic/parser/ESJSONType';
import ESPropertyInfo from '../../../../shared/database/elastic/parser/ESPropertyInfo';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';
import * as BlockUtils from '../../../blocks/BlockUtils';
import Block, { BlockConfig } from '../../../blocks/types/Block';
import { ElasticBlocks } from '../blocks/ElasticBlocks';
import { ElasticElasticCards } from '../blocks/ElasticElasticCards';
import { FilterUtils } from '../blocks/ElasticFilterCard';
import ESCardParser from './ESCardParser';

// Translate an Elastic bool card to the format of terrain filter card.
export default class ESBoolCardParser
{
  /**
   * Return the field name of the first field key.
   */
  private static GetFilterClauseField(filterValueInfo: ESValueInfo): string
  {
    for (const name of Object.keys(filterValueInfo.objectChildren))
    {
      const kv = filterValueInfo.objectChildren[name];
      if (kv.propertyName.clause.type === 'field')
      {
        return String(kv.propertyName.value);
      }
      if (name === 'field' && kv.propertyValue.clause.type === 'field')
      {
        return 'field';
      }
    }
    return null;
  }

  private filterQueryOp =
    {
      term: { clauseToBlocks: (boolTypeName, clause) => ESBoolCardParser.TermClauseToBlocks(boolTypeName, clause) },
      terms: { clauseToBlocks: (boolTypeName, clause) => ESBoolCardParser.TermsClauseToBlocks(boolTypeName, clause) },
      range: { clauseToBlocks: (boolTypeName, clause) => ESBoolCardParser.RangeClauseToBlocks(boolTypeName, clause) },
      match: { clauseToBlocks: (boolTypeName, clause) => ESBoolCardParser.MatchClauseToBlocks(boolTypeName, clause) },
      exists: { clauseToBlocks: (boolTypeName, clause) => ESBoolCardParser.ExistsClauseToBlocks(boolTypeName, clause) },
      bool: { clauseToBlocks: (boolTypeName, clause) => ESBoolCardParser.BoolClauseToBlocks(boolTypeName, clause) },
    };
  private ElasticFilterClauseOp =
    {
      filter: { filterListName: '' },
      must: {},
      should: {},
      must_not: {},
    };

  public boolCard: Block;
  public cardParser: ESCardParser;
  public cardValueInfo: ESValueInfo;

  public constructor(boolCard: Block)
  {
    if (boolCard.type !== 'elasticFilter')
    {
      TerrainLog.error('ESBoolCardParser accepts elasticFilter card only, but the input is' + boolCard.type);
    }
    this.boolCard = boolCard;
    this.cardParser = new ESCardParser(boolCard);
    this.cardValueInfo = this.cardParser.getValueInfo();
  }

  public queryToFilter(): Block
  {
    if (this.cardParser === undefined || this.cardParser.hasError())
    {
      return this.boolCard;
    }

    const clauseChildren = this.cardValueInfo.objectChildren;

    let filterBlocks = [];
    for (const key of Object.keys(this.ElasticFilterClauseOp))
    {
      if (clauseChildren[key] !== undefined)
      {
        const value = clauseChildren[key].propertyValue;
        if (value.jsonType === ESJSONType.object)
        {
          const blocks = this.extractFilterFromQuery(key, value);
          filterBlocks = filterBlocks.concat(blocks);
          if (value.childrenSize() === 0)
          {
            this.cardParser.deleteChild(this.cardValueInfo, key);
          }
        } else if (value.jsonType === ESJSONType.array)
        {
          value.forEachElement((queryValue: ESValueInfo, index) =>
          {
            const blocks = this.extractFilterFromQuery(key, queryValue);
            filterBlocks = filterBlocks.concat(blocks);
            if (queryValue.childrenSize() === 0)
            {
              // delete this query from the arry
              this.cardParser.deleteChild(value, index);
            }
          });
          value.arrayChildren = value.arrayChildren.filter((e) => e);
          if (value.arrayChildren.length === 0)
          {
            this.cardParser.deleteChild(this.cardValueInfo, key);
          }
        }
      }
    }

    if (this.cardParser.isMutated)
    {
      this.cardParser.updateCard();
      this.boolCard = this.cardValueInfo.card;
    }
    return FilterUtils.reGroupFilterRows(this.boolCard, filterBlocks);
  }

  private extractFilterFromQuery(boolClauseType: string, query: ESValueInfo, deleteCard: boolean = true): Block[]
  {
    let blocks = [];
    for (const filterName of Object.keys(this.filterQueryOp))
    {
      if (query.objectChildren[filterName] !== undefined)
      {
        const clauseBlocks = this.filterQueryOp[filterName].clauseToBlocks(boolClauseType, query.objectChildren[filterName]);
        blocks = blocks.concat(clauseBlocks);
        if (blocks.length > 0)
        {
          if (deleteCard)
          {
            this.cardParser.deleteChild(query, filterName);
          }
        }
      }
    }
    return blocks;
  }

  /**
   * Return the field name of the first field key.
   */
  private static GetBoostValue(filterValueInfo: ESValueInfo): ESValueInfo
  {
    if (filterValueInfo.objectChildren.hasOwnProperty('boost'))
    {
      if (filterValueInfo.objectChildren['boost'].propertyValue.clause.type === 'boost')
      {
        return filterValueInfo.objectChildren['boost'].propertyValue;
      }
    }
    return null;
  }

  /**
   *
   * @param boolTypeName: [must, must_not, should, filter]
   * @param {ESPropertyInfo}: termClause : {terms: TERMS_QUERY}
   * @returns {Block[]}: a list of elasticFilterBlock
   * @constructor
   */
  public static TermsClauseToBlocks(boolTypeName, termsClause: ESPropertyInfo): Block[]
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
   * @param {ESPropertyInfo} valueInfo: term or range
   * @return elasticFilterBlocks generated from the filter clause
   */
  public static RangeClauseToBlocks(boolTypeName, rangeClause: ESPropertyInfo): Block[]
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
      if (FilterUtils.esRangeOperatorMap[k] !== undefined)
      {
        // generating a new block from this range filter
        const value = String(rangeValue.objectChildren[k].propertyValue.value);
        blocks.push(
          BlockUtils.make(ElasticBlocks, 'elasticFilterBlock', {
            field,
            value,
            boost,
            boolQuery: boolTypeName,
            filterOp: FilterUtils.esRangeOperatorMap[k],
          }, true),
        );
      }
    }
    return blocks;
  }

  /**
   *
   * @param {ESPropertyInfo} valueInfo: term or range
   * @return elasticFilterBlocks generated from the filter clause
   */
  public static MatchClauseToBlocks(boolTypeName, rangeClause: ESPropertyInfo): Block[]
  {
    // term : {field : term_value}
    // term_value: object (term_settings), null ('null'), boolean ('boolean'), number ('number'), string: 'string)
    // term_settings: { value: 'base', boost: 'boost' }
    const blocks = [];
    const termQuery = rangeClause.propertyValue;
    const field = this.GetFilterClauseField(termQuery);
    let boost = '';
    if (field === null)
    {
      return blocks;
    }
    const termValue = termQuery.objectChildren[field].propertyValue;
    let blockValue;
    switch (termValue.clause.type)
    {
      case 'match_settings':
        if (termValue.objectChildren['query'] !== undefined)
        {
          blockValue = String(termValue.value['query']);
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
          filterOp: '≈',
          boost,
        }, true),
      );
    }
    return blocks;
  }

  /**
   *
   * @param {ESPropertyInfo} termClause "term":term_query
   * @return elasticFilterBlocks generated from the filter clause
   */
  public static ExistsClauseToBlocks(boolTypeName, existsClause: ESPropertyInfo): Block[]
  {
    // term : {field : term_value}
    // term_value: object (term_settings), null ('null'), boolean ('boolean'), number ('number'), string: 'string)
    // term_settings: { value: 'base', boost: 'boost' }
    const blocks = [];
    const existsQuery = existsClause.propertyValue;
    const field = this.GetFilterClauseField(existsQuery);
    const boostValueInfo = this.GetBoostValue(existsQuery);
    if (field === null)
    {
      return blocks;
    }
    const existsValue = existsQuery.objectChildren[field].propertyValue;
    let blockValue;
    console.assert(existsValue.clause.type === 'field');
    blockValue = String(existsValue.value);

    if (blockValue !== undefined)
    {
      if (boostValueInfo === null)
      {
        blocks.push(
          BlockUtils.make(ElasticBlocks, 'elasticFilterBlock', {
            field: blockValue,
            value: blockValue,
            boolQuery: boolTypeName,
            filterOp: 'exists',
          }, true),
        );
      } else
      {
        blocks.push(
          BlockUtils.make(ElasticBlocks, 'elasticFilterBlock', {
            field: blockValue,
            value: blockValue,
            boolQuery: boolTypeName,
            filterOp: 'exists',
            boost: String(boostValueInfo.value),
          }, true),
        );
      }
    }
    return blocks;
  }

  public static BoolClauseToBlocks(boolTypeName, boolClause: ESPropertyInfo): Block[]
  {
    const boolCard = boolClause.propertyValue.card;
    const boolValueInfo = boolClause.propertyValue;
    if (boolTypeName !== 'should' && boolTypeName !== 'filter')
    {
      return [];
    }

    if (boolValueInfo.childrenSize() > 0)
    {
      return [];
    }
    if (boolCard.otherFilters.size !== 1)
    {
      return [];
    }

    let innerBlock = boolCard.otherFilters.get(0);
    if (innerBlock.boolQuery !== 'must_not')
    {
      return [];
    }
    if (boolTypeName === 'should')
    {
      innerBlock = innerBlock.set('boolQuery', 'should_not');
      return innerBlock;
    } else
    {
      innerBlock = innerBlock.set('boolQuery', 'filter_not');
      return innerBlock;
    }
  }

  /**
   *
   * @param {ESPropertyInfo} termClause "term":term_query
   * @return elasticFilterBlocks generated from the filter clause
   */
  public static TermClauseToBlocks(boolTypeName, termClause: ESPropertyInfo): Block[]
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
}
