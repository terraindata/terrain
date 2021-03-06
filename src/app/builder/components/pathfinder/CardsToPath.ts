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
  _Path,
  _ScoreLine,
  _Script,
  ElasticDataSource,
  FilterGroup,
  FilterLine,
  Path,
  PathfinderSteps,
  Score,
  ScoreLine,
  Script,
  Source,
} from 'builder/components/pathfinder/PathfinderTypes';
import { List } from 'immutable';
import * as _ from 'lodash';
import * as TerrainLog from 'loglevel';
import { FieldType } from '../../../../../shared/builder/FieldTypes';
import ESJSONType from '../../../../../shared/database/elastic/parser/ESJSONType';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import * as BlockUtils from '../../../../blocks/BlockUtils';
import Block from '../../../../blocks/types/Block';
import ElasticBlocks from '../../../../database/elastic/blocks/ElasticBlocks';
import ESCardParser from '../../../../database/elastic/conversion/ESCardParser';
import Query from '../../../../items/types/Query';
import { PathToCards } from './PathToCards';

export class CardsToPath
{
  public static updatePath(query: Query, dbName: string): { path: Path, parser: ESCardParser }
  {
    const rootCard = query.cards.get(0);
    if (rootCard === undefined)
    {
      // the card is empty
      TerrainLog.debug('The builder is empty, clear the path too.');
      return { path: this.emptyPath(), parser: null };
    }

    // let's parse the card
    const parser = new ESCardParser(rootCard);
    // TODO: Maybe it is safe to ignore the errors.
    if (parser.hasError())
    {
      TerrainLog.debug('Avoid updating path since card side has errors: ', parser.getErrors());
      // TODO: add the error message to the query.path
      return { path: query.path, parser: null };
    }
    //
    TerrainLog.debug('B->P: The parsed card is ' + JSON.stringify(parser.getValueInfo().value));

    const newPath = this.BodyCardToPath(query.path, parser, parser.getValueInfo(), dbName);
    parser.updateCard();
    return { path: newPath, parser };
  }

  public static emptyPath()
  {
    return _Path();
  }

  public static BodyCardToPath(path: Path, parser: ESCardParser, bodyValueInfo: ESValueInfo, dbName: string, groupJoinKey?: string)
  {
    // Redistribute the bools from the source bool to the soft and hard filter bools
    // this.distributeSourceBoolFilters(parser, bodyValueInfo);
    // parser.updateCard();
    bodyValueInfo = parser.getValueInfo();
    if (groupJoinKey)
    {
      bodyValueInfo = bodyValueInfo.objectChildren.groupJoin.propertyValue.objectChildren[groupJoinKey].propertyValue;
    }
    const newSource = this.updateSource(path.source, parser, bodyValueInfo, dbName);
    const newScore = this.updateScore(path.score, parser, bodyValueInfo);
    const filterGroup = this.BodyToFilterSection(path.filterGroup, parser, bodyValueInfo, 'hard');
    const softFilterGroup = this.BodyToFilterSection(path.softFilterGroup, parser, bodyValueInfo, 'soft');
    const parentAlias = this.getParentAlias(parser, bodyValueInfo);
    const dropIfLessThan = this.getDropIfLessThan(parser, bodyValueInfo);
    let groupJoinPaths = this.getGroupJoinPaths(path.nested, parser, bodyValueInfo, parentAlias, dbName);
    groupJoinPaths = groupJoinPaths.map((p, i) =>
      p.set('minMatches', dropIfLessThan),
    );
    const newScripts = this.getScripts(path.more.scripts, parser, bodyValueInfo);
    const collapse = this.getCollapse(path.more.collapse, parser, bodyValueInfo);
    const trackScores = this.getTrackScores(parser, bodyValueInfo);
    const { source, customSource } = this.getSourceFields(path, parser, bodyValueInfo);
    const more = path.more
      .set('scripts', newScripts)
      .set('collapse', collapse)
      .set('trackScores', trackScores)
      .set('source', source)
      .set('customSource', customSource);

    const newPath = path
      .set('source', newSource)
      .set('score', newScore)
      .set('filterGroup', filterGroup)
      .set('softFilterGroup', softFilterGroup)
      .set('reference', parentAlias)
      .set('nested', List(groupJoinPaths))
      .set('more', more)
      .set('step', (
        newSource.dataSource as ElasticDataSource).index ?
        PathfinderSteps.Source + 1 : path.step);
    return newPath;
  }

