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

// tslint:disable:restrict-plus-operands strict-boolean-expressions no-console

import { List } from 'immutable';
import * as _ from 'lodash';

// TODO change / remove
import Query from '../../../items/types/Query';

import MapUtil from '../../../../src/app/util/MapUtil';
import * as BlockUtils from '../../../blocks/BlockUtils';
import { Block } from '../../../blocks/types/Block';
import { Card, Cards } from '../../../blocks/types/Card';
import Blocks from '../blocks/ElasticBlocks';

import ESClauseType from '../../../../shared/database/elastic/parser/ESClauseType';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';
import { ElasticCustomCards } from '../blocks/ElasticElasticCards';
import ESCardParser from './ESCardParser';

const { make } = BlockUtils;

const UNIT_MAPPINGS = {
  'mi': 'mi',
  'yd': 'yd',
  'ft': 'ft',
  'in': 'in',
  'km': 'km',
  'm': 'm',
  'cm': 'cm',
  'mm': 'mm',
  'nmi': 'nmi',
  'miles': 'mi',
  'meters': 'm',
  'yards': 'yd',
  'feet': 'ft',
  'inch': 'in',
  'inches': 'in',
  'kilometers': 'km',
  'centimeters': 'cm',
  'millimeters': 'mm',
  'NM': 'nmi',
  'nautical miles': 'nmi',
};

export function ElasticValueInfoToCards(rootValueInfo: ESValueInfo, currentCards: Cards)
{
  const rootCard = parseCardFromValueInfo(rootValueInfo).set('key', 'body');
  const cards = BlockUtils.reconcileCards(currentCards, List([rootCard]));
  return ESCardParser.parseAndUpdateCards(cards);
}

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
      const rootValueInfo = query.parseTree.parser.getValueInfo();
      const cards = ElasticValueInfoToCards(rootValueInfo, query.cards);
      return query
        .set('cards', cards)
        .set('cardsAndCodeInSync', true);
    }
    catch (e)
    {
      console.error(e);
      return query
        .set('cardsAndCodeInSync', false);
    }
  }
}

export const parseCardFromValueInfo = (valueInfo: ESValueInfo): Card =>
{
  if (!valueInfo)
  {
    return make(Blocks, 'eqlnull', null, true);
  }

  const valueMap: { value?: any, cards?: List<Card> } = {};
  if (isScoreCard(valueInfo))
  {
    const _scriptValueInfo = valueInfo.objectChildren._script.propertyValue;
    const scriptValueInfo = _scriptValueInfo && _scriptValueInfo.objectChildren.script.propertyValue;

    const weights = [];
    for (const factor of scriptValueInfo.value.params.factors)
    {
      const weight = parseElasticWeightBlock(factor);
      if (weight)
      {
        weights.push(weight);
      }
    }

    let sortOrder;
    if (_scriptValueInfo && _scriptValueInfo.objectChildren.order)
    {
      sortOrder = _scriptValueInfo.objectChildren.order.propertyValue.value;
    }

    let sortMode = 'auto';
    if (_scriptValueInfo && _scriptValueInfo.objectChildren.mode)
    {
      sortMode = _scriptValueInfo.objectChildren.mode.propertyValue.value;
    }

    let sortType;
    if (_scriptValueInfo && _scriptValueInfo.objectChildren.type)
    {
      sortType = _scriptValueInfo.objectChildren.type.propertyValue.value;
    }

    return make(
      Blocks, 'elasticScore',
      {
        weights: List(weights),
        sortOrder,
        sortMode,
        sortType,
      }, true);
  }
  else if (isDistanceCard(valueInfo))
  {
    const distanceAndUnit = valueInfo.objectChildren.distance.propertyValue.value;
    const match = /[a-zA-Z]/.exec(distanceAndUnit);
    const distance = distanceAndUnit.substring(0, match.index).replace(/ /g, '');
    let distanceUnit = UNIT_MAPPINGS[distanceAndUnit.substring(match.index)];
    if (distanceUnit === undefined)
    {
      distanceUnit = 'm';
    }
    let distanceType = 'arc';
    if (valueInfo.objectChildren.distance_type !== undefined)
    {
      distanceType = valueInfo.objectChildren.distance_type.propertyValue.value;
    }

    // Get variable name for field
    let field: string;
    _.keys(valueInfo.objectChildren).forEach((key) =>
    {
      if (key !== 'distance' && key !== 'distance_type')
      {
        field = key;
      }
    });
    const fieldValue = valueInfo.value[field];
    const coords = MapUtil.getCoordinatesFromGeopoint(fieldValue);
    return make(
      Blocks, 'elasticDistance',
      {
        distance,
        distanceType,
        distanceUnit,
        field,
        geopoint: coords,
        map_text: '',
      },
      true);
  }

  let clauseCardType = 'eql' + valueInfo.clause.type;
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
      throw new Error('Found both arrayChildren and objectChildren in a ValueInfo: ' + valueInfo);
    }

    valueMap.cards = List(_.map(valueInfo.objectChildren,
      (propertyInfo, key: string) =>
      {
        let card = parseCardFromValueInfo(propertyInfo.propertyValue);
        card = card.set('key', key);
        return card;
      },
    ));
  }
  if (ElasticCustomCards[clauseCardType])
  {
    clauseCardType = ElasticCustomCards[clauseCardType];
  }
  return make(Blocks, clauseCardType, valueMap, true);
};

