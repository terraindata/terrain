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

// tslint:disable:restrict-plus-operands strict-boolean-expressions

import
{
  _FilterGroup, _FilterLine, _Path, _Source, FilterLine,
  Path,
} from 'builder/components/pathfinder/PathfinderTypes';
import { List, Map } from 'immutable';
import * as _ from 'lodash';
import * as TerrainLog from 'loglevel';
import { Classes } from 'react-modal';
import ESInterpreter from '../../../../../shared/database/elastic/parser/ESInterpreter';
import ESPropertyInfo from '../../../../../shared/database/elastic/parser/ESPropertyInfo';
import ESUtils from '../../../../../shared/database/elastic/parser/ESUtils';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import { AllRecordMap } from '../../../../../shared/util/Classes';
import { toInputMap } from '../../../../blocks/types/Input';

// NOTE: Please follow the structure in `ClauseToPathTable` when you want to support other queries.

interface CodeToPathOptions
{
  refQuery?: Path;
  mergeRefQuery?: boolean;
}

/**
 * ESCodeToPathfinder generates the path from the TQL query.
 */
export function ESCodeToPathfinder(query: string, inputs, options: CodeToPathOptions = {}): Path | null
{
  let path;
  try
  {
    const params = toInputMap(inputs);
    const interpreter: ESInterpreter = new ESInterpreter(query, inputs);
    if (interpreter.hasError())
    {
      TerrainLog.debug(query + ' \n has errors:' + JSON.stringify(interpreter.getErrors(), null, 2));
      return null;
    }
    path = generatePath(interpreter);
    if (options.mergeRefQuery && options.refQuery)
    {
      // TODO: support more sections, now we only support the source and filter groups
      path = options.refQuery
        .set('step', path.step)
        .set('source', path.source)
        .set('filterGroup', path.filterGroup)
        .set('softFilterGroup', path.softFilterGroup)
        .set('nested', path.nested);
    }
    return path;
  } catch (e)
  {
    TerrainLog.error(e);
    return null;
  }
}

/**
 * generatePath generates the path from the interpreter via a bottom-up re-writing approach
 * @param {ESInterpreter}: the interpreter
 * @returns {Path}: the path generated from the interpreter
 */
function generatePath(inter: ESInterpreter): Path
{
  const currentPath = [];
  const rootValueInfo = inter.rootValueInfo;
  rootValueInfo.recursivelyVisit((element, key) =>
  {
    return beforeProcessValueInfo(element, inter, key);
  }, (node, key) =>
    {
      afterProcessValueInfo(node, inter, key);
    });
  TerrainLog.debug('New Path: ' + JSON.stringify(rootValueInfo.annotation.path));
  return rootValueInfo.annotation.path;
}

/**
 * A collection of rewriting functions. Each member maps to a ES node type.
 * [member].before is called before processing the subtree (top down),
 * while [member].after is called after processing the subtree (bottom up).
 * The before and after functions can use ValueInfo.annotation for storing data, such as generated path component.
 */
const ClauseToPathTable = {
  body: {
    before: BodyToPathBefore,
    after: BodyToPathAfter,
  },
  groupjoin_clause: {
    after: GroupJoinToPath,
  },
  bool_query: {
    after: BoolToPath,
  },
  query: {
    after: ESQueryToPath,
  },
  term_query: {
    after: TermToPath,
  },
  terms_query: {
    after: TermsToPath,
  },
  match: {
    after: MatchToPath,
  },
  exists_query: {
    after: ExistsToPath,
  },
  range_query: {
    after: RangeToPath,
  },
  geo_distance: {
    after: GeoDistanceToPath,
  },
  nested_query: {
    after: ESNestedQuerytoPath,
  },
};

const NegativeableComparionMap = {
  contain: 'notcontain',
  equal: 'notequal',
  isin: 'isnotin',
  exists: 'notexists',
};

