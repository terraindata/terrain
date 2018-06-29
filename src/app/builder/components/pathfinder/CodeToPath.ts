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

import { _FilterLine, _Path, Path } from 'builder/components/pathfinder/PathfinderTypes';
import * as TerrainLog from 'loglevel';
import ESInterpreter from '../../../../../shared/database/elastic/parser/ESInterpreter';
import ESValueInfo from '../../../../../shared/database/elastic/parser/ESValueInfo';
import { toInputMap } from '../../../../blocks/types/Input';
import ESUtils from '../../../../../shared/database/elastic/parser/ESUtils';

export default class CodeToPath
{
  public static ClauseToPathTable = {
    body: {
      before: CodeToPath.BodyToPathBefore,
      after: CodeToPath.BodyToPathAfter,
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

  // term
  // [field] : { "value" : val, "boost": 1 }
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
    console.log('term_query to ' + JSON.stringify(filterLine));
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
    console.log('terms_query to ' + JSON.stringify(filterLine));
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
    console.log('match_query to ' + JSON.stringify(filterLine));
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
    console.log('exists_query to ' + JSON.stringify(filterLine));
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
    console.log('range_query to ' + JSON.stringify(filterLine));
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
    console.log('Geo_distance to ' + JSON.stringify(filterLine));
  }

  // body
  public static BodyToPathBefore(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
  }
  public static BodyToPathAfter(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    node.annotation.path = _Path();
  }

  // bool

  // script

  // sort

  // we can mark some useful information for the bottom up processing
  public static beforeProcessValueInfo(node: ESValueInfo, interpreter: ESInterpreter, key: any[])
  {
    node.annotation = {};
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
