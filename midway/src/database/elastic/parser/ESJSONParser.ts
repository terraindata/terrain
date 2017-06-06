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

import ESParserError from './ESParserError';
import ESParserToken from './ESParserToken';
import ESParserPropertyInfo from './ESPropertyInfo';
import ESValueInfo from './ESValueInfo';

/**
 * An instrumented JSON parser for parsing ES queries
 *
 * http://www.json.org/
 *
 * https://discuss.codemirror.net/t/custom-mode-any-way-to-process-the-entire-string-in-the-editor-before-running-token-stream-state/775
 * "It is usually less work (and less of a performance hazard) to implement a
 * regular streaming CodeMirror mode than to try and work on top of a classical
 * whole-file parser. But if you really want to do it this way, you can
 * parameterize your mode with a full token stream, including token text,
 * and have it run through that (keeping a counter in its state) as long as
 * the stream it has matches the content, and just start outputting null
 * tokens when it runs into an outdated token. You can then set a debounced
 * change event handler that parses the document and calls cm.setOption("mode",
 * myModeWithTokens(tokenizeWholeFile(cm.getValue())), starting a new highlight."
 *
 */
export default class ESJSONParser
{
  private queryString: string; // string being parsed

  private charNumber: number; // current parser/tokenizer position in the queryString

  private lastCheckedRowChar: number; // last char checked for row count
  private lastRowChar: number; // position of last newline
  private lastRowNumber: number; // row number of last newline

  private value: any; // parsed value
  private valueInfo: ESValueInfo | null; // parsed root value info

  private tokens: ESParserToken[]; // accumulated tokens, in order
  private valueStack: ESValueInfo[]; // stack of current value info's
  private valueInfos: ESValueInfo[]; // accumulated value info's, in order
  private errors: ESParserError[]; // accumulated errors, in order

  /**
   * Runs the parser on the given query string. Read needed data by calling the
   * public member functions below.
   * @param queryString query to parse
   */
  public constructor(queryString: string)
  {
    this.queryString = queryString;
    this.charNumber = 0;
    this.lastCheckedRowChar = -1;
    this.lastRowChar = 0;
    this.lastRowNumber = 0;
    this.value = null;
    this.valueInfo = null;

    this.tokens = [];
    this.valueStack = [];
    this.valueInfos = [];
    this.errors = [];

    this.value = this.readValue();
  }

  /**
   * @returns {any} the parsed root value
   */
  public getValue(): any
  {
    return this.value;
  }

  /**
   * @returns {any} the parsed root value info
   */
  public getValueInfo(): ESValueInfo
  {
    return this.valueInfo as ESValueInfo;
  }

  /**
   * @returns {ESParserToken[]} the tokens encountered, in order
   */
  public getTokens(): ESParserToken[]
  {
    return this.tokens;
  }

  /**
   * @returns {ESValueInfo[]} metadata value info's for each value parsed, in order
   */
  public getValueInfos(): ESValueInfo[]
  {
    return this.valueInfos;
  }

  /**
   * @returns {ESParserError[]} errors encountered, in order
   */
  public getErrors(): ESParserError[]
  {
    return this.errors;
  }

  public accumulateError(error: ESParserError): void
  {
    this.errors.push(error);
  }

  private peek(): string
  {
    // skip whitespace
    this.match(/\s*/);

    // handle EOF
    if (this.charNumber >= this.queryString.length)
    {
      return '';
    }

    return this.queryString.charAt(this.charNumber);
  }

  private peekString(): string
  {
    if (this.charNumber >= this.queryString.length)
    {
      return '';
    }

    return this.queryString.substr(this.charNumber, this.queryString.length);
  }

  private advance(numChars: number = 1): void
  {
    this.charNumber += numChars;
  }

