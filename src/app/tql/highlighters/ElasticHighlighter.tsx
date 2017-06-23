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

type TextCoordinates = [{ line: number, ch: number }, { line: number, ch: number }];

class ElasticHighlighter extends SyntaxHighlighter
{
  protected markers: any[];

  constructor()
  {
    super();
    this.markers = [];
  }

  /*
   *  Handle the 'changes' event emitted by CodeMirror
   */
  public handleChanges(instance, changes: object[]): void
  {
    // const marker = instance.markText({line: 0, ch: 0}, {line: 1, ch: 1}, {className: "cm-number"});
    // tslint:disable-next-line no-console
    this.clearMarkers();
    const parser = new ESJSONParser(instance.getValue());
    const tokens: ESParserToken[] = parser.getTokens();
    for (let i = 0; i < tokens.length; i++)
    {
      if (i !== 1)
      {
        continue;
      }
      if (tokens[i].valueInfo)
      {
        const valueInfo: ESValueInfo = tokens[i].valueInfo;
        let style: string = 'cm-number';
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
            style = 'cm-meta';
            break;
        }
        const coords: TextCoordinates = this.getTokenCoordinates(tokens[i]);
        const marker = instance.markText(coords[0], coords[1], { className: style});
        // tslint:disable-next-line no-console
        // console.log([coords[0], coords[1], {className: style}]);
        console.log(style);
        console.log(marker);
        this.markers.push(marker);
      }
    }
    console.log(instance);
  }

  protected clearMarkers(): void
  {
    for (let i = 0; i < this.markers.length; i++)
    {
      this.markers[i].clear();
    }
    this.markers = [];
  }

  protected getTokenCoordinates(token: ESParserToken): TextCoordinates
  {
    const row0 = token.row;
    const col0 = token.col;
    const lines = token.substring.replace('\r', '').replace('\n', '').split('\n');
    const row1 = row0 + lines.length - 1;
    const col1 = lines.length === 1 ? col0 + token.length : lines[lines.length - 1].length;
    // tslint:disable-next-line no-console
    console.log('-------------------');
    // console.log(token.substring);
    console.log(lines);
    console.log(row0, col0);
    console.log(row1, col1);
    return [{ line: row0, ch: col1 }, { line: row1, ch: col1 }];
  }
}
export default ElasticHighlighter;

/* tslint:disable */
