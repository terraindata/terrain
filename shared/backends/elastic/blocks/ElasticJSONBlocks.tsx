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

import * as Immutable from 'immutable';
import * as _ from 'underscore';
const { List, Map } = Immutable;
const L = () => List([]);
import BlockUtils from '../../../blocks/BlockUtils';
import CommonBlocks from '../../../blocks/CommonBlocks';
import { Display, DisplayType, firstSecondDisplay, getCardStringDisplay, letVarDisplay, stringValueDisplay, valueDisplay, wrapperDisplay, wrapperSingleChildDisplay } from '../../../blocks/displays/Display';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card, Card, CardString } from '../../../blocks/types/Card';
import { Input, InputType } from '../../../blocks/types/Input';
import CommonElastic from '../syntax/CommonElastic';
const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;

import ScoreBar from '../../../../src/app/builder/components/charts/ScoreBar';
import TransformCard from '../../../../src/app/builder/components/charts/TransformCard';

const transformScoreInputTypes = CommonElastic.acceptsValues;

//  List(['elasticScore', 'elasticTransform']).concat(CommonElastic.acceptsValues).toList();

export const elasticKeyValueToggle = _card({
  key: '',
  value: '',
  valueType: CommonElastic.valueTypesList[0],

  static:
  {
    language: 'elastic',
    tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
    {
      const rawValue = block['value'];
      let value: any;

      switch (block['valueType'])
      {
        case CommonElastic.valueTypes.number:
          value = +rawValue;
          break;
        case CommonElastic.valueTypes.text:
          value = '' + rawValue;
          break;
        case CommonElastic.valueTypes.null:
          value = null;
          break;
        case CommonElastic.valueTypes.bool:
          value = !rawValue || rawValue === 'false' ? false : true;
          break;
        case CommonElastic.valueTypes.array:
          // TODO ELASTIC
          value = tqlTranslationFn(rawValue, tqlConfig);
          break;
        case CommonElastic.valueTypes.object:
          // TODO ELASTIC
          value = tqlTranslationFn(rawValue, tqlConfig);
          break;
      }

      return {
        [block['key']]: value,
      };
    },
    title: 'Property T',
    colors: ['#789', '#abc'],
    preview: '[key]: [value]',

    display:
    {
      displayType: DisplayType.FLEX,
      key: null,

      flex:
      [
        {
          displayType: DisplayType.TEXT,
          key: 'key',
          autoDisabled: true,
        },
        {
          displayType: DisplayType.DROPDOWN,
          key: 'valueType',
          options: Immutable.List(CommonElastic.valueTypesList),
          centerDropdown: true,
          dropdownUsesRawValues: true,
        },
        {
          displayType: DisplayType.CARDTEXT,
          key: 'value',
          top: false,
          showWhenCards: true,
          accepts: CommonElastic.acceptsValues,
        },
      ],

      below:
      {
        displayType: DisplayType.CARDSFORTEXT,
        key: 'value',
        accepts: CommonElastic.acceptsValues,
      },
    },
  },
});

export const elasticValue = _card({
  key: '',
  value: '',
  valueType: CommonElastic.valueTypes[0],

  static: {
    language: 'elastic',
    tql: '"$value"',
    title: 'Value',
    colors: ['#798', '#acb'],
    preview: '[value]',
    display:
    {
      displayType: DisplayType.TEXT,
      key: 'value',
    },
  },
});

export const elasticObject = _wrapperCard({
  language: 'elastic',
  tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
  {
    const obj: object = {};

    block['cards'].map(
      (card) =>
        _.extend(obj, tqlTranslationFn(card, tqlConfig)),
    );

    return obj;
  },
  title: 'Object',
  colors: ['#123', '#456'],
  accepts: List(['elasticKeyValueWrap', 'elasticKeyValueToggle']),
});

export const elasticArray = _wrapperCard({
  title: 'Array',
  language: 'elastic',
  tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
  {
    const arr: any[] = [];

    block['cards'].map(
      (card) =>
        arr.push(tqlTranslationFn(card, tqlConfig)),
    );

    return arr;
  },
  colors: ['#123', '#456'],
  accepts: CommonElastic.acceptsValues,
});

// section: each value type has its own card

