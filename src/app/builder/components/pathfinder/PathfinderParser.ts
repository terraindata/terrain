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
import * as _ from 'lodash';
import { Query } from '../../../../items/types/Query';
import { DistanceValue, FilterGroup, FilterLine, More, Path, Score, Source } from './PathfinderTypes';

export function parsePath(path: Path): string
{
  const baseQuery = {
    query: {
      bool: {
        filter: [],
        must: [],
        must_not: [],
        should: [],
      },
    },
    sort: {},
    aggs: {},
    from: 0,
    size: 1000,
    track_scores: true,
  };
  const sourceInfo = parseSource(path.source);
  baseQuery.from = sourceInfo.from;
  baseQuery.size = sourceInfo.size;
  baseQuery.query.bool.filter =
    [
      {
        term: {
          _index: sourceInfo.index.split('/')[1],
        },
      },
    ];
  if (path.score.lines.size)
  {
    const sortObj = parseScore(path.score);
    baseQuery.sort = sortObj;
  }

  const filterObj = parseFilters(path.filterGroup);
  filterObj.bool.filter.concat(baseQuery.query.bool.filter);
  baseQuery.query = filterObj;
  const moreObj = parseMore(path.more);
  baseQuery.aggs = moreObj;
  return JSON.stringify(baseQuery, null, 2);
}

function parseSource(source: Source): any
{
  return {
    from: source.start,
    size: typeof source.count !== 'string' ? source.count : 1000,
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
      return { _score: { order: 'asc' } };
    case 'random':
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
  const factors = score.lines.map((line) =>
  {
    let ranges = [];
    let outputs = [];
    let data;
    const min = line.transformData.dataDomain[0];
    const max = line.transformData.dataDomain[1];
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
      ranges,
      outputs,
    };
  }).toArray();
  sortObj._script.script.params.factors = factors;
  return sortObj;
}

function parseFilters(filterGroup: FilterGroup): any
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
  const filterObj = {
    bool: {
      filter: [],
      must: [],
      must_not: [],
      should: [],
    },
  };
  const must = [];
  const mustNot = [];
  const filter = [];
  const should = [];
  let useShould = false;
  if (filterGroup.minMatches !== 'all')
  {
    useShould = true;
  }
  filterGroup.lines.forEach((line) =>
  {
    if (!line.filterGroup)
    {
      const lineInfo = parseFilterLine(line);
      if (useShould)
      {
        should.push(lineInfo);
      }
      else if (line.comparison === 'notequal' || line.comparison === 'notcontain')
      {
        mustNot.push(lineInfo);
      }
      else if (line.comparison === 'located') // TODO MAYBE ADD NON-TEXT FILTERS HERE AS WELL
      {
        filter.push(lineInfo);
      }
      else
      {
        must.push(lineInfo);
      }
    }
    else
    {
      const nestedFilter = parseFilters(line.filterGroup);
      must.push(nestedFilter);
    }
  });
  if (useShould)
  {
    filterObj.bool['minimum_should_match'] = filterGroup.minMatches === 'any' ? 1 : filterGroup.minMatches;
  }
  filterObj.bool.must = must;
  filterObj.bool.must_not = mustNot;
  filterObj.bool.should = should;
  filterObj.bool.filter = filter;
  return filterObj;
}

function parseFilterLine(line: FilterLine)
{
  switch (line.comparison)
  {
    case 'equal':
      return {
        term: {
          [line.field]: String(line.value),
        },
      };
    case 'contains':
      return {
        match: {
          [line.field]: line.value,
        },
      };
    case 'notequal':
      return {
        term: {
          [line.field]: line.value,
        },
      };
    case 'notcontain':
      return {
        match: {
          [line.field]: line.value,
        },
      };
    case 'greater':
    case 'alphaafter':
    case 'dateafter':
      return {
        range: {
          [line.field]:
          {
            gt: line.value,
          },
        },
      };
    case 'less':
    case 'alphabefore':
    case 'datebefore':
      return {
        range: {
          [line.field]:
          {
            lt: line.value,
          },
        },
      };
    case 'greaterequal':
      return {
        range: {
          [line.field]:
          {
            gte: line.value,
          },
        },
      };
    case 'lessequal':
      return {
        range: {
          [line.field]:
          {
            lte: line.value,
          },
        },
      };
    case 'located':
      const distanceObj = line.value as DistanceValue;
      return {
        geo_distance: {
          distance: String(distanceObj.distance) + distanceObj.units,
          [line.field]: distanceObj.location,
        },
      };
    default:
      return {};
  }
}
// public field: string = '';
// public name: string = '';
// // Type is the human readable version of elasticType
// // e.g. type = Full Statistics, elasticType = extended_stats
// public elasticType: string = '';
// public type: string = '';
// public advanced: any = Map<string, any>({});
// public expanded: boolean = false;
// public sampler: Sample = undefined;
// public filters: FilterGroup = undefined;
// public nested: List<AggregationLine> = undefined;
// public scripts: List<Script> = undefined;
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
];
function parseMore(more: More)
{
  const moreObj = {};
  more.aggregations.forEach((agg) =>
  {
    const advanced = agg.advanced.toJS();
    const advancedObj = { field: agg.field };
    _.keys(advanced).forEach((key) =>
    {
      if (unusedKeys.indexOf(key) === -1)
      {
        if (key === 'missing' || key === 'sigma')
        {
          advancedObj[key] = parseFloat(advanced[key]);
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
      else if (key === 'termsType')
      {
        advancedObj.field = advancedObj.field + '.keyword';
      }
      else if (key === 'rangeType')
      {
        advancedObj[advanced['rangeType']] = advanced[advanced['rangeType']];
      }
      else if (key === 'min')
      {
        advancedObj['extended_bounds'] = { min: parseFloat(advanced['min']), max: parseFloat(advanced['max']) };
      }
    });
    moreObj[agg.advanced.get('name')] = {
      [agg.elasticType]: advancedObj,
    };

  });
  return moreObj;
}
