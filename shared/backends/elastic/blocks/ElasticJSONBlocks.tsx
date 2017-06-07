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
import CommonBlocks from '../../../blocks/CommonBlocks';
import { Display, DisplayType, firstSecondDisplay, getCardStringDisplay, letVarDisplay, stringValueDisplay, valueDisplay, wrapperDisplay, wrapperSingleChildDisplay } from '../../../blocks/displays/Display';
import { _block, Block, TQLFn } from '../../../blocks/types/Block';
import { _card, Card, CardString } from '../../../blocks/types/Card';
import { Input, InputType } from '../../../blocks/types/Input';
import CommonElastic from '../syntax/CommonElastic';
const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;

export const elasticKeyValue = _card({
  key: '',
  value: '',
  valueType: CommonElastic.valueTypes[0],

  static: {
    language: 'elastic',
    tql: '{ "$key": "$value" }',
    title: 'Key / Value',
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
          options: Immutable.List(CommonElastic.valueTypes),
          centerDropdown: true,
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
  tql: '{ $cards }',
  title: 'Object',
  colors: ['#123', '#456'],
  accepts: List(['elasticKeyValue']),
});

export const elasticArray = _wrapperCard({
  language: 'elastic',
  tql: '[ $cards ]',
  title: 'Array',
  colors: ['#123', '#456'],
  accepts: List(['elasticValue']),
});
