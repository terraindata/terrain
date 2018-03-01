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
import { DistanceValue, FilterGroup, FilterLine, More, Path, Score, Source } from './PathfinderTypes';

export function parsePath(path: Path, inputs, ignoreInputs?: boolean): any
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
  let filterObj = parseFilters(path.filterGroup, inputs);
  filterObj = filterObj.setIn(['bool', 'filter'],
    filterObj.getIn(['bool', 'filter'])
      .concat(baseQuery.getIn(['query', 'bool', 'filter'])));
  baseQuery = baseQuery.set('query', filterObj);
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
  const moreObj = parseAggregations(path.more);
  baseQuery = baseQuery.set('aggs', Map(moreObj));
  const groupJoin = parseNested(path.more, path.nested, inputs);
  if (groupJoin)
  {
    baseQuery = baseQuery.set('groupJoin', groupJoin);
  }
  if (ignoreInputs)
  {
    return baseQuery;
  }
  const text = stringifyWithParameters(baseQuery.toJS(), (name) => isInput(name, inputs));
  const parser: ESJSONParser = new ESJSONParser(text, true);
  return ESParseTreeToCode(parser, {}, inputs);
}

function parseSource(source: Source): any
{
  const count = parseFloat(String(source.count));
  return {
    from: source.start,
    size: !isNaN(count) ? count : 1000, // if it is all results, just default to 1000 ? change...
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

function parseFilters(filterGroup: FilterGroup, inputs): any
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
    else
    {
      const nestedFilter = parseFilters(line.filterGroup, inputs);
      must = must.push(nestedFilter);
    }
  });
  if (useShould)
  {
    filterObj = filterObj.setIn(['bool', 'minimum_should_match'],
      filterGroup.minMatches === 'any' ? 1 : parseFloat(String(filterGroup.minMatches)));
  }
  filterObj = filterObj.setIn(['bool', 'must'], must);
  filterObj = filterObj.setIn(['bool', 'must_not'], mustNot);
  filterObj = filterObj.setIn(['bool', 'should'], should);
  filterObj = filterObj.setIn(['bool', 'filter'], filter);
  return filterObj;
}

function parseFilterLine(line: FilterLine, useShould: boolean, inputs)
{
  const lineValue = String(line.value);
  let value: any = String(line.value || '');
  const boost = typeof line.weight === 'string' ? parseFloat(line.weight) : line.weight;
  // Parse date
  if (line.comparison === 'datebefore' || line.comparison === 'dateafter')
  {
    value = Util.formatInputDate(new Date(value), 'elastic');
  }
  switch (line.comparison)
  {
    case 'exists':
      return Map({
        exists: Map({
          field: line.field,
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
              }),
            }),
          }),
        });
      }
      return Map({
        match: Map({
          [line.field]: Map({
            query: String(line.value || ''),
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
    // const distanceObj = line.value as DistanceValue;
    // return Map({
    //   geo_distance: Map({
    //     distance: String(distanceObj.distance) + distanceObj.units,
    //     [line.field]: [distanceObj.location[1], distanceObj.location[0]],
    //   }),
    // });
    case 'isin':
    case 'isnotin':
      try {
        return Map({
          terms : { [line.field] : JSON.parse(String(value).toLowerCase())}
        });
      }
      catch {
       // Try to split it along commas and create own value
       if (typeof value === 'string' && value[0] !== '@')
       {
       value = value.replace(/\s/g, '').replace(/\[/g, '').replace(/\]/g, '');
         let pieces = value.split(',');
         pieces = pieces.map((piece) => piece.toLowerCase());
         return Map({
           terms: {[line.field]: pieces}
         });
       }
       return Map({
          terms : { [line.field] : value}
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
