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
// tslint:disable:restrict-plus-operands strict-boolean-expressions max-line-length member-ordering no-console
import { parseScore, PathFinderDefaultSize } from 'builder/components/pathfinder/PathfinderParser';
import { ElasticDataSource, FilterGroup, FilterLine, Path } from 'builder/components/pathfinder/PathfinderTypes';
import { List } from 'immutable';
import * as TerrainLog from 'loglevel';
import { FieldType } from '../../../../../shared/builder/FieldTypes';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ESPropertyInfo from '../../../../../shared/database/elastic/parser/ESPropertyInfo';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import { make } from '../../../../blocks/BlockUtils';
import * as BlockUtils from '../../../../blocks/BlockUtils';
import Block from '../../../../blocks/types/Block';
import Card from '../../../../blocks/types/Card';
import ElasticBlocks from '../../../../database/elastic/blocks/ElasticBlocks';
import { parseElasticWeightBlock } from '../../../../database/elastic/conversion/ElasticToCards';
import ESCardParser from '../../../../database/elastic/conversion/ESCardParser';
import Query from '../../../../items/types/Query';

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
              { 'term:term_query': { '_index:string': (path.source.dataSource as ElasticDataSource).index } },
              {
                'bool:elasticFilter': {
                  'filter:query[]': [{ 'term:term_query': { ' :string': '' } }],
                },
              },
            ],
            'should:query[]': [
              {
                'bool:elasticFilter': {
                  'should:query[]': [{ 'term:term_query': { ' :string': '' } }],
                },
              }],
          },
        },
        'from:from': 0,
        'size:size': PathFinderDefaultSize,
        'track_scores:track_scores': true,
      };
      rootCard = BlockUtils.make(ElasticBlocks, 'eqlbody', { key: 'body', template });
    }
    // parse the card
    const parser = new ESCardParser(rootCard);

    this.PathToBody(path, parser, parser.getValueInfo());

    if (parser.isMutated === true)
    {
      TerrainLog.debug('Parser is mutated, update the card');
      parser.updateCard();
    }
    rootCard = parser.getValueInfo().card;
    TerrainLog.debug('(P->B) from path ', query.path, ' to root card ', rootCard);
    return List([rootCard]);
  }

  private static PathToBody(path: Path, parser: ESCardParser, body: ESValueInfo)
  {
    this.updateSize(path, parser, body);
    this.updateSourceBool(path, parser, body);
    // hard bool
    this.FilterSectionToBodyBool(path.filterGroup, parser, body, 'hard');
    // soft bool
    this.FilterSectionToBodyBool(path.softFilterGroup, parser, body, 'soft');
    // groupJoi
    const parentAliasName = path.reference || 'parent';
    this.updateGroupJoin(path.nested, parser, body, parentAliasName);
    // score card
    this.fromScore(path, parser, body);

    // finally, let's distribute filters from the sourcebool to the hard/soft bool.
    this.distributeSourceBoolFilters(path, parser, body);
  }
  private static updateSize(path: Path, parser: ESCardParser, body: ESValueInfo)
  {
    const rootValueInfo = body;
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
      const sizeCard = BlockUtils.make(ElasticBlocks, 'eqlsize', { key: 'size', template: sourceSize });
      const parsedCard = new ESCardParser(sizeCard);
      rootValueInfo.objectChildren['size'].propertyValue = parsedCard.getValueInfo();
      parser.isMutated = true;
    }
  }

  private static ComparisonsToFilterOpMap = {
    greater: '>',
    greaterequal: '≥',
    less: '<',
    lessequal: '≤',
    equal: '=',
    notequal: '=',
    isin: 'in',
    isnotin: 'in',
    exists: 'exists',
    contains: '≈',
    notcontain: '≈',
  };

  private static ComparisonsToBoolType = {
    greater: { filter: 'filter', should: 'should' },
    greaterequal: { filter: 'filter', should: 'should' },
    less: { filter: 'filter', should: 'should' },
    lessequal: { filter: 'filter', should: 'should' },
    equal: { filter: 'filter', should: 'should' },
    isin: { filter: 'filter', should: 'should' },
    exists: { filter: 'filter', should: 'should' },
    contains: { filter: 'filter', should: 'should' },
    notequal: { filter: 'filter_not', should: 'should_not' },
    isnotin: { filter: 'filter_not', should: 'should_not' },
    notcontain: { filter: 'filter_not', should: 'should_not' },
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
    TerrainLog.debug('(P->B) line -> block ', line, block);
    return [block];
  }

  private static processNestedQueryFilterGroup(filterLines: FilterLine[], parser: ESCardParser, boolValueInfo: ESValueInfo, boolType, filterSection: 'soft' | 'hard')
  {
    const boolTypeFiltersType = boolType + ':query[]';
    let filterCard;
    let nestedQueries;
    TerrainLog.debug('P->B: ' + filterLines.length + ' nestedGroup ');
    nestedQueries = parser.searchCard({ [boolTypeFiltersType]: [{ 'nested:nested_query': true }] }, boolValueInfo, false, true);

    if (nestedQueries === null)
    {
      TerrainLog.debug('P->B: found 0(null) nestedBools from the boolCard', boolValueInfo);
      if (filterLines.length > 0)
      {
        parser.createCardIfNotExist({ [boolTypeFiltersType]: [] }, boolValueInfo);
        filterCard = boolValueInfo.objectChildren[boolType].propertyValue;
        // create filterGroup.groupCount queries
        nestedQueries = [];
        for (let i = 0; i < filterLines.length; i = i + 1)
        {
          const theLine = filterLines[i];
          const template = {
            'nested:nested_query': {
              'path:field': theLine.field,
              'score_mode:nested_score_mode': 'avg',
              'query:query': {
                'bool:elasticFilter': {},
              },
            },
          };
          const queryCard = BlockUtils.make(ElasticBlocks, 'eqlquery', {
            key: i,
            template,
          });
          const parsedBoolCard = new ESCardParser(queryCard);
          nestedQueries.push(parsedBoolCard.getValueInfo().objectChildren.nested.propertyValue);
          parser.addChild(filterCard, filterCard.arrayChildren.length, parsedBoolCard.getValueInfo());
        }
      }
    } else
    {
      // we have to filter out nested queries that do not have `bool` query
      nestedQueries = nestedQueries.filter((query: ESValueInfo) =>
      {
        const boolQuery = parser.searchCard({ 'query:query': { 'bool:elasticFilter': true } }, query);
        if (boolQuery != null)
        {
          return true;
        }
        return false;
      });
      TerrainLog.debug('P->B: found ' + nestedQueries.length + ' nestedBools from the boolCard', boolValueInfo);
      filterCard = boolValueInfo.objectChildren[boolType].propertyValue;
      if (nestedQueries.length < filterLines.length)
      {
        for (let i = nestedQueries.length; i < filterLines.length; i = i + 1)
        {
          const theLine = filterLines[i];
          const template = {
            'nested:nested_query': {
              'path:field': theLine.field,
              'score_mode:nested_score_mode': 'avg',
              'query:query': {
                'bool:elasticFilter': {},
              },
            },
          };
          const boolQueryCard = BlockUtils.make(ElasticBlocks, 'eqlquery', {
            key: i,
            template,
          });
          const parsedBoolCard = new ESCardParser(boolQueryCard);
          nestedQueries.push(parsedBoolCard.getValueInfo().objectChildren.nested.propertyValue);
          parser.addChild(filterCard, filterCard.arrayChildren.length, parsedBoolCard.getValueInfo());
        }
      } else if (nestedQueries.length > filterLines.length)
      {
        if (filterLines.length > 0)
        {
          filterCard = boolValueInfo.objectChildren[boolType].propertyValue;
          for (let i = nestedQueries.length; i > filterLines.length; i = i - 1)
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

    filterLines.map((line: FilterLine, index) =>
    {
      console.assert((line.fieldType === FieldType.Nested) && line.filterGroup);
      const thePath = line.field.split('.')[0];
      // this is an inner filter group
      const nestedQuery = nestedQueries[index];
      this.FilterGroupToBool(line.filterGroup, parser, nestedQuery.objectChildren.query.propertyValue.objectChildren.bool.propertyValue, filterSection);
      // update nestedQuery's path
      if (nestedQuery.objectChildren.path.propertyValue.value !== thePath)
      {
        nestedQuery.objectChildren.path.propertyValue.card = nestedQuery.objectChildren.path.propertyValue.card.set('value', thePath);
      }
    };
  }

  private static processInnerGroup(filterLines: FilterLine[], parser: ESCardParser, boolValueInfo: ESValueInfo, boolType, filterSection: 'soft' | 'hard')
  {
    const boolTypeFiltersType = boolType + ':query[]';
    let filterCard;
    let innerBools;
    TerrainLog.debug('P->B: ' + filterLines.length + ' innerGroup ');
    innerBools = parser.searchCard({ [boolTypeFiltersType]: [{ 'bool:elasticFilter': true }] }, boolValueInfo, false, true);
    if (innerBools === null)
    {
      TerrainLog.debug('P->B: found 0 innerBools from the boolCard', boolValueInfo);
      if (filterLines.length > 0)
      {
        parser.createCardIfNotExist({ [boolTypeFiltersType]: [] }, boolValueInfo);
        filterCard = boolValueInfo.objectChildren[boolType].propertyValue;
        // create filterGroup.groupCount queries
        innerBools = [];
        for (let i = 0; i < filterLines.length; i = i + 1)
        {
          const template = { 'bool:elasticFilter': true };
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
      TerrainLog.debug('P->B: found ' + innerBools.length + ' innerBools from the boolCard', boolValueInfo);
      filterCard = boolValueInfo.objectChildren[boolType].propertyValue;
      if (innerBools.length < filterLines.length)
      {
        for (let i = innerBools.length; i < filterLines.length; i = i + 1)
        {
          const template = { 'bool:elasticFilter': true };
          const boolQueryCard = BlockUtils.make(ElasticBlocks, 'eqlquery', {
            key: i,
            template,
          });
          const parsedBoolCard = new ESCardParser(boolQueryCard);
          innerBools.push(parsedBoolCard.getValueInfo().objectChildren.bool.propertyValue);
          parser.addChild(filterCard, filterCard.arrayChildren.length, parsedBoolCard.getValueInfo());
        }
      } else if (innerBools.length > filterLines.length)
      {
        if (filterLines.length > 0)
        {
          filterCard = boolValueInfo.objectChildren[boolType].propertyValue;
          for (let i = innerBools.length; i > filterLines.length; i = i - 1)
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

    filterLines.map((line: FilterLine, index) =>
    {
      console.assert((line.fieldType === FieldType.Nested) && line.filterGroup);

      // this is an inner filter group
      const innerBoolValueInfo = innerBools[index];
      this.FilterGroupToBool(line.filterGroup, parser, innerBoolValueInfo, filterSection);
    };
  }

  private static FilterGroupToBool(filterGroup: FilterGroup, parser: ESCardParser, boolValueInfo: ESValueInfo, filterSection: 'hard' | 'soft' = 'hard')
  {
    TerrainLog.debug('P->B( start filtergroup -> bool) ', filterGroup, boolValueInfo);
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

    const filterLineMap = { filter: [], nested: [], group: [] };
    filterGroup.lines.map((line: FilterLine) =>
    {
      if (line.fieldType === FieldType.Nested)
      {
        if (line.field && line.field.indexOf('.') !== -1)
        {
          filterLineMap.nested.push(line);
        }
      } else if (line.filterGroup)
      {
        filterLineMap.group.push(line);
      } else
      {
        filterLineMap.filter.push(line);
      }
    });

    TerrainLog.debug('P->B(filtergroup -> bool):' +
      'find ' + filterLineMap.filter.length + 'normal filters,' +
      '\n' + filterLineMap.group.length + 'innerGroup filters,' +
      '\n' + filterLineMap.nested.length + 'nested group filters,');

    // normal filters first
    filterLineMap.filter.map((line: FilterLine) =>
    {
      blocks = blocks.concat(this.filterLineToFilterBlock(boolType, line));
    });

    const boolCard = boolValueInfo.card;
    const keepFilters = [];
    // delete all matched terrain filter blocks
    boolCard.otherFilters.map((filterBlock: Block) =>
    {
      if (filterBlock.boolQuery.startsWith('filter') === false &&
        filterBlock.boolQuery.startsWith('should') === false)
      {
        keepFilters.push(filterBlock);
      }
    });
    boolValueInfo.card = boolCard.set('otherFilters', List(keepFilters.concat(blocks)));
    parser.isMutated = true;
    TerrainLog.debug('P->B( end filtergroup -> bool) ', filterGroup, boolValueInfo);

    // handle inner filter group
    this.processInnerGroup(filterLineMap.group, parser, boolValueInfo, boolType, filterSection);
    this.processNestedQueryFilterGroup(filterLineMap.nested, parser, boolValueInfo, boolType, filterSection);
    // handle nested query filter group
  }

  private static updateGroupJoin(sourcePaths: List<Path>, parser: ESCardParser, body: ESValueInfo, parentAlias: string)
  {
    const paths = [];
    sourcePaths.map((path: Path) =>
    {
      if (path && path.name)
      {
        paths.push(path);
      }
    });

    TerrainLog.debug('(P->B): from paths ', paths, ' to body', body);
    if (paths.length === 0)
    {
      TerrainLog.debug('(P->B): No groupJoin path, delete the groupJoin card if existed.');
      if (body.objectChildren.groupJoin)
      {
        parser.deleteChild(body, 'groupJoin');
      }
      return;
    }

    if (body.objectChildren.groupJoin === undefined)
    {
      parser.createCardIfNotExist({ 'groupJoin:groupjoin_clause': { 'parentAlias:string': parentAlias } }, body);
    } else
    {
      const parentAliasValueInfo = parser.searchCard({ 'groupJoin:groupjoin_clause': { 'parentAlias:string': true } }, body);
      if (parentAliasValueInfo === null)
      {
        parser.createCardIfNotExist({ 'groupJoin:groupjoin_clause': { 'parentAlias:string': parentAlias } }, body);
      } else
      {
        if (parentAliasValueInfo.value !== parentAlias)
        {
          parentAliasValueInfo.card = parentAliasValueInfo.card.set('value', parentAlias);
          parser.isMutated = true;
        }
      }
    }

    const groupJoinV = body.objectChildren.groupJoin.propertyValue;

    const pathMap = {};
    paths.map((path: Path) => { pathMap[path.name] = path; });

    const joinBodyMap = {};
    groupJoinV.forEachProperty((joinBody, name) =>
    {
      if (joinBody.propertyValue.clause.type === 'body')
      {
        joinBodyMap[name] = joinBody.propertyValue;
      }
    });

    TerrainLog.debug('(P->B): pathMap ', pathMap, ' to body map', joinBodyMap);

    for (const bodyKey of Object.keys(joinBodyMap))
    {
      if (pathMap[bodyKey] === undefined)
      {
        parser.deleteChild(groupJoinV, bodyKey);
      }
    }

    for (const pathKey of Object.keys(pathMap))
    {
      if (joinBodyMap[pathKey])
      {
        this.PathToBody(pathMap[pathKey], parser, joinBodyMap[pathKey]);
      } else
      {
        const bodyNameType = pathKey + ':body';
        const pathBodyTemplate =
          parser.createCardIfNotExist({
            [bodyNameType]: {      // the card is empty
              'query:query': {
                'bool:elasticFilter': {
                  'filter:query[]': [
                    { 'term:term_query': { '_index:string': '' } },
                    {
                      'bool:elasticFilter': {
                        'filter:query[]': [{ 'term:term_query': { ' :string': '' } }],
                      },
                    },
                  ],
                  'should:query[]': [
                    {
                      'bool:elasticFilter': {
                        'should:query[]': [{ 'term:term_query': { ' :string': '' } }],
                      },
                    }],
                },
              },
              'from:from': 0,
              'size:size': PathFinderDefaultSize,
              'track_scores:track_scores': true,
            },
          }, groupJoinV);
        const b = groupJoinV.objectChildren[pathKey].propertyValue;
        this.PathToBody(pathMap[pathKey], parser, b);
      }
    }
  }

  private static transformBoolFilters(bool: ESValueInfo, flip: boolean = false)
  {
    if (bool.card.otherFilters)
    {
      const newfilters = [];
      bool.card.otherFilters.map((filter: Block) =>
      {
        switch (filter.boolQuery)
        {
          case 'must':
            if (flip)
            {
              newfilters.push(filter.set('boolQuery', 'should_not'));
            } else
            {
              newfilters.push(filter.set('boolQuery', 'filter'));
            }
            break;
          case 'must_not':
            if (flip)
            {
              newfilters.push(filter.set('boolQuery', 'should'));
            } else
            {
              newfilters.push(filter.set('boolQuery', 'filter_not'));
            }
            break;
          case 'filter':
            if (flip)
            {
              newfilters.push(filter.set('boolQuery', 'should_not'));
            } else
            {
              newfilters.push(filter.set('boolQuery', 'filter'));
            }
            break;
          case 'filter_not':
            if (flip)
            {
              newfilters.push(filter.set('boolQuery', 'should'));
            } else
            {
              newfilters.push(filter.set('boolQuery', 'filter_not'));
            }
            break;
          case 'should':
            if (flip)
            {
              newfilters.push(filter.set('boolQuery', 'filter_not'));
            } else
            {
              newfilters.push(filter.set('boolQuery', 'should'));
            }
            break;
          case 'should_not':
            if (flip)
            {
              newfilters.push(filter.set('boolQuery', 'filter'));
            } else
            {
              newfilters.push(filter.set('boolQuery', 'should_not'));
            }
            break;
          default:
            TerrainLog.error('(P->B, distribute source filters) unknown filter type', filter);
            break;
        }
      });
      bool.card = bool.card.set('otherFilters', List(newfilters));
    }
  }

  private static distributeSourceBoolFilters(path: Path, parser: ESCardParser, body: ESValueInfo)
  {
    const sourceBool = parser.searchCard({
      'query:query': {
        'bool:elasticFilter': true,
      },
    }, body);
    console.assert(sourceBool !== null);
    const hardBool = parser.searchCard(
      {
        'query:query': {
          'bool:elasticFilter': {
            'filter:query[]':
              [{ 'bool:elasticFilter': true }],
          },
        },
      }, body);
    console.assert(hardBool !== null);
    const softBool = parser.searchCard(
      {
        'query:query': {
          'bool:elasticFilter': {
            'should:query[]':
              [{ 'bool:elasticFilter': true }],
          },
        },
      }, body);
    console.assert(softBool !== null);
    const newHardFilters = [];
    const newSoftFilters = [];
    if (sourceBool.card.otherFilters)
    {
      sourceBool.card.otherFilters.map((filter: Block) =>
      {
        switch (filter.boolQuery)
        {
          case 'must':
            newHardFilters.push(filter.set('boolQuery', 'filter'));
            break;
          case 'must_not':
            newHardFilters.push(filter.set('boolQuery', 'filter_not'));
            break;
          default:
            newSoftFilters.push(filter);
            break;
        }
      });
      sourceBool.card = sourceBool.card.set('otherFilters', List([]));

      if (newHardFilters.length > 0)
      {
        hardBool.card = hardBool.card.set('otherFilters', hardBool.card.otherFilters.concat(List(newHardFilters)));
      }
      if (newSoftFilters.length > 0)
      {
        softBool.card = softBool.card.set('otherFilters', softBool.card.otherFilters.concat(List(newSoftFilters)));
      }

      // now let's check the nested query
      // TODO: how to handle must_not?
      for (const t of ['filter', 'must', 'should', 'must_not'])
      {
        const typeString = t + ':query[]';
        const searchNestedTemplate = {
          [typeString]: [{ 'nested:nested_query': true }],
        };
        const nestedQuery = parser.searchCard(searchNestedTemplate, sourceBool, false, true);
        if (nestedQuery !== null)
        {
          const oldFilterValueInfo = sourceBool.objectChildren[t].propertyValue;
          let targetBool = hardBool;
          let targetClause = 'filter';
          if (t === 'should')
          {
            targetBool = softBool;
            targetClause = 'should';
          }
          if (targetBool.objectChildren[targetClause] === undefined)
          {
            const targetClausePattern = targetClause + ':query[]';
            parser.createCardIfNotExist({
              [targetClausePattern]: [],
            }, targetBool);
          }
          const targetClauseValueInfo = targetBool.objectChildren[targetClause].propertyValue;
          TerrainLog.debug('(P->B) Move nested queries from ', oldFilterValueInfo, ' to new place ', targetClauseValueInfo);
          oldFilterValueInfo.forEachElement((query: ESValueInfo, index) =>
          {
            if (query.objectChildren.nested)
            {
              const nestedValueInfo = query.objectChildren.nested.propertyValue;
              const nestedBool = parser.searchCard({ 'query:query': { 'bool:elasticFilter': true } }, nestedValueInfo);
              if (nestedBool === null)
              {
                TerrainLog.debug('(P->B) There is no bool card in the must_not:nested query, avoid translating it.');
              } else
              {
                if (t === 'must_not')
                {
                  this.transformBoolFilters(nestedBool, true);
                } else
                {
                  this.transformBoolFilters(nestedBool, false);
                }
                parser.deleteChild(oldFilterValueInfo, index);
                parser.addChild(targetClauseValueInfo, targetClauseValueInfo.arrayChildren.length, query);
              }
            }
          });
        }
      }
      parser.isMutated = true;
    }
  }

  private static updateSourceBool(path: Path, parser: ESCardParser, body: ESValueInfo)
  {
    const indexValue = (path.source.dataSource as ElasticDataSource).index;
    // get the source bool card
    const sourceBool = parser.searchCard({
      'query:query': {
        'bool:elasticFilter': true,
      },
    }, body);

    if (sourceBool == null)
    {
      const sourceBoolTemplate =
        {
          'query:query': {
            'bool:elasticFilter': { 'filter:query[]': [{ 'term:term_query': { '_index:string': indexValue } }] },
          },
        };
      TerrainLog.debug('(P->B) Source card is missing, create a new one with index ' + indexValue);
      parser.createCardIfNotExist(sourceBoolTemplate, body);
      return;
    }

    if (sourceBool.currentIndex !== indexValue)
    {
      TerrainLog.debug('(P->B) card side index is different, update it to ' + indexValue);
      const indexBlock = BlockUtils.make(ElasticBlocks, 'elasticFilterBlock',
        {
          field: '_index',
          value: indexValue,
          boolQuery: 'filter',
          filterOp: '=',
        }, true);
      sourceBool.card = sourceBool.card.set('indexFilters', List([indexBlock])).set('currentIndex', indexValue);
      parser.isMutated = true;
    }
  }

  private static FilterSectionToBodyBool(filterGroup: FilterGroup, parser: ESCardParser, bodyValueInfo: ESValueInfo, filterSection: 'soft' | 'hard')
  {
    let boolType;
    // collect all `bool.filter` query
    if (filterSection === 'soft')
    {
      boolType = 'should:query[]';
    } else
    {
      boolType = 'filter:query[]';
    }
    let theBool = parser.searchCard(
      {
        'query:query': {
          'bool:elasticFilter': {
            [boolType]:
              [{ 'bool:elasticFilter': true }],
          },
        },
      }, bodyValueInfo);
    if (theBool === null)
    {
      // slow path
      parser.createCardIfNotExist(
        {
          'query:query': {
            'bool:elasticFilter': {
              [boolType]:
                [{ 'bool:elasticFilter': {} }],
            },
          },
        }, bodyValueInfo);
      theBool = parser.searchCard(
        {
          'query:query': {
            'bool:elasticFilter': {
              [boolType]:
                [{ 'bool:elasticFilter': true }],
            },
          },
        }, bodyValueInfo);
    }
    this.FilterGroupToBool(filterGroup, parser, theBool, filterSection);
  }

  private static fromScore(path: Path, parser: ESCardParser, body: ESValueInfo)
  {
    const rootValueInfo = body;

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
    // const scoreObj = parseScore(path.score)._script;
    const factors = parseScore(path.score);
    const weights = [];
    for (const factor of factors)
    {
      const transform = make(ElasticBlocks, 'elasticTransform', factor);
      const weight = make(ElasticBlocks, 'elasticWeight', { key: transform, weight: factor.weight });

      if (weight)
      {
        weights.push(weight);
      }
    }
    const sortOrder = 'desc';
    const sortMode = 'auto';
    const sortType = 'number';

    const scoreCard = make(
      ElasticBlocks, 'elasticScore',
      {
        weights: List(weights),
        sortOrder,
        sortMode,
        sortType,
      }, true);
    const scoreCardValueInfo = new ESCardParser(scoreCard).getValueInfo();

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
    parser.isMutated = true;
  }
}
