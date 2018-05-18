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
import { PathToCards } from 'builder/components/pathfinder/PathToCards';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as TerrainLog from 'loglevel';
import { FieldType } from '../../../../../shared/builder/FieldTypes';
import ESJSONParser from '../../../../../shared/database/elastic/parser/ESJSONParser';
import ESJSONType from '../../../../../shared/database/elastic/parser/ESJSONType';
import { isInput } from '../../../../blocks/types/Input';
import { ESParseTreeToCode, stringifyWithParameters } from '../../../../database/elastic/conversion/ParseElasticQuery';
import { _FilterGroup, DistanceValue, FilterGroup, FilterLine, More, Path, Score, Script, Source } from './PathfinderTypes';

export const PathFinderDefaultSize = 101;
const NEGATIVES = ['notcontain', 'notequal', 'isnotin', 'notexists'];
const FlipNegativeMap = {
  notcontain: 'contain',
  notequal: 'equal',
  isnotin: 'isin',
  notexists: 'exists',
};

export function parsePath(path: Path, inputs, ignoreInputs?: boolean): any
{
  const queryBody = {
    query: {
      bool: {
        filter: [],
        should: [],
      },
    },
    from: 0,
    size: PathFinderDefaultSize,
    track_scores: path.more.trackScores,
    _source: true,
  };
  const sourceBool = queryBody.query.bool;

  // Sources
  const sourceInfo = parseSource(path.source);
  queryBody.from = sourceInfo.from;
  if (sourceInfo.size !== 'all')
  {
    queryBody.size = sourceInfo.size;
  }
  const indexQuery = {
    term: {
      _index: sourceInfo.index,
    },
  };
  sourceBool.filter.push(indexQuery);

  // Filters
  const filterObj = parseFilters(path.filterGroup, inputs);
  sourceBool.filter.push(filterObj);
  const softFiltersObj = parseFilters(path.softFilterGroup, inputs, true);
  sourceBool.should.push(softFiltersObj);

  // filterObj = filterObj.setIn(['bool', 'should'], softFiltersObj);
  // (originalShould) => originalShould.concat(baseQuery.getIn(['query', 'bool', 'should'])));

  // Scores

  if ((path.score.type !== 'terrain' && path.score.type !== 'linear') || path.score.lines.size)
  {
    let sortObj = parseScore(path.score, true);
    if (path.score.type !== 'random')
    {
      queryBody['sort'] = sortObj;
    }
    else
    {
      sortObj = sortObj['function_score']['query'] = queryBody.query;
      queryBody.query = sortObj;
      delete queryBody['sort'];
    }
  }

  const collapse = path.more.collapse;
  if (collapse)
  {
    queryBody['collapse'] = { field: collapse };
  }
  // _source
  if (path.more.customSource)
  {
    queryBody._source = path.more.source.toJS();
  }

  // Scripts
  const scripts = parseScripts(path.more.scripts);
  queryBody['script_fields'] = scripts;

  // Nested algorithms (groupjoins)
  const groupJoin = parseGroupJoin(path.reference, path.nested, inputs);
  if (groupJoin)
  {
    queryBody['groupJoin'] = groupJoin;
  }

  // Export, without inputs
  if (ignoreInputs)
  {
    return queryBody;
  }

  // Export, with inputs
  const text = stringifyWithParameters(queryBody, (name) => isInput(name, inputs));
  const parser: ESJSONParser = new ESJSONParser(text, true);
  return ESParseTreeToCode(parser, {}, inputs);

  // TODO
  // const moreObj = parseAggregations(path.more);
  // baseQuery = baseQuery.set('aggs', Map(moreObj));
}

function parseSource(source: Source): any
{
  const count = parseFloat(String(source.count));
  return {
    from: source.start,
    size: !isNaN(parseFloat(String(count))) ? parseFloat(String(count)) : 'all',
    index: (source.dataSource as any).index,
  };
}

