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

// tslint:disable:restrict-plus-operands strict-boolean-expressions

import TransformUtil, { NUM_CURVE_POINTS } from 'app/util/TransformUtil';
import Util from 'app/util/Util';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import { FieldType } from '../../../../../shared/builder/FieldTypes';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import { isInput } from '../../../../blocks/types/Input';
import { ESParseTreeToCode, stringifyWithParameters } from '../../../../database/elastic/conversion/ParseElasticQuery';
import { Query } from '../../../../items/types/Query';
import {DistanceValue, ElasticDataSource, FilterGroup, FilterLine, More, Path, Score, Source, sourceCountOptions} from './PathfinderTypes';
import ESCardParser from '../../../../database/elastic/conversion/ESCardParser';
import {RecordsSerializer} from '../../../Classes';
import * as TerrainLog from 'loglevel';
import Card from '../../../../blocks/types/Card';
import {ElasticBackend} from '../../../../database/elastic/ElasticBackend';
import {ElasticBlocks} from '../../../../database/elastic/blocks/ElasticBlocks';
import * as BlockUtils from '../../../../blocks/BlockUtils';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import ESPropertyInfo from '../../../../../shared/database/elastic/parser/ESPropertyInfo';
import Blocks from '../../../../database/elastic/blocks/ElasticBlocks';
import {make} from '../../../../blocks/BlockUtils';
import {parseElasticWeightBlock} from '../../../../database/elastic/conversion/ElasticToCards';
import {_FilterGroup, _FilterLine, _ScoreLine, ScoreLine} from 'builder/components/pathfinder/PathfinderTypes';
import Block from '../../../../blocks/types/Block';
import ESJSONType from '../../../../../shared/database/elastic/parser/ESJSONType';

