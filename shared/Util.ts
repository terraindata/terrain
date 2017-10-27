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

// tslint:disable:no-var-requires strict-boolean-expressions max-line-length

const BAD_DELIMITERS =
  [
    '\r',
    '\n',
    '\r\n',
    '"',
  ];

const VALID_NEWLINE_SEQUENCES =
  [
    '\n',
    '\r\n',
  ];

export interface ParseCSVConfig
{
  /* The delimiting character. Must be string of length 1. */
  delimiter?: string;

  /* The newLine sequence. Must be one of \n or \r\n. */
  newLine?: string;

  /* The character used to quote fields. */
  quoteChar?: string;

  /* The character used to escape characters inside quoted fields. */
  escapeChar?: string;

  /* The string that indicates a comment (e.g., "#" or "//"). When parser encounters a line starting with this string,
     it will skip the line. */
  comments?: string;

  /* If > 0, only that many rows will be parsed. */
  preview: number;

  /* if true, the first row of parsed data will be interpreted as field names. Warning: Duplicate field names will
     overwrite values in previous fields having the same name */
  hasHeaderRow: boolean;

  /* callback to execute if parser encounters an error. */
  error: (err: string) => void;
}

const newlineDelimeters = ['\r\n', '\r', '\n'];

export function parseCSV(file, config: ParseCSVConfig)
{
  const delim = config.delimiter || ',';
  const quoteChar = config.quoteChar || '\"';
  const escapeChar = config.escapeChar || '\"';
  const comments = config.comments || '#';
  const hasHeaderRow = config.hasHeaderRow === undefined ? true : config.hasHeaderRow;
  let preview = config.preview;

  // autodetect newLine
  let newLine: string = '';
  let newLineIndex: number;
  newlineDelimeters.map((newLineDelim) =>
  {
    const index = file.indexOf(newLineDelim);
    if (index !== -1)
    {
      if (newLineIndex === undefined || newLineIndex > index)
      {
        newLine = newLineDelim;
        newLineIndex = index;
      }
    }
  });

  if (newLine === '')
  {
    config.error('Error: no line-breaks found in uploaded CSV file.');
    return undefined;
  }

  const newLineLength = newLine.length;
  const commentsLength = comments.length;

  if (BAD_DELIMITERS.indexOf(delim) !== -1)
  {
    config.error('Error: invalid delimiter ' + delim + '. Invalid delimiters are ' + String(BAD_DELIMITERS));
    return undefined;
  }
  if (delim.length !== 1)
  {
    config.error('Error: delim character must be length 1');
    return undefined;
  }
  if (quoteChar.length !== 1)
  {
    config.error('Error: quoteChar character must be length 1');
    return undefined;
  }
  if (escapeChar.length !== 1)
  {
    config.error('Error: escape character must be length 1');
    return undefined;
  }
  if (comments === delim)
  {
    config.error('Error: comment character same as delimiter');
    return undefined;
  }
  if (file.substr(0, newLineLength) === newLine)
  {
    config.error('Error: first line of file cannot be empty');
    return undefined;
  }

  if (hasHeaderRow)
  {
    preview += 1;
  }

  let arr: string[][] = [];
  let insideQuote = false;
  let rowStart = true;

  let row = 0;
  let col = 0;
  let curChar;
  let nextChar;

  for (let c = 0; c < file.length; c++)
  {
    curChar = file[c];
    nextChar = file[c + 1];
    arr[row] = arr[row] || [];             // create a new row if necessary
    arr[row][col] = arr[row][col] || '';   // create a new column (start with empty string) if necessary

    if (rowStart && comments && file.substr(c, commentsLength) === comments)
    {
      c = Number(file.indexOf(newLine, c));
      if (c === -1) // EOF
      {
        arr.pop();
        c = file.length;
      }
      c += newLineLength - 1; // account for loop increment
      continue;
    }
    rowStart = false;

    if (curChar === escapeChar && insideQuote && nextChar === quoteChar)
    {
      arr[row][col] += curChar;
      c++;
      continue;
    }
    if (curChar === quoteChar)
    {
      insideQuote = !insideQuote;
      continue;
    }
    if (curChar === delim && !insideQuote)
    {
      col++;
      continue;
    }
    if (file.substr(c, newLineLength) === newLine && !insideQuote)
    {
      if (arr[row].length === 1 && arr[row][0].length === newLineLength) // increment preview on blank rows and remove them later
      {
        preview++;
      }
      if (preview && arr.length >= preview)
      {
        break;
      }
      if (col > 0 && col !== arr[0].length - 1)
      {
        config.error('Error: each row must have the same number of fields');
        return undefined;
      }
      row++;
      col = 0;
      rowStart = true;
      c += newLineLength - 1; // account for loop increment
      continue;
    }
    arr[row][col] += curChar;
  }
  if (insideQuote)
  {
    config.error('Error: unterminated quote');
    return undefined;
  }
  if (curChar === delim)
  {
    arr[row][col] = '';
  }

  // remove blank lines
  arr = arr.filter((arrRow) =>
    arrRow.length > 1 || arrRow[0].length > newLineLength,
  );

  if (hasHeaderRow)
  {
    const headers = arr[0];
    const arrObj = arr.slice(1).map((arrRow) =>
      arrRow.reduce((acc, cur, i) =>
      {
        acc[headers[i]] = cur;
        return acc;
      }, {}),
    );
    return arrObj;
  }
  return arr;
}

