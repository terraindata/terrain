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
import { Query } from '../../../../items/types/Query';
import { DistanceValue, FilterGroup, FilterLine, More, Path, Score, Source } from './PathfinderTypes';
import {FieldType} from '../../../../database/elastic/blocks/ElasticBlockHelpers';

export function parsePath(path: Path): string
{
  let baseQuery = Map({
    query: Map({
      bool: Map({
        filter: List([]),
        must: List([]),
        should: List([]),
        must_not: List([]),
      }),
    }),
    sort: Map({}),
    aggs: Map({}),
    from: 0,
    size: 1000,
    track_scores: true,
  });
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
  let filterObj = parseFilters(path.filterGroup);
  filterObj = filterObj.setIn(['bool', 'filter'],
    filterObj.getIn(['bool', 'filter'])
      .concat(baseQuery.getIn(['query', 'bool', 'filter'])));
  baseQuery = baseQuery.set('query', filterObj);
  if ((path.score.type !== 'terrain' && path.score.type !== 'linear') || path.score.lines.size)
  {
    const sortObj = parseScore(path.score);
    if (path.score.type !== 'random')
    {
      baseQuery = baseQuery.set('sort', sortObj);
    }
    else
    {
      baseQuery = baseQuery.setIn(['query', 'bool', 'filter'],
        baseQuery.getIn(['query', 'bool', 'filter']).push(sortObj));
    }
  }
  const moreObj = parseMore(path.more);
  baseQuery = baseQuery.set('aggs', Map(moreObj));
  return JSON.stringify(baseQuery.toJS(), null, 2);
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
      return {
        function_score: {
          random_score: {
            seed: 10,
          },
          query: {},
        },
      };
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
  if (filterGroup.minMatches !== 'all')
  {
    useShould = true;
  }
  filterGroup.lines.forEach((line) =>
  {
    if (!line.filterGroup)
    {
      const lineInfo = parseFilterLine(line, useShould);
      if (useShould)
      {
        should = should.push(lineInfo);
      }
      else if (line.comparison === 'notequal' || line.comparison === 'notcontain')
      {
        mustNot = mustNot.push(lineInfo);
      }
      else if (line.comparison === 'located') // TODO MAYBE ADD NON-TEXT FILTERS HERE AS WELL
      {
        filter = filter.push(lineInfo);
      }
      else
      {
        must = must.push(lineInfo);
      }
    }
    else
    {
      const nestedFilter = parseFilters(line.filterGroup);
      must = must.push(nestedFilter);
    }
  });
  if (useShould)
  {
    filterObj = filterObj.setIn(['bool', 'minimum_should_match'], filterGroup.minMatches === 'any' ? 1 : filterGroup.minMatches);
  }
  filterObj = filterObj.setIn(['bool', 'must'], must);
  filterObj = filterObj.setIn(['bool', 'must_not'], mustNot);
  filterObj = filterObj.setIn(['bool', 'should'], should);
  filterObj = filterObj.setIn(['bool', 'filter'], filter);
  return filterObj;
}

function parseFilterLine(line: FilterLine, useShould: boolean)
{
  switch (line.comparison)
  {
    case 'equal':
      return Map({
        term: Map({
          [line.field]: Map({
            value: line.value,
            boost: line.weight,
          }),
        }),
      });
    case 'contains':
      return Map({
        match: Map({
          [line.field]: Map({
            query: String(line.value),
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
                  value: String(line.value),
                  boost: line.weight,
                }),
              }),
            }),
          }),
        });
      }
      return Map({
        term: Map({
          [line.field]: Map({
            value: String(line.value),
            boost: line.weight,
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
                  query: String(line.value),
                }),
              }),
            }),
          }),
        });
      }
      return Map({
        match: Map({
          [line.field]: Map({
            query: String(line.value),
          }),
        }),
      });
    case 'greater':
    case 'alphaafter':
    case 'dateafter':
      return Map({
        range: Map({
          [line.field]:
          Map({
            gt: line.value,
            boost: line.weight,
          }),
        }),
      });
    case 'less':
    case 'alphabefore':
    case 'datebefore':
      return Map({
        range: Map({
          [line.field]:
          Map({
            lt: line.value,
            boost: line.weight,
          }),
        }),
      });
    case 'greaterequal':
      return Map({
        range: Map({
          [line.field]:
          Map({
            gte: line.value,
            boost: line.weight,
          }),
        }),
      });
    case 'lessequal':
      return Map({
        range: Map({
          [line.field]:
          Map({
            lte: line.value,
            boost: line.weight,
          }),
        }),
      });
    case 'located':
      const distanceObj = line.value as DistanceValue;
      return Map({
        geo_distance: Map({
          distance: String(distanceObj.distance) + distanceObj.units,
          [line.field]: distanceObj.location,
        }),
      });
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
function parseMore(more: More): {}
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
        else if (key === 'sortField')
        {
          advancedObj['order'] = {[advanced['sortField']]: advanced['order']};
        }
      });
      moreObj[agg.advanced.get('name')] = {
        [agg.elasticType]: advancedObj,
      };
    }
  });
  return moreObj;
}
