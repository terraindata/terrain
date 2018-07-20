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
// tslint:disable:strict-boolean-expressions

import { parsePath } from 'app/builder/components/pathfinder/PathfinderParser';
import { List, Map } from 'immutable';
import { toInputMap } from '../../blocks/types/Input';
import { isInput } from '../../blocks/types/Input';
import { stringifyWithParameters } from '../../database/elastic/conversion/ParseElasticQuery';
/*
  A set pf functions that creates domain and histogram aggregation queries for the transform charts
  for different forms (geodistance, _score, and regular curves)
*/

export const TransformQueryUtil = {
  getDomainAggregation(index, type, input): string
  {
    return JSON.stringify({
      query: {
        bool: {
          filter: TransformQueryUtil.getFilter(index, type),
        },
      },
      aggs: {
        maximum: {
          max: {
            field: input,
          },
        },
        minimum: {
          min: {
            field: input,
          },
        },
      },
    });
  },

  getHistogramAggregation(index, type, input, min, max, interval)
  {
    return JSON.stringify({
      query: {
        bool: {
          filter: TransformQueryUtil.getFilter(index, type),
          must: {
            range: {
              [input as string]: { gte: min, lt: max },
            },
          },
        },
      },
      aggs: {
        transformCard: {
          histogram: {
            field: input,
            interval,
            extended_bounds: {
              min, max,
            },
          },
        },
      },
      size: 1,
    });
  },

  getGeoDomainAggregation(index, type, input, distanceValue, query)
  {
    let { lat, lon } = TransformQueryUtil.getLatLon(distanceValue);
    if (distanceValue.address && distanceValue.address.charAt(0) === '@')
    {
      const param = toInputMap(query.inputs)[distanceValue.address.substring(1)];
      if (param && param.lat !== undefined && param.lon !== undefined)
      {
        lat = param.lat;
        lon = param.lon;
      }
      else if (distanceValue.address.split('.').length > 1)
      {
        const parentField = distanceValue.address.split('.')[1];
        // Try to use a special query (will require special handling)
        let path = query.path;
        // Set outer size to 1000 and inner size to 1000
        path = path
          .setIn(['source', 'count'], 10)
          .setIn(['more', 'source'], List([parentField]))
          .setIn(['more', 'customSource'], true)
          .setIn(['score', 'type'], 'random')
          .setIn(['score', 'lines'], List())
        ;
        path.nested.forEach((nested, i) =>
        {
          path = path
            .setIn(['nested', i, 'source', 'count'], 10)
            .setIn(['nested', i, 'more', 'source'], List([input]))
            .setIn(['nested', i, 'more', 'customSource'], true)
            .setIn(['nested', i, 'score', 'type'], 'random')
            .setIn(['nested', i, 'name'], 'childQuery')
            .setIn(['score', 'lines'], List())
          ;
        });
        const { tql, pathErrorMap } = parsePath(path, query.inputs);
        if (pathErrorMap.size !== 0)
        {
          return null;
        }
        return tql;
      }
      else
      {
        return null;
      }
    }
    const domainQuery = {
      query: {
        bool: {
          filter: TransformQueryUtil.getFilter(index, type),
        },
      },
      aggs: {
        minimum: {
          min: {
            script: {
              params: {
                lat,
                lon,
              },
              inline: `doc['${input}'].arcDistance(params.lat, params.lon) * 0.000621371`,
            },
          },
        },
        maximum: {
          max: {
            script: {
              params: {
                lat,
                lon,
              },
              inline: `doc['${input}'].arcDistance(params.lat, params.lon) * 0.000621371`,
            },
          },
        },
      },
    };
    // If there were inputs involved, need to use an interpreter

    return JSON.stringify(domainQuery);
  },

  getGeoHistogramAggregation(index, type, input, min, max, interval, distanceValue, inputs)
  {
    let { lat, lon } = TransformQueryUtil.getLatLon(distanceValue);
    if (distanceValue.address && distanceValue.address.charAt(0) === '@')
    {
      const param = toInputMap(inputs)[distanceValue.address.substring(1)];
      if (param && param.lat !== undefined && param.lon !== undefined)
      {
        lat = param.lat;
        lon = param.lon;
      }
      else // TODO CHECK IF IT IS A PARENT FIELD
      {
        return null;
      }
    }
    const aggQuery = {
      query: {
        bool: {
          filter: TransformQueryUtil.getFilter(index, type),
        },
      },
      aggs: {
        transformCard: {
          geo_distance: {
            field: input,
            origin: { lat, lon },
            ranges: TransformQueryUtil.computeGeoRanges(interval, min, max),
            unit: 'mi',
            keyed: true,
          },
        },
      },
      size: 1,
    };
    return JSON.stringify(aggQuery);
  },

  getScoreDomainAggregation(query)
  {
    let tqlString = '';
    try
    {
      tqlString = stringifyWithParameters(JSON.parse(query.tql), (name) => isInput(name, query.inputs));
    } catch (e)
    {
      return null;
    }

    const tql = JSON.parse(tqlString);
    tql['size'] = 0;
    tql['sort'] = {};
    tql['aggs'] = {
      maximum: {
        max: {
          script: { inline: '_score' },
        },
      },
      minimum: {
        min: {
          script: { inline: '_score' },
        },
      },
    };
    return JSON.stringify(tql);
  },

  getScoreHistogramAggregation(query, min, max, interval)
  {
    let tqlString = '';
    try
    {
      tqlString = stringifyWithParameters(JSON.parse(query.tql), (name) => isInput(name, query.inputs));
    } catch (e)
    {
      return null;
    }
    const tql = JSON.parse(tqlString);
    tql['size'] = 0;
    tql['sort'] = {};
    tql['aggs'] = {
      transformCard: {
        histogram: {
          script: { inline: '_score' },
          interval,
          extended_bounds: {
            min, max,
          },
        },
      },
    };
    return JSON.stringify(tql);
  },

  // Utility functions for creating the queries
  getFilter(index, type)
  {
    const filter = [];
    if (typeof index === 'string')
    {
      filter.push({
        term: {
          _index: index,
        },
      });
    }
    if (typeof type === 'string' && type !== '')
    {
      filter.push({
        term: {
          _type: type,
        },
      });
    }
    return filter;
  },

  getLatLon(distanceValue)
  {
    let lat: string | number = 0;
    let lon: string | number = 0;
    if (distanceValue.location)
    {
      lat = distanceValue.location[0];
      lon = distanceValue.location[1];
    }
    if (distanceValue.address && distanceValue.address.charAt(0) === '@')
    {
      lat = String(distanceValue.address) + '.lat';
      lon = String(distanceValue.address) + '.lon';
    }
    return { lat, lon };
  },

  computeGeoRanges(interval: number, min: number, max: number)
  {
    const ranges = [];
    for (let val = min; val <= max + 0.000001; val += interval)
    {
      ranges.push({
        to: val + interval,
        from: val,
        key: String(val),
      });
    }
    return ranges;
  },

};
