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
import { _FilterGroup, DistanceValue, FilterGroup, FilterLine, More, Path, Score, Script, Source } from './PathfinderTypes';

export const PathFinderDefaultSize = 101;
const NEGATIVES = ['notcontain', 'noteequal', 'notisin', 'notexists'];

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
    _source: true,
    track_scores: path.more.trackScores,
  });

  // Sources
  const sourceInfo = parseSource(path.source);
  baseQuery = baseQuery.set('from', sourceInfo.from);
  if (sourceInfo.size !== 'all')
  {
    baseQuery = baseQuery.set('size', sourceInfo.size);
  }
  baseQuery = baseQuery.setIn(['query', 'bool', 'filter'], List([
    Map({
      term: Map({
        _index: sourceInfo.index,
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
    let sortObj = parseScore(path.score, true);
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
  // _source
  if (path.more.customSource)
  {
    baseQuery = baseQuery.set('_source', path.more.source.toJS());
  }

  // Scripts
  const scripts = parseScripts(path.more.scripts);
  baseQuery = baseQuery.set('script_fields', scripts);

  // Nested algorithms (groupjoins)
  const groupJoin = parseNested(path.reference, path.nested, inputs);
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

function groupNestedFilters(filterGroup: FilterGroup): FilterGroup
{
  const nestedLines = filterGroup.lines.filter((line) => line.field && line.field.indexOf('.') !== -1).toList();
  let nestedPathMap: Map<string, List<FilterLine>> = Map({});
  nestedLines.forEach((line) =>
  {
    const nestedPath = line.field.split('.')[0];
    if (nestedPathMap.get(nestedPath) !== undefined)
    {
      nestedPathMap = nestedPathMap.set(nestedPath, nestedPathMap.get(nestedPath).push(line));
    }
    else
    {
      nestedPathMap = nestedPathMap.set(nestedPath, List([line]));
    }
  });

  let newLines: List<any> = filterGroup.lines.filter((line) => nestedLines.indexOf(line) === -1).toList();
  _.keys(nestedPathMap.toJS()).forEach((key) =>
  {
    newLines = newLines.push(nestedPathMap.get(key));
  });
  return filterGroup.set('lines', newLines);
}

function parseFilters(filterGroup: FilterGroup, inputs, inMatchQualityContext = false, ignoreNested = false): any
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
  if (!ignoreNested)
  {
    filterGroup = groupNestedFilters(filterGroup);
  }
  filterGroup.lines.forEach((line) =>
  {
    if ((!line.filterGroup && line.comparison) || List.isList(line))
    {
      const lineInfo = parseFilterLine(line, useShould, inputs, ignoreNested);

      if (useShould)
      {
        should = should.push(lineInfo);
      }
      else if (NEGATIVES.indexOf(line.comparison) !== -1)
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
  if (List.isList(line) && !ignoreNested)
  {
    // In this case it is a nested query, disguised as a normal filter line
    const path = line.get(0).field.split('.')[0];
    const inner = parseFilters(_FilterGroup({ lines: line }), inputs, useShould, true).toJS());
    return Map({
      nested: {
        path,
        score_mode: 'avg',
        ignore_unmapped: true,
        query: inner,
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
    case 'notexists':
      if (useShould)
      {
        return Map({
          bool: Map({
            must_not: Map({
              exists: Map({
                field: line.field,
              }),
            }),
            boost,
          }),
        });
      }
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
            value:
              !isNaN(parseFloat(value)) && line.fieldType !== FieldType.Date ? parseFloat(value) : value,
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
                }),
              }),
            }),
            boost,
          }),
        });
      }
      return Map({
        term: Map({
          [line.field]: Map({
            value:
              !isNaN(parseFloat(value)) && line.fieldType !== FieldType.Date ? parseFloat(value) : value,
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
            boost,
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
              gte: value,
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
              lte: value,
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
            boost,
          }),
        });
      }
      return Map({
        geo_distance: Map({
          distance: String(distanceObj.distance) + distanceObj.units,
          [line.field]: distanceObj.location || distanceObj.address,
          boost,
        }),
      });
    case 'isin':
      try
      {
        return Map({
          terms: {
            [line.field]: JSON.parse(String(value).toLowerCase()),
            boost,
          },
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
            terms: {
              [line.field]: pieces,
              boost,
            },
          });
        }
        return Map({
          terms: {
            [line.field]: value,
            boost,
          },
        });
      }

    case 'isnotin':
      let parsed = value;
      try
      {
        parsed = JSON.parse(String(value).toLowerCase());
      }
      catch {
        // Try to split it along commas and create own value
        if (typeof value === 'string' && value[0] !== '@')
        {
          value = value.replace(/\[/g, '').replace(/\]/g, '');
          const pieces = value.split(',');
          parsed = pieces.map((piece) => piece.toLowerCase().trim());
        }
      }
      if (useShould)
      {
        return Map({
          bool: {
            must_not: {
              terms: {
                [line.field]: parsed,
              },
            },
            boost,
          },
        });
      }
      else
      {
        return Map({
          terms: {
            [line.field]: parsed,
            boost,
          },
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
function parseNested(reference: string, nested: List<Path>, inputs)
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
  groupJoins = groupJoins.set('parentAlias', reference);
  nested.forEach((n, i) =>
  {
    if (n)
    {
      groupJoins = groupJoins.set(n.name, parsePath(n, inputs, true));
    }
  });
  return groupJoins;
}

function parseScripts(scripts: List<Script>)
{
  let scriptObj = Map({});
  scripts.forEach((script: Script) =>
  {
    let params = Map({});
    script.params.forEach((param) =>
    {
      params = params.set(param.name, param.value);
    });
    const s = Map({
      script: {
        params: params.toJS(),
        inline: script.script,
      },
    });
    scriptObj = scriptObj.set(script.name, s);
  });
  return scriptObj;
}
