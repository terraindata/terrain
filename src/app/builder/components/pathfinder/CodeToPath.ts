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

import {
  _FilterGroup, _FilterLine, _Path, _Source, FilterLine,
  Path
} from 'builder/components/pathfinder/PathfinderTypes';
import * as TerrainLog from 'loglevel';
import ESInterpreter from '../../../../../shared/database/elastic/parser/ESInterpreter';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import { toInputMap } from '../../../../blocks/types/Input';
import ESUtils from '../../../../../shared/database/elastic/parser/ESUtils';
import { List, Map } from 'immutable';
import PathfinderLine from 'builder/components/pathfinder/PathfinderLine';
import * as _ from 'lodash';
import ESPropertyInfo from '../../../../../shared/database/elastic/parser/ESPropertyInfo';
import {Classes} from 'react-modal';
import {AllRecordMap} from '../../../../../shared/util/Classes';

export default class CodeToPath
{
  public static ClauseToPathTable = {
    body: {
      before: CodeToPath.BodyToPathBefore,
      after: CodeToPath.BodyToPathAfter,
    },
    bool_query: {
      after: CodeToPath.BoolToPath,
    },
    query: {
      after: CodeToPath.QueryToPath,
    },
    term_query: {
      after: CodeToPath.TermToPathAfter,
    },
    terms_query: {
      after: CodeToPath.TermsToPathAfter,
    },
    match: {
      after: CodeToPath.MatchToPathAfter,
    },
    exists_query: {
      after: CodeToPath.ExistsToPathAfter,
    },
    range_query: {
      after: CodeToPath.RangeToPathAfter,
    },
    geo_distance: {
      after: CodeToPath.GeoDistanceToPath,
    },
  };

  public static NegativeableComparionMap = {
    contain: 'notcontain',
    equal: 'notequal',
    isin: 'isnotin',
    exists: 'notexists',
  };


  public static TermToPathAfter(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    const config = {};
    const fieldName = Object.keys(node.objectChildren)[0];
    const fieldValue = node.objectChildren[fieldName].propertyValue;
    if (fieldValue.clause.type === 'term_settings')
    {
      config['value'] = fieldValue.value['value'];
      if (fieldValue.value.boost === undefined)
      {
        config['boost'] = 1;
      } else
      {
        config['boost'] = fieldValue.value['boost'];
      }
    } else
    {
      config['value'] = fieldValue.value;
      config['boost'] = 1;
    }
    config['field'] = fieldName;
    config['comparison'] = 'equal';
    const filterLine = _FilterLine(config);
    node.annotation.path = filterLine;
    TerrainLog.debug('term_query to ' + JSON.stringify(filterLine));
  }

  // terms
  public static TermsToPathAfter(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    const config = {};
    const fieldKV = ESUtils.ExtractFirstField(node);
    if (fieldKV !== null)
    {
      const kValueInfo = fieldKV.propertyName;
      const vValueInfo = fieldKV.propertyValue;
      if (vValueInfo.clause.type === 'base[]')
      {
        const fieldName = kValueInfo.value;
        const fieldValue = JSON.stringify(vValueInfo.value);
        config['field'] = fieldName;
        config['vaue'] = fieldValue;
      }
    }

    config['comparison'] = 'isin';
    config['boost'] = node.value.boost === undefined ? 1 : node.value.boost;
    const filterLine = _FilterLine(config);
    node.annotation.path = filterLine;
    TerrainLog.debug('terms_query to ' + JSON.stringify(filterLine));
  }

  // match
  // [field] : { "value" : val, "boost": 1 }
  public static MatchToPathAfter(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    const config = {};
    const fieldName = Object.keys(node.objectChildren)[0];
    const fieldValue = node.objectChildren[fieldName].propertyValue;
    if (fieldValue.clause.type === 'match_settings')
    {
      config['value'] = fieldValue.value['query'];
      if (fieldValue.value.boost === undefined)
      {
        config['boost'] = 1;
      } else
      {
        config['boost'] = fieldValue.value['boost'];
      }
    } else
    {
      config['value'] = fieldValue.value;
      config['boost'] = 1;
    }
    config['field'] = fieldName;
    config['comparison'] = 'equal';
    const filterLine = _FilterLine(config);
    node.annotation.path = filterLine;
    TerrainLog.debug('match_query to ' + JSON.stringify(filterLine));
  }

