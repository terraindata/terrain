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
import {
  _FilterGroup,
  _FilterLine,
  _ScoreLine,
  FilterGroup,
  FilterLine,
  Path,
  Score,
  ScoreLine,
  Source,
  sourceCountOptions
} from 'builder/components/pathfinder/PathfinderTypes';
import ESCardParser from '../../../../database/elastic/conversion/ESCardParser';
import * as TerrainLog from 'loglevel';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import Block from '../../../../blocks/types/Block';
import ESJSONType from '../../../../../shared/database/elastic/parser/ESJSONType';
import {List} from 'immutable';

export class CardsToPath
{
  public static updatePath(query: Query): Path
  {
    const rootCard = query.cards.get(0);
    if (rootCard === undefined)
    {
      // the card is empty
      console.log('There is no card at all.');
      return query.path;
    }

    // let's parse the card
    const parsedCard = new ESCardParser(rootCard);
    if (parsedCard.hasError())
    {
      TerrainLog.debug('Avoid updating path since card side has errors: ', parsedCard.getErrors());
      return query.path;
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
    };
    return _FilterLine(template);
  }

  private static BoolToFilterGroup(boolValueInfo: ESValueInfo, filterGroup: FilterGroup, boolType: "hard" | "soft", isInnerGroup: boolean = false): FilterGroup
  {
    const boolCard = boolValueInfo.card;

    const filterRows = boolCard['otherFilters'];
    const filterRowMap = {filter: [], filter_not: [], must: [], must_not: [], should: [], should_not: []};

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

  private static updateInnerFilterGroup(parentFilterGroup: FilterGroup, parentBool: ESValueInfo, boolType: "hard" | "soft"): FilterGroup
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
      filterGroup = this.BoolToFilterGroup(hardBool, filterGroup, 'hard');
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


  private static updateSource(source: Source, parsedCard: ESCardParser): Source
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
