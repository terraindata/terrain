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

// tslint:disable:max-line-length

import {List} from 'immutable';
import * as _ from 'lodash';

import { ESInterpreterDefaultConfig } from '../../../../shared/database/elastic/parser/ESInterpreter';
import CardsScoreBar from '../../../app/builder/components/charts/CardsScoreBar';
import { Colors, getCardColors } from '../../../app/colors/Colors';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { DisplayType } from '../../../blocks/displays/Display';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card } from '../../../blocks/types/Card';

export const elasticScore = _card(
  {
    weights: List(),
    key: 'sort',
    sortOrder: 'desc',
    sortType: 'number',
    sortMode: 'auto',
    cards: List([]),

    static: {
      clause: ESInterpreterDefaultConfig.getClause('script_sort'),
      language: 'elastic',
      title: 'Terrain Score Sort',
      description: 'Sort results using Terrain\'s proprietary scoring method: Transform \
        individual field values using a simple graphing tool, and combine the transformed \
        fields in a weighted sum.',
      colors: getCardColors('score', Colors().builder.cards.structureClause),
      preview: '[weights.length] Factors',
      // manualEntry: ManualConfig.cards['score'],
      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        const factors = block['weights'].map((weightBlock) => tqlTranslationFn(weightBlock, tqlConfig)).toArray();
        const _scriptObj = {
          _script:
            {
              type: block['sortType'],
              order: block['sortOrder'],
              script: {
                stored: 'Terrain.Score.PWL',
                params: {
                  factors,
                },
              },
            },
        };

        if (block['sortMode'] !== 'auto')
        {
          _scriptObj._script['mode'] = block['sortMode'];
        }

        return _scriptObj;
      },

      init: (blocksConfig) =>
      {
        return {
          weights: List([
            BlockUtils.make(blocksConfig, 'elasticWeight'),
          ]),
          sortOrder: 'desc',
          sortType: 'number',
          sortMode: 'auto',
        };
      },
      display:
        [
          {
            displayType: DisplayType.ROWS,
            key: 'weights',
            english: 'weight',
            factoryType: 'elasticWeight',
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
                      accepts: List(['elasticTransform']),
                      showWhenCards: true,
                    },
                    {
                      displayType: DisplayType.NUM,
                      // help: ManualConfig.help['weight'],
                      key: 'weight',
                      placeholder: 'Weight',
                      style: {
                        maxWidth: 120,
                      },
                      // autoDisabled: true,
                    },
                    {
                      displayType: DisplayType.COMPONENT,
                      component: CardsScoreBar,
                      requiresBuilderState: true,
                      key: 'elasticScore',
                      // help: ManualConfig.help['score'],
                    },
                  ],

                below:
                  {
                    displayType: DisplayType.CARDSFORTEXT,
                    key: 'key',
                  },
              },
          },
          // Advanced controls
          {
            displayType: DisplayType.EXPANDABLE,
            key: null,
            expandToggle: {
              displayType: DisplayType.LABEL,
              label: 'Advanced',
              key: null,
              style: {
                display: 'inline',
                marginLeft: 6,
                fontSize: 16,
              },
            },
            expandContent:
              [
                {
                  displayType: DisplayType.FLEX,
                  key: null,
                  style: {
                    paddingBottom: 20,
                    marginTop: 18,
                  },

                  flex:
                    [
                      {
                        displayType: DisplayType.LABEL,
                        key: null,
                        label: 'Order',
                        style: {
                          paddingLeft: 20,
                        },
                      },
                      {
                        displayType: DisplayType.DROPDOWN,
                        key: 'sortOrder',
                        options: List(ESInterpreterDefaultConfig.getClause('sort_order')['values'] as string[]),
                        autoDisabled: true,
                        dropdownUsesRawValues: true,
                        centerDropdown: true,
                        style: {
                          maxWidth: 80,
                        },
                      },
                      {
                        displayType: DisplayType.LABEL,
                        key: null,
                        label: 'Mode',
                        style: {
                          paddingLeft: 20,
                        },
                      },
                      {
                        displayType: DisplayType.DROPDOWN,
                        key: 'sortMode',
                        options: List(ESInterpreterDefaultConfig.getClause('sort_mode')['values'].concat(['auto']) as string[]),
                        dropdownUsesRawValues: true,
                        autoDisabled: true,
                        centerDropdown: true,
                        style: {
                          maxWidth: 80,
                        },
                      },
                      {
                        displayType: DisplayType.LABEL,
                        key: null,
                        label: 'Type',
                        style: {
                          paddingLeft: 20,
                        },
                      },
                      {
                        displayType: DisplayType.DROPDOWN,
                        key: 'sortType',
                        options: List(ESInterpreterDefaultConfig.getClause('field_type')['values'] as string[]),
                        dropdownUsesRawValues: true,
                        autoDisabled: true,
                        centerDropdown: true,
                        style: {
                          maxWidth: 120,
                        },
                      },
                    ],
                },
              ],
          },
        ],
    },
  });

export const elasticWeight = _block(
  {
    key: '',
    weight: 1,

    static: {
      language: 'elastic',
      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        const obj: object = {
          weight: Number(block['weight']),
        };

        _.extend(obj, tqlTranslationFn(block['key'], tqlConfig));
        return obj;
      },
      init: (blocksConfig) =>
      {
        return {
          key: BlockUtils.make(blocksConfig, 'elasticTransform'),
        };
      },
      removeOnCardRemove: true,
    },
  });

export default elasticScore;
