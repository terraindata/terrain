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

// Copyright 2018 Terrain Data, Inc.

import ESJSONType from './ESJSONType';
import ESParser from './ESParser';
import ESParserError from './ESParserError';
import ESParserToken from './ESParserToken';
import ESPropertyInfo from './ESPropertyInfo';
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
export class ESJSONParser extends ESParser
{
  private queryString: string; // string being parsed
  private allowParameters: boolean; // if @parameters are allowed (non-compliant)

  private charNumber: number; // current parser/tokenizer position in the queryString

  private lastCheckedRowChar: number; // last char checked for row count
  private lastRowChar: number; // position of last newline
  private lastRowNumber: number; // row number of last newline

  private tokens: ESParserToken[]; // accumulated tokens, in order
  private valueInfos: ESValueInfo[]; // accumulated value info's, in order

  /**
   * Runs the parser on the given query string. Read needed data by calling the
   * public member functions below.
   * @param queryString query to parse
   * @param allowParameters
   */
  public constructor(queryString: string, allowParameters: boolean = true)
  {
    super();

    this.queryString = queryString;
    this.charNumber = 0;
    this.lastCheckedRowChar = -1;
    this.lastRowChar = 0;
    this.lastRowNumber = 0;
    this.value = null;
    this.valueInfo = null;
    this.allowParameters = allowParameters;

    this.tokens = [];
    this.valueInfos = [];

    this.valueInfo = this.readValue();
    if (this.valueInfo !== null)
    {
      this.value = this.valueInfo.value;
    }

    // check ending
    if (this.peek() !== '')
    {
      this.accumulateToken();
      this.accumulateErrorOnCurrentToken('Unexpected token at the end of the query string');
    }
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

  public accumulateErrorOnValueInfo(info: ESValueInfo, message: string, isWarning: boolean = false): void
  {
    this.accumulateError(new ESParserError(info.tokens[0], info, message, isWarning));
  }

  private peek(): string
  {
    // skip whitespace
    this.match(/^\s*/);

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

  private readValue(): ESValueInfo | null
  {
    const nextChar: string = this.peek();
    const valueInfo: ESValueInfo = this.beginValueInfo();
    const token: ESParserToken = this.accumulateToken();
    token.valueInfo = valueInfo;

    let jsonType: ESJSONType = ESJSONType.invalid;

    try
    {
      switch (nextChar)
      {
        // string
        case '"':
          jsonType = ESJSONType.string;
          valueInfo.value = this.readString();
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
          jsonType = ESJSONType.number;
          valueInfo.value = this.readNumber();
          break;

        // object
        case '{':
          jsonType = ESJSONType.object;
          this.advance();
          this.readObject(valueInfo);
          break;

        // object end
        case '}':
          break;

        // array
        case '[':
          jsonType = ESJSONType.array;
          this.advance();
          this.readArray(valueInfo);
          break;

        // array end
        case ']':
          break;

        // true
        case 't':
          jsonType = ESJSONType.boolean;
          valueInfo.value = this.readTrueValue();
          break;

        // false
        case 'f':
          jsonType = ESJSONType.boolean;
          valueInfo.value = this.readFalseValue();
          break;

        // null
        case 'n':
          jsonType = ESJSONType.null;
          valueInfo.value = this.readNullValue();
          break;

        case '@':
          jsonType = ESJSONType.parameter;
          valueInfo.value = this.readParameter();
          valueInfo.parameter = valueInfo.value.substring(1);
          break;

        default:
          this.accumulateErrorOnCurrentToken('Unknown token found when expecting a value');
          this.matchAndSetToken(/^.[a-zA-Z_0-9]*/); // try to skip the token
          break;
      }
    }
    finally
    {
      if (valueInfo.value === undefined)
      {
        // if no value was read, erase the token information accumulated
        this.valueInfos.pop();
        this.tokens.pop();
      }
    }

    if (valueInfo.value === undefined)
    {
      return null;
    }

    token.jsonType = jsonType;
    valueInfo.jsonType = jsonType;

    return valueInfo;
  }

  private readString(): string
  {
    let result: any = this.captureMatch(/^("(?:\\(?:["\\\/bfnrt]|u[a-fA-F0-9]{4})|[^"\\\0-\x1F\x7F])*")/);
    if (typeof result === 'string')
    {
      return result;
    }

    // try to capture an invalid token
    this.accumulateErrorOnCurrentToken('Unknown string format');

    // try to capture a string that ends in double quotes
    result = this.matchAndSetToken(/^"(?:\\.|[^"\\])*"/);
    if (result !== null)
    {
      return result.substring(1, result.length - 1);
    }

    // try to capture a string that ends with some JSON control char
    result = this.matchAndSetToken(/^".+[^,:\[\]{}"]/);