  // exists
  // [field] : { field: 'field', 'boost': boost }
  public static ExistsToPathAfter(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    const config = {
      field: node.value.field,
      boost: node.value.boost === undefined ? 1 : node.value.boost,
      comparison: 'exists',
    };
    const filterLine = _FilterLine(config);
    node.annotation.path = filterLine;
    TerrainLog.debug('exists_query to ' + JSON.stringify(filterLine));
  }

  // range
  // [field] : { "value" : val, "boost": 1 }
  public static RangeToPathAfter(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    const fieldName = Object.keys(node.objectChildren)[0];
    const rangeValue = node.objectChildren[fieldName].propertyValue;
    const rangeComparisonMap = {
      gt: 'greater',
      gte: 'greaterequal',
      lt: 'less',
      lte: 'lessequal',
    };
    let rangeOp;
    for (const op of Object.keys(rangeComparisonMap))
    {
      if (rangeValue.objectChildren[op] !== undefined)
      {
        rangeOp = op;
        break;
      }
    }
    if (rangeOp === undefined)
    {
      return;
    }
    const config = {
      field: fieldName,
      value: rangeValue.value[rangeOp],
      comparison: rangeComparisonMap[rangeOp],
      boost: rangeValue.value['boost'] === 'undefined' ? 1 : rangeValue.value['boost'],
    };
    const filterLine = _FilterLine(config);
    node.annotation.path = filterLine;
    TerrainLog.debug('range_query to ' + JSON.stringify(filterLine));
  }

