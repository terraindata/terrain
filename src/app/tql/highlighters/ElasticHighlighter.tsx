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

// parser imports
import ESJSONParser from '../../../../shared/backends/elastic/parser/ESJSONParser';
import ESJSONType from '../../../../shared/backends/elastic/parser/ESJSONType';
import ESParserToken from '../../../../shared/backends/elastic/parser/ESParserToken';
import ESPropertyInfo from '../../../../shared/backends/elastic/parser/ESPropertyInfo';
import ESValueInfo from '../../../../shared/backends/elastic/parser/ESValueInfo';

// interpreter and clause imports
import ESClause from '../../../../shared/backends/elastic/parser/clauses/ESClause';
import ESStructureClause from '../../../../shared/backends/elastic/parser/clauses/ESStructureClause';
import EQLConfig from '../../../../shared/backends/elastic/parser/EQLConfig';
import ESInterpreter from '../../../../shared/backends/elastic/parser/ESInterpreter';

// other imports
import SyntaxHighlighter from './SyntaxHighlighter';

/*
 *  Errors involving this function probably mean a missing a case on a switch.
 *  See: https://stackoverflow.com/questions/39419170
 */
function assertUnreachable(param: never): never
{
  throw new Error("Unreachable code reached");
}

interface FlaggedToken
{
  isKeyword: boolean,
  parserToken: ESParserToken
}

/*
 *  Generator that performs recursive DFS on valueInfo tree.
 *  Eventually yields all tokens in the tree, flagging properties if they are elastic keywords
 *  parentClause is not null for property name values, null for all else.
 */
function* traverseTokens(valueInfo: ESValueInfo, parentClause: ESClause | null = null): IterableIterator<FlaggedToken>
{
  if (!valueInfo)
  {
    return;
  }

  for (const token of valueInfo.tokens)
  {
    const isKw: boolean =
      parentClause && parentClause.hasOwnProperty('structure') &&
      token.substring.trim().replace(/["']/g, '') in parentClause['structure'];
    // trim & replace to turn '    "property"' into 'property'
    const fToken: FlaggedToken = { isKeyword: isKw, parserToken: token };
    yield fToken;
  }

  if (valueInfo.arrayChildren)
  {
    for (const child of valueInfo.arrayChildren)
    {
      yield* traverseTokens(child);
    }
  }
  if (valueInfo.objectChildren)
  {
    const keys: string[] = Object.keys(valueInfo.objectChildren);
    for (const key of keys)
    {
      const propertyInfo: ESPropertyInfo = valueInfo.objectChildren[key];
      const valueChild: ESValueInfo = propertyInfo.propertyValue;
      const keyChild: ESValueInfo = propertyInfo.propertyName;
      yield* traverseTokens(keyChild, valueInfo.clause);
      yield* traverseTokens(valueChild);
    }
  }
}

/*
 * Elastic highlighter - should not maintain state across highlight calls.
 * Constructed once per highlight. If extending this, can add configuration to the
 * constructor.
 */
class ElasticHighlighter extends SyntaxHighlighter
{
  public initialHighlight(instance): void
  {
    this.handleChanges(instance, []);
  }

  public handleChanges(instance, changes: object[]): void
  {
    this.clearMarkers(instance);
    const parser = new ESJSONParser(instance.getValue());
    const interpreter = new ESInterpreter(parser);
    const rootValueInfo: ESValueInfo = parser.getValueInfo();

    for (const fToken of traverseTokens(parser.getValueInfo()))
    {
      const token: ESParserToken = fToken.parserToken;
      if (true)
      {
        const style: string = this.getStyle(fToken);
        instance.markText(
          { line: token.row, ch: token.col },
          { line: token.toRow, ch: token.toCol },
          { className: style }
        );
        // markText returns a TextMarker object. In the goal of being stateless though,
        // we clear the markers by grabbing them from the code mirror instance instead
      }
    }
  }

  /*
   *  Property names are generally elastic keywords, so they are highlighted as properties.
   *  If they are not elastic keywords, they are highlighted as strings.
   */
  protected getStyle(fToken: FlaggedToken): string
  {
    if (fToken.isKeyword)
    {
      return 'cm-property';
    }
    switch (fToken.parserToken.jsonType)
    {
      // invalid types
      case ESJSONType.unknown:
      case ESJSONType.invalid:
        return 'cm-error';
      // true JSON types
      case ESJSONType.null:
      case ESJSONType.boolean:
      case ESJSONType.number:
        return 'cm-number';
      case ESJSONType.string:
        return 'cm-string';
      case ESJSONType.array:
      case ESJSONType.object:
      // delimiter types
      case ESJSONType.arrayDelimiter:
      case ESJSONType.arrayTerminator:
      case ESJSONType.propertyDelimiter:
      case ESJSONType.objectDelimiter:
      case ESJSONType.objectTerminator:
        return 'cm-bracket';
      // additional types
      case ESJSONType.parameter:
        return 'cm-variable-2';
      default:
        assertUnreachable(fToken.parserToken.jsonType);
      // an error on assertUnreachable might mean a missing case
    }
  }

  protected clearMarkers(instance): void
  {
    const markers: any[] = instance.getAllMarks();
    for (let i = 0; i < markers.length; i++)
    {
      markers[i].clear();
    }
  }
}

export default ElasticHighlighter;
