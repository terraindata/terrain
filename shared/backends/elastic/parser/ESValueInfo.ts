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

import ESClause from './ESClause';
import ESJSONType from './ESJSONType';
import ESParserError from './ESParserError';
import ESParserToken from './ESParserToken';
import ESPropertyInfo from './ESPropertyInfo';

/**
 * Represents information about a value that was parsed by ESJSONParser
 */
export default class ESValueInfo
{

  private static emptyArrayChildren: ESValueInfo[] = [];

  private static emptyObjectChildren: { [name: string]: ESPropertyInfo } = {};

  private static emptyErrorList: ESParserError[] = [];

  /**
   * The JSON type of the value.
   */
  public jsonType: ESJSONType;

  /**
   * The parsed value
   */
  public value: any;

  /**
   * If value is an array, a corresponding ESValueInfo[]. An empty list otherwise.
   */
  public arrayChildren: ESValueInfo[];

  /**
   * If value is an object, a corresponding object mapping keys. An empty object otherwise.
   */
  public objectChildren: { [name: string]: ESPropertyInfo };

  /**
   * The tokens belonging to the value, in order of appearance
   */
  public tokens: ESParserToken[];

  /**
   * If errors were detected associated with this value, they will be in this list
   * in the order in which they were detected.
   */
  public errors: ESParserError[];

  /**
   * When interpreted, this is set to the detected ESClause for this value
   */
  public clause: ESClause | null;

  /**
   * In the case of a variant clause, this is set to the delegate clause used
   */
  public delegateClause: ESClause | null;

  public constructor()
  {
    this.jsonType = ESJSONType.unknown;
    this.value = undefined;
    this.tokens = [];
    this.arrayChildren = ESValueInfo.emptyArrayChildren;
    this.objectChildren = ESValueInfo.emptyObjectChildren;
    this.errors = ESValueInfo.emptyErrorList;
    this.clause = null;
    this.delegateClause = null;
  }

  public attachError(error: ESParserError): void
  {
    if (this.errors.length === 0)
    {
      this.errors = [error];
    }
    else
    {
      this.errors.push(error);
    }
  }
}