  private readValue(): any
  {
    const valueInfo: ESValueInfo = this.beginValueInfo();
    if (this.valueInfo === null)
    {
      // set root value info
      this.valueInfo = valueInfo;
    }

    const token: ESParserToken = this.accumulateToken();
    let value: any;

    try
    {
      switch (this.peek())
      {
        // string
        case '"':
          value = this.readString();
          this.setToken();
          break;

        // number
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case '-':
          value = this.readNumber();
          this.setToken();
          break;

        // object
        case '{':
          this.advance();
          value = this.readObject();
          break;

        case '}':
        case ']':
          break;

        // array
        case '[':
          this.advance();
          value = this.readArray();
          break;

        // true
        case 't':
          value = this.readTrueValue();
          this.setToken();
          break;

        // false
        case 'f':
          value = this.readFalseValue();
          this.setToken();
          break;

        // null
        case 'n':
          value = this.readNullValue();
          this.setToken();
          break;

        default:
          this.accumulateErrorOnCurrentToken('Unknown token found when expecting a value');
          this.advance();
          value = null;
          break;
      }
    }
    finally
    {
      if (value !== undefined)
      {
        // always end the value, even if it broke
        this.endValueInfo(value);
      }
      else
      {
        // if no value was read, erase the token information accumulated
        this.valueStack.pop();
        this.valueInfos.pop();
        this.tokens.pop();
      }
    }

    return value;
  }

  private readString(): string
  {
    const result: any = this.captureMatch(/^("(?:\\(?:["\\\/bfnrt]|u[a-fA-F0-9]{4})|[^"\\\0-\x1F\x7F]+)*")/);
    if (typeof result === 'string')
    {
      return result;
    }

