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

import ESClause from './clauses/ESClause';
import ESJSONType from './ESJSONType';
import ESParserError from './ESParserError';
import ESParserToken from './ESParserToken';
import ESPropertyInfo from './ESPropertyInfo';

/**
 * Represents information about a value that was parsed by ESJSONParser
 */
export default class ESValueInfo
{
  /**
   * The JSON type of the value.
   */
  public jsonType: ESJSONType;

  /**
   * The parsed value
   */
  public value: undefined | any;

  /**
   * The tokens belonging to the value, in order of appearance
   */
  public tokens: ESParserToken[];

  /**
   * When this value is the result of substituting in a parameter,
   * this is set to the name of that parameter.
   */
  public parameter: undefined | string;

  /**
   * When interpreted, this is set to the detected ESClause for this value
   */
  public clause: undefined | ESClause;

  /**
   * In the case of a variant clause, this is set to the variant clause
   */
  public parentClause: undefined | ESClause;

  /**
   * If value is an object, a corresponding object mapping keys, undefined otherwise.
   */
  private _objectChildren: undefined | { [name: string]: ESPropertyInfo };

  /**
   * If value is an array, a corresponding ESValueInfo[], undefined otherwise.
   */
  private _arrayChildren: undefined | ESValueInfo[];

  /**
   * If errors were detected associated with this value, they will be in this list
   * in the order in which they were detected, undefined otherwise.
   */
  private _errors: undefined | ESParserError[];

  public constructor()
  {
    this.jsonType = ESJSONType.unknown;
    this.tokens = [];
  }

  /**
   * If value is an object, a corresponding object mapping keys, empty otherwise.
   */
  public get objectChildren(): { [name: string]: ESPropertyInfo }
  {
    return (this._objectChildren === undefined) ? {} : this._objectChildren;
  }

  public addObjectChild(name: string, info: ESPropertyInfo): void
  {
    this._objectChildren = this.objectChildren;
    this._objectChildren[name] = info;
  }

  /**
   * If value is an array, a corresponding ESValueInfo[], empty otherwise.
   */
  public get arrayChildren(): ESValueInfo[]
  {
    return (this._arrayChildren === undefined) ? [] : this._arrayChildren;
  }

  public addArrayChild(info: ESValueInfo): void
  {
    this._arrayChildren = this.arrayChildren;
    this._arrayChildren.push(info);
  }

  /**
   * If errors were detected associated with this value, they will be in this list
   * in the order in which they were detected.
   */
  public get errors(): ESParserError[]
  {
    return (this._errors === undefined) ? [] : this._errors;
  }

  public attachError(error: ESParserError): void
  {
    this._errors = this.errors;
    this._errors.push(error);
  }

  public forEachProperty(func: (property: ESPropertyInfo) => void): void
  {
    Object.keys(this.objectChildren).forEach(
      (name: string): void =>
      {
        func(this.objectChildren[name]);
      });
  }

  public forEachElement(func: (element: ESValueInfo) => void): void
  {
    this.arrayChildren.forEach(func);
  }

  public recursivelyVisit(func: (element: ESValueInfo) => boolean): void
  {
    if (!func(this))
    {
      return;
    }

    this.forEachProperty((property: ESPropertyInfo): void =>
    {
      property.propertyName.recursivelyVisit(func);

      if (property.propertyValue !== null)
      {
        property.propertyValue.recursivelyVisit(func);
      }
    });

    this.forEachElement((element: ESValueInfo): void =>
    {
      element.recursivelyVisit(func);
    });
  }
}