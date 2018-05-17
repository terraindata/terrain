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

// parser imports
import ESJSONParser from '../parser/ESJSONParser';
import ESParserToken from '../parser/ESParserToken';
import ESPropertyInfo from '../parser/ESPropertyInfo';
import ESValueInfo from '../parser/ESValueInfo';

// interpreter and clause imports
import ESClause from '../parser/clauses/ESClause';

export interface FlaggedToken
{
  isKeyword: boolean;
  depth: number;
  parserToken: ESParserToken;
}

/*
 *  Generator that performs recursive DFS on valueInfo tree.
 *  Eventually yields all tokens in the tree, flagging properties if they are elastic keywords
 *  parentClause is not null for property name values, null for all else.
 */
function* traverseTokens(valueInfo: ESValueInfo, tokenDepth = 0, parentClause?: ESClause): IterableIterator<FlaggedToken>
{
  if (valueInfo !== undefined && valueInfo !== null)
  {
    for (const token of valueInfo.tokens)
    {
      const isKw: boolean =
        parentClause !== undefined && parentClause.hasOwnProperty('structure') &&
        token.substring.trim().replace(/["']/g, '') in parentClause['structure'];
      // trim & replace to turn '    "property"' into 'property'
      const fToken: FlaggedToken = { isKeyword: isKw, parserToken: token, depth: tokenDepth };
      yield fToken;
    }

    if (valueInfo.arrayChildren !== undefined && valueInfo.arrayChildren !== null)
    {
      for (const child of valueInfo.arrayChildren)
      {
        yield* traverseTokens(child, tokenDepth + 1);
      }
    }
    if (valueInfo.objectChildren !== undefined && valueInfo.objectChildren !== null)
    {
      const keys: string[] = Object.keys(valueInfo.objectChildren);
      for (const key of keys)
      {
        const propertyInfo: ESPropertyInfo = valueInfo.objectChildren[key];
        const valueChild: ESValueInfo = propertyInfo.propertyValue;
        const keyChild: ESValueInfo = propertyInfo.propertyName;
        yield* traverseTokens(keyChild, tokenDepth + 1, valueInfo.clause);
        yield* traverseTokens(valueChild, tokenDepth + 1);
      }
    }
  }
}

export class ESParserTokenizer
{
  public static getTokens(valueInfo: ESValueInfo, sort = false): FlaggedToken[]
  {
    const fTokens: FlaggedToken[] = Array.from(traverseTokens(valueInfo));
    if (sort)
    {
      fTokens.sort((a: FlaggedToken, b: FlaggedToken) =>
      {
        if (a.parserToken.row === b.parserToken.row)
        {
          return a.parserToken.col - b.parserToken.col;
        }
        else
        {
          return a.parserToken.row - b.parserToken.row;
        }
      });
    }
    return fTokens;
  }
}
