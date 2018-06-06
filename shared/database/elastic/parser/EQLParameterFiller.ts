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
import { ESParameterType } from 'shared/database/elastic/parser/ESParameter';
import ESParameterSubstituter from './ESParameterSubstituter';
import ESValueInfo from './ESValueInfo';
import TerrainDateParameter from './TerrainDateParameter';

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
 *
 *  Parameters are in the format of `parameterName[.fieldL1][.fieldL2]`.
 *  There are two types of parameters: 1) given parameters 2)meta parameters
 *  A given parameter is a parameter whose value is given in the `params` (params[parameterName] exists). When handling a given parameter,
 *  If there are nested fields followed by the parameter name, we try to search the final value in the given parameter value.
 *
 *  When the parameter's value is not given, then it could be a meta parameter:
 *  @TerrainDate is a date related meta parameter. We replace it with a date derived from `now`.
 *  @[parentAlias] is a groupJoin meta parameter. We leave it as what it is until runtime, then it will become a given parameter.
 *  NOTE: If the parameterValue of a given parameter is in the format of @TerrainDate meta parameter, we try to substitute the parameter
 *  with  meta value as if the parameter is a @TerrainDate parameter.
 *
 *  Callers can use monitor to capture and control the process. If the monitor returns true, the filling process keeps going even there
 *  is any error.
 */
export default class ESParameterFiller
{
  public static generate(source: ESValueInfo,
    params: { [name: string]: any },
    monitor: (source: ESValueInfo, type: ESParameterType, value: string | Error) => boolean
      = (sv, type, value) => false): string
  {
    return ESParameterSubstituter.generate(source,
      (paramValueInfo: ESValueInfo, runtimeParam?: string, inTerms?: boolean): string =>
      {
        const param = paramValueInfo.parameter as string;
        const ps = param.split('.');
        const parameterName = ps[0];
        let finalString;
        if (params[parameterName] !== undefined)
        {
          // given parameters
          const parameterValue = params[parameterName];
          // replace it eagerly for easy debugging.
          if (typeof parameterValue === 'string' && TerrainDateParameter.isValidTerrainDateParameter(parameterValue))
          {
            finalString = TerrainDateParameter.fillTerrainDateParameter(parameterValue);
            monitor(paramValueInfo, ESParameterType.MetaDate, finalString);
            return finalString;
          }
          try
          {
            finalString = ESParameterFiller.handleGivenParameter(ps.slice(1), params[parameterName], inTerms);
          } catch (e)
          {
            const keepGoing = monitor(paramValueInfo, ESParameterType.Unknown, e);
            if (keepGoing === true)
            {
              return e.message;
            }
            throw e;
          }
          monitor(paramValueInfo, ESParameterType.GivenName, finalString);
          return finalString;
        } else
        {
          // TerrainDate parameter
          if (parameterName === 'TerrainDate')
          {
            finalString = TerrainDateParameter.fillTerrainDateParameter(param);
            monitor(paramValueInfo, ESParameterType.MetaDate, finalString);
            return finalString;
          }

          // @[parentAlias] parameter
          if (runtimeParam !== undefined && parameterName === runtimeParam)
          {
            finalString = '@' + param;
            if (monitor !== undefined)
            {
              monitor(paramValueInfo, ESParameterType.MetaParent, finalString);
            }
            return finalString;
          }

          const errorMessage = 'Undefined parameter ' + param + ' in ' + JSON.stringify(params, null, 2);
          const keepGoing = monitor(paramValueInfo, ESParameterType.Unknown, new Error(errorMessage));
          if (keepGoing === true)
          {
            return errorMessage;
          }
          throw new Error(errorMessage);
        }
      });
  }

  public static handleGivenParameter(fields: string[], parameterValue: any, inTerms?): string
  {
    for (let i = 0; i < fields.length; i += 1)
    {
      const fieldName = fields[i];
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
          // parameterValue may be [] since not all elements have the same shape.
          parameterValue = parameterValue.map((val) => val[fieldName]).filter((val) => val !== undefined);
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
      // parameterValue must not be `undefined`.
      if (inTerms === true)
      {
        return JSON.stringify([parameterValue]);
      } else
      {
        return JSON.stringify(parameterValue);
      }
    }
  }
}
