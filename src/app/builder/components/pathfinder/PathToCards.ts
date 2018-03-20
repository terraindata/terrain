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
import Query from '../../../../items/types/Query';
import Card from '../../../../blocks/types/Card';
import {ElasticDataSource, FilterGroup, FilterLine, Path} from 'builder/components/pathfinder/PathfinderTypes';
import * as BlockUtils from '../../../../blocks/BlockUtils';
import {make} from '../../../../blocks/BlockUtils';
import ElasticBlocks from '../../../../database/elastic/blocks/ElasticBlocks';
import ESCardParser from '../../../../database/elastic/conversion/ESCardParser';
import Block from '../../../../blocks/types/Block';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import {FieldType} from '../../../../../shared/builder/FieldTypes';
import {parseElasticWeightBlock} from '../../../../database/elastic/conversion/ElasticToCards';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ESPropertyInfo from '../../../../../shared/database/elastic/parser/ESPropertyInfo';
import {parseScore, PathFinderDefaultSize} from 'builder/components/pathfinder/PathfinderParser';
import {List} from 'immutable';

export class PathToCards
{
  public static updateRootCard(query: Query): List<Card>
  {
    let rootCard = query.cards.get(0);
    const path = query.path;
    if (rootCard === undefined)
    {
      // the card is empty
      const template = {
        'query:query': {
          'bool:elasticFilter': {
            'filter:query[]': [
              {'term:term_query': {'_index:string': (path.source.dataSource as ElasticDataSource).index}},
              {
                'bool:elasticFilter': {
                  'filter:query[]': [{'term:term_query': {' :string': ''}}]
                }
              }
            ],
            'should:query[]': [
              {
                'bool:elasticFilter': {
                  'should:query[]': [{'term:term_query': {' :string': ''}}]
                }
              }]
          }
        },
        'from:from': 0,
        'size:size': PathFinderDefaultSize,
        'track_scores:track_scores': true,
      };
      rootCard = BlockUtils.make(ElasticBlocks, 'eqlbody', {key: 'body', template});
    }
    // parse the card
    const parser = new ESCardParser(rootCard);
    this.updateSize(path, parser);
    this.updateSourceBool(path, parser);

    // hard bool
    this.updateBodyBool(path.filterGroup, parser, parser.getValueInfo(), 'hard');
    // soft bool
    this.updateBodyBool(path.softFilterGroup, parser, parser.getValueInfo(), 'soft');
    // groupJoin
    //this.updateGroupJoin(path.nested, parser);
    // score card
    this.fromScore(path, parser);

    if (parser.isMutated === true)
    {
      parser.updateCard();
    }
    rootCard = parser.getValueInfo().card;
    console.log('Path -> Cards: ' + JSON.stringify(parser.getValueInfo().value));
    return List([rootCard]);
  }

  private static updateSize(path: Path, parser: ESCardParser)
  {
    const rootValueInfo = parser.getValueInfo();
    let updateSize = false;
    let sourceSize;
    if (path.source.count === 'all')
    {
      sourceSize = PathFinderDefaultSize;
    } else
    {
      sourceSize = Number(path.source.count);
    }

    if (rootValueInfo.objectChildren.hasOwnProperty('size'))
    {
      if (rootValueInfo.objectChildren['size'].propertyValue.value !== sourceSize)
      {
        updateSize = true;
      }
    } else
    {
      updateSize = true;
    }

    if (updateSize)
    {
      const sizeCard = BlockUtils.make(ElasticBlocks, 'eqlsize', {key: 'size', template: sourceSize});
      const parsedCard = new ESCardParser(sizeCard);
      rootValueInfo.objectChildren['size'].propertyValue = parsedCard.getValueInfo();
      parser.isMutated = true;
    }
  }

  private static ComparisonsToFilterOpMap = {
    'greater': '>',
    'greaterequal': '≥',
    'less': '<',
    'lessequal': '≤',
    'equal': '=',
    'notequal': '=',
    'isin': 'in',
    'isnotin': 'in',
    'exists': 'exists',
    'contains': '≈',
    'notcontain': '≈',
  };

  private static ComparisonsToBoolType = {
    'greater': {'filter': 'filter', 'should': 'should'},
    'greaterequal': {'filter': 'filter', 'should': 'should'},
    'less': {'filter': 'filter', 'should': 'should'},
    'lessequal': {'filter': 'filter', 'should': 'should'},
    'equal': {'filter': 'filter', 'should': 'should'},
    'isin': {'filter': 'filter', 'should': 'should'},
    'exists': {'filter': 'filter', 'should': 'should'},
    'contains': {'filter': 'filter', 'should': 'should'},
    'notequal': {'filter': 'filter_not', 'should': 'should_not'},
    'isnotin': {'filter': 'filter_not', 'should': 'should_not'},
    'notcontain': {'filter': 'filter_not', 'should': 'should_not'}
  };

