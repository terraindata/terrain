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

// tslint:disable:strict-boolean-expressions

// parser imports
import * as Immutable from 'immutable';

import ESJSONParser from '../../../../shared/database/elastic/parser/ESJSONParser';
import ESJSONType from '../../../../shared/database/elastic/parser/ESJSONType';
import ESParserToken from '../../../../shared/database/elastic/parser/ESParserToken';
import ESValueInfo from '../../../../shared/database/elastic/parser/ESValueInfo';

// interpreter and clause imports
import ESInterpreter from '../../../../shared/database/elastic/parser/ESInterpreter';

// other imports
import { MarkerAnnotation } from 'tql/components/TQLEditor';
import { ESParserTokenizer, FlaggedToken } from '../../../../shared/database/elastic/formatter/ESParserTokenizer';
import SyntaxHighlighter from './SyntaxHighlighter';

import { BuilderStore } from 'builder/data/BuilderStore';
import { toInputMap } from '../../../blocks/types/Input';

/*
 *  Errors involving this function probably mean a missing a case on a switch.
 *  See: https://stackoverflow.com/questions/39419170
 */
function assertUnreachable(param: never): never
{
  throw new Error('Unreachable code reached');
}

/*
 * Elastic highlighter - should not maintain state across highlight calls.
 * Constructed once per highlight. If extending this, can add configuration to the
 * constructor.
 */
class ElasticHighlighter extends SyntaxHighlighter
{
  public static highlightES(instance)
  {
    const highlighter = new ElasticHighlighter();
    highlighter.handleChanges(instance, []);
  }

  public initialHighlight(instance): void
  {
    this.handleChanges(instance, []);
  }

  public handleChanges(instance, changes: object[]): void
  {
    this.clearMarkers(instance);
    const parser = new ESJSONParser(instance.getValue());
    const state = BuilderStore.getState();
    let inputs = state.query && state.query.inputs;
    if (inputs === null)
    {
      inputs = Immutable.List([]);
    }
    const params: { [name: string]: any; } = toInputMap(inputs);
    const interpreter = new ESInterpreter(parser, params);
    const rootValueInfo: ESValueInfo = parser.getValueInfo();
    const tokens = ESParserTokenizer.getTokens(parser);
    for (const fToken of tokens)
    {
      const token: ESParserToken = fToken.parserToken;
      const style: string = this.getStyle(fToken);
      const marker = instance.markText(
        { line: token.row, ch: token.col },
        { line: token.toRow, ch: token.toCol },
        { className: style },
      );
      if (token.errors.length > 0)
      {
        let message = 'Error:';
        for (const e of token.errors)
        {
          message += '\n' + e.message;
        }
        const errorAnnotation: MarkerAnnotation = { showing: false, msg: message };
        const errMarker = instance.markText(
          { line: token.row, ch: token.col },
          { line: token.toRow, ch: token.toCol },
          { className: 'CodeMirror-lint-mark-error', __annotation: errorAnnotation });
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
        return 'cm-error es-error';
      // true JSON types
      case ESJSONType.null:
        return 'cm-number es-null';
      case ESJSONType.boolean:
        return 'cm-number es-boolean';
      case ESJSONType.number:
        return 'cm-number es-number';
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
        return 'cm-variable-2 es-parameter';
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
