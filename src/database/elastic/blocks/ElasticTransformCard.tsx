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

// tslint:disable:restrict-plus-operands max-line-length

import { List } from 'immutable';

import { Colors, getCardColors } from '../../../app/colors/Colors';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { DisplayType } from '../../../blocks/displays/Display';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card } from '../../../blocks/types/Card';

import TransformCard from '../../../app/builder/components/charts/TransformCard';
import { AutocompleteMatchType, ElasticBlockHelpers } from './ElasticBlockHelpers';

export const scorePoint = _block(
  {
    value: 0,
    score: 0,

    static: {
      language: 'elastic',
      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        return [block['value'], block['score']];
      },
    },
  });

export const elasticTransform = _card(
  {
    input: '',
    scorePoints: List([]),

    // make this list<string> since the values passed from BuilderTextBox are string.
    domain: List(['0', '100']),
    hasCustomDomain: false, // has the user set a custom domain

    noTitle: true,
    cannotBeMoved: true,
    mode: 'linear',

    static: {
      language: 'elastic',
      // manualEntry: ManualConfig.cards['transform'],
      colors: getCardColors('score', Colors().builder.cards.inputParameter),
      title: 'Transform',
      preview: (card: any) =>
      {
        let preview = '';
        if (card.input._isCard)
        {
          preview = '' + BlockUtils.getPreview(card.input);
        }
        else
        {
          preview = '' + card.input;
        }

        if (preview.length === 0)
        {
          preview = 'No input set';
        }

        return preview;
      },
      display: [
        {
          displayType: DisplayType.FLEX,
          key: 'transform-flex',
          flex: [
            {
              displayType: DisplayType.TEXT,
              // help: ManualConfig.help['input'],
              key: 'input',
              placeholder: 'Input field',
              showWhenCards: true,
              getAutoTerms: (schemaState): List<string> =>
              {
                return ElasticBlockHelpers.autocompleteMatches(schemaState, AutocompleteMatchType.Transform);
              },
              style: {
                marginLeft: -16,
                width: '121%',
              },
            },
            {
              displayType: DisplayType.DROPDOWN,
              options: List(['linear', 'logarithmic', 'exponential', 'normal', 'sigmoid']),
              key: 'mode',
              style: {
                width: '50%',
              },
            },
          ],
        },
        // TODO, in the future, if we allow complicated formulas inside
        //  transforms, then we can change this back to a cards view
        // {
        //   displayType: DisplayType.CARDSFORTEXT,
        //   key: 'input',
        //   accepts: transformScoreInputTypes,
        // },
        {
          displayType: DisplayType.COMPONENT,
          component: TransformCard,
          requiresBuilderState: true,
          key: null,
          // help: ManualConfig.help['scorePoints'],
        },
      ],

      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        let ranges = [];
        let outputs = [];
        const min = parseFloat(block['domain'].get(0));
        const max = parseFloat(block['domain'].get(1));
        const x1 = block['scorePoints'].get(0).value;
        const x2 = block['scorePoints'].get(1).value;
        const y1 = block['scorePoints'].get(0).score;
        const y2 = block['scorePoints'].get(1).score;

        if (block['mode'] === 'normal')
        {
          const NORMAL_CONSTANT = 1 / Math.sqrt(2 * Math.PI);
          const normal = (x, avg, std) =>
          {
            x = (x - avg) / std;
            return NORMAL_CONSTANT * Math.exp(-.5 * x * x) / std;
          };
          const average = block['scorePoints'].get(1).value;
          const stdDev = Math.abs(average - block['scorePoints'].get(0).value);
          const maxY = normal(average, average, stdDev);
          const scaleFactor = block['scorePoints'].get(1).score / maxY;
          const stepSize = Math.abs(max - min) / 31;
          for (let i = min; i <= max; i += stepSize)
          {
            const y = normal(i, average, stdDev) * scaleFactor;
            ranges.push(i);
            outputs.push(y);
          }
        }
        else if (block['mode'] === 'exponential')
        {
          const exponential = (x, l, a) =>
          {
            return a * Math.exp(-1 * l * x);
          };
          const lambda = (Math.log(y2) / x1 - Math.log(y1) / x1) / (1 - x2 / x1);
          const A = y2 / Math.exp(-1 * lambda * x2);
          const stepSize = (x2 - x1) * (1 / 100);
          for (let i = x1; i < x2; i += stepSize)
          {
            const y = exponential(i, lambda, A);
            ranges.push(i);
            outputs.push(y);
          }
        }
        else
        {
          ranges = block['scorePoints'].map((scorePt) => scorePt.value).toArray();
          outputs = block['scorePoints'].map((scorePt) => scorePt.score).toArray();
        }
        return {
          a: 0,
          b: 1,
          numerators: [[block['input'], 1]],
          denominators: [],
          ranges,
          outputs,
        };
      },

      // init: (blocksConfig) => (
      //   {
      //     scorePoints: List([]),
      //   }
      // ),

      metaFields: ['domain', 'hasCustomDomain'],
    },
  });

export default elasticTransform;
