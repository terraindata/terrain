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

// tslint:disable:strict-boolean-expressions

import EQLConfig from '../EQLConfig';
import ESClauseType from '../ESClauseType';
import ESClauseVisitor from '../ESClauseVisitor';
import ESInterpreter from '../ESInterpreter';
import ESJSONType from '../ESJSONType';
import ESValueInfo from '../ESValueInfo';

import ESClauseSettings from '../ESClauseSettings';
import ESAnyClause from './ESAnyClause';
import ESArrayClause from './ESArrayClause';
import ESBaseClause from './ESBaseClause';
import ESBooleanClause from './ESBooleanClause';
import ESEnumClause from './ESEnumClause';
import ESFieldClause from './ESFieldClause';
import ESIndexClause from './ESIndexClause';
import ESMapClause from './ESMapClause';
import ESNullClause from './ESNullClause';
import ESNumberClause from './ESNumberClause';
import ESObjectClause from './ESObjectClause';
import ESPropertyClause from './ESPropertyClause';
import ESReferenceClause from './ESReferenceClause';
import ESScriptClause from './ESScriptClause';
import ESStringClause from './ESStringClause';
import ESStructureClause from './ESStructureClause';
import ESTypeClause from './ESTypeClause';
import ESVariantClause from './ESVariantClause';
import ESWildcardStructureClause from './ESWildcardStructureClause';
/**
 * Represents an Elastic Search query clause
 */
abstract class ESClause
{
  public clauseType: ESClauseType; // clause type (each class has a unique clause type)

  public type: string; // type name

  public settings: ESClauseSettings; // additional information about this clause

  /**
   * Type definition for this clause. It should be one of these:
   * + A parent type name that this clause inherits from (ex: boost inherits from number)
   * + An object containing all allowed properties and their types.
   *   (a null property value means the type is the same as the name of the property)
   */
  public def: string | { [key: string]: string | null };

  public name: string; // human type name
  public path: string[]; // human-facing categorization of this clause type & function
  public desc: string; // clause description
  public url: string; // clause documentation url
  public template: any; // template for this clause type
  public required: string[]; // required members (used for object types)
  public suggestions: any[]; // suggested autocomplete values or keys
  public multifield: boolean;
  public rewrite: (ESInterpreter, ESValueInfo) => void;

  /**
   * @param type the name to refer to this clause (type)
   * @param settings the settings object to initialize it from
   * @param clauseType the enum uniquely identifying the clause type
   */
  public constructor(type: string, clauseType: ESClauseType, settings?: ESClauseSettings)
  {
    this.clauseType = clauseType;
    this.type = type;
    this.settings = settings === undefined ? {} : settings;
    this.setDefaultProperty('def', () => 'value');
    this.setDefaultProperty('name', () => this.type.replace('_', ' '));
    this.setDefaultProperty('path', () => ['general']);
    this.setDefaultProperty('desc', () => '');
    this.setDefaultProperty('url', () => '');
    this.setDefaultProperty('template', () => undefined);
    this.setDefaultProperty('required', () => []);
    this.setDefaultProperty('suggestions', () => []);
    this.setDefaultProperty('multifield', () => true);
    this.setDefaultProperty('rewrite', () => undefined);
  }

  public init(config: EQLConfig): void
  {
    // default is to do nothing
  }

  public accept<ReturnType>(visitor: ESClauseVisitor<ReturnType>): ReturnType
  {
    switch (this.clauseType)
    {
      case ESClauseType.ESAnyClause:
        return visitor.visitESAnyClause(this as any as ESAnyClause);
      case ESClauseType.ESArrayClause:
        return visitor.visitESArrayClause(this as any as ESArrayClause);
      case ESClauseType.ESBaseClause:
        return visitor.visitESBaseClause(this as any as ESBaseClause);
      case ESClauseType.ESBooleanClause:
        return visitor.visitESBooleanClause(this as any as ESBooleanClause);
      case ESClauseType.ESEnumClause:
        return visitor.visitESEnumClause(this as any as ESEnumClause);
      case ESClauseType.ESFieldClause:
        return visitor.visitESFieldClause(this as any as ESFieldClause);
      case ESClauseType.ESIndexClause:
        return visitor.visitESIndexClause(this as any as ESIndexClause);
      case ESClauseType.ESMapClause:
        return visitor.visitESMapClause(this as any as ESMapClause);
      case ESClauseType.ESNullClause:
        return visitor.visitESNullClause(this as any as ESNullClause);
      case ESClauseType.ESNumberClause:
        return visitor.visitESNumberClause(this as any as ESNumberClause);
      case ESClauseType.ESObjectClause:
        return visitor.visitESObjectClause(this as any as ESObjectClause);
      case ESClauseType.ESPropertyClause:
        return visitor.visitESPropertyClause(this as any as ESPropertyClause);
      case ESClauseType.ESReferenceClause:
        return visitor.visitESReferenceClause(this as any as ESReferenceClause);
      case ESClauseType.ESStringClause:
        return visitor.visitESStringClause(this as any as ESStringClause);
      case ESClauseType.ESStructureClause:
        return visitor.visitESStructureClause(this as any as ESStructureClause);
      case ESClauseType.ESTypeClause:
        return visitor.visitESTypeClause(this as any as ESTypeClause);
      case ESClauseType.ESVariantClause:
        return visitor.visitESVariantClause(this as any as ESVariantClause);
      case ESClauseType.ESScriptClause:
        return visitor.visitESScriptClause(this as any as ESScriptClause);
      case ESClauseType.ESWildcardStructureClause:
        return visitor.visitESWildcardStructureClause(this as any as ESWildcardStructureClause);
      default:
        return visitor.visitESClause(this);
    }
  }

  public mark(interpreter: ESInterpreter, valueInfo: ESValueInfo): void
  {
    if (this.rewrite !== undefined)
    {
      this.rewrite(interpreter, valueInfo);
    }
  }

  protected typeCheck(interpreter: ESInterpreter,
    valueInfo: ESValueInfo,
    expected: ESJSONType): boolean
  {
    if (ESJSONType[valueInfo.jsonType] === 'parameter')
    {
      if (valueInfo.parameterValue && valueInfo.parameterValue.getValueInfo())
      {
        const parameterType = valueInfo.parameterValue.getValueInfo().jsonType;
        if (parameterType !== expected)
        {
          interpreter.accumulateError(valueInfo,
            'Expected a ' + ESJSONType[expected] + ', but found a parameter ' + String(valueInfo.parameter) +
            ' whose type is ' + ESJSONType[parameterType] + ' instead.');
          return false;
        }
      } else
      {
        interpreter.accumulateError(valueInfo,
          'Expected a ' + ESJSONType[expected] + ', but found a parameter ' + String(valueInfo.parameter) +
          ' whose type is unknown.');
      }
    } else
    {
      if (valueInfo.jsonType !== expected)
      {
        interpreter.accumulateError(valueInfo,
          'Expected a ' + ESJSONType[expected] + ', but found a ' +
          ESJSONType[valueInfo.jsonType] + ' instead.');
        return false;
      }
    }

    return true;
  }

  protected setDefaultProperty(name: string, defaultValueFunction: any): void
  {
    let val: any = this.settings[name];
    if (val === undefined)
    {
      val = defaultValueFunction();
    }

    this[name] = val;
  }
}

export default ESClause;
