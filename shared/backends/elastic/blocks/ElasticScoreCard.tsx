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

import * as Immutable from 'immutable';
import * as _ from 'underscore';
const { List, Map } = Immutable;
const L = () => List([]);
import * as BlockUtils from '../../../blocks/BlockUtils';
import * as CommonBlocks from '../../../blocks/CommonBlocks';
import { Display, DisplayType, firstSecondDisplay, getCardStringDisplay, letVarDisplay, stringValueDisplay, valueDisplay, wrapperDisplay, wrapperSingleChildDisplay } from '../../../blocks/displays/Display';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card, Card, CardString } from '../../../blocks/types/Card';
import { Input, InputType } from '../../../blocks/types/Input';
import * as CommonElastic from '../syntax/CommonElastic';
const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;

import ScoreBar from '../../../../src/app/builder/components/charts/ScoreBar';

import { elasticTransform } from './ElasticTransformCard';

const transformScoreInputTypes = CommonElastic.acceptsValues;

export const elasticScore = _card(
  {
    weights: L(),
    method: '',

    static: {
      language: 'elastic',
      title: 'Score',
      colors: ['#3a91a6', '#a1eafb'],
      preview: '[weights.length] Factors',
      // manualEntry: ManualConfig.cards['score'],
      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        return {
          script: {
            stored: 'terrain_PWLScore',
            params: {
              factors: block['weights'].map((weightBlock) => tqlTranslationFn(weightBlock, tqlConfig)).toArray(),
            },
          },
        };
      },
      accepts: transformScoreInputTypes,
      
      anythingAccepts: true, // TODO change

      init: (blocksConfig) =>
      {
        return {
          weights: List([
            BlockUtils.make(blocksConfig, 'elasticWeight'),
          ]),
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
                // autoDisabled: true,
              },
              {
                displayType: DisplayType.COMPONENT,
                component: ScoreBar,
                requiresBuilderState: true,
                key: 'elasticScore',
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
          weight: parseInt(block['weight'], 10),
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
