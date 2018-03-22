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

import
{
  _FilterGroup,
  _FilterLine,
  _Param,
  _Path,
  _Script,
  _ScoreLine,
  FilterGroup,
  FilterLine,
  Path,
  Param,
  Script,
  Score,
  ScoreLine,
  Source,
  sourceCountOptions,
} from 'builder/components/pathfinder/PathfinderTypes';
import { List } from 'immutable';
import * as _ from 'lodash';
import * as TerrainLog from 'loglevel';
import { FieldType } from '../../../../../shared/builder/FieldTypes';
import ESJSONType from '../../../../../shared/database/elastic/parser/ESJSONType';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import Block from '../../../../blocks/types/Block';
import ESCardParser from '../../../../database/elastic/conversion/ESCardParser';
import Query from '../../../../items/types/Query';

export class CardsToPath
{
  public static updatePath(query: Query): Path
  {
    const rootCard = query.cards.get(0);
    if (rootCard === undefined)
    {
      // the card is empty
      TerrainLog.debug('The builder is empty, clear the path too.');
      return this.emptyPath();
    }

    // let's parse the card
    const parser = new ESCardParser(rootCard);
    if (parser.hasError())
    {
      TerrainLog.debug('Avoid updating path since card side has errors: ', parser.getErrors());
      // TODO: add the error message to the query.path
      return query.path;
    }
    //
    TerrainLog.debug('B->P: The parsed card is ' + JSON.stringify(parser.getValueInfo().value));

    const newPath = this.BodyCardToPath(query.path, parser, parser.getValueInfo());
    return newPath;
  }

  public static emptyPath()
  {
    return _Path();
  }

  public static BodyCardToPath(path: Path, parser: ESCardParser, bodyValueInfo: ESValueInfo)
  {
    const newSource = this.updateSource(path.source, parser, bodyValueInfo);
    const newScore = this.updateScore(path.score, parser, bodyValueInfo);
    const filterGroup = this.BodyToFilterSection(path.filterGroup, parser, bodyValueInfo, 'hard');
    const softFilterGroup = this.BodyToFilterSection(path.softFilterGroup, parser, bodyValueInfo, 'soft');
    const parentAlias = this.getParentAlias(parser, bodyValueInfo);
    const groupJoinPaths = this.getGroupJoinPaths(path.nested, parser, bodyValueInfo, parentAlias);
    const newScripts = this.getScripts(path.more.scripts, parser, bodyValueInfo);
    const more = path.more
      .set('references', List([parentAlias]))
      .set('scripts', newScripts);

    const newPath = path
      .set('source', newSource)
      .set('score', newScore)
      .set('filterGroup', filterGroup)
      .set('softFilterGroup', softFilterGroup)
      .set('more', more)
      .set('nested', List(groupJoinPaths));
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
  };

  private static filterNotOpToComparisonsMap = {
    '>': 'lessequal',
    '≥': 'less',
    '<': 'greaterequal',
    '≤': 'greater',
    '=': 'notequal',
    '≈': 'notcontain',
    'in': 'isnotin',
  };