export function parseObjectListJSONSubset(file: string, numLines: number): object[]
{
  let lineCount = 0;
  let openBracketCount = 0;
  let closeBracketCount = 0;
  let c = 0;

  while (lineCount < numLines)
  {
    const curChar = file[c];
    if (c >= file.length - 1)
    {
      if (curChar === '\n')
      {
        c--;
      }
      break;
    }

    if (curChar === '{')
    {
      openBracketCount++;
    }
    else if (curChar === '}')
    {
      closeBracketCount++;
    }
    c++;

    if (openBracketCount === closeBracketCount && openBracketCount !== 0)
    {
      lineCount++;
      openBracketCount = 0;
      closeBracketCount = 0;
    }
  }
  return JSON.parse(file.substring(0, c) + ']');
}

export function parseNewlineJSONSubset(file: string, numLines: number): object[] | string
{
  const items: object[] = [];
  let ind: number = 0;
  while (ind < file.length)
  {
    let rInd: number = file.indexOf('\r', ind);
    rInd = rInd === -1 ? file.length : rInd;
    let nInd: number = file.indexOf('\n', ind);
    nInd = nInd === -1 ? file.length : nInd;
    const end: number = Math.min(rInd, nInd);

    const line: string = file.substring(ind, end);
    if (line !== '')
    {
      try
      {
        items.push(JSON.parse(file.substring(ind, end)));
        if (items.length === numLines)
        {
          return items;
        }
      }
      catch (e)
      {
        return 'JSON format incorrect. Could not parse object: ' + line;
      }
      ind = end;
    }
    else
    {
      ind++;
    }
  }
  return items;
}

// full template name is of the form - 'id: name'
export function getTemplateName(template: string): string
{
  return template.substring(template.indexOf(':') + 2);
}

export function getTemplateId(template: string): number
{
  return Number(template.substring(0, template.indexOf(':')));
}

export class CSVTypeParser
{
  public getDoubleFromString(value: string): number | boolean
  {
    const parsedValue: number | boolean = this._getDoubleFromStringHelper(value);
    if (typeof parsedValue === 'number')
    {
      return parsedValue;
    }
    if (value.charAt(0) === '$')
    {
      const dollarValue: number | boolean = this._getDoubleFromStringHelper(value.substring(1));
      if (typeof dollarValue === 'number')
      {
        return dollarValue;
      }
    }
    if (value.charAt(value.length - 1) === '%')
    {
      const percentValue: number | boolean = this._getDoubleFromStringHelper(value.substring(0, value.length - 1));
      if (typeof percentValue === 'number')
      {
        return percentValue / 100;
      }
    }
    return false;
  }

  public getBestTypeFromArrayAsArray(values: string[]): string[]
  {
    const types: Set<string> = new Set();
    for (const value of values)
    {
      types.add(JSON.stringify(this._getCSVTypeAsArray(value)));
    }
    const bestType: string[] = this._getBestTypeFromArrayHelper(types);
    return bestType[0] === 'BAD' ? ['text'] : bestType;
  }
  private _getBestTypeFromArrayHelper(types: Set<string>): string[]
  {
    types.delete(JSON.stringify(['null']));
    if (types.size === 0)
    {
      return ['text'];    // no data provided, so return the default
    }
    let numberOfArrayTypes: number = 0;
    for (const type of types)
    {
      if (JSON.parse(type)[0] === 'array')
      {
        numberOfArrayTypes++;
      }
    }
    if (numberOfArrayTypes > 0)
    {
      if (numberOfArrayTypes !== types.size)
      {
        return ['BAD']; // mix of array and (non-null) non-array types is not allowed
      }
      const innerTypes: Set<string> = new Set<string>();
      for (const type of types)
      {
        innerTypes.add(JSON.stringify(JSON.parse(type).slice(1)));
      }
      const bestType: string[] = this._getBestTypeFromArrayHelper(innerTypes);
      return bestType[0] === 'BAD' ? ['text'] : ['array'].concat(bestType);
    }
    if (types.size === 1)
    {
      return JSON.parse(Array.from(types)[0]) as string[];
    }
    if (this._matchInSet(types, ['long', 'double']))
    {
      return ['double'];
    }
    // if (this._matchInSet(types, ['long', 'date']))
    // {
    //   return ['date'];
    // }
    // if (this._matchInSet(types, ['double', 'date']))
    // {
    //   return ['date'];
    // }
    // TODO: other cases?
    return ['text'];
  }

