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

import EQLConfig from '../EQLConfig';
import ESClauseSettings from '../ESClauseSettings';
import ESClauseType from '../ESClauseType';
import ESInterpreter from '../ESInterpreter';
import ESJSONType from '../ESJSONType';
import ESValueInfo from '../ESValueInfo';
import ESClause from './ESClause';

/**
 * A clause which is one of several possible types
 */
export default class ESVariantClause extends ESClause
{
  public subtypes: { [jsonType: string]: string };

  public constructor(type: string, subtypes: { [jsonType: string]: string }, settings?: ESClauseSettings)
  {
    super(type, ESClauseType.ESVariantClause, settings);
    this.subtypes = subtypes;
  }

  public init(config: EQLConfig): void
  {
    Object.keys(this.subtypes).forEach(
      (key: string): void =>
      {
        config.declareType(this.subtypes[key]);
      });
  }

  public mark(interpreter: ESInterpreter, valueInfo: ESValueInfo): void
  {
    let valueType: string = ESJSONType[valueInfo.jsonType];
    if (valueType === 'parameter')
    {
      if (valueInfo.parameterValue !== null && valueInfo.parameterValue.getValueInfo() !== null)
      {
        const parameterType = ESJSONType[valueInfo.parameterValue.getValueInfo().jsonType];
        if (parameterType === 'parameter')
        {
          // this is a runtime parameter
          for (const t of ['string', 'number', 'boolean', 'base', 'null'])
          {
            if (this.subtypes[t] !== undefined)
            {
              valueType = t;
              break;
            }
          }
        } else
        {
          valueType = parameterType;
        }
      }
    }
    const refinedValueType: string = this.refineType(valueType, valueInfo);

    // try with refined value type first
    let subtype: string | undefined = this.subtypes[refinedValueType];
    if (subtype === undefined)
    {
      subtype = this.subtypes[valueType];
    }
    if (subtype === undefined)
    {
      interpreter.accumulateError(valueInfo,
        'Unknown clause type \"' + valueType +
        '\". Expected one of these types: ' +
        JSON.stringify(Object.keys(this.subtypes), null, 2));
      return;
    }

    const subclause: ESClause = interpreter.config.getClause(subtype);

    valueInfo.parentClause = this;
    valueInfo.clause = subclause;

    subclause.mark(interpreter, valueInfo);
  }

  private refineType(jsonType: string, valueInfo: ESValueInfo): string
  {
    switch (jsonType)
    {
      case 'string':
        return jsonType + ':' + String(valueInfo.value);
      case 'object':
        const keys = Object.keys(valueInfo.value);
        if (keys.length === 1)
        {
          return jsonType + ':' + keys[0];
        } else
        {
          return jsonType;
        }
      default:
        return jsonType;
    }
  }
}
