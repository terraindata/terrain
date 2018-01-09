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

// tslint:disable:strict-boolean-expressions interface-name max-line-length

import * as Immutable from 'immutable';
import * as _ from 'lodash';

import * as BlockUtils from './BlockUtils';
import { Display, getCardStringDisplay, stringValueDisplay, valueDisplay, wrapperDisplay, wrapperSingleChildDisplay } from './displays/Display';
import { TQLFn } from './types/Block';
import { _card, Card, Cards } from './types/Card';
const { List, Map } = Immutable;
const L = () => List([]);
const { make } = BlockUtils;

// a card that contains other cards
export interface IWrapperCard extends Card
{
  cards: Cards;
}

// config to define such a card
interface IWrapperCardConfig
{
  colors: string[];
  title: string;
  // manualEntry: IManualEntry;
  getChildTerms?: (card: Card) => List<string>;
  getNeighborTerms?: (card: Card) => List<string>;
  display?: Display | Display[];
  tql: TQLFn;
  tqlGlue?: string;
  accepts: List<string>;
  singleChild?: boolean;
  isAggregate?: boolean;
  language: string;
  init?: () => any;
  className?: string;
}

export const _wrapperCard = (config: IWrapperCardConfig) =>
{
  const display = config.display || (
    config.singleChild ? wrapperSingleChildDisplay : wrapperDisplay
  );

  if (config.className)
  {
    (display as Display).className += ' ' + config.className;
  }

  return _card({
    cards: L(),

    static:
      {
        title: config.title,
        colors: config.colors,
        accepts: config.accepts,
        language: config.language,

        // manualEntry: config.manualEntry,

        getChildTerms: config.getChildTerms,
        getNeighborTerms: config.getNeighborTerms,

        preview: (c: IWrapperCard) =>
        {
          if (c.cards.size)
          {
            const card = c.cards.get(0);
            return BlockUtils.getPreview(card);
          }
          return 'Nothing';
        },

        display,

        tql: config.tql,
        tqlGlue: config.tqlGlue,

        init: config.init,
      },
  });
};

export const _aggregateCard = (config: {
  colors: string[];
  title: string;
  // manualEntry: IManualEntry;
  tql: TQLFn;
  defaultValue?: string;
  language: string;
}) => _card({
  value: '',

  static: {
    language: config.language,
    title: config.title,
    colors: config.colors,
    // manualEntry: config.manualEntry,
    preview: '[value]',
    tql: config.tql,
    isAggregate: true,

    display:
      config.defaultValue === undefined
        ? stringValueDisplay
        : _.extend({},
          stringValueDisplay,
          {
            defaultValue: config.defaultValue,
          },
        )
    ,
  },
});

export const _aggregateNestedCard = (config: {
  colors: string[],
  title: string,
  // manualEntry: IManualEntry,
  tql: TQLFn,
  accepts: List<string>,
  init?: () => any,
  language: string,
}) => _card({
  value: '',

  static: {
    language: config.language,
    title: config.title,
    colors: config.colors,
    // manualEntry: config.manualEntry,
    preview: '[value]',
    tql: config.tql,
    init: config.init,
    isAggregate: true,

    display: getCardStringDisplay({
      accepts: config.accepts,
    }),
  },
});

export const _valueCard = (config: {
  title: string,
  colors: string[],
  // manualEntry: IManualEntry,
  tql: TQLFn,
  defaultValue: number | string,
  language: string,
  string?: boolean,
}) => (
    _card({
      value: config.defaultValue,

      static: {
        language: config.language,
        title: config.title,
        colors: config.colors,
        preview: '[value]',
        display: config.string ? stringValueDisplay : valueDisplay,
        // manualEntry: config.manualEntry,
        tql: config.tql,
      },
    })
  );
