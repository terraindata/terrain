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

import AExportTransform from './AExportTransform';

/**
 * Export to CSV format.
 * Conforms to RFC 4180: https://tools.ietf.org/html/rfc4180
 *
 * Additional configuration options are possible.
 */
export default class CSVExportTransform extends AExportTransform
{

  private columnNames: string[];
  private separator: string = ',';
  private nullValue: string = 'null';

  constructor(columnNames: string[],
    separator: string = ',',
    nullValue: string = 'null')
  {
    super();
    this.columnNames = columnNames;
    this.separator = separator;
    this.nullValue = nullValue;
  }

  protected preamble(): string
  {
    const headerObject: object = {};
    for (let i: number = 0; i < this.columnNames.length; ++i)
    {
      const name: string = this.columnNames[i];
      headerObject[name] = name;
    }

    return this.transform(headerObject, 0) + this.delimiter();
  }

  protected transform(input: object, chunkNumber: number): string
  {
    let result: string = '';

    for (let i: number = 0; i < this.columnNames.length; ++i)
    {
      const name: string = this.columnNames[i];
      const value: any = input[name];

      if (i > 0)
      {
        result += this.separator;
      }

      result += this.translation(value);
    }
    return result;
  }

  protected delimiter(): string
  {
    return '\r\n';
  }

  protected conclusion(chunkNumber: number): string
  {
    return this.delimiter();
  }

  private translation(value: any): string
  {
    switch (typeof value)
    {
      case 'boolean':
        return (value === true) ? 'true' : 'false';
      case 'number':
        return value.toString();
      case 'string':
        return this.escapeString(value as string);
      case 'object':
        if (value === null)
        {
          return this.nullValue;
        }
        else
        {
          return this.escapeString(JSON.stringify(value));
        }
      case 'undefined':
        return this.nullValue;
      default:
        throw Error('Unable to convert value to valid CSV: ' + JSON.stringify(value));
    }
  }

  private escapeString(input: string): string
  {
    if (!(/[,\n\r"]/.test(input)))
    {
      return input; // no need to escape
    }

    // CSV escapes quotes by doubling them
    input = input.replace(/"/g, '""');
    return '"' + input + '"';
  }
}