  private static filterOpToComparisonsMap = {
    '>': {
      [FieldType.Numerical]: 'greater',
      [FieldType.Date]: 'dateafter',
      [FieldType.Text]: 'alphaafter',
    },
    '≥': {
      [FieldType.Numerical]: 'greaterequal',
      [FieldType.Date]: 'dateafter',
      [FieldType.Text]: 'alphaafter',
    },
    '<': {
      [FieldType.Numerical]: 'less',
      [FieldType.Date]: 'datebefore',
      [FieldType.Text]: 'alphabefore',
    },
    '≤': {
      [FieldType.Numerical]: 'lessequal',
      [FieldType.Date]: 'datebefore',
      [FieldType.Text]: 'alphabefore',
    },
    '=': 'equal',
    '≈': 'contains',
    'in': 'isin',
    'exists': 'exists',
  };

  private static filterNotOpToComparisonsMap = {
    '>': {
      [FieldType.Numerical]: 'lessequal',
      [FieldType.Date]: 'datebefore',
      [FieldType.Text]: 'alphabefore',
    },
    '≥': {
      [FieldType.Numerical]: 'less',
      [FieldType.Date]: 'datebefore',
      [FieldType.Text]: 'alphabefore',
    },
    '<': {
      [FieldType.Numerical]: 'greaterequal',
      [FieldType.Date]: 'dateafter',
      [FieldType.Text]: 'alphaafter',
    },
    '≤': {
      [FieldType.Numerical]: 'greater',
      [FieldType.Date]: 'dateafter',
      [FieldType.Text]: 'alphaafter',
    },
    '=': 'notequal',
    '≈': 'notcontain',
    'in': 'isnotin',
    'exists': 'notexists',
  };

