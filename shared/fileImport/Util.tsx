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
    '"',
  ];

const VALID_NEWLINE_SEQUENCES =
  [
    '\n',
    '\r',
  ];

export interface ParseCSVConfig
{
  /* The delimiting character. Must be string of length 1 */
  delimiter: string;

  /* The newLine sequence. Must be one of \r, \n, or \r\n. */
  newLine: string;

  /* The character used to quote fields */
  quoteChar: string;

  /* The character used to escape characters */
  escapeChar: string;

  /* The string that indicates a comment (e.g., "#" or "//"). When parser encounters a line starting with this string,
     it will skip the line. */
  comments: string;

  /* If > 0, only that many rows will be parsed. */
  preview: number;

  /* if true, the first row of parsed data will be interpreted as field names. Warning: Duplicate field names will
     overwrite values in previous fields having the same name */
  hasHeaderRow: boolean;

  /* callback to execute if parser encounters an error. */
  error: (err: any) => void;
}

/* returns an error message if there are any; else returns empty string */
export function isValidIndexName(name: string): string
{
  if (name === '')
  {
    return 'Index name cannot be an empty string.';
  }
  if (name !== name.toLowerCase())
  {
    return 'Index name may not contain uppercase letters.';
  }
  if (!/^[a-z\d].*$/.test(name))
  {
    return 'Index name must start with a lowercase letter or digit.';
  }
  if (!/^[a-z\d][a-z\d\._\+-]*$/.test(name))
  {
    return 'Index name may only contain lowercase letters, digits, periods, underscores, dashes, and pluses.';
  }
  return '';
}
/* returns an error message if there are any; else returns empty string */
export function isValidTypeName(name: string): string
{
  if (name === '')
  {
    return 'Document type cannot be an empty string.';
  }
  if (/^_.*/.test(name))
  {
    return 'Document type may not start with an underscore.';
  }
  return '';
}
/* returns an error message if there are any; else returns empty string */
export function isValidFieldName(name: string): string
{
  if (name === '')
  {
    return 'Field name cannot be an empty string.';
  }
  if (/^_.*/.test(name))
  {
    return 'Field name may not start with an underscore.';
  }
  if (name.indexOf('.') !== -1)
  {
    return 'Field name may not contain periods.';
  }
  return '';
}

export function parseJSONSubset(file: string, numLines: number): object[]
{
  let lineCount = 0;
  let openBracketCount = 0;
  let closeBracketCount = 0;
  let charIndex = 0;

  while (lineCount < numLines)
  {
    if (charIndex >= file.length - 1)
    {
      if (file.charAt(charIndex) === '\n')
      {
        charIndex--;
      }
      break;
    }

    if (file.charAt(charIndex) === '{')
    {
      openBracketCount++;
    }
    else if (file.charAt(charIndex) === '}')
    {
      closeBracketCount++;
    }
    charIndex++;

    if (openBracketCount === closeBracketCount && openBracketCount !== 0)
    {
      lineCount++;
      openBracketCount = 0;
      closeBracketCount = 0;
    }
  }
  return JSON.parse(file.substring(0, charIndex) + ']');
}

export function parseCSV(file, config: ParseCSVConfig)
{
  const delim = config.delimiter;
  const newLine = config.newLine;
  const quoteChar = config.quoteChar;
  const escapeChar = config.escapeChar;
  const comments = config.comments;
  const hasHeaderRow = config.hasHeaderRow;
  let preview = config.preview;

  if (BAD_DELIMITERS.indexOf(delim) !== -1)
  {
    config.error('Error: invalid delimiter ' + delim + '. Invalid delimiters are ' + String(BAD_DELIMITERS));
    return undefined;
  }
  if (VALID_NEWLINE_SEQUENCES.indexOf(newLine) === -1)
  {
    config.error('Error: invalid newLine sequence ' + newLine + '. Valid newLine sequences are ' + String(VALID_NEWLINE_SEQUENCES));
    return undefined;
  }
  if (comments === delim)
  {
    config.error('Error: comment character same as delimiter');
    return undefined;
  }
  if (file[0] === newLine)
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

    if (rowStart && comments && file.substr(c, comments.length) === comments)
    {
      c = Number(file.indexOf(newLine, c));
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
    if (curChar === newLine && !insideQuote)
    {
      if (arr[row].length === newLine.length) // increment preview on blank rows and remove them later
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

  arr = arr.filter((arrRow) =>
    arrRow.length > newLine.length,
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
