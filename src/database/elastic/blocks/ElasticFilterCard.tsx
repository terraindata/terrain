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

import { Colors, getCardColors } from '../../../app/colors/Colors';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { DisplayType } from '../../../blocks/displays/Display';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card } from '../../../blocks/types/Card';
import { AutocompleteMatchType, ElasticBlockHelpers } from '../../../database/elastic/blocks/ElasticBlockHelpers';

import SpecializedCreateCardTool from 'builder/components/cards/SpecializedCreateCardTool';
import { ESInterpreterDefaultConfig } from '../../../../shared/database/elastic/parser/ESInterpreter';
import { ElasticBlocks } from './ElasticBlocks';
import { ElasticElasticCards } from './ElasticElasticCards';

const esFilterOperatorsMap = {
  '>': 'gt',
  '≥': 'gte',
  '<': 'lt',
  '≤': 'lte',
  '=': 'term',
  '≈': 'match',
};

const esFilterOperatorsTooltips = {
  '>': "The data's field must be greater than your specified valued.",
  '≥': "The data's field must be greater than or equal to your specified valued.",
  '<': "The data's field must be less than your specified valued.",
  '≤': "The data's field must be less than or equal to your specified valued.",
  '=': "The data's field must match your specified value exactly.",
  '≈': "The data's field must contain your specified value.",
};

class FilterUtils
{
  public static BoolQueryCard = ElasticElasticCards['eqlbool_query'];
  public static filterRowToQueryCard(rootBlock: Block, block: Block, blockPath?: KeyPath)
  {
    let queryCard;
    const templateField = String(block['field']) + ':string';

    if (block['filterOp'] === '=')
    {
      queryCard = BlockUtils.make(ElasticBlocks,
        'eqlquery',
        {
          template: {
            'term:term_query': {
              [templateField]: block['value'],
            },
          },
        });
    } else if (block['filterOp'] === '≈')
    {
      // match
      queryCard = BlockUtils.make(ElasticBlocks,
        'eqlquery',
        {
          template: {
            'match:match': {
              [templateField]: block['value'],
            },
          },
        });
    } else
    {
      // range
      // match
      const rangeField = String(block['field']) + ':range_value';
      const rangeOp = String(esFilterOperatorsMap[block['filterOp']]) + ':base';
      queryCard = BlockUtils.make(ElasticBlocks,
        'eqlquery',
        {
          template: {
            'range:range_query': {
              [rangeField]: {
                [rangeOp]: block['value'],
              },
            },
          },
        });
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
        config['boolQuery'] = (extraConfig && extraConfig.boolQuery) || 'must';
        config['filterOp'] = (extraConfig && extraConfig.filterOp) || '=';
        return config;
      },
    },
  });

export const elasticFilter = _card({
  // a short-path for searching the index.
  currentIndex: '',
  // a short-path for searching the type.
  currentType: '',
  indexFilters: List(),
  typeFilters: List(),
  otherFilters: List(),
  filters: List(),
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
    preview: '[filters.length] Filters',
    // this tql is same as tql of other clause cards.
    tql: FilterUtils.BoolQueryCard.static.tql,
    // this is called before parsing/interpreting cards, so we have to update the cards fields.
    /*updateCards: (rootBlock: Block, block: Block, blockPath: KeyPath) =>
    {
      const indexFilters = [];
      const typeFilters = [];
      const otherFilters = [];
      const filterCards = [];
      const mustCards = [];
      const shouldCards = [];
      const mustNotCards = [];
      const allFilters = block['indexFilters'].concat(block['typeFilters']).concat(block['otherFilters']);
      allFilters.map((filterBlock) =>
      {
        const updatedBlock = filterBlock.static.updateCards(rootBlock, filterBlock);
        switch (updatedBlock.field)
        {
          case '_index':

            indexFilters.push(updatedBlock);
            break;
          case '_type':
            typeFilters.push(updatedBlock);
            break;
          default:
            otherFilters.push(updatedBlock);
        }
        switch (updatedBlock.boolQuery)
        {
          case 'must':
            mustCards.push(updatedBlock);
            break;
          case 'must_not':
            mustNotCards.push(updatedBlock);
            break;
          case 'should':
            shouldCards.push(updatedBlock);
            break;
          case 'filter':
            filterCards.push(updatedBlock);
            break;
          default:
            console.log('Unknown block when updating ElasticFilter cards' + String(block.boolQuery));
        }
      });
      block = block.setIn(['cards', 0, 'cards'], Immutable.List(filterCards));
      block = block.setIn(['cards', 1, 'cards'], Immutable.List(mustCards));
      block = block.setIn(['cards', 2, 'cards'], Immutable.List(mustNotCards));
      block = block.setIn(['cards', 3, 'cards'], Immutable.List(shouldCards));
      block = block.set('indexFilters', List(indexFilters));
      if (indexFilters.length === 0)
      {
        block = block.set('currentIndex', '');
      } else
      {
        block = block.set('currentIndex', indexFilters[0].value);
      }
      block = block.set('typeFilters', List(typeFilters));

      if (typeFilters.length === 0)
      {
        block = block.set('currentType', '');
      } else
      {
        block = block.set('currentType', typeFilters[0].value);
      }
      block = block.set('otherFilters', List(otherFilters));
      return block;
    },*/
    // to init the card with a special set of filters, please pass the filters
    // with extraConfig.filters (see ElasticFilterCard.tsx::parseCardFromValueInfo)
    init: (blocksConfig, extraConfig?, skipTemplate?) =>
    {
      //const boolQueryCard = ElasticElasticCards['eqlbool_query'];
      //console.assert(boolQueryCard);
      const config = FilterUtils.BoolQueryCard.static.init(blocksConfig, extraConfig, skipTemplate);
      return config;
      /*const indexFilters = [];
      const typeFilters = [];
      const otherFilters = [];
      const boolCard = BlockUtils.make(blocksConfig,
        'eqlbool_query',
        {
          key: 'bool',
          template: {
            'filter:query[]': null,
            'must:query[]': null,
            'must_not:query[]': null,
            'should:query[]': null,
          },
        });

      const filters = extraConfig.filters;
      if (filters)
      {
        filters.map((block) =>
        {
          switch (block.field)
          {
            case '_index':
              indexFilters.push(block);
              break;
            case '_type':
              typeFilters.push(block);
              break;
            default:
              otherFilters.push(block);
          }
        });
      } else
      {
        const indexBlock = BlockUtils.make(blocksConfig,
          'elasticFilterBlock',
          {
            field: '_index',
            value: '',
            boolQuery: 'filter',
          });

        const typeBlock = BlockUtils.make(blocksConfig,
          'elasticFilterBlock',
          {
            field: '_type',
            value: '',
            boolQuery: 'filter',
          });

        indexFilters.push(indexBlock);
        typeFilters.push(typeBlock);
      }

      return {
        indexFilters: List(indexFilters),
        typeFilters: List(typeFilters),
        otherFilters: List(otherFilters),
        cards: boolCard.cards,
      };*/
    },

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
              getAutoTerms: (schemaState) =>
              {
                return ElasticBlockHelpers.autocompleteMatches(schemaState, AutocompleteMatchType.Index);
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
              getAutoTerms: (schemaState) =>
              {
                return ElasticBlockHelpers.autocompleteMatches(schemaState, AutocompleteMatchType.Type);
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
              getAutoTerms: (schemaState) =>
              {
                return ElasticBlockHelpers.autocompleteMatches(schemaState, AutocompleteMatchType.Field);
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
