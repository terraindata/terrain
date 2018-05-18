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

import ESClauseSettings from '../ESClauseSettings';
import ESClauseType from '../ESClauseType';
import ESInterpreter from '../ESInterpreter';
import ESValueInfo from '../ESValueInfo';
import ESClause from './ESClause';

/**
 * A clause which can only take on a restricted set of values.
 */
export default class ESEnumClause extends ESClause
{
  public values: any[];
  public valueMap: any;

  public constructor(type: string, values: any[], settings?: ESClauseSettings)
  {
    super(type, ESClauseType.ESEnumClause, settings);

    this.values = values;
    this.valueMap = new Map();
    for (let i = 0; i < this.values.length; ++i)
    {
      const value = this.values[i];
      this.valueMap.set(value, i);
    }
  }

  public mark(interpreter: ESInterpreter, valueInfo: ESValueInfo): void
  {
    if (this.valueMap.get(valueInfo.value) === undefined)
    {
      if (this.values.length > 10)
      {
        interpreter.accumulateError(valueInfo, 'Unknown value for this clause.');
      }
      else
      {
        interpreter.accumulateError(valueInfo,
          'Unknown value for this clause. Valid values are: ' + JSON.stringify(this.values, null, 1));
      }
    }
  }
}