  private static filterLineToFilterBlock(boolType: 'filter' | 'should', line: FilterLine): Block[]
  {
    if (line.filterGroup)
    {
      return [];
    }
    if (this.ComparisonsToFilterOpMap[line.comparison] === undefined)
    {
      return [];
    }
    const filterOp = this.ComparisonsToFilterOpMap[line.comparison];
    const boolQuery = this.ComparisonsToBoolType[line.comparison][boolType];
    console.log('create line with field ' + line.field + ' value ' + line.value);
    let value = line.value;
    // TODO: Move this check to the pathfinder
    if (value === 'null')
    {
      value = '';
    }
    const block = BlockUtils.make(ElasticBlocks, 'elasticFilterBlock', {
      field: line.field,
      value,
      boolQuery,
      filterOp,
      boost: line.boost,
    }, true);
    return [block];
  }


  private static MergeFilterGroupWithBool(filterGroup: FilterGroup, parser: ESCardParser, boolValueInfo: ESValueInfo, filterSection: 'hard' | 'soft' = 'hard')
  {
    console.log('MergeFilterGroupWithBool ', filterGroup, boolValueInfo);
    // collect all potential
    let blocks = [];
    let boolType: 'filter' | 'should' = 'filter';
    // collect all `bool.filter` query
    if (filterSection === 'soft')
    {
      boolType = 'should';
    } else
    {
      // hard section
      if (filterGroup.minMatches !== 'all')
      {
        boolType = 'should';
      }
    }

    let boolTypeFiltersType = boolType + ':query[]';
    let filterCard;
    let innerBools;

    const filterLineMap = {filter: [], nested: [], group: []};
    filterGroup.lines.map((line: FilterLine) =>
    {
      if (line.fieldType === FieldType.Nested)
      {
        filterLineMap.nested.push(line);
      } else if (line.filterGroup)
      {
        filterLineMap.group.push(line);
      } else
      {
        filterLineMap.filter.push(line);
      }
    }
    console.log('Inner filter ' + filterLineMap.group.length);
    innerBools = parser.searchCard({[boolTypeFiltersType]: [{'bool:elasticFilter': true}]}, boolValueInfo, false, true);
    if (innerBools === null)
    {
      if (filterLineMap.group.length > 0)
      {
        parser.createCardIfNotExist({[boolTypeFiltersType]: true}, boolValueInfo);
        console.log('innerBool after create', boolValueInfo.objectChildren);
        filterCard = boolValueInfo.objectChildren[boolType].propertyValue;
        // create filterGroup.groupCount queries
        innerBools = [];
        for (let i = 0; i < filterLineMap.group.length; i = i + 1)
        {
          const template = {'bool:elasticFilter': true};
          const queryCard = BlockUtils.make(ElasticBlocks, 'eqlquery', {
            key: i,
            template,
          });
          const parsedBoolCard = new ESCardParser(queryCard);
          innerBools.push(parsedBoolCard.getValueInfo().objectChildren.bool.propertyValue);
          parser.addChild(filterCard, filterCard.arrayChildren.length, parsedBoolCard.getValueInfo());
        }
      }
    } else
    {
      console.log('Discovered innerBools ', innerBools);
      filterCard = boolValueInfo.objectChildren[boolType].propertyValue;
      if (innerBools.length < filterLineMap.group.length)
      {
        for (let i = innerBools.length; i < filterLineMap.group.length; i = i + 1)
        {
          const template = {'bool:elasticFilter': true};
          const boolQueryCard = BlockUtils.make(ElasticBlocks, 'eqlquery', {
            key: i,
            template,
          });
          const parsedBoolCard = new ESCardParser(boolQueryCard);
          innerBools.push(parsedBoolCard.getValueInfo().objectChildren.bool.propertyValue);
          parser.addChild(filterCard, filterCard.arrayChildren.length, parsedBoolCard.getValueInfo());
        }
      } else if (innerBools.length > filterLineMap.group.length)
      {
        // TODO: decide whether we want to remove these
        if (filterLineMap.group.length > 0)
        {
          filterCard = boolValueInfo.objectChildren[boolType].propertyValue;
          for (let i = innerBools.length; i > filterLineMap.group.length; i = i - 1)
          {
            parser.deleteChild(filterCard, i - 1);
          }
        } else
        {
          // delete the filter card
          parser.deleteChild(boolValueInfo, boolType);
        }
      }
    }

    let nrGroup = 0;
    filterGroup.lines.map((line: FilterLine) =>
    {
      if (line.fieldType === FieldType.Nested)
      {
        // this is an nested query
      } else if (line.filterGroup)
      {
        // this is an inner filter group
        const innerBoolValueInfo = innerBools[nrGroup];
        nrGroup += 1;
        this.MergeFilterGroupWithBool(line.filterGroup, parser, innerBoolValueInfo, filterSection);
      }
      blocks = blocks.concat(this.filterLineToFilterBlock(boolType, line));
    });
    console.log('Gnerate ' + blocks.length + ' blocks from ' + filterGroup.lines.size + ' blocks');

    const boolCard = boolValueInfo.card;
    const keepFilters = [];
    boolCard.otherFilters.map((filterBlock: Block) =>
    {
      if (filterBlock.boolQuery.startsWith('filter') === false &&
        filterBlock.boolQuery.startsWith('should') === false)
      {
        keepFilters.push(filterBlock);
      }
    });
    boolValueInfo.card = boolCard.set('otherFilters', List(keepFilters.concat(blocks)));
  }

  private static updateSourceBool(path: Path, parser: ESCardParser)
  {
    const indexValue = (path.source.dataSource as ElasticDataSource).index;
    // get the source bool card
    const sourceBool = parser.searchCard({
      'query:query': {
        'bool:elasticFilter': true
      }
    });

    if (sourceBool == null)
    {
      const sourceBoolTemplate =
        {
          'query:query': {
            'bool:elasticFilter': {'filter:query[]': [{'term:term_query': {'_index:string': indexValue}}]}
          }
        };
      console.log('create source bool');
      parser.createCardIfNotExist(sourceBoolTemplate);
      return;
    }

    if (sourceBool.currentIndex !== indexValue)
    {
      const indexBlock = BlockUtils.make(ElasticBlocks, 'elasticFilterBlock',
        {
          field: '_index',
          value: indexValue,
          boolQuery: 'filter',
          filterOp: '=',
        }, true);
      sourceBool.card = sourceBool.card.set('indexFilters', List([indexBlock])).set('currentIndex', indexValue);
    }
  }

  private static updateBodyBool(filterGroup: FilterGroup, parser: ESCardParser, bodyValueInfo: ESValueInfo, filterSection: 'soft' | 'hard')
  {
    let boolType = 'filter:query[]';
    // collect all `bool.filter` query
    if (filterSection === 'soft')
    {
      boolType = 'should:query[]';
    } else
    {
      // hard section
      if (filterGroup.minMatches !== 'all')
      {
        boolType = 'should:query[]';
      }
    }
    let hardBool = parser.searchCard(
      {
        "query:query": {
          'bool:elasticFilter': {
            [boolType]:
              [{"bool:elasticFilter": true}]
          }
        }
      }, bodyValueInfo);
    if (hardBool === null)
    {
      // slow path
      parser.createCardIfNotExist(
        {
          "query:query": {
            'bool:elasticFilter': {
              [boolType]:
                [{"bool:elasticFilter": {}}]
            }
          }
        }, bodyValueInfo);
      hardBool = parser.searchCard(
        {
          "query:query": {
            'bool:elasticFilter': {
              [boolType]:
                [{"bool:elasticFilter": true}]
            }
          }
        }, bodyValueInfo);
    }
    this.MergeFilterGroupWithBool(filterGroup, parser, hardBool, filterSection);
  }


  private static fromScore(path: Path, parser: ESCardParser)
  {
    const rootValueInfo = parser.getValueInfo();

    if (path.score.lines.size === 0)
    {
      // we have to delete the sort card
      if (rootValueInfo.objectChildren.sort)
      {
        delete rootValueInfo.objectChildren.sort;
        parser.updateCard();
        return;
      }
      return;
    }
    const scoreObj = parseScore(path.score)._script;
    console.log('scoreObj ' + JSON.stringify(scoreObj));
    const weights = [];
    console.assert(scoreObj.script);
    for (const factor of scoreObj.script.params.factors)
    {
      const weight = parseElasticWeightBlock(factor);
      if (weight)
      {
        weights.push(weight);
      }
    }

    const sortOrder = scoreObj.order || 'desc';
    const sortMode = scoreObj.mode || 'auto';
    let sortType = scoreObj.type || 'number';

    const scoreCard = make(
      ElasticBlocks, 'elasticScore',
      {
        weights: List(weights),
        sortOrder,
        sortMode,
        sortType,
      }, true);
    const scoreCardValueInfo = new ESCardParser(scoreCard).getValueInfo();
    console.log('scoreCardValueInfo ' + scoreCardValueInfo.value);

    // de we have sort card
    if (rootValueInfo.objectChildren.sort)
    {
      rootValueInfo.objectChildren.sort.propertyValue = scoreCardValueInfo;
    } else
    {
      const childName = new ESJSONParser(JSON.stringify('sort')).getValueInfo();
      childName.card = scoreCard;
      const propertyInfo = new ESPropertyInfo(childName, scoreCardValueInfo);
      rootValueInfo.addObjectChild('sort', propertyInfo);
    }
    parser.updateCard();
  }
}
