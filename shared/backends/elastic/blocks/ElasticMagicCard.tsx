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
const { List, Map } = Immutable;
const L = () => List([]);
import BlockUtils from '../../../blocks/BlockUtils';
import CommonBlocks from '../../../blocks/CommonBlocks';
import { _block, Block, TQLTranslationFn } from '../../../blocks/types/Block';
import { _card, Card, CardString } from '../../../blocks/types/Card';
import { Input, InputType } from '../../../blocks/types/Input';
import CommonElastic from '../syntax/CommonElastic';
import { Display, DisplayType, firstSecondDisplay, getCardStringDisplay, letVarDisplay, stringValueDisplay, valueDisplay, wrapperDisplay, wrapperSingleChildDisplay } from '../../../blocks/displays/Display';
const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;

const { make } = BlockUtils;

export const elasticMagicValue = _block({
  key: '',
  value: '',
  valueType: CommonElastic.valueTypesList[0],
  static: {
    language: 'elastic',
    removeOnCardRemove: true,
    tql: (block: Block, tqlTranslationFn: TQLTranslationFn, tqlConfig: object) =>
    {
      const rawValue = block['value'];
      let value: any;

      if (rawValue._isBlock)
      {
        value = tqlTranslationFn(rawValue, tqlConfig);
      }
      else
      {
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
          default:
            try
            {
              value = JSON.parse(rawValue);
            }
            catch (e)
            {
              value = rawValue;
            }
        }
      }

      return {
        [block['key']]: value,
      };
    },
  },
});

//           },
//           // {
//           //   displayType: DisplayType.DROPDOWN,
//           //   key: 'valueType',
//           //   options: Immutable.List(CommonElastic.valueTypesList),
//           //   centerDropdown: true,
//           //   dropdownUsesRawValues: true,
//           // },

const accepts = List(['elasticMagicCard']);

export const elasticMagicCard = _card(
  {
    values: List([]),
    method: '',

    static: {
      language: 'elastic',
      title: 'Object',
      colors: ['#3a91a6', '#a1eafb'],
      preview: '[values.length] Values',
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
        english: 'elasticMagicValue',
        factoryType: 'elasticMagicValue',
        provideParentData: true,
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
