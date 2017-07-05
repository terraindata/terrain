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
import List = Immutable.List;
import Map = Immutable.Map;

import AjaxM1 from '../../../../src/app/util/AjaxM1'; // TODO change / remove
import Query from '../../../items/types/Query';
import * as CommonElastic from '../syntax/CommonElastic';

import * as BlockUtils from '../../../blocks/BlockUtils';
import { Block } from '../../../blocks/types/Block';
import { Card, Cards, CardString } from '../../../blocks/types/Card';
import Blocks from '../blocks/ElasticBlocks';

const { make } = BlockUtils;

export default function ElasticToCards(
  query: Query,
  queryReady: (query: Query) => void,
): Query
{
  try
  {
    const obj = JSON.parse(query.tql);
    let cards = parseMagicObject(obj);
    cards = BlockUtils.reconcileCards(query.cards, cards);
    return query
      .set('cards', cards)
      .set('cardsAndCodeInSync', true);
  }
  catch (e)
  {
    return query
      .set('cardsAndCodeInSync', false);
  }
}

const isScoreCard = (obj: object): boolean =>
{
  return obj.hasOwnProperty('script')
    && obj['script'].hasOwnProperty('stored')
    && obj['script'].hasOwnProperty('params')
    && obj['script']['stored'] === 'terrain_PWLScore'
    && obj['script']['params'].hasOwnProperty('factors')
    && Array.isArray(obj['script']['params']['factors']);
};

const parseObjectWrap = (obj: object): Cards =>
{
  const arr: Card[] = _.map(obj,
    (value: any, key: string) =>
    {
      return make(
        Blocks.elasticKeyValueWrap,
        {
          key,
          cards: Immutable.List([
            parseValueSingleCard(value),
          ]),
        },
      );
    },
  );

  return Immutable.List(arr);
};

const parseElasticWeightBlock = (obj: object): Block =>
{
  const scorePoints = [];
  for (let i = 0; i < obj['ranges'].length; ++i)
  {
    scorePoints.push(
      make(Blocks.scorePoint, {
        value: obj['ranges'][i],
        score: obj['outputs'][i],
      }));
  }

  const card = make(Blocks.elasticTransform, {
    input: obj['numerators'][0][0],
    scorePoints: Immutable.List(scorePoints),
  });

  return make(Blocks.elasticWeight, {
    key: card,
    weight: obj['weight'],
  });
};

const parseArrayWrap = (arr: any[]): Cards =>
{
  return Immutable.List(arr.map(parseValueSingleCard));
};

const parseValueSingleCard = (value: any): Card =>
{
  switch (typeof value)
  {
    case 'string':
      return make(Blocks.elasticText, {
        value,
      });
    case 'number':
      return make(Blocks.elasticNumber, {
        value,
      });
    case 'boolean':
      return make(Blocks.elasticBool, {
        value: value ? 1 : 0,
      });
    case 'object':
      if (value === null)
      {
        return make(Blocks.elasticNull);
      }
      else if (Array.isArray(value))
      {
        return make(
          Blocks.elasticArray,
          {
            cards: parseArrayWrap(value),
          },
        );
      }
      else
      {
        // value is an object
        return make(
          Blocks.elasticObject,
          {
            cards: parseObjectWrap(value),
          },
        );
      }
    default:
      throw new Error('Elastic Parsing: Unsupported value: ' + value);
  }
};

const parseMagicArray = (arr: any[]): Card =>
{
  const values: Card[] = _.map(arr,
    (value: any) =>
    {
      if (Array.isArray(value) && (value !== []))
      {
        value = parseMagicArray(value);
      }
      else if (typeof value === 'object' && (value !== null || value !== {}))
      {
        value = parseMagicObject(value).first();
      }
      else
      {
        value = CommonElastic.parseESValue(value);
      }

      return make(Blocks.elasticMagicListItem, {
        value,
      });
    },
  );

  return make(
    Blocks.elasticMagicList,
    {
      values: Immutable.List(values),
    },
  );
};

const parseMagicObject = (obj: object): Cards =>
{
  if (obj === {} || obj === null)
  {
    return Immutable.List([
      make(Blocks.elasticMagicValue, {
        value: obj,
      }),
    ],
    );
  }

  if (isScoreCard(obj))
  {
    return Immutable.List([
      make(
        Blocks.elasticScore,
        {
          weights: Immutable.List(obj['script']['params']['factors'].map(parseElasticWeightBlock)),
        }),
    ]);
  }

  const values: Card[] = _.map(obj,
    (value: any, key: string) =>
    {
      if (value === null || value === {})
      {
        value = JSON.stringify(value);
      }
      else if (Array.isArray(value) && (value !== []))
      {
        value = parseMagicArray(value);
      }
      else if (typeof value === 'object' && (value !== null || value !== {}))
      {
        value = parseMagicObject(value).first();
      }
      else
      {
        value = CommonElastic.parseESValue(value);
      }

      return make(Blocks.elasticMagicValue, {
        key,
        value,
      });
    },
  );

  const magicCard = make(
    Blocks.elasticMagicCard,
    {
      values: Immutable.List(values),
    },
  );

  return Immutable.List([magicCard]);
};
