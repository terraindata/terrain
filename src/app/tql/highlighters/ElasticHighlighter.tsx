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
import ESJSONParser from '../../../../shared/backends/elastic/parser/ESJSONParser';
import ESJSONType from '../../../../shared/backends/elastic/parser/ESJSONType';
import ESParserToken from '../../../../shared/backends/elastic/parser/ESParserToken';
import ESValueInfo from '../../../../shared/backends/elastic/parser/ESValueInfo';
import SyntaxHighlighter from './SyntaxHighlighter';

class ElasticHighlighter extends SyntaxHighlighter
{
  protected markers: any[];

  constructor()
  {
    super();
    this.markers = [];
  }

  public initialHighlight(instance): void
  {
    this.handleChanges(instance, []);
  }

  public handleChanges(instance, changes: object[]): void
  {
    this.clearMarkers();
    const parser = new ESJSONParser(instance.getValue());
    const tokens: ESParserToken[] = parser.getTokens();
    for (let i = 0; i < tokens.length; i++)
    {
      if (tokens[i].valueInfo)
      {
        const valueInfo: ESValueInfo = tokens[i].valueInfo;
        let style: string = '';
        switch (valueInfo.jsonType)
        {
          case ESJSONType.invalid:
            style = 'cm-error';
            break;
          case ESJSONType.null:
          case ESJSONType.boolean:
          case ESJSONType.number:
            style = 'cm-number';
            break;
          case ESJSONType.string:
            style = 'cm-string';
            break;
          case ESJSONType.array:
          case ESJSONType.object:
            style = 'cm-bracket';
            break;
          case ESJSONType.parameter:
            style = 'cm-variable-2';
            break;
        }
        const coords = this.getTokenCoordinates(tokens[i]);
        const marker = instance.markText(coords[0], coords[1], { className: style });
        this.markers.push(marker);
      }
    }
  }

  protected clearMarkers(): void
  {
    for (let i = 0; i < this.markers.length; i++)
    {
      this.markers[i].clear();
    }
    this.markers = [];
  }

  protected getTokenCoordinates(token: ESParserToken)// : TextCoordinates
  {
    return [{ line: token.row, ch: token.col - 1 }, { line: token.toRow, ch: token.toCol }];
  }
}
export default ElasticHighlighter;