export const elasticKeyValueWrap = _card({
  key: '',
  cards: L(),

  static:
  {
    language: 'elastic',
    tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
    {
      return {
        [block['key']]: tqlTranslationFn(block['cards'].get(0), tqlConfig),
      };
    },
    title: 'Property W',
    colors: ['#789', '#abc'],
    preview: (c: Card) =>
    {
      const prefix = c['key'] + ': ';

      if (c['cards'].size)
      {
        const card = c['cards'].get(0);
        return prefix + BlockUtils.getPreview(card);
      }
      return prefix + 'Nothing';
    },

    accepts: CommonElastic.acceptsValues,
    display:
    [
      {
        displayType: DisplayType.TEXT,
        key: 'key',
        autoDisabled: true,
      },

      {
        displayType: DisplayType.CARDS,
        key: 'cards',
        // className: 'nested-cards-content',
        singleChild: true,
        accepts: CommonElastic.acceptsValues,
      },
    ],
  },
});

export const elasticText = _valueCard({
  language: 'elastic',
  title: 'Text',
  colors: ['#798', '#acb'],
  defaultValue: '',
  tql: (block: Block) => block['value'],
  string: true,
});

export const elasticNumber = _valueCard({
  language: 'elastic',
  title: 'Number',
  colors: ['#798', '#acb'],
  defaultValue: 0,
  tql: (block: Block) => + block['value'] as any,
  string: true,
});

export const elasticBool = _card({
  value: 1,

  static:
  {
    language: 'elastic',
    title: 'True / False',
    preview: (card: Card) => card['value'] ? 'True' : 'False',
    tql: (block: Block) => !!block['value'] as any,
    colors: ['#798', '#acb'],
    display:
    {
      displayType: DisplayType.DROPDOWN,
      options: Immutable.List(['false', 'true']),
      key: 'value',
    },
  },
});

export const elasticNull = _card({
  static:
  {
    language: 'elastic',
    title: 'Null',
    preview: 'Null',
    tql: () => null,
    colors: ['#798', '#acb'],
    display: [],
  },
});

export const elasticWeight = _block(
  {
    key: '',
    // ranges: [],
    // outputs: [],
    weight: 1,
    static: {
      language: 'elastic',
      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        return {
          weight: block['weight'],
          a: 0,
          b: 1,
          numerators: [[block['key']['input'], 1]],
          denominators: [],
          ranges: block['key']['scorePoints'].map((scorePoint) => scorePoint.value),
          outputs: block['key']['scorePoints'].map((scorePoint) => scorePoint.score),
        };
      },
      init: () =>
      {
        return {
          key: BlockUtils.make(elasticTransform),
        };
      },
      removeOnCardRemove: true,
    },
  });

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

      init: () =>
        {
          return {
            weights: List([
              BlockUtils.make(elasticWeight),
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
                accepts: List(['elasticScore', 'elasticTransform']),
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

export const elasticTransform = _card(
  {
    input: '',
    scorePoints: List([]),

    domain: List([0, 100]),
    hasCustomDomain: false, // has the user set a custom domain

    static: {
      language: 'elastic',
      // manualEntry: ManualConfig.cards['transform'],
      colors: ['#4b979a', '#aef3f6'],
      title: 'Transform',
      preview: (card: any) =>
      {
        if (card.input._isCard)
        {
          return '' + BlockUtils.getPreview(card.input);
        }
        return '' + card.input;
      },
      display: [
        {
          displayType: DisplayType.CARDTEXT,
          // help: ManualConfig.help['input'],
          key: 'input',
          placeholder: 'Input field',
          accepts: transformScoreInputTypes,
          showWhenCards: true,
        },
        {
          displayType: DisplayType.CARDSFORTEXT,
          key: 'input',
          accepts: transformScoreInputTypes,
        },
        {
          displayType: DisplayType.COMPONENT,
          component: TransformCard,
          requiresBuilderState: true,
          key: null,
          // help: ManualConfig.help['scorePoints'],
        },
      ],

      init: () => (
        {
          scorePoints: List([
            BlockUtils.make(scorePoint, {
              id: 'point0',
              value: 2,
              score: 0.2,
            }),
            BlockUtils.make(scorePoint, {
              id: 'point1',
              value: 15,
              score: 0.5,
            }),
          ]),
        }
      ),

      metaFields: ['domain', 'hasCustomDomain'],
    },
  });
