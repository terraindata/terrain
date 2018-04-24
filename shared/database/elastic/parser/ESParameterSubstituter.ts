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

import ESJSONType from './ESJSONType';
import ESPropertyInfo from './ESPropertyInfo';
import ESValueInfo from './ESValueInfo';

/**
 * Produces a new query string from a value info root, substituting in a given
 * string for each parameter, using a lambda to produce the string.
 */
export default class ESParameterSubstituter
{
  public static generate(source: ESValueInfo,
    substitutionFunction: (param: string, runtimeParam?: string) => string): string
  {
    return (new ESParameterSubstituter(source, substitutionFunction)).result;
  }

  private substitutionFunction: (param: string, runtimeParam?: string, inTerms?: boolean) => string;
  private result: string;

  public constructor(source: ESValueInfo,
    substitutionFunction: (param: string, runtimeParam?: string) => string)
  {
    this.substitutionFunction = substitutionFunction;
    this.result = '';
    this.convert(source);
  }

  public convert(source: ESValueInfo, inShould: boolean = false, inTerms: boolean = false, alias: string = 'parent'): void
  {
    let i: number = 0;

    switch (source.jsonType)
    {
      case ESJSONType.null:
      case ESJSONType.boolean:
      case ESJSONType.number:
        this.appendJSON(source.value);
        break;

      case ESJSONType.string:
        if (source.parameter !== undefined)
        {
          this.appendParameter(source.parameter, inShould && inTerms, inTerms, alias);
          break;
        }

        this.appendJSON(source.value);
        break;

      case ESJSONType.parameter:
        this.appendParameter(source.parameter as string, inShould && inTerms, inTerms, alias);
        break;

      case ESJSONType.array:
        this.result += '[';
        source.forEachElement(
          (child: ESValueInfo): void =>
          {
            if (i++ > 0)
            {
              this.result += ',';
            }

            this.convert(child, inShould, inTerms, alias);
          });
        this.result += ']';
        break;

      case ESJSONType.object:
        this.result += ' { '; // extra spaces to avoid confusion with mustache tags

        source.forEachProperty(
          (property: ESPropertyInfo): void =>
          {
            if (i++ > 0)
            {
              this.result += ',';
            }

            if (property.propertyName.value === 'groupJoin' && property.propertyValue !== null)
            {
              const parentAlias = property.propertyValue.objectChildren['parentAlias'];
              if (parentAlias !== undefined && parentAlias.propertyValue !== null)
              {
                alias = parentAlias.propertyValue.value;
              }
            }

            if (property.propertyName.value === 'should')
            {
              inShould = true;
            }

            if (property.propertyName.value === 'terms')
            {
              inTerms = true;
            }

            this.convert(property.propertyName, inShould, inTerms, alias);
            this.result += ':';

            if (property.propertyValue !== null)
            {
              this.convert(property.propertyValue, inShould, inTerms, alias);
            }
          });

        if (inShould && !inTerms)
        {
          inShould = false;
        }

        if (inShould && inTerms)
        {
          inTerms = false;
        }

        this.result += ' } '; // extra spaces to avoid confusion with mustache tags
        break;

      default:
        throw new Error('Unconvertable value type found.');
    }
  }

  private appendParameter(param: string, replaceNullWithEmptyArray: boolean, inTerms: boolean, alias?: string): void
  {
    let subst = this.substitutionFunction(param, alias, inTerms);
    if (replaceNullWithEmptyArray && subst === 'null')
    {
      subst = '[]';
    }
    this.result += subst;
  }

  private appendJSON(value: any): void
  {
    this.result += JSON.stringify(value);
  }
}