  // accounts for numbers with commas, e.g., "1,105.20"
  private _getDoubleFromStringHelper(value: string): number | boolean
  {
    const parsedValue: number = Number(value);
    if (!isNaN(parsedValue))
    {
      return parsedValue;
    }
    let decimalInd: number = value.indexOf('.');
    decimalInd = decimalInd === -1 ? value.length : decimalInd;
    let ind = decimalInd - 4;
    while (ind > 0)
    {
      if (value.charAt(ind) === ',')
      {
        value = value.substring(0, ind) + value.substring(ind + 1);
        ind -= 4;
      }
      else
      {
        return false;
      }
    }
    const noCommaValue: number = Number(value);
    if (!isNaN(noCommaValue))
    {
      return noCommaValue;
    }
    return false;
  }

  private _isNullHelper(value: string): boolean
  {
    return value === null || value === undefined || value === '' || value === 'null' || value === 'undefined';
  }
  private _isIntHelper(value: string): boolean
  {
    const parsedValue: number | boolean = this.getDoubleFromString(value);
    // return ((typeof parsedValue) === 'number') && Number.isInteger(parsedValue as number);
    return ((typeof parsedValue) === 'number') && (value.indexOf('.') === -1);
  }
  private _isDoubleHelper(value: string): boolean
  {
    const parsedValue: number | boolean = this.getDoubleFromString(value);
    return (typeof parsedValue) === 'number';
  }
  private _isBooleanHelper(value: string): boolean
  {
    let parsedValue: any;
    try
    {
      parsedValue = JSON.parse(value);
    }
    catch (e)
    {
      return false;
    }
    return parsedValue === false || parsedValue === true;
  }

  private _isDateHelper(value: string): boolean
  {
    const dateFormatRegex = new RegExp('^(0?[1-9]|1[0,1,2])\/(0?[1-9]|[1,2][0-9]|3[0,1])\/([0-9]{4})$');
    return dateFormatRegex.test(value);
  }

  private _isArrayHelper(value: string): boolean
  {
    let parsedValue: any;
    try
    {
      parsedValue = JSON.parse(value);
    }
    catch (e)
    {
      return false;
    }
    return Array.isArray(parsedValue);
  }
  private _getCSVTypeAsArray(value: string): string[]
  {
    if (this._isNullHelper(value))
    {
      return ['null'];
    }
    if (this._isBooleanHelper(value))
    {
      return ['boolean'];
    }
    if (this._isArrayHelper(value))
    {
      const innerValue = JSON.parse(value);
      if (innerValue.length === 0)
      {
        return ['array', 'null'];
      }
      return isTypeConsistent(innerValue) ? ['array'].concat(this._getCSVTypeAsArray(JSON.stringify(innerValue[0]))) : ['text'];
    }
    if (this._isIntHelper(value))
    {
      return ['long'];
    }
    if (this._isDoubleHelper(value))
    {
      return ['double'];
    }
    if (this._isDateHelper(value))
    {
      return ['date'];
    }
    return ['text'];
  }
  // typeSet should already have JSON.stringify(['null']) removed
  private _matchInSet(typeSet: Set<string>, types: string[]): boolean
  {
    let counter: number = 0;
    for (const type of types)
    {
      if (typeSet.has(JSON.stringify([type])))
      {
        counter++;
      }
    }
    return counter === typeSet.size;
  }
}

/* checks if all elements in the provided array are of the same type ; handles nested arrays */
export function isTypeConsistent(arr: object[]): boolean
{
  return _isTypeConsistentHelper(arr) !== 'inconsistent';
}

function _isTypeConsistentHelper(arr: object[]): string
{
  if (arr.length === 0)
  {
    return 'null';
  }
  const types: Set<string> = new Set();
  arr.forEach((obj) =>
  {
    types.add(getType(obj));
  });
  if (types.size > 1)
  {
    types.delete('null');
  }
  if (types.size !== 1)
  {
    return 'inconsistent';
  }
  const type: string = types.entries().next().value[0];
  if (type === 'array')
  {
    const innerTypes: Set<string> = new Set();
    arr.forEach((obj) =>
    {
      innerTypes.add(_isTypeConsistentHelper(obj as object[]));
    });
    if (innerTypes.size > 1)
    {
      innerTypes.delete('null');
    }
    if (innerTypes.size !== 1)
    {
      return 'inconsistent';
    }
    return innerTypes.entries().next().value[0];
  }
  return type;
}

export function getType(obj: object): string
{
  if (typeof obj === 'object')
  {
    if (obj === null)
    {
      return 'null';
    }
    if (obj instanceof Date)
    {
      return 'date';
    }
    if (Array.isArray(obj))
    {
      return 'array';
    }
  }
  if (typeof obj === 'string')
  {
    return 'text';
  }
  // handles "number", "boolean", "object", and "undefined" cases
  return typeof obj;
}
