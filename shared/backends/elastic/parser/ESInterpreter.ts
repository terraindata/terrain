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

import EQLConfig from './EQLConfig';
import ESJSONParser from './ESJSONParser';
import ESParserError from './ESParserError';
import ESValueInfo from './ESValueInfo';

export const ESInterpreterDefaultConfig = new EQLConfig();

/**
 * An instrumented interpreter that takes the output of ESJSONParser and
 * decorates the results with ES-specific information.
 */
export default class ESInterpreter
{
  public parser: ESJSONParser; // source parser
  public config: EQLConfig; // query language description

  /**
   * Runs the interpreter on the given query string. Read needed data by calling the
   * public member functions below. You can also pass in an existing ESJSONParser
   * to run the interpreter on it's result.
   * @param query the query string or parser to interpret
   */
  public constructor(query: string | ESJSONParser, config: EQLConfig = ESInterpreterDefaultConfig)
  {
    this.config = config;

    if (typeof query === 'string')
    {
      this.parser = new ESJSONParser(query);
    } else
    {
      this.parser = query;
    }

    if (this.parser.getValue() !== null && this.parser.hasError() === false)
    {
      try
      {
        this.config.getClause('root').mark(this, this.parser.getValueInfo());
      } catch (e)
      {
        this.accumulateError(this.parser.getValueInfo(), 'Failed to mark the json object ' + String(e.message));
      }
    }
  }

  public accumulateError(info: ESValueInfo, message: string, isWarning: boolean = false): void
  {
    this.parser.accumulateError(new ESParserError(info.tokens[0], info, message, isWarning));
  }

  public hasError()
  {
    return this.parser === null || this.parser.hasError();
  }
}
