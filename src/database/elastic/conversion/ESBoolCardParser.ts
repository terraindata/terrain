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

// Copyright 2018 Terrain Data, Inc.

import Block, {BlockConfig} from '../../../blocks/types/Block';
import {ElasticElasticCards} from '../blocks/ElasticElasticCards';
import * as BlockUtils from '../../../blocks/BlockUtils';
import {FilterUtils} from '../blocks/ElasticFilterCard';
import ESCardParser from './ESCardParser';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';
import * as TerrainLog from 'loglevel';
import ESPropertyInfo from '../../../../shared/database/elastic/parser/ESPropertyInfo';
import ESJSONType from '../../../../shared/database/elastic/parser/ESJSONType';
import {List} from 'immutable';

export default class ESBoolCardParser
{
  private filterQueryOp =
    {
      term: { clauseToBlocks : (boolTypeName, clause) => FilterUtils.TermClauseToBlocks(boolTypeName, clause)},
      terms: { clauseToBlocks: (boolTypeName, clause) => FilterUtils.TermsClauseToBlocks(boolTypeName, clause)},
      range: { clauseToBlocks: (boolTypeName, clause) => FilterUtils.RangeClauseToBlocks(boolTypeName, clause)},
      match: { clauseToBlocks: (boolTypeName, clause) => FilterUtils.MatchClauseToBlocks(boolTypeName, clause)},
      exists: {clauseToBlocks: (boolTypeName, clause) => FilterUtils.ExistsClauseToBlocks(boolTypeName, clause)},
      bool: {clauseToBlocks: (boolTypeName, clause) => FilterUtils.BoolClauseToBlocks(boolTypeName, clause)},
    };
  private ElasticFilterClauseOp =
    {
      filter: {filterListName: ''},
      must: {},
      should: {},
      must_not: {},
    };

  public boolCard: Block;
  public cardParser: ESCardParser;
  public cardValueInfo: ESValueInfo;

  public constructor(boolCard: Block)
  {
    if (boolCard.type !== 'elasticFilter')
    {
      TerrainLog.error('ESBoolCardParser accepts elasticFilter card only, but the input is' + boolCard.type);
    }
    this.boolCard = boolCard;
    this.cardParser = new ESCardParser(boolCard);
    this.cardValueInfo = this.cardParser.getValueInfo();
  }

  public queryToFilter(): Block
  {
    if (this.cardParser === undefined || this.cardParser.hasError())
    {
      return this.boolCard;
    }

    console.log('extracing blocks from ' + JSON.stringify(this.cardValueInfo.value));
    const clauseChildren = this.cardValueInfo.objectChildren;

    let filterBlocks = [];
    for (const key of Object.keys(this.ElasticFilterClauseOp))
    {
      console.log('extracing ' + key);
      if (clauseChildren[key] !== undefined)
      {
        const value = clauseChildren[key].propertyValue;
        if (value.jsonType === ESJSONType.object)
        {
          const blocks = this.extractFilterFromQuery(key, value);
          filterBlocks = filterBlocks.concat(blocks);
          if (value.childrenSize() === 0)
          {
            this.cardParser.deleteChild(this.cardValueInfo, key);
          }
        } else if (value.jsonType === ESJSONType.array)
        {
          value.forEachElement((queryValue: ESValueInfo, index) =>
          {
            const blocks = this.extractFilterFromQuery(key, queryValue);
            filterBlocks = filterBlocks.concat(blocks);
            if (queryValue.childrenSize() === 0)
            {
              // delete this query from the arry
              this.cardParser.deleteChild(value, index);
            }
          });
          value.arrayChildren = value.arrayChildren.filter((e) => e);
          if (value.arrayChildren.length === 0)
          {
            this.cardParser.deleteChild(this.cardValueInfo, key);
          }
        }
      }
    }

    if (this.cardParser.isMutated)
    {
      this.cardParser.updateCard();
      this.boolCard = this.cardValueInfo.card;
    }
    return FilterUtils.reGroupFilterRows(this.boolCard, filterBlocks);
  }

  private extractFilterFromQuery(boolClauseType: string, query: ESValueInfo, deleteCard: boolean = true): Block[]
  {
    console.log('extracing from query ' + JSON.stringify(query.value));
    let blocks = []
    for (const filterName of Object.keys(this.filterQueryOp))
    {
      console.log('Lookin at clause ' + filterName, query.objectChildren[filterName]);
      if (query.objectChildren[filterName] !== undefined)
      {
        const clauseBlocks = this.filterQueryOp[filterName].clauseToBlocks(boolClauseType, query.objectChildren[filterName]);
        console.log(filterName + ' generate blocks ', clauseBlocks);
        blocks = blocks.concat(clauseBlocks);
        if (blocks.length > 0)
        {
          if (deleteCard)
          {
            this.cardParser.deleteChild(query, filterName);
          }
        }
      }
    }
    return blocks;
  }

}
