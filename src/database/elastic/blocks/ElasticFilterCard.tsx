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

// tslint:disable:restrict-plus-operands

import * as Immutable from 'immutable';
import { List, Map } from 'immutable';
import * as _ from 'lodash';

import { Colors, getCardColors } from '../../../app/common/Colors';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { DisplayType } from '../../../blocks/displays/Display';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card } from '../../../blocks/types/Card';
import { AutocompleteMatchType, ElasticBlockHelpers } from '../../../database/elastic/blocks/ElasticBlockHelpers';

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

export const elasticFilterBlock = _block(
  {
    field: '',
    value: undefined,
    boolQuery: 'must',
    filterOp: '=',

    static: {
      language: 'elastic',
      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        let value: any;
        try
        {
          value = JSON.parse(block['value']);
        }
        catch (e)
        {
          value = block['value'];
        }

        // term query
        if (block['filterOp'] === '=')
        {
          return {
            [block['boolQuery']]: {
              term: {
                [block['field']]: value,
              },
            },
          };
        }
        else if (block['filterOp'] === '≈')
        {
          return {
            [block['boolQuery']]: {
              match: {
                [block['field']]: value,
              },
            },
          };
        }
        else
        {
          // range query
          const rangeOp = esFilterOperatorsMap[block['filterOp']];
          if (rangeOp === undefined)
          {
            throw new Error('Unspecified range operation for: ' + block['filterOp']);
          }

          return {
            [block['boolQuery']]: {
              range: {
                [block['field']]: {
                  [rangeOp]: value,
                },
              },
            },
          };
        }

      },
      removeOnCardRemove: true,
    },
  });

export const elasticFilter = _card({
  filters: List(),
  key: 'bool',

  static: {
    language: 'elastic',
    title: 'Filter',
    description: 'Terrain\'s custom card for filtering results in a human-readable way.',
    colors: getCardColors('filter', Colors().builder.cards.structureClause),
    preview: '[filters.length] Filters',

    tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
    {
      const filterObj = {};

      const filters = block['filters'].map(
        (filterBlock) =>
        {
          const f = tqlTranslationFn(filterBlock, tqlConfig);
          _.map(f as any, (v, k) =>
          {
            if (filterObj[k] === undefined)
            {
              filterObj[k] = [v];
            }
            else
            {
              filterObj[k].push(v);
            }
          });
        });
      return filterObj;
    },

    init: (blocksConfig) =>
    {
      return {
        filters: List([
          BlockUtils.make(blocksConfig, 'elasticFilterBlock'),
        ]),
      };
    },

    display:
    [
      {
        displayType: DisplayType.ROWS,
        key: 'filters',
        english: 'Filter',
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
    ],
  },
});

export default elasticFilter;