const MAX_COUNT = 101;

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
      'size:size': MAX_COUNT,
      'track_scores:track_scores': true,
      };
      rootCard = BlockUtils.make(ElasticBlocks, 'eqlbody', { key: 'body', template});
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
      sourceSize = MAX_COUNT;
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
    'greater' : '>',
    'greaterequal': '≥',
    'less' : '<',
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
    'greater' : {'filter':'filter', 'should':'should'},
    'greaterequal': {'filter':'filter', 'should':'should'},
    'less' : {'filter':'filter', 'should':'should'},
    'lessequal': {'filter':'filter', 'should':'should'},
    'equal': {'filter':'filter', 'should':'should'},
    'isin': {'filter':'filter', 'should':'should'},
    'exists': {'filter':'filter', 'should':'should'},
    'contains': {'filter':'filter', 'should':'should'},
    'notequal': {'filter':'filter_not', 'should':'should_not'},
    'isnotin': {'filter':'filter_not', 'should':'should_not'},
    'notcontain': {'filter':'filter_not', 'should':'should_not'}
  };

  private static filterLineToFilterBlock(boolType: 'filter'|'should', line: FilterLine): Block[]
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


  private static MergeFilterGroupWithBool(filterGroup: FilterGroup, parser: ESCardParser, boolValueInfo: ESValueInfo, filterSection: 'hard'|'soft' = 'hard')
  {
    console.log('MergeFilterGroupWithBool ', filterGroup, boolValueInfo);
    // collect all potential
    let blocks = [];
    let boolType: 'filter'|'should' = 'filter';
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

    const filterLineMap = { filter: [], nested: [], group: []};
    filterGroup.lines.map((line: FilterLine) => {
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
            const template = {'bool:elasticFilter': true}
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
            const template = {'bool:elasticFilter': true}
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
    filterGroup.lines.map((line: FilterLine) => {
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
    boolCard.otherFilters.map((filterBlock: Block) => {
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

  private static updateBodyBool(filterGroup: FilterGroup, parser: ESCardParser, bodyValueInfo: ESValueInfo, filterSection: 'soft'|'hard')
  {
    let boolType  = 'filter:query[]';
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
      Blocks, 'elasticScore',
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

export class CardsToPath
{
  public static updatePath(query: Query): Path
  {
    const rootCard = query.cards.get(0);
    if (rootCard === undefined)
    {
      // the card is empty
      console.log('There is no card at all.')
      return query.path;
    }

    // let's parse the card
    const parsedCard = new ESCardParser(rootCard);
    if (parsedCard.hasError())
    {
      TerrainLog.debug('Avoid updating path since card side has errors: ', parsedCard.getErrors());
      return query.path
    }
    //
    console.log('The parsed card is ' + JSON.stringify(parsedCard.getValueInfo().value));

    const newPath = this.BodyCardToPath(query.path, parsedCard, parsedCard.getValueInfo());
    return newPath;
  }

  public static BodyCardToPath(path: Path, parser: ESCardParser, bodyValueInfo: ESValueInfo)
  {
    // update source first
    const newSource = this.updateSource(path.source, parser);
    const newScore = this.updateScore(path.score, parser);
    const filterGroup = this.updateHardFilterGroup(path.filterGroup, parser);
    const softFilterGroup = this.updateSoftFilterGroup(path.softFilterGroup, parser);
    //const groupJoinPaths

    const newPath = path
      .set('source', newSource)
      .set('score', newScore)
      .set('filterGroup', filterGroup)
      .set('softFilterGroup', softFilterGroup);

    return newPath;
  }

  private static filterOpToComparisonsMap = {
      '>': 'greater',
      '≥': 'greaterequal',
      '<': 'less',
      '≤': 'lessequal',
      '=': 'equal',
      '≈': 'contains',
      'in': 'isin',
      'exists': 'exists',
  }

  private static filterNotOpToComparisonsMap = {
    '>': 'lessequal',
    '≥': 'less',
    '<': 'greaterequal',
    '≤': 'greater',
    '=': 'notequal',
    '≈': 'notcontain',
    'in': 'isnotin',
  }

  private static staticFilterRowToFilterLine(row: Block): FilterLine
  {
    let comparison;
    if (row.boolQuery === 'should_not' || row.boolQuery === 'filter_not')
    {
      comparison = this.filterNotOpToComparisonsMap[row.filterOp];
      if (comparison === undefined)
      {
        // we can't express this comparison in the pathfinder
        return null;
      }
    } else
    {
      comparison = this.filterOpToComparisonsMap[row.filterOp];
    }

    const template = {
      field: row.field,
      value: row.value,
      comparison,
      boost: row.boost === '' ? 1 : Number(row.boost),
    }
    return _FilterLine(template);
  }

  private static BoolToFilterGroup(boolValueInfo: ESValueInfo, filterGroup: FilterGroup, boolType: "hard"|"soft", isInnerGroup: boolean = false): FilterGroup
  {
    const boolCard = boolValueInfo.card;

    const filterRows = boolCard['otherFilters'];
    const filterRowMap = {filter: [], filter_not: [], must: [], must_not: [], should: [], should_not:[]};

    // regroup the filters
    filterRows.map((row: Block) =>
    {
      if (filterRowMap[row.boolQuery] === undefined)
      {
        console.log('row is ' + row.boolQuery, row);
      }
      filterRowMap[row.boolQuery].push(row);
    });

    filterRowMap.filter = filterRowMap.filter.concat(filterRowMap.filter_not);
    filterRowMap.should = filterRowMap.should.concat(filterRowMap.should_not);

    if (boolType === 'hard')
    {
      // check whether this is a `all` group first
      if (filterRowMap.filter.length > 0)
      {
        // set the filtergroup to
        filterGroup = filterGroup.set('minMatches', 'all');
        const newLines = List(filterRowMap.filter.map((row) => this.staticFilterRowToFilterLine(row)).filter((filter) => filter !== null));
        filterGroup = filterGroup.set('lines', newLines);
        return filterGroup;
      }
      if (isInnerGroup === true)
      {
        if (filterRowMap.should.length > 0)
        {
          // set the filtergroup to
          filterGroup = filterGroup.set('minMatches', 'any');
          const newLines = List(filterRowMap.should.map((row) => this.staticFilterRowToFilterLine(row)).filter((filter) => filter !== null));
          filterGroup = filterGroup.set('lines', newLines);
          return filterGroup;
        }
      }
    } else
    {
      // soft
      // only check should
      if (filterRowMap.should.length > 0)
      {
        // set the filtergroup to
        filterGroup = filterGroup.set('minMatches', 'any');
        const newLines = List(filterRowMap.should.map((row) => this.staticFilterRowToFilterLine(row)).filter((filter) => filter !== null));
        filterGroup = filterGroup.set('lines', newLines);
        return filterGroup;
      }
    }

    // empty bool
    if (filterGroup.lines.size > 0)
    {
      filterGroup = filterGroup.set('lines', List([])).set('groupCount', 1);
    }

    return filterGroup;
  }

  private static updateInnerFilterGroup(parentFilterGroup: FilterGroup, parentBool: ESValueInfo, boolType: "hard"|"soft"): FilterGroup
  {
    // let search whether we have an inner bool or not
    let from;
    if (parentFilterGroup.minMatches === 'all')
    {
      // let's search childBool from parentBool: { filter : [Bool, Bool, Bool]
      from = parentBool.objectChildren.filter;
    } else if (parentFilterGroup.minMatches === 'any')
    {
      from = parentBool.objectChildren.should;
    }

    console.log('updateInner', from, parentFilterGroup);

    if (from)
    {
      const queries = from.propertyValue;
      if (queries.jsonType === ESJSONType.array)
      {
        queries.forEachElement((query: ESValueInfo) =>
        {
          console.log('Handle Query ' + query.value);
          if (query.objectChildren.bool)
          {
            // create filter group
            let newFilterGroup = _FilterGroup();
            const boolValueInfo = query.objectChildren.bool.propertyValue;
            newFilterGroup = this.BoolToFilterGroup(boolValueInfo, newFilterGroup, boolType, true);
            // keep searching this group
            newFilterGroup = this.updateInnerFilterGroup(newFilterGroup, boolValueInfo, boolType);
            const newFilterLine = _FilterLine().set('filterGroup', newFilterGroup);
            // add this line to the parentFilterGroup
            parentFilterGroup = parentFilterGroup.set('lines', parentFilterGroup.lines.push(newFilterLine))
              .set('groupCount', parentFilterGroup.groupCount + 1);
          }
        });
      }
    }
    return parentFilterGroup;
  }

  private static updateHardFilterGroup(filterGroup: FilterGroup, parsedCard: ESCardParser): FilterGroup
  {
    const hardBool = parsedCard.searchCard({
      'query:query': {
        'bool:elasticFilter': {
          "filter:query[]": [{"bool:elasticFilter": true}]
        }
      }
    });
    if (hardBool)
    {
      console.log('Got Hard Bool ', hardBool);
      filterGroup  = this.BoolToFilterGroup(hardBool, filterGroup, 'hard');
      filterGroup = this.updateInnerFilterGroup(filterGroup, hardBool, 'hard');
      // nest bool
    } else
    {
      // empty bool -> empty filter group
      filterGroup = filterGroup.set('lines', List([])).set('groupCount', 0);
    }
    return filterGroup;
  }

  private static updateSoftFilterGroup(filterGroup: FilterGroup, parsedCard: ESCardParser): FilterGroup
  {
    const softBool = parsedCard.searchCard(
      {'query:query': {'bool:elasticFilter': {"should:query[]": [{"bool:elasticFilter": true}]}}});
    if (softBool)
    {
      console.log('Got soft Bool ', softBool);
      filterGroup = this.BoolToFilterGroup(softBool, filterGroup, 'soft');
      filterGroup = this.updateInnerFilterGroup(filterGroup, softBool, 'soft');
    } else
    {
      filterGroup = filterGroup.set('lines', List([])).set('groupCount', 0);
    }
    return filterGroup;
  }

  private static updateNestedPath(nested: List<Path>, parser: ESCardParser)
  {

  }


  private static updateSource(source: Source , parsedCard: ESCardParser): Source
  {
    const rootVal = parsedCard.getValueInfo().value;
    if (rootVal.hasOwnProperty('from'))
    {
      source = source.set('start', rootVal.from);
    } else
    {
      source = source.set('start', 0);
    }
    if (rootVal.hasOwnProperty('size'))
    {
      source = source.set('count', rootVal.size);
    } else
    {
      //default count
      source = source.set('count', sourceCountOptions.get(0));
    }

    if (rootVal.query && rootVal.query.bool)
    {
      const rootValueInfo = parsedCard.getValueInfo();
      const sourceCard = rootValueInfo.objectChildren['query'].propertyValue.objectChildren['bool'].propertyValue.card;
      console.assert(sourceCard !== undefined && sourceCard.type === 'elasticFilter');
      source = source.setIn(['dataSource', 'index'], sourceCard.currentIndex);
    } else
    {
      // default index
      source = source.setIn(['dataSource', 'index'], '');
    }
    return source;
  }

  private static elasticTransformToScoreLine(transCard, weight): ScoreLine
  {
    if (Number(weight) > 100)
    {
      weight = 100;
    }
    const transformData = {
      scorePoints: transCard.scorePoints.toJS(),
      domain: transCard.domain.toJS(),
      dataDomain: transCard.dataDomain.toJS(),
      hasCustomDomain: transCard.hasCustomDomain,
      mode: transCard.mode,
    };
    return _ScoreLine({field: transCard.input, transformData, weight});
  }

  private static elasticScoreToLines(scoreCard)
  {
    return scoreCard['weights'].map((weightBlock) =>
      this.elasticTransformToScoreLine(weightBlock['key'], weightBlock.weight)
    );
  }

  private static updateScore(score: Score, parsedCard: ESCardParser): Score
  {
    const rootValueInfo = parsedCard.getValueInfo();
    let hasScoreCard = false;
    if (rootValueInfo.objectChildren.sort)
    {
      const sortCard = rootValueInfo.objectChildren.sort.propertyValue.card;
      if (sortCard.type === 'elasticScore')
      {
        hasScoreCard = true;
        score = score.set('lines', this.elasticScoreToLines(sortCard));
      }
    }

    if (hasScoreCard === false)
    {
      if (score.lines.size > 0)
      {
        score = score.set('lines', List([]));
      }
    }
    return score;
  }

}

export function parsePath(path: Path, inputs, ignoreInputs?: boolean): any
{
  let baseQuery: Map<string, any> = Map({
    query: Map({
      bool: Map({
        filter: List([]),
        must: List([]),
        should: List([]),
        must_not: List([]),
        minimum_should_match: 0,
      }),
    }),
    sort: Map({}),
    aggs: Map({}),
    from: 0,
    size: MAX_COUNT,
    track_scores: true,
  });

  // Sources
  const sourceInfo = parseSource(path.source);
  baseQuery = baseQuery.set('from', sourceInfo.from);
  baseQuery = baseQuery.set('size', sourceInfo.size);
  baseQuery = baseQuery.setIn(['query', 'bool', 'filter'], List([
    Map({
      term: Map({
        _index: sourceInfo.index.split('/')[1],
      }),
    }),
  ]));

  // Filters
  const filterObj = parseFilters(path.filterGroup, inputs);

  // filterObj = filterObj.updateIn(['bool', 'filter'],
  // (originalFilter) => originalFilter.concat(baseQuery.getIn(['query', 'bool', 'filter'])));
  baseQuery = baseQuery.updateIn(['query', 'bool', 'filter'],
    (originalFilterArr) => originalFilterArr.push(filterObj),
  );

  const softFiltersObj = parseFilters(path.softFilterGroup, inputs, true);

  baseQuery = baseQuery.updateIn(['query', 'bool', 'must'],
    (originalMustArr) => originalMustArr.push(Map({
      bool: Map({
        should: softFiltersObj,
        minimum_should_match: 0,
      }),
    })),
  );

  // filterObj = filterObj.setIn(['bool', 'should'], softFiltersObj);
  // (originalShould) => originalShould.concat(baseQuery.getIn(['query', 'bool', 'should'])));

  // Scores
  if ((path.score.type !== 'terrain' && path.score.type !== 'linear') || path.score.lines.size)
  {
    let sortObj = parseScore(path.score);
    if (path.score.type !== 'random')
    {
      baseQuery = baseQuery.set('sort', sortObj);
    }
    else
    {
      sortObj = sortObj.setIn(['function_score', 'query'], baseQuery.get('query'));
      baseQuery = baseQuery.set('query', sortObj);
      baseQuery = baseQuery.delete('sort');
    }
  }

  // More
  // const moreObj = parseAggregations(path.more);
  // baseQuery = baseQuery.set('aggs', Map(moreObj));
  const collapse = path.more.collapse;
  if (collapse)
  {
    baseQuery = baseQuery.set('collapse', { field: collapse });
  }
  const groupJoin = parseNested(path.more, path.nested, inputs);
  if (groupJoin)
  {
    baseQuery = baseQuery.set('groupJoin', groupJoin);
  }

  // Export, without inputs
  if (ignoreInputs)
  {
    return baseQuery;
  }

  // Export, with inputs
  const text = stringifyWithParameters(baseQuery.toJS(), (name) => isInput(name, inputs));
  const parser: ESJSONParser = new ESJSONParser(text, true);
  return ESParseTreeToCode(parser, {}, inputs);
}

function parseSource(source: Source): any
{
  const count = parseFloat(String(source.count));
  return {
    from: source.start,
    size: !isNaN(parseFloat(String(count))) ? parseFloat(String(count)) : MAX_COUNT,
    index: (source.dataSource as any).index,
  };
}

function parseScore(score: Score): any
{
  switch (score.type)
  {
    case 'terrain':
      return parseTerrainScore(score);
    case 'linear':
      return parseLinearScore(score);
    case 'elastic':
      return { _score: { order: 'desc' } };
    case 'random':
      return Map({
        function_score: Map({
          boost_mode: 'sum',
          random_score: {
            seed: score.seed,
          },
          query: {},
        }),
      });
    case 'none':
    default:
      return {};
  }
}

function parseLinearScore(score: Score)
{
  const sortObj = {};
  score.lines.forEach((line) =>
  {
    sortObj[line.field] = line.sortOrder;
  });
  return sortObj;
}

function parseTerrainScore(score: Score)
{
  const sortObj = {
    _script: {
      type: 'number',
      order: 'desc',
      script: {
        stored: 'Terrain.Score.PWL',
        params: {
          factors: [],
        },
      },
    },
  };
  // This is a weird race condition where the path starts loading with the old path and then switches to new path...
  let dirty = false;
  const factors = score.lines.map((line) =>
  {
    let ranges = [];
    let outputs = [];
    let data;
    const transformData = Util.asJS(line.transformData);
    if (transformData === undefined)
    {
      dirty = true;
      return {};
    }
    const min = Util.asJS(line.transformData).dataDomain[0];
    const max = Util.asJS(line.transformData).dataDomain[1];
    const numPoints = 31;
    if (line.transformData['mode'] === 'normal' &&
      line.transformData['scorePoints'].size === NUM_CURVE_POINTS.normal)
    {
      data = TransformUtil.getNormalData(numPoints, line.transformData['scorePoints'].toJS(), min, max);
    }
    else if (line.transformData['mode'] === 'exponential' && line.transformData['scorePoints'].size === NUM_CURVE_POINTS.exponential)
    {
      data = TransformUtil.getExponentialData(numPoints, line.transformData['scorePoints'].toJS());
    }
    else if (line.transformData['mode'] === 'logarithmic' && line.transformData['scorePoints'].size === NUM_CURVE_POINTS.logarithmic)
    {
      data = TransformUtil.getLogarithmicData(numPoints, line.transformData['scorePoints'].toJS(), min, max);
    }
    else if (line.transformData['mode'] === 'sigmoid' && line.transformData['scorePoints'].size === NUM_CURVE_POINTS.sigmoid)
    {
      data = TransformUtil.getSigmoidData(numPoints, line.transformData['scorePoints'].toJS(), min, max);
    }
    else
    {
      ranges = line.transformData['scorePoints'].map((scorePt) => scorePt.value).toArray();
      outputs = line.transformData['scorePoints'].map((scorePt) => scorePt.score).toArray();
    }
    if (data !== undefined)
    {
      ranges = data.ranges;
      outputs = data.outputs;
    }
    return {
      a: 0,
      b: 1,
      weight: typeof line.weight === 'string' ? parseFloat(line.weight) : line.weight,
      numerators: [[line.field, 1]],
      denominators: [],
      mode: line.transformData['mode'],
      ranges,
      outputs,
    };
  }).toArray();
  sortObj._script.script.params.factors = factors;
  if (dirty)
  {
    return {};
  }
  return sortObj;
}

function parseFilters(filterGroup: FilterGroup, inputs, inMatchQualityContext = false): any
{
  // init must, mustNot, filter, should
  // If the minMatches is all of the above
  // For each line in the filter group
  // If the line is not a filterGroup
  // Parse the line and add it to must, mustNot or filter
  // If the line is a filterGroup
  // must.push ({bool: {should: parseFilters(filterGroup.lines)}, minimum_should_match: minMatches})
  // If the minMatches is not all
  // add all the filter conditions to should, set minimum_should_match on the outside of that bool
  // By adding all the filter conditions to should, do same process as above
  let filterObj = Map({
    bool: Map({
      filter: List([]),
      must: List([]),
      must_not: List([]),
      should: List([]),
    }),
  });
  let must = List([]);
  let mustNot = List([]);
  let filter = List([]);
  let should = List([]);
  let useShould = false;
  if (filterGroup.minMatches !== 'all' || inMatchQualityContext)
  {
    useShould = true;
  }
  filterGroup.lines.forEach((line) =>
  {
    if (!line.filterGroup && line.comparison)
    {
      const lineInfo = parseFilterLine(line, useShould, inputs);
      if (useShould)
      {
        should = should.push(lineInfo);
      }
      else if (line.comparison === 'notequal' || line.comparison === 'notcontain' || line.comparison === 'isnotin')
      {
        mustNot = mustNot.push(lineInfo);
      }
      else
      {
        filter = filter.push(lineInfo);
      }
    }
    else if (line.filterGroup)
    {
      const nestedFilter = parseFilters(line.filterGroup, inputs, inMatchQualityContext);
      must = must.push(nestedFilter);
    }
  });
  if (useShould)
  {
    filterObj = filterObj.updateIn(['bool', 'minimum_should_match'], (MSM) =>
    {
      if (inMatchQualityContext)
      {
        return 0; // forcing should for match quality
      }

      return filterGroup.minMatches === 'any' ? 1 : parseFloat(String(filterGroup.minMatches));
    });
  }

  filterObj = filterObj.setIn(['bool', 'must'], must);
  if (inMatchQualityContext)
  {
    // need to add a useless Must check, so that the Should does not
    // convert to a "must" because of the filter context
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html
    filterObj = filterObj.updateIn(['bool', 'must'],
      (m) =>
      {
        return m.push(Map({
          exists: Map({
            field: '_id',
          }),
        }));
      });
  }

  filterObj = filterObj.setIn(['bool', 'must_not'], mustNot);
  filterObj = filterObj.setIn(['bool', 'should'], should);
  filterObj = filterObj.setIn(['bool', 'filter'], filter);
  return filterObj;
}

function parseFilterLine(line: FilterLine, useShould: boolean, inputs, ignoreNested = false)
{
  const lineValue = String(line.value);
  let value: any = String(line.value || '');
  const boost = typeof line.boost === 'string' ? parseFloat(line.boost) : line.boost;
  // Parse date
  if (line.comparison === 'datebefore' || line.comparison === 'dateafter')
  {
    const date = Util.formatInputDate(new Date(value), 'elastic');
    if (date)
    {
      value = date;
    }
  }
  if (line.field && line.field.indexOf('.') !== -1 && !ignoreNested)
  {
    // In this case it is a nested query, disguised as a normal filter line
    const path = line.field.split('.')[0];
    const negatives = ['notcontain', 'noteequal', 'notisin'];
    const boolQueryType = negatives.indexOf(line.comparison) !== -1 ? 'must_not' :
      useShould ? 'should' : 'must';
    const innerLine = parseFilterLine(line, useShould, inputs, true).toJS();
    return Map({
      nested: {
        path,
        score_mode: 'avg',
        query: {
          bool: {
            [boolQueryType]: innerLine,
          },
        },
      },

    });
  }
  switch (line.comparison)
  {
    case 'exists':
      return Map({
        exists: Map({
          field: line.field,
          boost,
        }),
      });
    case 'equal':
      return Map({
        term: Map({
          [line.field]: Map({
            value: !isNaN(parseFloat(value)) ? parseFloat(value) : value,
            boost,
          }),
        }),
      });
    case 'contains':
      return Map({
        match: Map({
          [line.field]: Map({
            query: String(line.value || ''),
            boost,
          }),
        }),
      });
    case 'notequal':
      if (useShould)
      {
        return Map({
          bool: Map({
            must_not: Map({
              term: Map({
                [line.field]: Map({
                  value: !isNaN(parseFloat(value)) ? parseFloat(value) : value,
                  boost,
                }),
              }),
            }),
          }),
        });
      }
      return Map({
        term: Map({
          [line.field]: Map({
            value: !isNaN(parseFloat(value)) ? parseFloat(value) : value,
            boost,
          }),
        }),
      });
    case 'notcontain':
      if (useShould)
      {
        return Map({
          bool: Map({
            must_not: Map({
              match: Map({
                [line.field]: Map({
                  query: String(line.value || ''),
                }),
                boost,
              }),
            }),
          }),
        });
      }
      return Map({
        match: Map({
          [line.field]: Map({
            query: String(line.value || ''),
            boost,
          }),
        }),
      });
    case 'greater':
      return Map({
        range: Map({
          [line.field]:
            Map({
              gt: parseFloat(value),
              boost,
            }),
        }),
      });
    case 'alphaafter':
    case 'dateafter':
      return Map({
        range: Map({
          [line.field]:
            Map({
              gt: value,
              boost,
            }),
        }),
      });
    case 'less':
      return Map({
        range: Map({
          [line.field]:
            Map({
              lt: parseFloat(value),
              boost,
            }),
        }),
      });
    case 'alphabefore':
    case 'datebefore':
      return Map({
        range: Map({
          [line.field]:
            Map({
              lt: value,
              boost,
            }),
        }),
      });
    case 'greaterequal':
      return Map({
        range: Map({
          [line.field]:
            Map({
              gte: parseFloat(value),
              boost,
            }),
        }),
      });
    case 'lessequal':
      return Map({
        range: Map({
          [line.field]:
            Map({
              lte: parseFloat(value),
              boost,
            }),
        }),
      });
    case 'located':
      const distanceObj = line.value as DistanceValue;
      if (!line.value)
      {
        return Map({
          geo_distance: Map({
            distance: '10mi',
            [line.field]: '',
          }),
        });
      }
      return Map({
        geo_distance: Map({
          distance: String(distanceObj.distance) + distanceObj.units,
          [line.field]: distanceObj.location || distanceObj.address,
        }),
      });
    case 'isin':
    case 'isnotin':
      try
      {
        return Map({
          terms: { [line.field]: JSON.parse(String(value).toLowerCase()) },
        });
      }
      catch {
        // Try to split it along commas and create own value
        if (typeof value === 'string' && value[0] !== '@')
        {
          value = value.replace(/\[/g, '').replace(/\]/g, '');
          let pieces = value.split(',');
          pieces = pieces.map((piece) => piece.toLowerCase().trim());
          return Map({
            terms: { [line.field]: pieces },
          });
        }
        return Map({
          terms: { [line.field]: value },
        });
      }

    default:
      return Map({});
  }
}

const unusedKeys = [
  'name',
  'compression',
  'number_of_significant_value_digits',
  'rangeType',
  'termsType',
  'geoType',
  'order',
  'interval',
  'ranges',
  'min',
  'max',
  'sortField',
];
function parseAggregations(more: More): {}
{
  const moreObj = {};
  more.aggregations.forEach((agg) =>
  {
    if (agg.elasticType && agg.field)
    {
      const advanced = agg.advanced.toJS();
      const advancedObj = { field: agg.field };
      if (String(agg.fieldType) === String(FieldType.Text))
      {
        advancedObj.field = advancedObj.field + '.keyword';
      }
      _.keys(advanced).forEach((key) =>
      {
        if (unusedKeys.indexOf(key) === -1)
        {
          if (key === 'missing' || key === 'sigma' || key === 'offset' || key === 'min_doc_count')
          {
            const value = !isNaN(advanced[key]) ? parseFloat(advanced[key]) : 0;
            advancedObj[key] = value;
          }
          else if (key === 'accuracyType')
          {
            if (advanced[key] === 'compression')
            {
              advancedObj['tdigest'] = {
                [advanced[key]]: advanced[advanced[key]],
              };
            }
            else
            {
              advancedObj['hdr'] = {
                [advanced[key]]: advanced[advanced[key]],
              };
            }
          }
          else if (key === 'include' || key === 'exclude')
          {
            if (advanced[key].length)
            {
              advancedObj[key] = advanced[key];
            }
          }
          else
          {
            advancedObj[key] = advanced[key];
          }
        }
        else if (key === 'rangeType')
        {
          advancedObj[advanced['rangeType']] = advanced[advanced['rangeType']];
        }
        else if (key === 'min')
        {
          advancedObj['extended_bounds'] = { min: parseFloat(advanced['min']), max: parseFloat(advanced['max']) };
        }
        else if (key === 'sortField' && advanced['sortField'])
        {
          advancedObj['order'] = { [advanced['sortField']]: advanced['order'] };
        }
      });
      moreObj[agg.advanced.get('name')] = {
        [agg.elasticType]: advancedObj,
      };
    }
  });
  return moreObj;
}

// Put a nested path inside of a groupJoin
function parseNested(more: More, nested: List<Path>, inputs)
{
  if (nested.size === 0)
  {
    return undefined;
  }
  let groupJoins = Map({});
  if (nested.get(0) && nested.get(0).minMatches)
  {
    groupJoins = groupJoins.set('dropIfLessThan', parseFloat(String(nested.get(0).minMatches)));
  }
  groupJoins = groupJoins.set('parentAlias', more.references.get(0));
  nested.forEach((n, i) =>
  {
    if (n)
    {
      groupJoins = groupJoins.set(n.name, parsePath(n, inputs, true));
    }
  });
  return groupJoins;
}
