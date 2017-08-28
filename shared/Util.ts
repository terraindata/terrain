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
  preview?: number;

  /* if true, the first row of parsed data will be interpreted as field names. Warning: Duplicate field names will
     overwrite values in previous fields having the same name */
  hasHeaderRow?: boolean;

  /* callback to execute if parser encounters an error. */
  error?: (err: string) => void;
}

export function parseCSV(file, config: ParseCSVConfig)
{
  const delim = config.delimiter || ',';
  const quoteChar = config.quoteChar || '\"';
  const escapeChar = config.escapeChar || '\"';
  const comments = config.comments || '#';
  const hasHeaderRow = config.hasHeaderRow === undefined ? true : config.hasHeaderRow;
  let preview = config.preview;

  // autodetect newLine
  let newLine;
  const rnIndex = file.indexOf('\r\n');
  const nIndex = file.indexOf('\n');
  if (rnIndex === -1 && nIndex === -1)
  {
    config.error('Error: no line-breaks found in uploaded file.');
    return undefined;
  }
  if (rnIndex === -1)
  {
    newLine = '\n';
  }
  else if (nIndex === -1)
  {
    newLine = '\r\n';
  }
  else
  {
    newLine = rnIndex < nIndex ? '\r\n' : '\n';
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
      if (arr[row].length === newLineLength) // increment preview on blank rows and remove them later
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

  arr = arr.filter((arrRow) =>
    arrRow.length > newLineLength,
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

export function parseJSONSubset(file: string, numLines: number): object[]
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

export function parseNewlineJSON(file: string, numLines: number): object[] | string
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
