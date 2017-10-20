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

import * as _ from 'lodash';

import * as BlockUtils from '../../../blocks/BlockUtils';
import * as CommonBlocks from '../../../blocks/CommonBlocks';
import { _block } from '../../../blocks/types/Block';
import { _card } from '../../../blocks/types/Card';
import { InputType } from '../../../blocks/types/Input';

import { elasticDistance } from './ElasticDistanceCard';
import { ElasticElasticCards } from './ElasticElasticCards';
import { elasticFilter, elasticFilterBlock } from './ElasticFilterCard';
import { elasticScore, elasticWeight } from './ElasticScoreCard';
import { elasticTransform, scorePoint } from './ElasticTransformCard';

const { _wrapperCard, _aggregateCard, _valueCard, _aggregateNestedCard } = CommonBlocks;
const { make } = BlockUtils;

export const ElasticBlocks = _.extend(
  {
    // Score and transform blocks
    elasticScore,
    scorePoint,
    elasticTransform,
    elasticWeight,

    // Geo distance Card
    elasticDistance,

    // Filter Card
    elasticFilterBlock,
    elasticFilter,

    elasticCreating: _card( // a placeholder for when a card is being created
      {
        static:
        {
          language: 'elastic',
          tql: '',
          title: 'New Card',
          colors: ['#777', '#777'],
          preview: '',
          display: null,
          // manualEntry: null,
        },
      }),

    elasticInput: _block(
      {
        key: '',
        value: '',
        inputType: InputType.NUMBER,
        static: {
          language: 'elastic',
          tql: '',
        },
      }),
  },
  ElasticElasticCards,
);

BlockUtils.initBlocks(ElasticBlocks);

// TODO remove
const cards = {};
for (const key in ElasticBlocks)
{
  if (ElasticBlocks[key]._isCard && ElasticBlocks[key].static.manualEntry)
  {
    cards[ElasticBlocks[key].static.manualEntry.name] = key;
  }
}
export const cardList = cards;

export default ElasticBlocks;
