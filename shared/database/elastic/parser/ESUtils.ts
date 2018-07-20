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

import ESInterpreter from 'shared/database/elastic/parser/ESInterpreter';
import ESJSONType from 'shared/database/elastic/parser/ESJSONType';
import ESPropertyInfo from 'shared/database/elastic/parser/ESPropertyInfo';
import ESValueInfo from 'shared/database/elastic/parser/ESValueInfo';

export default class ESUtils
{
  // distanceUnit is in string 'double[UnitName]'.
  // the UnitName: in, inch, yd, yards, ft, feet, km, kilometers, NM, nmi, nauticalmiles, mm, millimeters, cm, centimeters
  // NOTE: make sure m is the last one and mi is the second last.
  public static ESDistanceUnits = ['in', 'inch', 'yd', 'yards', 'ft', 'feet', 'km', 'kilometers',
    'NM', 'nmi', 'nauticalmiles', 'mm', 'millimeters', 'cm', 'centimeters', 'mi', 'miles', 'm', 'meters'];
  public static QueryNameMap = {
    geo_distance: 'geo_distance',
    bool: 'bool_query',
    term: 'term_query',
    terms: 'terms_query',
    range: 'range_query',
    exists: 'exists_query',
    prefix: 'prefix_query',
    wildcard: 'wildcard_query',
    regexp: 'regexp_query',
    fuzzy: 'fuzzy_query',
    match_all: 'match_all',
    match_none: 'match_none',
    match: 'match',
    type: 'type',
    ids: 'string[]',
    match_phrase: 'match_phrase',
    match_phrase_prefix: 'match_phrase_prefix',
    multi_match: 'multi_match',
    common: 'common_terms_query',
    query_string: 'query_string_clause',
    simple_query_string: 'simple_query_string',
    constant_score: 'constant_score',
    dis_max: 'dis_max',
    function_score: 'function_score',
    script_score: 'script_score',
    boosting: 'boosting_query',
    nested: 'nested_query',
    has_child: 'has_child_query',
    has_parent: 'has_parent_query',
  };

  public static IsNumberString(val): boolean
  {
    return !isNaN(val) && !isNaN(parseFloat(val));
  }

  public static ExtractFirstField(node: ESValueInfo): ESPropertyInfo
  {
    for (const k of Object.keys(node.objectChildren))
    {
      const kValueInfo = node.objectChildren[k].propertyName;
      if (kValueInfo.clause.type === 'field')
      {
        return node.objectChildren[k];
      }
    }
    return null;
  }

  public static ExtractDistanceValueUnit(distanceString: string): {distance: number, unit: string}
  {
    let valueString = distanceString;
    let valueUnit = 'm';
    for (const unit of ESUtils.ESDistanceUnits)
    {
      if (distanceString.endsWith(unit) === true)
      {
        valueUnit = unit;
        valueString = distanceString.slice(0, distanceString.length - unit.length);
        break;
      }
    }
    if (ESUtils.IsNumberString(valueString) === false)
    {
      return null;
    }
    return {distance: Number.parseFloat(valueString), unit: valueUnit};
  }

  public static DistanceUnitTypeChecker(inter: ESInterpreter, valueInfo: ESValueInfo, expected: ESJSONType)
  {
    if (expected !== ESJSONType.string)
    {
      return true;
    }
    if (ESUtils.ExtractDistanceValueUnit(valueInfo.value) === null)
    {
      inter.accumulateError(valueInfo,
        'The distance unit ' + String(valueInfo.value) + ' is not in a right format.');
      return false;
    }
    return true;
  }

  public static GenerateFieldSizeChecker(fieldList, size: number[])
  {
    return (inter: ESInterpreter, valueInfo: ESValueInfo, expected: ESJSONType) => {
      if (expected !== ESJSONType.object)
      {
        return true;
      }
      const hitList = fieldList.filter((f) => valueInfo.objectChildren[f] !== undefined);
      const matched = size.filter((s) => s === hitList.length);
      if (matched.length === 0)
      {
        inter.accumulateError(valueInfo,
          'Only allow ' + String(size.join(',')) + ' of ' + JSON.stringify(fieldList) + ' fields, but found ' + String(hitList.length)
          + '(' + JSON.stringify(hitList) + ').');
        return false;
      }
      return true;
    };
  }
}