    if (result !== null)
    {
      return result.substring(1, result.length);
    }

    this.advance();
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
    this.matchAndSetToken(/^([\-.eE0-9]+)/);
    return 0;
  }

  private readArray(arrayInfo: ESValueInfo): void
  {
    const array: any[] = [];
    arrayInfo.value = array;

    for (let elementInfo: ESValueInfo | null = this.readValue();
      elementInfo !== null;
      elementInfo = this.readValue())
    {
      array.push(elementInfo.value);
      arrayInfo.addArrayChild(elementInfo);

      // read array delimiter, ','
      const propertyDelimiter: string = this.peek();
      if (propertyDelimiter !== ',')
      {
        break;
      }

      this.accumulateToken(arrayInfo, ESJSONType.arrayDelimiter);
      this.advance();
    }

    // at the end of the list, make sure that the terminating char is ']'
    if (this.peek() === ']')
    {
      this.accumulateToken(arrayInfo, ESJSONType.arrayTerminator);
      this.advance();
    }
    else
    {
      this.accumulateErrorOnCurrentToken('Missing or misplaced array closing bracket, "]"');
    }
  }

  private readObject(objInfo: ESValueInfo): void
  {
    const obj: object = {};
    objInfo.value = obj;

    for (let nameInfo: ESValueInfo | null = this.readValue();
      nameInfo !== null;
      nameInfo = this.readValue())
    {
      let propertyName: any = nameInfo.value;

      if (typeof propertyName !== 'string')
      {
        this.accumulateErrorOnCurrentToken(
          'Object property names must be strings, but found a ' + typeof propertyName + ' instead');
        propertyName = String(propertyName);
      }

      // check for duplicates
      if (obj.hasOwnProperty(propertyName))
      {
        this.accumulateErrorOnCurrentToken('Duplicate property names are not allowed');
      }

      // install a property info into the parent object
      const propertyInfo: ESPropertyInfo = new ESPropertyInfo(nameInfo);
      objInfo.addObjectChild(propertyName, propertyInfo);

      // read delimiter between property name and value
      const kvpDelimiter: string = this.peek();

      // check for errors in the delimiter
      if (kvpDelimiter !== ':')
      {
        if (kvpDelimiter === ',')
        {
          // eat object delimiter, ','
          this.accumulateErrorOnCurrentToken('Object property\'s value is missing');
          this.accumulateToken(objInfo, ESJSONType.objectDelimiter);
          this.advance();
          continue;
        }

        break;
      }

      // eat property delimiter, ':'
      this.accumulateToken(nameInfo, ESJSONType.propertyDelimiter);
      this.advance();

      // read property value
      const propertyValueInfo: ESValueInfo | null = this.readValue();

      // check for errors in the property value
      if (propertyValueInfo === null)
      {
        this.accumulateErrorOnCurrentToken('Object property\'s value is missing');
        break;
      }

      propertyInfo.propertyValue = propertyValueInfo;
      obj[propertyName] = propertyValueInfo.value; // set object property

      // read next delimiter
      const propertyDelimiter: string = this.peek();
      if (propertyDelimiter !== ',')
      {
        break;
      }

      // eat object delimiter, ','
      this.accumulateToken(objInfo, ESJSONType.objectDelimiter);
      this.advance();
    }

    // at the end of the object, make sure that the terminating char is '}'
    if (this.peek() === '}')
    {
      // eat object terminator, ','
      this.accumulateToken(objInfo, ESJSONType.objectTerminator);
      this.advance();
    }
    else
    {
      this.accumulateErrorOnCurrentToken('Missing or misplaced object closing brace, "}"');
    }
  }

  private readTrueValue(): boolean
  {
    this.readBooleanOrNull(/^true(?!\w)/);
    return true;
  }

  private readFalseValue(): boolean
  {
    this.readBooleanOrNull(/^false(?!\w)/);
    return false;
  }

  private readNullValue(): null
  {
    this.readBooleanOrNull(/^null(?!\w)/);
    return null;
  }

  private readBooleanOrNull(exp: RegExp): boolean
  {
    const match: string | null = this.matchAndSetToken(exp);
    if (match !== null)
    {
      return true;
    }

    // try to capture an invalid token
    this.accumulateErrorOnCurrentToken('Unknown value type, possibly a boolean null (true, false, and null, are valid).');
    this.matchAndSetToken(/^\w+/);
    return false;
  }

  private readParameter(): string
  {
    let match: string | null = this.matchAndSetToken(/^@([a-zA-Z_\.?][a-zA-Z_0-9\.\:\+?]*)/);
    if (match === null || !this.allowParameters)
    {
      match = '';
      this.accumulateErrorOnCurrentToken(
        'Invalid parameter name. Parameter names must begin with a letter or underscore, ' +
        'and can only contain letters, underscores, and numbers.');
    }

    return match;
  }

  private captureMatch(exp: RegExp): any
  {
    const match: string | null = this.matchAndSetToken(exp);
    if (match === null)
    {
      return null;
    }

    return JSON.parse(match);
  }

  private matchAndSetToken(exp: RegExp): string | null
  {
    const result: string | null = this.match(exp);
    if (result !== null)
    {
      this.setToken();
    }

    return result;
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

  private accumulateToken(valueInfo: ESValueInfo | null = null, jsonType: ESJSONType | null = null): ESParserToken
  {
    const element: ESParserToken =
      new ESParserToken(this.charNumber,
        this.getRow(),
        this.getCol(),
        1,
        this.queryString.substring(this.charNumber, this.charNumber + 1));

    if (jsonType !== null)
    {
      element.jsonType = jsonType;
    }

    this.tokens.push(element);

    // link up the ValueInfo and the Token
    if (valueInfo === null)
    {
      valueInfo = this.getCurrentValueInfo();
    }

    // element.valueInfo = valueInfo;

    if (valueInfo !== null)
    {
      valueInfo.tokens.push(element);
      element.valueInfo = valueInfo;
    }

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
    element.toRow = this.getRow();
    element.toCol = this.getCol();
    element.substring = this.queryString.substring(element.charNumber, element.charNumber + element.length);
  }

  private beginValueInfo(): ESValueInfo
  {
    const element: ESValueInfo = new ESValueInfo();
    this.valueInfos.push(element);
    return element;
  }

  private getCurrentValueInfo(): ESValueInfo | null
  {
    if (this.valueInfos.length === 0)
    {
      return null;
    }

    return this.valueInfos[this.valueInfos.length - 1];
  }

  private accumulateErrorOnCurrentToken(message: string): void
  {
    this.errors.push(new ESParserError(
      this.getCurrentToken(), this.getCurrentValueInfo() as ESValueInfo, message));
  }

  private getRow(): number
  {
    while (this.lastCheckedRowChar < this.charNumber)
    {
      ++this.lastCheckedRowChar;
      const c: string = this.queryString.charAt(this.lastCheckedRowChar);
      if (c === '\n')
      {
        this.lastRowChar = this.lastCheckedRowChar + 1;
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

export default ESJSONParser;
