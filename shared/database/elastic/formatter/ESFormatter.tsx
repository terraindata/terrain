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

import ESJSONParser from '../parser/ESJSONParser';
import ESJSONType from '../parser/ESJSONType';
import { ESParserTokenizer, FlaggedToken } from './ESParserTokenizer';

function assertUnreachable(param: never): never
{
  throw new Error('Unreachable code reached');
}

interface TokenParts
{
  head: string;
  str: string;
  tail: string;
  depth: number;
}

class ESFormatter
{
  public tab: string;
  private parameterInString: boolean;

  constructor(indentSize: number = 2, parameterInString: boolean = false)
  {
    this.tab = (' ').repeat(indentSize);
    this.parameterInString = parameterInString;
  }

  public formatQuery(parser: ESJSONParser): string
  {
    const tokens: FlaggedToken[] = ESParserTokenizer.getTokens(parser, true);
    const accumulation: TokenParts = tokens.map((t) => this.mapTokens(t)).reduce(this.reduceParts.bind(this));
    return accumulation.str;
  }

  protected reduceParts(a: TokenParts, b: TokenParts, i: number, arr: TokenParts[]): TokenParts
  {
    // const sewn = a.tail + b.head;
    const indent: string = '\n' + this.tab.repeat(b.depth);
    const sewn: string = (a.tail + b.head)
      .replace(/\n+/, '\n')
      .replace(new RegExp('\n', 'mg'), indent);
    return { head: a.head, str: a.str + sewn + b.str, tail: b.tail, depth: b.depth };
  }

  protected mapTokens(value: FlaggedToken): TokenParts
  {
    if (value.isKeyword)
    {
      return { head: '', str: value.parserToken.substring.trim(), tail: '', depth: value.depth };
    }
    switch (value.parserToken.jsonType)
    {
      case ESJSONType.unknown:
      case ESJSONType.invalid:
        return { head: '', str: value.parserToken.substring.trim(), tail: '', depth: value.depth };
      case ESJSONType.null:
      case ESJSONType.boolean:
      case ESJSONType.number:
      case ESJSONType.string:
        if (this.parameterInString === true && value.parserToken.substring.startsWith('"@'))
        {
          const s = value.parserToken.substring.trim();
          return { head: '', str: s.substring(1, s.length - 1), tail: '', depth: value.depth };
        } else
        {
          return { head: '', str: value.parserToken.substring.trim(), tail: '', depth: value.depth };
        }
      case ESJSONType.parameter:
        return { head: '', str: value.parserToken.substring.trim(), tail: '', depth: value.depth };
      case ESJSONType.array:
        return { head: '', str: '[', tail: '\n', depth: value.depth };
      case ESJSONType.object:
        return { head: '', str: '{', tail: '\n', depth: value.depth };
      case ESJSONType.arrayTerminator:
        return { head: '\n', str: ']', tail: '', depth: value.depth };
      case ESJSONType.objectTerminator:
        return { head: '\n', str: '}', tail: '', depth: value.depth };
      case ESJSONType.arrayDelimiter:
      case ESJSONType.objectDelimiter:
        return { head: '', str: ',', tail: '\n', depth: value.depth };
      case ESJSONType.propertyDelimiter:
        return { head: '', str: ':', tail: ' ', depth: value.depth };
      default:
        return assertUnreachable(value.parserToken.jsonType);
    }
  }

}
export default ESFormatter;
