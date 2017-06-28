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
import ESInterpreter from '../../../../shared/backends/elastic/parser/ESInterpreter';
import ESJSONParser from '../../../../shared/backends/elastic/parser/ESJSONParser';
import ESJSONType from '../../../../shared/backends/elastic/parser/ESJSONType';
import ESParserToken from '../../../../shared/backends/elastic/parser/ESParserToken';
import ESValueInfo from '../../../../shared/backends/elastic/parser/ESValueInfo';

import EQLConfig from '../../../../shared/backends/elastic/parser/EQLConfig';
import ESClause from '../../../../shared/backends/elastic/parser/ESClause';
import ESStructureClause from '../../../../shared/backends/elastic/parser/ESStructureClause';

import SyntaxHighlighter from './SyntaxHighlighter';

interface FlaggedToken
{
  isKeyword: boolean,
  parserToken: ESParserToken
}

function* traverseTokens(valueInfo: ESValueInfo, parentClause: ESClause | null)
{
  for (const token of valueInfo.tokens)
  {
    const isKw: boolean =
      parentClause instanceof ESStructureClause &&
      token.jsonType === ESJSONType.property &&
      token.substring.trim().replace(/["']/g, '') in parentClause.structure;
    const fToken: FlaggedToken = { isKeyword: isKw, parserToken: token };
    yield fToken;
    // console.log(token.substring.trim().replace(/["']/g, ''));
  }
  if (valueInfo.arrayChildren)
  {
    for (const child of valueInfo.arrayChildren)
    {
      yield* traverseTokens(child, null);
    }
  }
  if (valueInfo.objectChildren)
  {
    const keys: string[] = Object.keys(valueInfo.objectChildren);
    for (const key of keys)
    {
      const child: ESValueInfo = valueInfo.objectChildren[key].propertyValue;
      const keyChild: ESValueInfo = valueInfo.objectChildren[key].propertyName;
      yield* traverseTokens(keyChild, valueInfo.clause);
      yield* traverseTokens(child, null);
    }
  }
}
/*
 * Does not return tokens in sequential order.
 */
function getFlaggedTokens(parser: ESJSONParser)
{
  const tokens: FlaggedToken[] = [];
  for (const token of traverseTokens(parser.getValueInfo(), null))
  {
    tokens.push(token);
  }
  return tokens;
}

class ElasticHighlighter extends SyntaxHighlighter
{
  public static config = new EQLConfig();

  public initialHighlight(instance): void
  {
    this.handleChanges(instance, []);
  }

  public handleChanges(instance, changes: object[]): void
  {
    this.clearMarkers(instance);
    const parser = new ESJSONParser(instance.getValue());
    const interpreter = new ESInterpreter(parser, ElasticHighlighter.config);
    const tokens: FlaggedToken[] = getFlaggedTokens(parser);
    console.log(parser.getTokens());
    console.log(tokens);
    for (let i = 0; i < tokens.length; i++)
    {
      const token: ESParserToken = tokens[i].parserToken;
      if (token.valueInfo)
      {
        const valueInfo: ESValueInfo = token.valueInfo;
        let style: string;
        switch (valueInfo.jsonType)
        {
          // invalid types
          case ESJSONType.unknown:
          case ESJSONType.invalid:
            style = 'cm-error';
            break;
          // true JSON types
          case ESJSONType.null:
          case ESJSONType.boolean:
          case ESJSONType.number:
            style = 'cm-number';
            break;
          case ESJSONType.string:
            style = 'cm-string';
            break;
          case ESJSONType.property:
            style = 'cm-property';
            break;
          case ESJSONType.array:
          case ESJSONType.object:
          // delimiter types
          case ESJSONType.arrayDelimiter:
          case ESJSONType.arrayTerminator:
          case ESJSONType.objectDelimiter:
          case ESJSONType.objectTerminator:
            style = 'cm-bracket';
            break;
          // additional types
          case ESJSONType.parameter:
            style = 'cm-variable-2';
            break;
          default:
            style = '';
        }
        if (tokens[i].isKeyword)
        {
          style = 'cm-variable-3';
        }
        const coords = this.getTokenCoordinates(token);
        const marker = instance.markText(coords[0], coords[1], { className: style });
      }
    }
  }

  protected clearMarkers(instance): void
  {
    const markers: any[] = instance.getAllMarks()
    for (let i = 0; i < markers.length; i++)
    {
      markers[i].clear();
    }
  }

  protected getTokenCoordinates(token: ESParserToken)
  {
    return [{ line: token.row, ch: token.col }, { line: token.toRow, ch: token.toCol }];
  }
}
export default ElasticHighlighter;
