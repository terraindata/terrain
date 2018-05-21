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

import * as _ from 'lodash';

import EQLConfig from '../EQLConfig';
import ESClauseSettings from '../ESClauseSettings';
import ESClauseType from '../ESClauseType';
import ESInterpreter from '../ESInterpreter';
import ESPropertyInfo from '../ESPropertyInfo';
import ESValueInfo from '../ESValueInfo';
import ESClause from './ESClause';
import ESStructureClause from './ESStructureClause';

/**
 * A clause that extends ESStructureClause by allowing for a wildcard value.
 */
export default class ESWildcardStructureClause extends ESStructureClause
{
  public structure: { [name: string]: string };

  public nameType: string;
  public valueType: string;
  public wildcardMarked: boolean = false;

  public constructor(type: string, structure: { [name: string]: string }, nameType: string, valueType: string, settings?: ESClauseSettings,
    clauseType: ESClauseType = ESClauseType.ESWildcardStructureClause)
  {
    super(type, structure, settings, clauseType);
    // super(type, clauseType, settings);
    this.structure = structure;
    this.nameType = nameType;
    this.valueType = valueType;
    this.setDefaultProperty('template', () => ({}));
  }

  public init(config: EQLConfig): void
  {
    Object.keys(this.structure).forEach(
      (key: string): void =>
      {
        config.declareType(this.structure[key]);
      });

    this.checkValidAndUniqueProperties(this.required, 'required');
    this.checkValidAndUniqueProperties(this.suggestions, 'suggestions');
    this.checkValidAndUniqueProperties(Object.keys(this.template), 'template');

    config.declareType(this.nameType);
    config.declareType(this.valueType);
  }

  public mark(interpreter: ESInterpreter, valueInfo: ESValueInfo): void
  {
    // for marking missing wildcard field errors
    const marker = valueInfo.objectChildren[_.keys(valueInfo.objectChildren)[0]];
    const valueClause: ESClause = interpreter.config.getClause(this.valueType);
    this.wildcardMarked = false;

    super.mark(interpreter, valueInfo);

    // If no wildcard property was marked, accumulate and error (because this is required)
    if (!this.wildcardMarked)
    {
      interpreter.accumulateError(marker !== undefined ? marker.propertyName : null,
        'Error: missing required wildcard field with value type of ' + valueClause.name);
    }
  }

  protected unknownPropertyName(interpreter: ESInterpreter, children: { [name: string]: ESPropertyInfo }, viTuple: ESPropertyInfo)
  {
    const nameClause: ESClause = interpreter.config.getClause(this.nameType);
    const valueClause: ESClause = interpreter.config.getClause(this.valueType);
    // check if this is the wild card field
    if (!this.wildcardMarked)
    {
      viTuple.propertyName.clause = nameClause;
      if (viTuple.propertyValue !== null)
      {
        viTuple.propertyValue.clause = valueClause;
      }
      this.wildcardMarked = true;
      return false;
    }
    else
    {
      interpreter.accumulateError(viTuple.propertyName,
        'Unknown property \"' + String(name) +
        '\". Expected one of these properties: ' +
        JSON.stringify(_.difference(Object.keys(this.structure), Object.keys(children)), null, 2),
        true);
      return true;
    }
  }
}
