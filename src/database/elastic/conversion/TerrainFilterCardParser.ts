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

// Insert query blocks generated from the filter rows to a card
// Please take care the order when pushing rows to cards
// [Row1, Row2, ... block's child1, child2...]
import * as Immutable from 'immutable';
import { List } from 'immutable';
import * as TerrainLog from 'loglevel';
import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';
import ESJSONType from '../../../../shared/database/elastic/parser/ESJSONType';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { Block } from '../../../blocks/types/Block';
import { ElasticBlocks } from '../blocks/ElasticBlocks';
import { FilterUtils } from '../blocks/ElasticFilterCard';
import ESCardParser from './ESCardParser';

// utilities of translating a Terrain filter card to an Elastic bool card
export class TerrainFilterCardParser
{
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
    const filterRows = block['indexFilters'].concat(block['otherFilters']);
    const filterRowMap = { filter: [], filter_not: [], must: [], must_not: [], should: [], should_not: [] };
    filterRows.map((row: Block) =>
    {
      filterRowMap[row.boolQuery].push(row);
    });
    filterRowMap.filter = filterRowMap.filter.concat(filterRowMap.filter_not);
    filterRowMap.should = filterRowMap.should.concat(filterRowMap.should_not);
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
          opCard = opCard.set('cards', this.insertRowsToBlock(opCard, filterRowMap[boolOp]));
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
            opCard = opCard.set('cards', this.insertRowsToBlock(opCard, filterRowMap[boolOp]));
            block = block.setIn(opValueInfo.cardPath, opCard);
          } else
          {
            console.assert(opValueInfo.card.type === 'eqlquery[]');
            let opCard = opValueInfo.card;
            opCard = opCard.set('cards', this.insertRowsToBlock(opCard, filterRowMap[boolOp]));
            block = block.setIn(opValueInfo.cardPath, opCard);
          }
        }
      }
    }
    return block;
  }

  private static GetTemplateTypeOfValueString(valueString: string, defaultType: string = null)
  {
    const valueParser = new ESJSONParser(valueString);
    if (valueParser.hasError() === false)
    {
      // number has a higher priority
      switch (valueParser.getValueInfo().jsonType)
      {
        case ESJSONType.number:
          return ':number';
        case ESJSONType.boolean:
          return ':boolean';
        default:
          TerrainLog.warn('valueType is neither a number nor a string, but a ' + valueParser.getValueInfo().jsonType);
          return defaultType;
      }
    }
    return defaultType;
  }

  private static ExistsClauseBlockToCard(block: Block): Block
  {
    const boost = block['boost'];
    const valueString = String(block['field']);
    let queryCard;
    if (boost !== '')
    {
      queryCard = BlockUtils.make(ElasticBlocks,
        'eqlquery',
        {
          template: {
            'exists:exists_query': {
              'field:field': valueString,
              'boost:boost': boost,
            },
          },
        });
    } else
    {
      queryCard = BlockUtils.make(ElasticBlocks,
        'eqlquery',
        {
          template: {
            'exists:exists_query': {
              'field:field': valueString,
            },
          },
        });
    }
    return queryCard;
  }

  private static RangeClauseBlockToCard(block: Block): Block
  {
    let queryCard;
    const boost = block['boost'];
    const valueString = String(block['value']);
    const valueType = this.GetTemplateTypeOfValueString(valueString, ':string');
    // range
    // match
    const rangeField = String(block['field']) + ':range_value';
    const rangeOp = String(FilterUtils.esFilterOperatorsMap[block['filterOp']]) + ':base';
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
    return queryCard;
  }

  private static MatchClauseBlockToCard(block: Block): Block
  {
    let queryCard;
    const boost = block['boost'];
    const valueString = String(block['value']);
    const valueType = this.GetTemplateTypeOfValueString(valueString, ':string');
    const templateField = String(block['field']) + valueType;

    if (boost !== '')
    {
      const matchSettingField = String(block['field']) + ':match_settings';
      queryCard = BlockUtils.make(ElasticBlocks,
        'eqlquery',
        {
          template: {
            'match:match': {
              [matchSettingField]: {
                'query:string': valueString,
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
            'match:match': {
              [templateField]: valueString,
            },
          },
        });
    }
    return queryCard;
  }

  private static TermClauseBlockToCard(block: Block): Block
  {
    const boost = block['boost'];
    const valueString = String(block['value']);
    const valueType = this.GetTemplateTypeOfValueString(valueString, ':string');
    let queryCard;
    const templateField = String(block['field']) + valueType;
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
          key: 'term',
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
    return queryCard;
  }

  private static TermsClauseBlockToCard(block: Block): Block
  {
    let queryCard;
    const boost = block['boost'];
    const valueParser = new ESJSONParser(block['value']);
    let cardValue;
    if (valueParser.hasError() === false)
    {
      cardValue = valueParser.getValueInfo().value;
    } else
    {
      cardValue = String(block['value']);
    }

    if (boost !== '')
    {
      const valueField = block['field'] + ':base[]';
      queryCard = BlockUtils.make(ElasticBlocks,
        'eqlquery',
        {
          template: {
            'terms:terms_query': {
              [valueField]: cardValue,
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
              [valueField]: cardValue,
            },
          },
        });
    }
    return queryCard;
  }

  // generate matched query cards from filter rows
  private static filterRowToQueryCard(block: Block): Block
  {
    console.assert(block.type === 'elasticFilterBlock', 'Rows of the Elastic filter card must be elasticFilterBlock');
    let queryCard;

    switch (block['filterOp'])
    {
      case '=':
        queryCard = this.TermClauseBlockToCard(block);
        break;
      case '≈':
        queryCard = this.MatchClauseBlockToCard(block);
        break;
      case 'in':
        queryCard = this.TermsClauseBlockToCard(block);
        break;
      case 'exists':
        queryCard = this.ExistsClauseBlockToCard(block);
        break;
      case '>':
      case '<':
      case '≥':
      case '≤':
        queryCard = this.RangeClauseBlockToCard(block);
        break;
      default:
        TerrainLog.error('Unknown filterOp ' + block['filterOp']);
    }

    // we have to put the queryCard in a bool query  bool : { must_not : queryCard}
    if (block.boolQuery === 'filter_not' || block.boolQuery === 'should_not')
    {
      let boolCard = BlockUtils.make(ElasticBlocks, 'eqlquery',
        {
          template: {
            'bool:bool_query': {},
          },
          key: 'bool',
          doNotCustom: true,
        });
      queryCard = queryCard.set('key', 'must_not');
      const mustNotCard = boolCard.cards.get(0);
      boolCard = boolCard.setIn(['cards', 0, 'cards'], List([queryCard]));
      return boolCard;
    }
    return queryCard;
  }
}
