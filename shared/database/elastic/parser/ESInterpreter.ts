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
import EQLConfig from './EQLConfig';
import ESJSONParser from './ESJSONParser';
import ESValueInfo from './ESValueInfo';

export const ESInterpreterDefaultConfig = new EQLConfig();

/**
 * An instrumented interpreter that takes the output of ESJSONParser and
 * decorates the results with ES-specific information.
 */
export default class ESInterpreter
{
  public config: EQLConfig; // query language description
  public params: { [name: string]: null | ESClause }; // input parameter clause types
  public parser: ESJSONParser; // source parser

  /**
   * Runs the interpreter on the given query string. Read needed data by calling the
   * public member functions below. You can also pass in an existing ESJSONParser
   * to run the interpreter on it's result.
   *
   * 1) parse
   * 2) interpret
   *
   * @param query the query string or parser to interpret
   * @param config the spec config to use
   * @param params parameter map to use
   */
  public constructor(query: string | ESJSONParser,
    params: { [name: string]: any } = {},
    config: EQLConfig = ESInterpreterDefaultConfig)
  {
    this.config = config;
    this.params = params;

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
        const root: ESValueInfo = this.parser.getValueInfo();
        root.clause = this.config.getClause('root');
        root.recursivelyVisit(
          (info: ESValueInfo): boolean =>
          {
            if (info.parameter !== undefined)
            {
              const value: null | any = this.params[info.parameter];
              if (value === undefined)
              {
                this.accumulateError(info, 'Undefined parameter: ' + info.parameter);
              }

              return false; // don't validate parameters
            }

            if (info.clause !== undefined)
            {
              info.clause.mark(this, info);
            }

            return true;
          });
      } catch (e)
      {
        this.accumulateError(this.parser.getValueInfo(), 'Failed to mark the json object ' + String(e.message));
      }
    }
  }

  public accumulateError(info: ESValueInfo, message: string, isWarning: boolean = false): void
  {
    this.parser.accumulateErrorOnValueInfo(info, message, isWarning);
  }

  public hasError()
  {
    return this.parser === null || this.parser.hasError();
  }
}