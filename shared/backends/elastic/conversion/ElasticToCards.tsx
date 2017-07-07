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

import { List, Map } from 'immutable';
import * as _ from 'underscore';

import AjaxM1 from '../../../../src/app/util/AjaxM1'; // TODO change / remove
import Query from '../../../items/types/Query';
import * as CommonElastic from '../syntax/CommonElastic';

import * as BlockUtils from '../../../blocks/BlockUtils';
import { Block } from '../../../blocks/types/Block';
import { Card, Cards, CardString } from '../../../blocks/types/Card';
import Blocks from '../blocks/ElasticBlocks';

import ESValueInfo from '../parser/ESValueInfo';

const { make } = BlockUtils;

export default function ElasticToCards(
  query: Query,
  queryReady: (query: Query) => void,
): Query
{
  if (query.parseTree === null || query.parseTree.hasError())
  {
    // TODO: we may want to show some error messages on the cards.
    return query
      .set('cardsAndCodeInSync', false);
  } else
  {
    try
    {
      // let cards = parseMagicObject(query.parseTree.parser.getValue());
      const rootValueInfo = query.parseTree.parser.getValueInfo();
      let cards = List([ parseCardFromValueInfo(rootValueInfo) ]);
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
}

const parseCardFromValueInfo = (valueInfo: ESValueInfo): Card =>
{
  if (!valueInfo)
  {
    return BlockUtils.make(Blocks['eqlnull']);
  }
  
  let valueMap: { value?: any, cards?: List<Card>} = {};
  
  const clauseCardType = 'eql' + valueInfo.clause.type;
  
  if (typeof valueInfo.value !== 'object')
  {
    valueMap.value = valueInfo.value;
  }
  
  if (valueInfo.arrayChildren && valueInfo.arrayChildren.length)
  {
    valueMap.cards = List(valueInfo.arrayChildren.map(parseCardFromValueInfo));
  }
  
  if (valueInfo.objectChildren && _.size(valueInfo.objectChildren))
  {
    if (valueMap.cards)
    {
      console.log('Error with: ', valueInfo);
      throw new Error('Found both arrayChildren and objectChildren in a ValueInfo');
    }
    
    valueMap.cards = List(_.map(valueInfo.objectChildren,
      (propertyInfo, key: string) =>
      {
        let card = parseCardFromValueInfo(propertyInfo.propertyValue);
        card = card.set('key', key);
        return card;
      }
    ));
  }
  
  return BlockUtils.make(Blocks[clauseCardType], valueMap);
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
          cards: List([
            parseValueSingleCard(value),
          ]),
        },
      );
    },
  );

  return List(arr);
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
    scorePoints: List(scorePoints),
  });

  return make(Blocks.elasticWeight, {
    key: card,
    weight: obj['weight'],
  });
};

const parseArrayWrap = (arr: any[]): Cards =>
{
  return List(arr.map(parseValueSingleCard));
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
      values: List(values),
    },
  );
};

const parseMagicObject = (obj: object): Cards =>
{
  if (obj === {} || obj === null)
  {
    return List([
      make(Blocks.elasticMagicValue, {
        value: obj,
      }),
    ],
    );
  }

  if (isScoreCard(obj))
  {
    return List([
      make(
        Blocks.elasticScore,
        {
          weights: List(obj['script']['params']['factors'].map(parseElasticWeightBlock)),
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
      values: List(values),
    },
  );

  return List([magicCard]);
};