  private static TerrainFilterBlockToFilterLine(row: Block): FilterLine
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
    };
    const newLine = _FilterLine(template);
    TerrainLog.debug('FilterBlock', row, 'to FilterLine', newLine);
    return newLine;
  }

  private static BoolToFilterGroup(filterGroup: FilterGroup, parser: ESCardParser, boolValueInfo, sectionType: 'hard' | 'soft', isInnerGroup: boolean = false): FilterGroup
  {
    const boolCard = boolValueInfo.card;

    const filterRows = boolCard['otherFilters'];
    const filterRowMap = { filter: [], filter_not: [], must: [], must_not: [], should: [], should_not: [] };

    // regroup the filters
    filterRows.map((row: Block) =>
    {
      filterRowMap[row.boolQuery].push(row);
    });

    filterRowMap.filter = filterRowMap.filter.concat(filterRowMap.filter_not);
    filterRowMap.should = filterRowMap.should.concat(filterRowMap.should_not);

    let newLines = [];

    // handle normal filter lines first
    if (sectionType === 'hard')
    {
      // all hard bool has higher priority
      if (filterRowMap.filter.length > 0)
      {
        // set the filtergroup to
        filterGroup = filterGroup.set('minMatches', 'all');
        newLines = newLines.concat(filterRowMap.filter.map(
          (row) => this.TerrainFilterBlockToFilterLine(row)).filter((filter) => filter !== null),
        );
      } else if (isInnerGroup === true)
      {
        // any hard bool has lower priority
        if (filterRowMap.should.length > 0)
        {
          // set the filtergroup to
          filterGroup = filterGroup.set('minMatches', 'any');
          newLines = newLines.concat(filterRowMap.should.map(
            (row) => this.TerrainFilterBlockToFilterLine(row)).filter((filter) => filter !== null),
          );
        }
      }
    } else
    {
      // only check any bool in the soft section
      if (filterRowMap.should.length > 0)
      {
        // set the filtergroup to
        filterGroup = filterGroup.set('minMatches', 'any');
        newLines = newLines.concat(filterRowMap.should.map(
          (row) => this.TerrainFilterBlockToFilterLine(row)).filter((filter) => filter !== null),
        );
      }
    }

    // handle nested groups
    const newNestedGroupLines = this.processInnerFilterGroup(filterGroup, parser, boolValueInfo, sectionType);
    const newNestedQueryLines = this.processNestedQueryFilterGroup(filterGroup, parser, boolValueInfo, sectionType);
    newLines = newLines.concat(newNestedGroupLines).concat(newNestedQueryLines);

    TerrainLog.debug('B->P(Bool): Generate ' + String(newLines.length) + ' filter lines ' +
      '(Nested Group' + String(newNestedGroupLines.length) + ').' +
      '(Nested Query' + String(newNestedQueryLines.length) + ').');
    filterGroup = filterGroup.set('lines', List(newLines)).set('groupCount', newNestedGroupLines.length + newNestedQueryLines.length + 1);
    return filterGroup;
  }

  private static processNestedQueryFilterGroup(parentFilterGroup: FilterGroup, parser: ESCardParser, parentBool: ESValueInfo, sectionType: 'hard' | 'soft')
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

    const newLines = [];

    if (from)
    {
      const queries = from.propertyValue;
      if (queries.jsonType === ESJSONType.array)
      {
        queries.forEachElement((query: ESValueInfo) =>
        {
          if (query.objectChildren.nested)
          {
            const nestedQuery = query.objectChildren.nested.propertyValue;
            const boolQuery = parser.searchCard({ 'query:query': { 'bool:elasticFilter': true } }, nestedQuery);
            if (boolQuery !== null)
            {
              // create filter group
              const pathName = nestedQuery.objectChildren.path.propertyValue.value;
              let newFilterGroup = _FilterGroup();
              newFilterGroup = this.BoolToFilterGroup(newFilterGroup, parser, boolQuery, sectionType, true);
              newLines.push(_FilterLine().set('filterGroup', newFilterGroup).set('fieldType', FieldType.Nested).set('field', pathName + '.'));
            }
          }
        });
      }
    }
    return newLines;
  }

  private static processInnerFilterGroup(parentFilterGroup: FilterGroup, parser, parentBool: ESValueInfo, sectionType: 'hard' | 'soft')
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

    const newLines = [];

    if (from)
    {
      const queries = from.propertyValue;
      if (queries.jsonType === ESJSONType.array)
      {
        queries.forEachElement((query: ESValueInfo) =>
        {
          if (query.objectChildren.bool)
          {
            // create filter group
            let newFilterGroup = _FilterGroup();
            const boolValueInfo = query.objectChildren.bool.propertyValue;
            newFilterGroup = this.BoolToFilterGroup(newFilterGroup, parser, boolValueInfo, sectionType, true);
            newLines.push(_FilterLine().set('filterGroup', newFilterGroup));
          }
        });
      }
    }
    return newLines;
  }

  private static BodyToFilterSection(filterGroup: FilterGroup, parser: ESCardParser, body: ESValueInfo, filterSection: 'hard' | 'soft')
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
    const theBool = parser.searchCard(
      {
        'query:query': {
          'bool:elasticFilter': {
            [boolType]:
              [{ 'bool:elasticFilter': true }],
          },
        },
      }, body);
    if (theBool === null)
    {
      // no source, return empty filterGroup
      TerrainLog.debug('B->P(BodySection): there is no ' + filterSection + 'bool, return empty filterGroup.');
      return _FilterGroup();
    } else
    {
      return this.BoolToFilterGroup(filterGroup, parser, theBool, filterSection);
    }
  }

  private static getParentAlias(parser: ESCardParser, bodyValueInfo: ESValueInfo)
  {
    const parentAliasValueInfo = parser.searchCard(
      { 'groupJoin:groupjoin_clause': { 'parentAlias:string': true } }, bodyValueInfo);
    if (parentAliasValueInfo === null)
    {
      TerrainLog.debug('(B->P) no parentAlias card, set the parentaAlias to parent.');
      return 'parent';
    } else
    {
      TerrainLog.debug('(B->P) current parent alias is ' + parentAliasValueInfo.value);
      return parentAliasValueInfo.value;
    }
  }

  private static getGroupJoinPaths(paths: List<Path>, parser: ESCardParser, body: ESValueInfo, parentAlias: string)
  {
    const joinBodyMap = {};
    const pathMap = {};
    if (body.objectChildren.groupJoin)
    {
      const parentJoinValueInfo = body.objectChildren.groupJoin.propertyValue;
      if (parentJoinValueInfo)
      {
        parentJoinValueInfo.forEachProperty((joinBody, name) =>
        {
          if (joinBody.propertyValue.clause.type === 'body')
          {
            joinBodyMap[name] = joinBody.propertyValue;
          }
        });
      }
    }

    paths.map((path: Path) =>
    {
      if (path && path.name)
      {
        pathMap[path.name] = path;
      }
    });

    const newPaths = [];
    for (const key of Object.keys(joinBodyMap))
    {
      let oldPath;
      if (pathMap[key] !== undefined)
      {
        oldPath = pathMap[key];
      } else
      {
        oldPath = _Path();
      }
      const p = this.BodyCardToPath(oldPath, parser, joinBodyMap[key]).set('name', key);
      TerrainLog.debug('(B->P) Turn groupJoin body ', joinBodyMap[key], ' to path', p);
      newPaths.push(p);
    }
    return newPaths;
  }

  private static getScripts(scripts: List<Script>, parser: ESCardParser, body: ESValueInfo): List<Script>
  {
    const rootVal = body.value;
    console.log(rootVal);
    if (rootVal.hasOwnProperty('script_fields'))
    {
      return List(_.keys(rootVal.script_fields).map((key) =>
        {
          const script = rootVal.script_fields[key];
          const oldScript = scripts.filter((script) => script.name === key).toList().get(0); // Look at old script 
          return _Script({
            name: key,
            script: script.script.inline,
            params: _.keys(script.script.params).map((paramKey) =>
              _Param({
                name: key,
                value: script.script.params[paramKey],
              })
            ),
            userAdded: oldScript !== undefined ? oldScript.userAdded : true,
          });
        }
      ));
    }
    return List([]);
  }

  private static updateSource(source: Source, parser: ESCardParser, body: ESValueInfo): Source
  {
    const rootVal = body.value;

    // source.start
    if (rootVal.hasOwnProperty('from'))
    {
      source = source.set('start', rootVal.from);
    } else
    {
      source = source.set('start', 0);
    }

    // source.count
    if (rootVal.hasOwnProperty('size'))
    {
      source = source.set('count', rootVal.size);
    } else
    {
      // default count
      source = source.set('count', sourceCountOptions.get(0));
    }

    // index from the sourceBool
    let cardIndex = '';
    const sourceBool = parser.searchCard({ 'query:query': { 'bool:elasticFilter': true } }, body);
    if (sourceBool)
    {
      cardIndex = sourceBool.card.currentIndex;
    }
    TerrainLog.debug('B->P: card index is ' + cardIndex);
    source = source.setIn(['dataSource', 'index'], cardIndex);

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
      visiblePoints: transCard.visiblePoints.toJS(),
      domain: transCard.domain.toJS(),
      dataDomain: transCard.dataDomain.toJS(),
      hasCustomDomain: transCard.hasCustomDomain,
      mode: transCard.mode,
    };
    const l = _ScoreLine({ field: transCard.input, transformData, weight });
    TerrainLog.debug('(C->P): transCard ', transCard, ' to scoreline ', l);
    return l;
  }

  private static elasticScoreToLines(scoreCard)
  {
    return scoreCard['weights'].map((weightBlock) =>
      this.elasticTransformToScoreLine(weightBlock['key'], weightBlock.weight),
    );
  }

  private static updateScore(score: Score, parsedCard: ESCardParser, body: ESValueInfo): Score
  {
    let hasScoreCard = false;
    if (body.objectChildren.sort)
    {
      const sortCard = body.objectChildren.sort.propertyValue.card;
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