  public static GeoDistanceToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    const vu = ESUtils.ExtractDistanceValueUnit(node.value.distance);
    if (vu === null)
    {
      return;
    }
    const fieldKV = ESUtils.ExtractFirstField(node);
    if (fieldKV === null)
    {
      return;
    }
    const fieldName = fieldKV.propertyName.value;
    const fieldValue = fieldKV.propertyValue;
    const distanceValue = { distance: vu.distance, units: vu.unit };
    // fieldValue can be latlon_object {lon: number, lat: number}, number[lon, lat] , or a string 'lat, lon'
    if (fieldValue.clause.type === 'latlon_object')
    {
      distanceValue['location'] = [fieldValue.value.lon, fieldValue.value.lat];
    } else if (fieldValue.clause.type === 'number[]')
    {
      distanceValue['location'] = fieldValue.value;
    } else if (fieldValue.clause.type === 'string')
    {
      distanceValue['address'] = fieldValue.value;
    }
    const config = {
      field: fieldName,
      value: distanceValue,
      boost: node.value.boost === undefined ? 1 : node.value.boost,
      comparison: 'located',
    }
    const filterLine = _FilterLine(config);
    node.annotation.path = filterLine;
    TerrainLog.debug('Geo_distance to ' + JSON.stringify(filterLine));
  }

  //query
  public static QueryToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    let queryName;
    for (const n of Object.keys(node.objectChildren))
    {
      if (ESUtils.QueryNameMap[n] !== undefined)
      {
         queryName = n;
      }
    }
    const queryValue = node.objectChildren[queryName].propertyValue;
    if (queryValue.annotation.path !== undefined)
    {
      node.annotation.path = queryValue.annotation.path;
    }
    console.log('Query copies path from ' + queryName);
  }

  // must_not : query
  public static NegativeBoolToPath(node: ESValueInfo, query: ESValueInfo): boolean
  {
    if (query.annotation.path)
    {
      // could be multiple lines if followed by a nested clause
      const lines = [];
      if (Immutable.List.isList(query.annotation.path))
      {
        (query.annotation.path as List<FilterLine>).map((line: FilterLine) => {
          if (CodeToPath.NegativeableComparionMap[line.comparison])
          {
            lines.push(line.set('comparison', CodeToPath.NegativeableComparionMap[line.comparison]));
          }
        });
        if (lines.length > 0)
        {
          node.annotation.path = List(lines);
          return true;
        }
      } else
      {
        let line = query.annotation.path as FilterLine;
        if (CodeToPath.NegativeableComparionMap[line.comparison])
        {
          line = line.set('comparison', CodeToPath.NegativeableComparionMap[line.comparison]);
          node.annotation.path = line;
          return true;
        }
      }
    }
    return false;
  }
  public static BoolToFilterGroup(node: ESValueInfo, queries: ESValueInfo[], minMatches: 'all' | 'any')
  {
    const lines = [];
    queries.map((query) =>
    {
      if (query.annotation.path)
      {
        // could be a List for nested query
        if (List.isList(query.annotation.path))
        {
          if (query.value.nested === undefined)
          {
            TerrainLog.error('Query ' + JSON.stringify(query.value) + ' has a list of filter lines');
          }
          query.annotation.path.map((line) =>
          {
            lines.push(line);
          });
        } else
        {
          lines.push(query.annotation.path);
        }
      }
    });

    const filterGroup = _FilterGroup(
      {
        minMatches,
      }).set('lines', List(lines));
    node.annotation.path = _FilterLine().set('filterGroup', filterGroup);
  }

  //
  public static BoolToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    // source bool
    if (node.annotation.isSourceBool === true)
    {
      // setup index, filterGroup, softFilterGroup
      let softFilterGroup;
      let filterGroup;
      let index;

      if (Array.isArray(node.value.filter))
      {
        const filterNode = node.objectChildren['filter'].propertyValue;
        for (const q of filterNode.arrayChildren)
        {
          if (q.annotation.path instanceof  AllRecordMap['FilterLineC'])
          {
            const line = q.annotation.path as FilterLine;
            if (line.field === '_index' && line.comparison === 'equal')
            {
              if (index === undefined)
              {
                index = line.value;
                TerrainLog.debug('Found index ' + index);
              }
            }

            if (q.objectChildren['bool'])
            {
              const boolNode = q.objectChildren['bool'].propertyValue;
              if (boolNode.annotation.path && boolNode.annotation.path.filterGroup)
              {
                if (filterGroup === undefined)
                {
                  filterGroup = boolNode.annotation.path.filterGroup;
                  TerrainLog.debug('Found hard bool ' + JSON.stringify(filterGroup));
                }
              }
            }
          }
        }
      }

      if (Array.isArray(node.value.should))
      {
        const shouldNode = (node.objectChildren['should'] as any).propertyValue;
        for (const q of shouldNode.arrayChildren)
        {
          if (q.objectChildren['bool'])
          {
            const boolNode = q.objectChildren['bool'].propertyValue;
            if (boolNode.annotation.path && boolNode.annotation.path.filterGroup)
            {
              if (softFilterGroup === undefined)
              {
                softFilterGroup = boolNode.annotation.path.filterGroup;
                TerrainLog.debug('Found soft bool ' + JSON.stringify(softFilterGroup));
              }
            }
          }
        }
      }
      // looking for the first bool in the shouldClause
      node.annotation.index = index === undefined ? '' : index;
      node.annotation.softFilterGroup = softFilterGroup === undefined ? _FilterGroup({minMatch: 'any'}) : softFilterGroup;
      node.annotation.filterGroup = filterGroup === undefined ? _FilterGroup({minMatch: 'all'}) : filterGroup;
      return;
    }
    // nested -> query -> bool
    if (node.annotation.isInNested === true)
    {
      // all filter lines are in the nested -> query -> bool -> filter -> [query]
      const queries = node.objectChildren['filter'] && node.objectChildren['filter'].propertyValue;
      if (queries && queries.clause.type === 'query[]')
      {
        // aggregate all filter lines here
        const lines = [];
        queries.arrayChildren.map((query) =>
        {
          if (query.annotation.path)
          {
            lines.push(query.annotation.path)
          }
        });
        if (lines.length > 0)
        {
          node.annotation.path = List(lines);
          return;
        }
      }
    }

    // bool -> must_not -> query
    if (node.objectChildren['must_not'])
    {
      const query = node.objectChildren['must_not'].propertyValue;
      if (query.clause.type === 'query')
      {
        if (CodeToPath.NegativeBoolToPath(node, query))
        {
          return;
        }
      }
    }

    if (Array.isArray(node.value.filter))
    {
      // soft filter group?
      if (node.value.filter.length === 1 && _.isEqual(node.value.filter[0], {
          exists: {
            field: "_id"
          }
        }) === true)
      {
        if (Array.isArray(node.value.should) && node.value.should.length > 0)
        {
          CodeToPath.BoolToFilterGroup(node, (node.objectChildren.should as any).propertyValue.arrayChildren, 'any');
          TerrainLog.debug('Soft any filter group line ' + JSON.stringify(node.annotation.path));
          return;
        }
      } else
      {
        CodeToPath.BoolToFilterGroup(node, node.objectChildren['filter'].propertyValue.arrayChildren, 'all');
        TerrainLog.debug('Hard all filter group line ' + JSON.stringify(node.annotation.path));
        return;
      }
      // hard all filter group
    } else if (Array.isArray(node.value.should) && node.value.should.length > 0)
    {
      CodeToPath.BoolToFilterGroup(node, (node.objectChildren.should as any).propertyValue.arrayChildren, 'any');
      TerrainLog.debug('Hard any filter group line ' + JSON.stringify(node.annotation.path));
      return;
    }

    // hard filter group
    // all group
    // any group
  }

  // body
  public static BodyToPathBefore(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    // annotate source bool
    const sourceBool = interpreter.searchValueInfo({'query:query': {'bool:bool_query': true}});
    if (sourceBool)
    {
      TerrainLog.debug('Found Source Bool '+ JSON.stringify(sourceBool.value));
      sourceBool.annotation = {isSourceBool: true};
      node.annotation.sourceBool = sourceBool;
    }
  }

  public static BodyToSource(node: ESValueInfo, index: string)
  {
    const start = node.value.hasOwnProperty('from')? node.value.from : 0;
    const count = node.value.hasOwnProperty('size')? node.value.size : 'all';
    const source = _Source({
      count,
      start,
      dataSource: {
        index,
      }
    });
    return source;
  }

  public static BodyToPathAfter(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    let index = '';
    let filterGroup;
    let softFilterGroup;
    if (node.annotation.sourceBool)
    {
      const sourceBool = node.annotation.sourceBool;
      index = sourceBool.annotation.index;
      filterGroup = sourceBool.annotation.filterGroup;
      softFilterGroup = sourceBool.annotation.softFilterGroup;
    }
    const source = CodeToPath.BodyToSource(node, index);
    let path = _Path({step: 1}).set('source', source);
    if (filterGroup)
    {
      TerrainLog.debug('Path Filter Group' + JSON.stringify(filterGroup));
      path = path.set('filterGroup', filterGroup);
    }
    if (softFilterGroup)
    {
      path = path.set('softFilterGroup', softFilterGroup);
    }
    node.annotation.path = path;
    TerrainLog.debug('Body to Path' + JSON.stringify(node.annotation.path));
  }


  // bool

  // script

  // sort

  // we can mark some useful information for the bottom up processing
  public static beforeProcessValueInfo(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    if (node.annotation === undefined)
    {
      node.annotation = {};
    }
    const handler = this.ClauseToPathTable[node.clause.type];
    if (handler && handler.before)
    {
      handler.before(node, interpreter, key);
    }
    return true;
  }

  // bottom up generating the path components
  public static afterProcessValueInfo(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    const handler = this.ClauseToPathTable[node.clause.type];
    if (handler && handler.after)
    {
      handler.after(node, interpreter, key);
    }
  }
  /**
   * @param {ESInterpreter} code
   * @returns {Path}
   */
  public static generatePath(inter: ESInterpreter): Path
  {
    const currentPath = [];
    const rootValueInfo = inter.rootValueInfo;
    rootValueInfo.recursivelyVisit((element, key) =>
    {
      return CodeToPath.beforeProcessValueInfo(element, inter, key);
    }, (node, key) =>
      {
        CodeToPath.afterProcessValueInfo(node, inter, key);
      });
    console.log('New Path: ' + JSON.stringify(rootValueInfo.annotation.path));
    return rootValueInfo.annotation.path;
  }

  public static parseCode(query: string, inputs): Path
  {
    try
    {
      const params = toInputMap(inputs);
      const interpreter: ESInterpreter = new ESInterpreter(query, inputs);
      return this.generatePath(interpreter);
    } catch (e)
    {
      TerrainLog.error(e);
      return null;
    }
  }
}