export function parseScore(score: Score, simpleParser: boolean = false): any
{
  switch (score.type)
  {
    case 'terrain':
      return parseTerrainScore(score, simpleParser);
    case 'linear':
      return parseLinearScore(score);
    case 'elastic':
      return { _score: { order: 'desc' } };
    case 'random':
      return {
        function_score: {
          boost_mode: 'sum',
          random_score: {
            seed: score.seed,
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

function parseTerrainScore(score: Score, simpleParser: boolean = false)
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
    if (simpleParser)
    {
      return {
        a: 0,
        b: 1,
        mode: line.transformData.mode,
        visiblePoints: {
          ranges: line.transformData.visiblePoints.map((scorePt) => scorePt.value).toArray(),
          outputs: line.transformData.visiblePoints.map((scorePt) => scorePt.score).toArray(),
        },
        weight: typeof line.weight === 'string' ? parseFloat(line.weight) : line.weight,
        numerators: [[line.field, 1]],
        denominators: [],
        ranges,
        outputs,
      };
    }
    return {
      dataDomain: List(line.transformData.dataDomain),
      domain: List(line.transformData.domain),
      mode: line.transformData.mode || 'linear',
      hasCustomDomain: line.transformData.hasCustomDomain,
      input: line.field,
      scorePoints: line.transformData.scorePoints,
      visiblePoints: line.transformData.visiblePoints,
      weight: line.weight,
    };
  }).toArray();
  sortObj._script.script.params.factors = factors;
  if (dirty)
  {
    return simpleParser ? {} : [];
  }
  return simpleParser ? sortObj : factors || [];
}

/*
 * Generate a bool query from a filtergroup.
 */
function parseFilters(filterGroup: FilterGroup, inputs, isSoftGroup = false, ignoreNested = false): any
{
  const filterQuery = { bool: { filter: [], should: [] } };
  const filterBool = filterQuery.bool;
  let filterClause = filterBool.filter;
  if (isSoftGroup === true)
  {
    // make sure the bool is softbool
    const dummyQuery = {
      exists: {
        field: '_id',
      },
    };
    filterBool.filter.push(dummyQuery);
  }
  if (filterGroup.minMatches === 'any' || isSoftGroup === true)
  {
    filterClause = filterBool.should;
  }

  const filterMap = PathToCards.MapFilterGroup(filterGroup, ignoreNested);
  // normal filter lines first
  filterMap.filter.map((line: FilterLine) =>
  {
    const q = filterLineToQuery(line);
    if (q !== null)
    {
      filterClause.push(q);
    }
  });
  // then inner groups
  filterMap.group.map((line: FilterLine) =>
  {
    const boolQuery = parseFilters(line.filterGroup, inputs, isSoftGroup, ignoreNested);
    filterClause.push(boolQuery);
  });

  const filterLinePathMap = {};
  filterMap.nested.map((line: FilterLine) =>
  {
    const path = line.field.split('.')[0];
    if (filterLinePathMap[path])
    {
      filterLinePathMap[path].push(line);
    }
    else
    {
      filterLinePathMap[path] = [line];
    }
  });
  _.keys(filterLinePathMap).forEach((path, i) =>
  {
    const group = _FilterGroup({ lines: List(filterLinePathMap[path]), minMatches: filterGroup.minMatches });
    const boolQuery = parseFilters(group, inputs, isSoftGroup, true);
    // put the boolQuery in the wrapper
    const nestedQuery = {
      nested: {
        path,
        score_mode: 'avg',
        ignore_unmapped: true,
        query: boolQuery,
      },
    };
    filterClause.push(nestedQuery);
  });

  filterMap.negativeNested.map((line: FilterLine) =>
  {
    const q = nestedFilterLineToQuery(line);
    if (q !== null)
    {
      filterClause.push(q);
    }
  });

  return filterQuery;
}

/*
 * Turn the filter line value to an array.
 * If the value is an JSON string already, return the parsed array
 * If the value is an input parameter, return the parameter value ('@name')
 * Otherwise, try to produce one by spliting the value with ','
 */
export function PathFinderStringToJSONArray(value: string)
{
  const p = new ESJSONParser(value);
  if (p.hasError())
  {
    // try to split it manualy
    value = value.replace(/\[/g, '').replace(/\]/g, '');
    let pieces: any = value.split(',');
    pieces = pieces.map((piece) =>
    {
      piece = piece.toLowerCase().trim();
      const isNumberValue = !isNaN(piece as any) && (!isNaN(parseFloat(piece)));
      if (isNumberValue)
      {
        return parseFloat(piece);
      } else
      {
        return piece;
      }
    });
    return pieces;
  } else
  {
    const rootValue = p.getValueInfo();
    if (rootValue.jsonType === ESJSONType.parameter || rootValue.jsonType === ESJSONType.array)
    {
      return rootValue.value;
    } else
    {
      return [rootValue.value];
    }
  }
}

function nestedFilterLineToQuery(line: FilterLine)
{
  const path = line.field.split('.')[0];
  const boost = typeof line.boost === 'string' ? parseFloat(line.boost) : line.boost;
  let wrapper: any = {
    nested: {
      path,
      score_mode: 'avg',
      ignore_unmapped: true,
      query: undefined,
    },
  };
  const nestQuery = wrapper.nested;
  if (NEGATIVES.indexOf(line.comparison) !== -1)
  {
    wrapper = {
      bool: {
        must_not: wrapper,
        boost,
      },
    };
    line = line.set('comparison', FlipNegativeMap[line.comparison]);
  }
  const query = filterLineToQuery(line);
  if (query === null)
  {
    return null;
  }
  nestQuery.query = query;
  return wrapper;
}

/*
 * Generate an query object (in JS object) from the line.
 * Return null if the line's comparison is unknow.
 */
function filterLineToQuery(line: FilterLine)
{
  // type priority: Date -> Number -> String
  // for how these values are finally tuned to query string, see ParseElasticQuery::stringifyWithParameters.
  let value: any = String(line.value || '');
  const isDateValue = line.fieldType === FieldType.Date;
  const isNumberValue = !isNaN(value) && (!isNaN(parseFloat(value))) && (!isDateValue);
  if (isDateValue)
  {
    const newDate = Util.formatInputDate(new Date(value), 'elastic');
    // console.log('Date '+ value + " is formatted to " + newDate);
    if (newDate)
    {
      value = newDate;
    }
  } else if (isNumberValue)
  {
    value = parseFloat(value);
  }

  // boost should be a number, but in case it is a string.
  const boost = typeof line.boost === 'string' ? parseFloat(line.boost) : line.boost;
  let query = {};
  switch (line.comparison)
  {
    case 'notexists':
      query = {
        bool: {
          must_not: {
            exists: {
              field: line.field,
            },
          },
          boost,
        },
      };
      break;
    case 'notequal':
      query = {
        bool: {
          must_not: {
            term: {
              [line.field]: {
                value,
              },
            },
          },
          boost,
        },
      };
      break;
    case 'notcontain':
      query = {
        bool: {
          must_not: {
            match: {
              [line.field]: {
                query: value,
              },
            },
          },
          boost,
        },
      };
      break;
    case 'exists':
      query = {
        exists: {
          field: line.field,
          boost,
        },
      };
      break;
    case 'equal':
      query = {
        term: {
          [line.field]: {
            value,
            boost,
          },
        },
      };
      break;
    case 'contains':
      query = {
        match: {
          [line.field]: {
            query: value,
            boost,
          },
        },
      };
      break;
    case 'greater':
      query = {
        range: {
          [line.field]:
            {
              gt: value,
              boost,
            },
        },
      };
      break;
    case 'alphaafter':
    case 'dateafter':
      query = {
        range: {
          [line.field]:
            {
              gte: value,
              boost,
            },
        },
      };
      break;
    case 'less':
      query = {
        range: {
          [line.field]:
            {
              lt: value,
              boost,
            },
        },
      };
      break;
    case 'alphabefore':
    case 'datebefore':
      query = {
        range: {
          [line.field]:
            {
              lte: value,
              boost,
            },
        },
      };
      break;
    case 'greaterequal':
      query = {
        range: {
          [line.field]:
            {
              gte: value,
              boost,
            },
        },
      };
      break;
    case 'lessequal':
      query = {
        range: {
          [line.field]:
            {
              lte: value,
              boost,
            },
        },
      };
      break;
    case 'located':
      const distanceObj = line.value as DistanceValue;
      if (!line.value)
      {
        query = {
          geo_distance: {
            distance: '10mi',
            [line.field]: '',
            boost,
          },
        };
      } else
      {
        query = {
          geo_distance: {
            distance: String(distanceObj.distance) + distanceObj.units,
            [line.field]: distanceObj.location || distanceObj.address,
            boost,
          },
        };
      }
      break;
    case 'isin':
      value = PathFinderStringToJSONArray(value);
      query = {
        terms: {
          [line.field]: value,
          boost,
        },
      };
      break;
    case 'isnotin':
      value = PathFinderStringToJSONArray(value);
      query = {
        bool: {
          must_not: {
            terms: {
              [line.field]: value,
            },
          },
          boost,
        },
      };
      break;
    default:
      query = null;
      break;
  }
  return query;
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
function parseGroupJoin(reference: string, nested: List<Path>, inputs)
{
  if (nested.size === 0)
  {
    return null;
  }
  const groupJoins = {};
  if (nested.get(0) && nested.get(0).minMatches)
  {
    groupJoins['dropIfLessThan'] = parseFloat(String(nested.get(0).minMatches));
  }
  groupJoins['parentAlias'] = reference;
  nested.forEach((n, i) =>
  {
    if (n)
    {
      groupJoins[n.name] = parsePath(n, inputs, true);
    }
  });
  return groupJoins;
}

function parseScripts(scripts: List<Script>)
{
  const scriptObj = {};
  scripts.forEach((script: Script) =>
  {
    const params = {};
    script.params.forEach((param) =>
    {
      params[param.name] = param.value;
    });
    const s = {
      script: {
        params,
        inline: script.script,
      },
    };
    scriptObj[script.name] = s;
  });
  return scriptObj;
}
