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

import { List, Map } from 'immutable';

import { Colors, getCardColors } from '../../../app/colors/Colors';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { DisplayType } from '../../../blocks/displays/Display';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card } from '../../../blocks/types/Card';

import TransformCard from '../../../app/builder/components/charts/TransformCard';
import { AutocompleteMatchType, ElasticBlockHelpers } from './ElasticBlockHelpers';
import TransformUtil from '../../../app/util/TransformUtil';

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
    dataDomain: List(['0', '100']),
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
              optionsDisplayName: Map({
                linear: 'freeform', logarithmic: 'logarithmic',
                exponential: 'exponential', normal: 'bell-curve', sigmoid: 's-curve',
              }),
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
        if (block['scorePoints'].size <= 1)
        {
          return {
            a: 0,
            b: 1,
            numerators: [[block['input'], 1]],
            denominators: [],
            ranges: block['scorePoints'].map((scorePt) => scorePt.value).toArray(),
            outputs: block['scorePoints'].map((scorePt) => scorePt.score).toArray(),
          };
        }
        let ranges = [];
        let outputs = [];
        const min = parseFloat(block['dataDomain'].get(0));
        const max = parseFloat(block['dataDomain'].get(1));
        let x1;
        let x2;
        let y1;
        let y2;
        let stepSize;
        if (block['scorePoints'].size > 1)
        {
          x1 = block['scorePoints'].get(0).value;
          x2 = block['scorePoints'].get(1).value;
          y1 = block['scorePoints'].get(0).score;
          y2 = block['scorePoints'].get(1).score;
          stepSize = Math.abs(x2 - x1) * (1 / 31);
        }

        switch (block['mode'])
        {
          case 'normal':
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
            stepSize = Math.abs(max - min) / 31;
            for (let i = min; i <= max; i += stepSize)
            {
              const y = normal(i, average, stdDev) * scaleFactor;
              ranges.push(i);
              outputs.push(y);
            }
            break;
          case 'exponential':
            const {xData, yData} = TransformUtil.getExponentialData(31, block['scorePoints'].toJS());
            ranges = xData;
            outputs = yData;
            break;
          case 'logarithmic':
            if (y1 > y2)
            {
              const yMax = y1 + 0.01;
              const k = (Math.log(yMax - y1) - Math.log(yMax - y2)) / (x1 - x2);
              const b = x2 - Math.log(yMax - y2) / k;
              for (let i = x1; i <= x2; i += stepSize)
              {
                const y = -1 * Math.exp(k * (i - b)) + yMax;
                ranges.push(i);
                outputs.push(y);
              }
            }
            else
            {
              const a = (y1 - y2 * (Math.log(x1) / Math.log(x2))) / (1 - Math.log(x1) / Math.log(x2));
              const b = (y2 - a) / Math.log(x2);
              for (let i = x1; i <= x2; i += stepSize)
              {
                const y = a + b * Math.log(i);
                ranges.push(i);
                outputs.push(y);
              }
            }
            break;
          case 'sigmoid':
            if (block['scorePoints'].size !== 4)
            {
              return {
                a: 0,
                b: 1,
                numerators: [[block['input'], 1]],
                denominators: [],
                ranges: block['scorePoints'].map((scorePt) => scorePt.value).toArray(),
                outputs: block['scorePoints'].map((scorePt) => scorePt.score).toArray(),
              };
            }
            const offset = y1;
            const xVal = x2;
            const yVal = y2;
            const x0 = block['scorePoints'].get(2).value;
            const L = block['scorePoints'].get(3).score - block['scorePoints'].get(0).score;
            const exp = (-1 * Math.log(L / (yVal - offset) - 1)) / (xVal - x0);
            stepSize = Math.abs(max - min) / 31;
            for (let i = min; i < max; i += stepSize)
            {
              const y = L / (1 + Math.exp(-1 * exp * (i - x0))) + offset;
              ranges.push(i);
              outputs.push(y);
            }
            break;

          case 'linear':
          default:
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

      metaFields: ['domain', 'dataDomain', 'hasCustomDomain'],
    },
  });

export default elasticTransform;