function isDistanceCard(valueInfo: ESValueInfo): boolean
{
  const isBool = (valueInfo.clause.clauseType === ESClauseType.ESWildcardStructureClause) &&
    (valueInfo.clause.name === 'geo_distance');
  return isBool;
}

function isFilterCard(valueInfo: ESValueInfo): boolean
{
  console.assert(valueInfo.clause, 'ValueInfo ' + JSON.stringify(valueInfo.value) + ' does not have the clause type');

  const isBool = (valueInfo.clause.clauseType === ESClauseType.ESStructureClause) &&
    (valueInfo.clause.name === 'bool');

  return isBool &&
    _.reduce(valueInfo.value,
      (memo, value: any) =>
      {
        let validFilter = typeof value === 'object';
        if (Array.isArray(value))
        {
          validFilter = _.reduce(value,
            (memo0, value0) => memo0 &&
              (value0['range'] ||
                value0['term'] ||
                value0['match']),
            true);
        }
        else
        {
          validFilter =
            (value['range'] !== undefined) ||
            (value['term'] !== undefined) ||
            (value['match'] !== undefined);
        }
        return memo && validFilter;
      }, true);
}

const esFilterOperatorsMap = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  term: '=',
  match: '≈',
};

function isScoreCard(valueInfo: ESValueInfo): boolean
{
  const isScriptSort = (valueInfo.clause.clauseType === ESClauseType.ESStructureClause) &&
    (valueInfo.clause.name === 'script sort');

  if (isScriptSort)
  {
    const _scriptValueInfo = valueInfo.objectChildren._script.propertyValue;
    const scriptValueInfo = _scriptValueInfo && _scriptValueInfo.objectChildren.script.propertyValue;

    return scriptValueInfo && (scriptValueInfo.clause.clauseType === ESClauseType.ESScriptClause) &&
      (scriptValueInfo.objectChildren.stored.propertyValue.value === 'Terrain.Score.PWL');
  }
  else
  {
    return false;
  }
}

function parseElasticWeightBlock(obj: object): Block
{
  if (obj['weight'] === 0)
  {
    return null;
  }

  const scorePoints = [];
  for (let i = 0; i < obj['ranges'].length; ++i)
  {
    scorePoints.push(
      make(Blocks, 'scorePoint', {
        value: obj['ranges'][i],
        score: obj['outputs'][i],
      }, true));
  }

  const card = make(Blocks, 'elasticTransform', {
    input: obj['numerators'][0][0],
    scorePoints: List(scorePoints),
  }, true);

  return make(Blocks, 'elasticWeight', {
    key: card,
    weight: obj['weight'],
  }, true);
}
