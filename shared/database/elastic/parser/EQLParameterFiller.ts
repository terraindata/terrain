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

import moment = require('moment');
import ESParameterSubstituter from './ESParameterSubstituter';
import ESValueInfo from './ESValueInfo';

/**
 * Fills values in for parameters in a query using a given substitutionFunction,
 * ultimately producing a new query string.
 *
 * Different possible strategies for substituting parameters:
 * + Emit new JSON, and then reparse if needed
 * + Emit new JS object and then interpret if needed
 * + Mutate VI's (reparse if needed)
 *  + traverse and replace
 * + Deep Copy + Mutate
 *  + traverse and copy
 *  + traverse and replace
 * + Immutable Substitution -> must first identify mutation locations before copy
 *  + traverse and mark, copy on return
 */
export default class ESParameterFiller
{
  public static fillParentParameter(source: ESValueInfo,
    params: { [name: string]: any }): string
  {
    return ESParameterSubstituter.generate(source,
      (param: string, runtimeParam?: string, inTerms?: boolean): string =>
      {
        // param in format [parentAlias]{.[fieldL1/index]}{.fieldL2}
        // params is in format {[parentALias]: _source}, _source is in {fieldL1:val}, val: {fieldL2:val} or [{fieldL2:val}...]
        const ps = param.split('.');
        if (ps[0] !== runtimeParam)
        {
          throw new Error(param + ' is not a runtime parent parameter.');
        }
        const parentAlias = ps[0];
        let parameterValue = params[parentAlias];
        if (params[parentAlias] === undefined)
        {
          throw new Error('Params does not have the parameter ' + parentAlias);
        }
        for (let i = 1; i < ps.length; i += 1)
        {
          const fieldName = ps[i];
          if (Array.isArray(parameterValue))
          {
            if (Number.isInteger(Number(fieldName)) === true && Number(fieldName) > 0)
            {
              const newValue = parameterValue[Number(fieldName)];
              if (newValue === undefined)
              {
                throw new Error('Parameter array value ' + JSON.stringify(parameterValue) + ' does not have field ' + fieldName);
              }
              parameterValue = newValue;
            } else
            {
              // merge [{field1:val1}, {field1:val1}] to [val1, val2]
              parameterValue = parameterValue.map((val) => val[fieldName]).filter((val) => val !== undefined);
              // Should we add this check or not, elements of nested field might not have the same shape?
              // if (parameterValue.length === 0)
              // {
              // throw new Error('None of elements in parameter value ' + JSON.stringify(parameterValue) + ' has field ' + fieldName);
              // }
            }
          } else if (typeof parameterValue === 'object')
          {
            const newValue = parameterValue[fieldName];
            if (newValue === undefined)
            {
              throw new Error('Parameter object value ' + JSON.stringify(parameterValue) + ' does not have field ' + fieldName);
            }
            parameterValue = newValue;
          } else
          {
            throw new Error('Parameter value ' + String(parameterValue) + ' does not have field ' + fieldName);
          }
        }

        if (Array.isArray(parameterValue))
        {
          if (inTerms === true)
          {
            return JSON.stringify(parameterValue);
          } else
          {
            return JSON.stringify(parameterValue.join(' '));
          }
        } else
        {
          if (inTerms === true)
          {
            return JSON.stringify([parameterValue]);
          } else
          {
            return JSON.stringify(parameterValue);
          }
        }
      });
  }
  public static generate(source: ESValueInfo,
    params: { [name: string]: any }): string
  {
    return ESParameterSubstituter.generate(source,
      (param: string, runtimeParam?: string, inTerms?: boolean): string =>
      {
        const ps = param.split('.');

        // @parent parameter
        if (runtimeParam !== undefined && ps[0] === runtimeParam && params[runtimeParam] === undefined)
        {
          return JSON.stringify('@' + param);
        }

        // TerrainDate parameter
        if (ps[0] === 'TerrainDate' && params[runtimeParam] === undefined)
        {
          return this.fillTerrainDateParameter(param);
        }

        const value: any = params[param];
        if (typeof value === 'string' && value.startsWith('@TerrainDate'))
        {
          return this.fillTerrainDateParameter(value.slice(1));
        }

        if (value === undefined)
        {
          throw new Error('Undefined parameter ' + param + ' in ' + JSON.stringify(params, null, 2));
        }
        return JSON.stringify(value);
      });
  }
  /**
   *
   * @param {string} dateString in format 'TerrainDate.[ThisWeek/NextWeek].[0-6].{T00:00:00+00:00}'
   * This function replace the parameter with the current time.
   */
  private static fillTerrainDateParameter(dateString: string)
  {
    const datePart = dateString.split('.');

    if (datePart.length < 3 || datePart[0] !== 'TerrainDate' || (datePart[1] !== 'ThisWeek' && datePart[1] !== 'NextWeek') ||
      Number.isInteger(Number(datePart[2])) === false ||
      Number(datePart[2]) < 0 || Number(datePart[2]) > 6)
    {
      throw new Error('The TerrainDate parameter ' + dateString + ' is not in the right format:'
        + 'TerrainDate.{ThisWeek/NextWeek}.[0-6]{T00:00:00+00:00}.');
    }
    const dayOffset = Number(datePart[2]);
    const today = moment().startOf('week');
    if (datePart[1] === 'NextWeek')
    {
      today.add(1, 'w');
    }
    today.add(dayOffset, 'd');
    let dateStr = today.format('YYYY-MM-DD');
    if (datePart.length > 3)
    {
      dateStr = dateStr + datePart[3];
      if (moment.parseZone(dateStr).isValid() === false)
      {
        throw new Error('The generated time string is not valid: ' + dateString + ' -> ' + dateStr);
      }
    }
    return JSON.stringify(dateStr);
  }
}