function beforeProcessValueInfo(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
{
  if (node.annotation === undefined)
  {
    node.annotation = {};
  }
  const handler = ClauseToPathTable[node.clause.type];
  if (handler && handler.before)
  {
    handler.before(node, interpreter, key);
  }
  return true;
}

/*
 * bottom-up re-writing
 * For example, for a query like this:
  {
   "query": {
     "bool": {
       "filter": [
         {
           "bool": {
             "filter": [
              {
                "bool": {
                  "must_not": {
                    "match": {
                      "PreferredGenre": {
                        "query": 300
                      }
                    }
                  },
                  "boost": 1
                }
              },
   We evaluate the tree in order of:
   `match` -> `query`-> `bool_query' -> `query` -> `bool_query` -> `query` -> `bool_query` -> `body`,
   At each stage, the [member].before generates the pathfinder component based on the shape of the subtree.
 */

function afterProcessValueInfo(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
{
  const handler = ClauseToPathTable[node.clause.type];
  if (handler && handler.after)
  {
    handler.after(node, interpreter, key);
  }
}

function BodyToSource(node: ESValueInfo, index: string)
{
  const start = node.value.hasOwnProperty('from') ? node.value.from : 0;
  const count = node.value.hasOwnProperty('size') ? node.value.size : 'all';
  const source = _Source({
    count,
    start,
    dataSource: {
      index,
    },
  });
  return source;
}

function BodyToPathAfter(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
{
  let index;
  let filterGroup;
  let softFilterGroup;
  let path;
  if (node.annotation.sourceBool)
  {
    // source bool should init `source`, `filterGroup`, `softFilterGroup`
    const sourceBool = node.annotation.sourceBool;
    index = sourceBool.annotation.index;
    filterGroup = sourceBool.annotation.filterGroup;
    softFilterGroup = sourceBool.annotation.softFilterGroup;
    const source = BodyToSource(node, index);
    path = _Path({ step: 1 })
      .set('source', source)
      .set('filterGroup', filterGroup)
      .set('softFilterGroup', softFilterGroup);
  } else
  {
    // no source bool, thus no filters
    path = _Path();
  }

  if (node.objectChildren['groupJoin'])
  {
    const groupJoinInfo = node.objectChildren['groupJoin'].propertyValue;
    if (groupJoinInfo.annotation.path)
    {
      path = path.set('nested', groupJoinInfo.annotation.path);
    }
  }
  node.annotation.path = path;
  TerrainLog.debug('Body to Path' + JSON.stringify(node.annotation.path));
}

// body
function BodyToPathBefore(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
{
  // annotate source bool
  const sourceBool = interpreter.searchValueInfo({ 'query:query': { 'bool:bool_query': true } }, node);
  if (sourceBool)
  {
    TerrainLog.debug('Found Source Bool ' + JSON.stringify(sourceBool.value) + ' at ' + JSON.stringify(key));
    sourceBool.annotation = { isSourceBool: true };
    node.annotation.sourceBool = sourceBool;
  }
}

// generate `nested`: List<Path>
function GroupJoinToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
{
  const paths = [];
  let parentAlias = 'parent';
  let minMatch = 0;
  if (node.value.parentAlias !== undefined)
  {
    parentAlias = node.value.parentAlias;
  }
  if (node.value.dropIfLessThan !== undefined)
  {
    minMatch = node.value.dropIfLessThan;
  }
  node.forEachProperty((kv, k) =>
  {
    if (kv.propertyValue.clause.type === 'body')
    {
      const bodyValueInfo = kv.propertyValue;
      if (bodyValueInfo.annotation.path)
      {
        const childPath = bodyValueInfo.annotation.path.set('name', k)
          .set('minMatches', minMatch);
        TerrainLog.debug('Pickup Child Path ' + k);
        paths.push(childPath);
      }
    }
  });
  node.annotation.path = List(paths);
}

function TermToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
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
function TermsToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
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
function MatchToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
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
  config['comparison'] = 'contains';
  const filterLine = _FilterLine(config);
  node.annotation.path = filterLine;
  TerrainLog.debug('match_query to ' + JSON.stringify(filterLine));
}

// exists
// [field] : { field: 'field', 'boost': boost }
function ExistsToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
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
function RangeToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
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

function GeoDistanceToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
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
  };
  const filterLine = _FilterLine(config);
  node.annotation.path = filterLine;
  TerrainLog.debug('Geo_distance to ' + JSON.stringify(filterLine));
}

// query
function ESQueryToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
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
    node.annotation = queryValue.annotation;
  }
}

function ESNestedQuerytoPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
{
  if (node.objectChildren['query'])
  {
    // nested -> query -> bool
    const path = node.objectChildren['query'].propertyValue.annotation.path;
    if (path)
    {
      if (path.filterGroup)
      {
        // nested -> query -> bool
        TerrainLog.debug('Pick up nested lines' + JSON.stringify(path.filterGroup.lines));
        node.annotation.path = path.filterGroup.lines;
      } else
      {
        // nested -> query
        TerrainLog.debug('Pick up single query line' + JSON.stringify(path));
        node.annotation.path = path;
      }
    }
  }
}

function processFilterLine(line: FilterLine): FilterLine
{
  if (line.filterGroup)
  {
    return line;
  }
  if (line.field.endsWith('.keyword'))
  {
    return line.set('field', line.field.substr(0, line.field.length - '.keyword'.length));
  }

  return line;
}

function BoolToFilterGroup(node: ESValueInfo, queries: ESValueInfo[], minMatches: 'all' | 'any')
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
          lines.push(processFilterLine(line));
        });
      } else
      {
        lines.push(processFilterLine(query.annotation.path));
      }
    }
  });

  const filterGroup = _FilterGroup(
    {
      minMatches,
    }).set('lines', List(lines));
  node.annotation.path = _FilterLine().set('filterGroup', filterGroup);
}