  private static distributeSourceBoolFilters(parser: ESCardParser, body: ESValueInfo)
  {
    const sourceBool = parser.searchCard({
      'query:query': {
        'bool:elasticFilter': true,
      },
    }, body);
    if (!sourceBool)
    {
      return;
    }
    const hardBoolTemplate = {
      'query:query': {
        'bool:elasticFilter': {
          'filter:query[]':
            [{ 'bool:elasticFilter': true }],
        },
      },
    };
    const softBoolTemplate = {
      'query:query': {
        'bool:elasticFilter': {
          'should:query[]':
            [{ 'bool:elasticFilter': true }],
        },
      },
    };
    const newHardFilters = [];
    const newSoftFilters = [];
    if (sourceBool.card.otherFilters.size > 0)
    {
      sourceBool.card.otherFilters.map((filter: Block) =>
      {
        switch (filter.boolQuery)
        {
          case 'filter':
          case 'must':
            newHardFilters.push(filter.set('boolQuery', 'filter'));
            break;
          case 'filter_not':
          case 'must_not':
            newHardFilters.push(filter.set('boolQuery', 'filter_not'));
            break;
          default:
            newSoftFilters.push(filter);
            break;
        }
      });
      sourceBool.card = sourceBool.card.set('otherFilters', List([]));
      let hardBool;
      let softBool;
      if (newHardFilters.length > 0)
      {
        parser.createCardIfNotExist(hardBoolTemplate, body);
        hardBool = parser.searchCard(hardBoolTemplate, body);
        hardBool.card = hardBool.card.set('otherFilters', hardBool.card.otherFilters.concat(List(newHardFilters)));
        parser.isMutated = true;
      }
      if (newSoftFilters.length > 0)
      {
        parser.createCardIfNotExist(softBoolTemplate, body);
        softBool = parser.searchCard(softBoolTemplate, body);
        softBool.card = softBool.card.set('otherFilters', softBool.card.otherFilters.concat(List(newSoftFilters)));
        parser.isMutated = true;
      }

      // now let's check the nested query
      for (const t of ['filter', 'must', 'should', 'must_not'])
      {
        const typeString = t + ':query[]';
        const searchNestedTemplate = {
          [typeString]: [{ 'nested:nested_query': true }],
        };
        const nestedQuery = parser.searchCard(searchNestedTemplate, sourceBool, false, true);
        if (nestedQuery !== null && nestedQuery.length > 0)
        {
          const oldFilterValueInfo = sourceBool.objectChildren[t].propertyValue;
          let targetBool = hardBool;
          let targetClause = 'filter';
          if (t === 'should')
          {
            targetBool = softBool;
            targetClause = 'should';
          }
          if (!targetBool)
          {
            parser.createCardIfNotExist(targetClause === 'should' ? softBoolTemplate : hardBoolTemplate, body);
            targetBool = parser.searchCard(targetClause === 'should' ? softBoolTemplate : hardBoolTemplate, body);
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
                  PathToCards.transformBoolFilters(nestedBool, true);
                } else
                {
                  PathToCards.transformBoolFilters(nestedBool, false);
                }
                parser.deleteChild(oldFilterValueInfo, index);
                parser.addChild(targetClauseValueInfo, targetClauseValueInfo.arrayChildren.length, query);
              }
            }
          });
        }
      }
      // Look for geo distance queries to move into correct bools
      for (const t of ['filter', 'must', 'should'])
      {
        const typeString = t + ':query[]';
        const boolFilters = parser.searchCard(
          {
            [typeString]: true,
          },
          sourceBool,
        );
        if (boolFilters && boolFilters.arrayChildren && boolFilters.arrayChildren.length)
        {
          const geoQueries = [];
          boolFilters.forEachElement((child, index) =>
          {
            if (child && child.objectChildren.geo_distance)
            {
              geoQueries.push(child);
              parser.deleteChild(boolFilters, index);
            }
          });
          if (geoQueries.length > 0)
          {

            let targetBool = hardBool;
            let targetClause = 'filter';
            if (t === 'should')
            {
              targetBool = softBool;
              targetClause = 'should';
            }
            if (!targetBool)
            {
              parser.createCardIfNotExist(targetClause === 'should' ? softBoolTemplate : hardBoolTemplate, body);
              targetBool = parser.searchCard(targetClause === 'should' ? softBoolTemplate : hardBoolTemplate, body);
            }
            if (targetBool.objectChildren[targetClause] === undefined)
            {
              const targetClausePattern = targetClause + ':query[]';
              parser.createCardIfNotExist({
                [targetClausePattern]: [],
              }, targetBool);
            }
            const targetClauseValueInfo = targetBool.objectChildren[targetClause].propertyValue;
            geoQueries.map((child, index) =>
            {
              parser.addChild(targetClauseValueInfo, targetClauseValueInfo.arrayChildren.length, child);
            });
          }
        }
      }
    }
    // if the bool:elasticFilter in the softbool do not have the dummy filter, we should add one.
    const theSoftBool = parser.searchCard(softBoolTemplate, body);
    if (theSoftBool !== null)
    {
      theSoftBool.recursivelyVisit((element: ESValueInfo) =>
      {
        const theCard = element.card;
        if (theCard.type === 'elasticFilter')
        {
          if (theCard.dummyFilters.size === 0)
          {
            const dummyBlock = BlockUtils.make(ElasticBlocks, 'elasticFilterBlock',
              {
                field: '_id',
                value: ' ',
                boolQuery: 'filter',
                filterOp: 'exists',
              }, true);
            element.card = theCard.set('dummyFilters', List([dummyBlock]));
            parser.isMutated = true;
          }
        }
        return true;
      });
    }
  }

  private static TerrainFilterBlockToFilterLine(row: Block): FilterLine
  {
    let comparison;
    if (row.boolQuery === 'should_not' || row.boolQuery === 'filter_not')
    {
      comparison = this.filterNotOpToComparisonsMap[row.filterOp];
      if (typeof comparison === 'object')
      {
        comparison = row.fieldType !== undefined && row.fieldType !== null && row.fieldType !== FieldType.Any ?
          comparison[row.fieldType] : comparison[FieldType.Numerical];
      }
      if (comparison === undefined)
      {
        // we can't express this comparison in the pathfinder
        return null;
      }
    } else
    {
      comparison = this.filterOpToComparisonsMap[row.filterOp];
      if (typeof comparison === 'object')
      {
        comparison = row.fieldType !== undefined && row.fieldType !== null && row.fieldType !== FieldType.Any ?
          comparison[row.fieldType] : comparison[FieldType.Numerical];
      }
    }

    const template = {
      field: row.field,
      value: row.value,
      comparison,
      boost: row.boost === '' ? 1 : Number(row.boost),
      fieldType: row.fieldType,
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
    let newLines = List([]);

    // handle normal filter lines first
    if (sectionType === 'hard')
    {
      // all hard bool has higher priority
      if (filterRowMap.filter.length > 0)
      {
        // set the filtergroup to
        filterGroup = filterGroup.set('minMatches', 'all');
        newLines = List(filterRowMap.filter.map(
          (row) => this.TerrainFilterBlockToFilterLine(row)).filter((filter) => filter !== null));
      } else if (isInnerGroup === true)
      {
        // any hard bool has lower priority
        if (filterRowMap.should.length > 0)
        {
          // set the filtergroup to
          filterGroup = filterGroup.set('minMatches', 'any');
          newLines = List(filterRowMap.should.map(
            (row) => this.TerrainFilterBlockToFilterLine(row)).filter((filter) => filter !== null));
        }
      }
    }
    else
    {
      // only check any bool in the soft section
      if (filterRowMap.should.length > 0)
      {
        // set the filtergroup to
        filterGroup = filterGroup.set('minMatches', 'any');
        newLines = List(filterRowMap.should.map(
          (row) => this.TerrainFilterBlockToFilterLine(row)).filter((filter) => filter !== null));
      }
    }
    // Look for Geo Distance Queries
    const geoDistanceLines = this.processGeoDistanceFilters(filterGroup, parser, boolValueInfo, sectionType);
    // handle nested groups
    const newNestedGroupLines = this.processInnerFilterGroup(filterGroup, parser, boolValueInfo, sectionType);
    const newNestedQueryLines = this.processNestedQueryFilterGroup(filterGroup, parser, boolValueInfo, sectionType);
    newLines = newLines.concat(newNestedGroupLines).concat(newNestedQueryLines).concat(geoDistanceLines).toList();
    TerrainLog.debug('B->P(Bool): Generate ' + String(newLines.size) + ' filter lines ' +
      '(Nested Group' + String(newNestedGroupLines.size) + ').' +
      '(Nested Query' + String(newNestedQueryLines.size) + ').');
    filterGroup = filterGroup.set('lines', newLines);
    return filterGroup;
  }

  private static processGeoDistanceFilters(parentFilterGroup: FilterGroup, parser: ESCardParser, parentBool: ESValueInfo, section: 'soft' | 'hard')
  {
    let from;
    let filterLines = List([]);
    if (parentFilterGroup.minMatches === 'all' && section === 'hard')
    {
      // let's search childBool from parentBool: { filter : [Bool, Bool, Bool]
      from = parentBool.objectChildren.filter;
    }
    else if (parentFilterGroup.minMatches === 'any' || section === 'soft')
    {
      from = parentBool.objectChildren.should;
    }
    if (from)
    {
      const queries = from.propertyValue;
      if (queries.jsonType === ESJSONType.array)
      {
        queries.forEachElement((query: ESValueInfo) =>
        {
          if (query.card.cards.get(0) && query.card.cards.get(0).type === 'elasticDistance')
          {
            const distanceCard = query.card.cards.get(0);
            const filterLine = _FilterLine({
              field: distanceCard.field,
              fieldType: FieldType.Geopoint,
              comparison: 'located',
              value: {
                location: distanceCard.locationValue,
                address: distanceCard.mapInputValue,
                distance: distanceCard.distance,
                units: distanceCard.distanceUnit,
                zoom: distanceCard.mapZoomValue,
              },
              boost: distanceCard.boost,
            });
            filterLines = filterLines.push(filterLine);
          }
        });
      }
      else if (queries.jsonType === ESJSONType.object)
      {
        if (queries.card.cards.get(0) && queries.card.cards.get(0).type === 'elasticDistance')
        {
          const distanceCard = queries.card.cards.get(0);
          const filterLine = _FilterLine({
            field: distanceCard.field,
            fieldType: FieldType.Geopoint,
            comparison: 'located',
            value: {
              location: [distanceCard.locationValue.lat, distanceCard.locationValue.lon],
              address: distanceCard.mapInputValue,
              distance: distanceCard.distance,
              units: distanceCard.distanceUnit,
              zoom: distanceCard.mapZoomValue,
            },
            boost: distanceCard.boost,
          });
          filterLines = filterLines.push(filterLine);
        }
      }
    }
    return filterLines;
  }

  private static extractNestedQueryToFilter(queries: ESValueInfo, parser: ESCardParser, flip: boolean = false)
  {
    const filters = [];
    queries.forEachElement((query: ESValueInfo) =>
    {
      if (query.objectChildren.nested)
      {
        const nestedQuery = query.objectChildren.nested.propertyValue;
        const boolQuery = parser.searchCard({ 'query:query': { 'bool:elasticFilter': true } }, nestedQuery);
        if (boolQuery !== null)
        {
          // create filter group
          // let newFilterGroup = _FilterGroup();
          boolQuery.card.otherFilters.forEach((filter) =>
          {
            // TODO convert boolQuery from must to filter ?
            let line = this.TerrainFilterBlockToFilterLine(filter);
            if (line)
            {
              if (flip)
              {
                // we only handle `exits`, `equal`, and `isin`
                let keep = true;
                switch (line.comparison)
                {
                  case 'exists':
                    line = line.set('comparison', 'notexists');
                    break;
                  case 'equal':
                    line = line.set('comparison', 'notequal');
                    break;
                  case 'isin':
                    line = line.set('comparison', 'isnotin');
                    break;
                  default:
                    keep = false;
                }
                if (keep === true)
                {
                  filters.push(line);
                }
              } else
              {
                filters.push(line);
              }
            }
          });
        }
      }
    });
    return filters;
  }

  private static processNestedQueryFilterGroup(parentFilterGroup: FilterGroup, parser: ESCardParser, parentBool: ESValueInfo, sectionType: 'hard' | 'soft')
  {
    // let search whether we have an inner bool or not
    let from;
    if (parentFilterGroup.minMatches === 'all' && sectionType === 'hard')
    {
      // let's search childBool from parentBool: { filter : [Bool, Bool, Bool]
      from = parentBool.objectChildren.filter;
    } else
    {
      from = parentBool.objectChildren.should;
    }

    let newLines = [];
    if (from)
    {
      const queries = from.propertyValue;
      if (queries.jsonType === ESJSONType.array)
      {
        const r = this.extractNestedQueryToFilter(queries, parser);
        newLines = newLines.concat(r);
      }
    }

    // negative filter lines
    if (parentBool.objectChildren.must_not)
    {
      const queries = parentBool.objectChildren.must_not.propertyValue;
      if (queries.jsonType === ESJSONType.array)
      {
        const r = this.extractNestedQueryToFilter(queries, parser, true);
        newLines = newLines.concat(r);
      }
    }
    return List(newLines);
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
            let newFilterGroup: FilterGroup = _FilterGroup();
            const boolValueInfo = query.objectChildren.bool.propertyValue;
            newFilterGroup = this.BoolToFilterGroup(newFilterGroup, parser, boolValueInfo, sectionType, true);
            newLines.push(_FilterLine().set('filterGroup', newFilterGroup));
          }
        });
      }
    }
    return List(newLines);
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
    }
    else
    {
      return this.BoolToFilterGroup(filterGroup, parser, theBool, filterSection);
    }
  }

  private static getDropIfLessThan(parser: ESCardParser, bodyValueInfo: ESValueInfo)
  {
    const dropIfLessThanValueInfo = parser.searchCard(
      { 'groupJoin:groupjoin_clause': { 'dropIfLessThan:number': true } }, bodyValueInfo);
    if (dropIfLessThanValueInfo === null)
    {
      return 0;
    }
    else
    {
      return dropIfLessThanValueInfo.value;
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

  private static getGroupJoinPaths(paths: List<Path>, parser: ESCardParser, body: ESValueInfo, parentAlias: string, dbName: string)
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
      const newParser = new ESCardParser(joinBodyMap[key].card);
      const p = this.BodyCardToPath(oldPath, parser, joinBodyMap[key], dbName, key).set('name', key);
      TerrainLog.debug('(B->P) Turn groupJoin body ', joinBodyMap[key], ' to path', p);
      newPaths.push(p);
    }
    return newPaths;
  }

  private static getCollapse(collapse: string, parser: ESCardParser, body: ESValueInfo): string | undefined
  {
    const rootVal = body.value;
    if (rootVal.hasOwnProperty('collapse'))
    {
      return rootVal.collapse.field;
    }
    return undefined;
  }

  private static getScripts(scripts: List<Script>, parser: ESCardParser, body: ESValueInfo): List<Script>
  {
    const rootVal = body.value;
    if (rootVal.hasOwnProperty('script_fields'))
    {
      return List(_.keys(rootVal.script_fields).map((key) =>
      {
        const script = rootVal.script_fields[key];
        const oldScript = scripts.filter((scr) => scr.name === key).toList().get(0); // Look at old script
        return _Script({
          name: key,
          script: script.script && script.script.inline,
          params: (script.script && script.script.params) ?
            _.keys(script.script.params).map((paramKey) =>
            {
              return {
                name: paramKey,
                value: script.script.params[paramKey],
              };
            })
            : [],
          userAdded: oldScript !== undefined ? oldScript.userAdded : true,
        });
      },
      ));
    }
    return List([]);
  }

  private static getTrackScores(parser: ESCardParser, body: ESValueInfo): boolean
  {
    const rootVal = body.value;
    if (rootVal.hasOwnProperty('track_scores'))
    {
      return rootVal.track_scores;
    }
    return true;
  }

  private static getSourceFields(path: Path, parser: ESCardParser, body: ESValueInfo): { source: List<string>, customSource: boolean }
  {
    const rootVal = body.value;
    if (rootVal.hasOwnProperty('_source') && Array.isArray(rootVal._source))
    {
      return { source: List(rootVal._source), customSource: true };
    }
    return { source: path.more.source, customSource: false };
  }

  private static updateSource(source: Source, parser: ESCardParser, body: ESValueInfo, dbName: string): Source
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
      source = source.set('count', 'all');
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
    source = source.setIn(['dataSource', 'server'], dbName);

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
      mode: transCard.mode || 'linear',
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