    // try to capture an invalid token
    this.accumulateErrorOnCurrentToken('Unknown string format');
    this.match(/^(?:\\.|[^"\\])*"/);
    return '';
  }

  private readNumber(): number
  {
    const result: any = this.captureMatch(/^(-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/);
    if (typeof result === 'number')
    {
      return result;
    }

    // try to capture an invalid token
    this.accumulateErrorOnCurrentToken('Unknown number format');
    this.match(/^([\-.eE0-9]+)/);
    return 0;
  }

  private readArray(): any[]
  {
    const array: any[] = [];
    const arrayInfo: ESValueInfo = this.getCurrentValueInfo();
    arrayInfo.children = [];

    for (let element = this.readValue();
      element !== undefined;
      element = this.readValue())
    {
      array.push(element);

      arrayInfo.children.push(this.getCurrentValueInfo());

      // read next delimiter
      const propertyDelimiter: string = this.peek();
      if (propertyDelimiter !== ',')
      {
        break;
      }

      this.accumulateToken();
      this.advance(); // skip over ','
    }

    // at the end of the list, make sure that the terminating char is ']'
    if (this.peek() === ']')
    {
      this.accumulateToken();
      this.advance();
    }
    else
    {
      this.accumulateErrorOnCurrentToken('Missing or misplaced array closing bracket, "]"');
    }

    return array;
  }

  private readObject(): object
  {
    const obj: object = {};
    const objInfo: ESValueInfo = this.getCurrentValueInfo();
    objInfo.children = {};

    for (let propertyName = this.readValue();
      propertyName !== undefined;
      propertyName = this.readValue())
    {
      if (typeof propertyName !== 'string')
      {
        this.accumulateErrorOnCurrentToken(
          'Object property names must be strings, but found a ' + typeof propertyName + ' instead');
        propertyName = String(propertyName);
      }

      if (obj.hasOwnProperty(propertyName))
      {
        this.accumulateErrorOnCurrentToken('Duplicate property names are not allowed');
      }

      const propertyInfo: ESParserPropertyInfo =
        new ESParserPropertyInfo(this.getCurrentValueInfo());
      objInfo.children[propertyName] = propertyInfo;

      // read delimiter between property name and value
      const kvpDelimiter: string = this.peek();

      // check for errors in the delimiter
      if (kvpDelimiter !== ':')
      {
        if (kvpDelimiter === ',')
        {
          this.accumulateErrorOnCurrentToken('Object property\'s value is missing');
          this.accumulateToken();
          this.advance(); // skip over the comma
          continue;
        }

        break;
      }

      this.accumulateToken();
      this.advance(); // skip ':'

      // read property value
      const propertyValue = this.readValue();
      propertyInfo.value = this.getCurrentValueInfo();

      // check for errors in the property value
      if (propertyValue === undefined)
      {
        this.accumulateErrorOnCurrentToken('Object property\'s value is missing');
        break;
      }

      obj[propertyName] = propertyValue; // set object property

      // read next delimiter
      const propertyDelimiter: string = this.peek();
      if (propertyDelimiter !== ',')
      {
        break;
      }

      this.accumulateToken();
      this.advance(); // skip over ','
    }

    // at the end of the object, make sure that the terminating char is '}'
    if (this.peek() === '}')
    {
      this.accumulateToken();
      this.advance();
    }
    else
    {
      this.accumulateErrorOnCurrentToken('Missing or misplaced object closing brace, "}"');
    }

    return obj;
  }

  private readTrueValue(): boolean
  {
    this.readBooleanOrNull(/^true/);
    return true;
  }

  private readFalseValue(): boolean
  {
    this.readBooleanOrNull(/^false/);
    return false;
  }

  private readNullValue(): null
  {
    this.readBooleanOrNull(/^null/);
    return null;
  }

  private readBooleanOrNull(exp: RegExp): boolean
  {
    const match: string | null = this.match(exp);
    if (match !== null)
    {
      return true;
    }

    // try to capture an invalid token
    this.accumulateErrorOnCurrentToken('Unknown value type, possibly a boolean null (true, false, and null, are valid).');
    this.match(/^\w+/);
    return false;
  }

  private captureMatch(exp: RegExp): any
  {
    const match: string | null = this.match(exp);
    if (match === null)
    {
      return null;
    }

    const unescaped: string = JSON.parse(match);
    return unescaped;
  }

  private match(exp: RegExp): string | null
  {
    const matches = this.peekString().match(exp);
    if (matches === null || matches.length <= 0)
    {
      return null;
    }

    const match: string = matches[0];
    this.advance(match.length);
    return match;
  }

  private accumulateToken(): ESParserToken
  {
    const element: ESParserToken =
      new ESParserToken(this.charNumber, this.getRow(), this.getCol(), 1);
    this.tokens.push(element);

    // link up the current ValueInfo and the Token
    const valueInfo: ESValueInfo = this.getCurrentValueInfo();
    element.valueInfo = valueInfo;
    valueInfo.tokens.push(element);
    return element;
  }

  private getCurrentToken(): ESParserToken
  {
    return this.tokens[this.tokens.length - 1];
  }

  private setToken(): void
  {
    const element: ESParserToken = this.getCurrentToken();
    element.length = this.charNumber - element.charNumber;
  }

  private beginValueInfo(): ESValueInfo
  {
    const element: ESValueInfo = new ESValueInfo(null, []);
    this.valueInfos.push(element);
    this.valueStack.push(element);
    return element;
  }

  private getCurrentValueInfo(): ESValueInfo
  {
    return this.valueStack[this.valueStack.length - 1];
  }

  private endValueInfo(value: any): void
  {
    const element = this.valueStack.pop() as ESValueInfo;
    element.value = value;
  }

  private accumulateErrorOnCurrentToken(message: string): void
  {
    this.errors.push(new ESParserError(this.getCurrentToken(), message));
  }

  private getRow(): number
  {
    while (this.lastCheckedRowChar < this.charNumber)
    {
      ++this.lastCheckedRowChar;
      const c: string = this.queryString.charAt(this.lastCheckedRowChar);
      if (c === '\n')
      {
        this.lastRowChar = this.lastCheckedRowChar;
        ++this.lastRowNumber;
      }
    }

    return this.lastRowNumber;
  }

  private getCol(): number
  {
    this.getRow();
    return this.charNumber - this.lastRowChar;
  }
}
