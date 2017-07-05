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

import * as Immutable from 'immutable';
import * as _ from 'underscore';

import * as BlockUtils from '../../../blocks/BlockUtils';
import * as CommonBlocks from '../../../blocks/CommonBlocks';
import { Display, DisplayType } from '../../../blocks/displays/Display';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card, Card, CardString } from '../../../blocks/types/Card';
import { Input, InputType } from '../../../blocks/types/Input';
import * as CommonElastic from '../syntax/CommonElastic';

const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;
const { List, Map } = Immutable;
const { make } = BlockUtils;

function parseValue(rawValue: any, tqlTranslationFn: TQLTranslationFn, tqlConfig: object): any
{
  let value: any;
  if (rawValue._isBlock)
  {
    value = tqlTranslationFn(rawValue, tqlConfig);
  }
  else
  {
    value = CommonElastic.parseESValue(rawValue);
  }
  return value;
}

export const elasticMagicValue = _block({
  key: '',
  value: '',
  static: {
    language: 'elastic',
    removeOnCardRemove: true,
    tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
    {
      return {
        [block['key']]: parseValue(block['value'], tqlTranslationFn, tqlConfig),
      };
    },
  },
});

export const elasticMagicListItem = _block({
  value: '',
  static: {
    language: 'elastic',
    removeOnCardRemove: true,
    tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
    {
      return parseValue(block['value'], tqlTranslationFn, tqlConfig);
    },
  },
});

function previewList(card: Card, depth: number = 0): string
{
  let str: string = '';
  const len: number = Math.min(card['values'].size, 3 - depth);
  for (let i = 0; i < len; ++i)
  {
    const block: Block = card['values'].get(i);
    const value = block['value'];
    if (value._isBlock)
    {
      str += '[' + previewList(value, depth + 1) + ']';
    }
    else
    {
      str += value;
    }

    if (i !== len - 1)
    {
      str += ', ';
    }
    else
    {
      if (i < card['values'].size - 1)
      {
        str += ', ...';
      }
    }
  }
  return str;
}

const accepts = List(['elasticMagicCard', 'elasticMagicList', 'elasticScore']);

export const elasticMagicList = _card(
  {
    values: List([]),

    static: {
      language: 'elastic',
      title: 'List',
      colors: ['#3a91a6', '#a1eafb'],
      preview: previewList,

      accepts,
      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        return block['values'].map((card: Card) =>
          tqlTranslationFn(card, tqlConfig)).toArray();
      },
      init: () => ({
        values: List([
          make(elasticMagicListItem),
        ]),
      }),
      display:
      {
        displayType: DisplayType.ROWS,
        key: 'values',
        english: 'List Entry',
        factoryType: 'elasticMagicListItem',
        provideParentData: false,
        row:
        {
          noDataPadding: true,
          inner:
          [
            {
              displayType: DisplayType.CARDTEXT,
              key: 'value',
              showWhenCards: true,
              autoDisabled: true,
              // options: Immutable.List(CommonElastic.valueTypesList),
              accepts,
            },
          ],
          below:
          {
            displayType: DisplayType.CARDSFORTEXT,
            key: 'value',
          },
        },
      },
    },
  });

export const elasticMagicCard = _card(
  {
    values: List([]),

    static: {
      language: 'elastic',
      title: 'Object',
      colors: ['#3a91a6', '#a1eafb'],
      preview: '[values.size] Values',

      accepts,
      tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
      {
        const elasticObj: object = {};
        block['values'].map(
          (card: Card) =>
          {
            _.extend(elasticObj, tqlTranslationFn(card, tqlConfig));
          },
        );

        return elasticObj;
      },
      init: () => ({
        values: List([
          make(elasticMagicValue),
        ]),
      }),
      display:
      {
        displayType: DisplayType.ROWS,
        key: 'values',
        english: 'Key / Value',
        factoryType: 'elasticMagicValue',
        provideParentData: false,
        row:
        {
          noDataPadding: true,
          inner:
          [
            {
              displayType: DisplayType.TEXT,
              key: 'key',
            },
            {
              displayType: DisplayType.CARDTEXT,
              key: 'value',
              showWhenCards: true,
              autoDisabled: true,
              // options: Immutable.List(CommonElastic.valueTypesList),
              accepts,
            },
          ],
          below:
          {
            displayType: DisplayType.CARDSFORTEXT,
            key: 'value',
          },
        },
      },
    },
  });

export default elasticMagicCard;