// soft filter group pattern: filter: [ {"exists": { "field": "_id"} } ] && should: []
function matchSoftFilterGroup(boolValueInfo: ESValueInfo): boolean
{
  const boolValue = boolValueInfo.value;
  if (Array.isArray(boolValue.filter) && Array.isArray(boolValue.should))
  {
    for (const q of boolValue.filter)
    {
      if (_.isEqual(q, {
        exists: {
          field: '_id',
        },
      }) === true)
      {
        return true;
      }
    }
  }
  return false;
}

// hard all filter group pattern: filter: [ non-empty ]
function matchHardAllFilterGroup(boolValueInfo: ESValueInfo): boolean
{
  const boolValue = boolValueInfo.value;
  if (Array.isArray(boolValue.filter))
  {
    if (boolValue.filter.length > 0)
    {
      return true;
    }
  }
  return false;
}

// hard all filter group pattern: should: [ non-empty ]
function matchHardAnyFilterGroup(boolValueInfo: ESValueInfo): boolean
{
  const boolValue = boolValueInfo.value;
  if (Array.isArray(boolValue.should))
  {
    if (boolValue.should.length > 0)
    {
      return true;
    }
  }
  return false;
}

function matchSourceBool(boolNode: ESValueInfo, key: any[])
{
  if (boolNode.annotation.isSourceBool === true)
  {
    return true;
  }
}
function sourceBoolToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
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
      if (q.annotation.path instanceof AllRecordMap['FilterLineC'])
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
  // make sure the source bool always has the index, softFilterGroup and filterGroup
  node.annotation.index = index === undefined ? '' : index;
  node.annotation.softFilterGroup = softFilterGroup === undefined ? _FilterGroup({ minMatch: 'any' }) : softFilterGroup;
  node.annotation.filterGroup = filterGroup === undefined ? _FilterGroup({ minMatch: 'all' }) : filterGroup;
  return true;
}

// pattern: bool -> must_not -> query
function matchNegativeBool(boolNode: ESValueInfo)
{
  // bool -> must_not -> query
  if (boolNode.objectChildren['must_not'])
  {
    // nested query?
    const query = boolNode.objectChildren['must_not'].propertyValue;
    if (query.clause.type === 'query' && query.annotation.path)
    {
      return true;
    }
  }
  return false;
}

// must_not : query
function NegativeBoolToPath(node: ESValueInfo, query: ESValueInfo): boolean
{
  if (query.annotation.path)
  {
    // could be multiple lines if followed by a nested clause
    const lines = [];
    if (List.isList(query.annotation.path))
    {
      (query.annotation.path as List<FilterLine>).map((line: FilterLine) =>
      {
        if (NegativeableComparionMap[line.comparison])
        {
          lines.push(line.set('comparison', NegativeableComparionMap[line.comparison]));
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
      if (NegativeableComparionMap[line.comparison])
      {
        line = line.set('comparison', NegativeableComparionMap[line.comparison]);
        node.annotation.path = line;
        return true;
      }
    }
  }
  return false;
}

/**
 * Generate the path component based on the shape of the sub-tree
 * 1) (highest priority): source bool
 * 2) negative bool (bool -> must_not -> query)
 * 3) soft any filter group
 * 4) hard all filter group
 * 5) hard any filter group
 */
function BoolToPath(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
{
  // source bool
  if (matchSourceBool(node, key))
  {
    sourceBoolToPath(node, interpreter, key);
    TerrainLog.debug('Source Bool: ' + JSON.stringify(node.annotation));
    return;
  }

  if (matchNegativeBool(node))
  {
    if (NegativeBoolToPath(node, node.objectChildren['must_not'].propertyValue))
    {
      TerrainLog.debug('Negative Bool: ' + JSON.stringify(node.annotation.path));
      return;
    }
  }

  if (matchSoftFilterGroup(node))
  {
    BoolToFilterGroup(node, (node.objectChildren.should as any).propertyValue.arrayChildren, 'any');
    TerrainLog.debug('Soft Group: ' + JSON.stringify(node.annotation.path));
    return;
  }

  if (matchHardAllFilterGroup(node))
  {
    BoolToFilterGroup(node, node.objectChildren['filter'].propertyValue.arrayChildren, 'all');
    TerrainLog.debug('Hard All Group: ' + JSON.stringify(node.annotation.path));
    return;
  }

  if (matchHardAnyFilterGroup(node))
  {
    BoolToFilterGroup(node, (node.objectChildren.should as any).propertyValue.arrayChildren, 'any');
    TerrainLog.debug('Hard Any Group: ' + JSON.stringify(node.annotation.path));
    return;
  }
}
