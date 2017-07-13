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

// tslint:disable:restrict-plus-operands

import ElementInfo from './ElementInfo';
import ObjectFormatter from './ObjectFormatter';

/**
 *  Default formatter implementation
 */
class ESDefaultFormatter extends ObjectFormatter
{
  protected static readonly defaultRules =
  {
    delimiter: ',',
    object: ['{', '}'],
    array: ['[', ']'],
    key: ':',
    spacingTok: '  ', // tokens are cosmetic
    valueToks: ['', '\n'],
    singularValueToks: ['', ''],
    keyToks: ['\n', ' '],
    singularKeyToks: ['\n', ' '],
    openObjectToks: ['', '\n'],
    closeObjectToks: ['\n', '\n'],
    openArrayToks: ['', '\n'],
    closeArrayToks: ['\n', '\n'],
    openSingularObjectToks: ['', '\n'],
    closeSingularObjectToks: ['\n', '\n'],
    openSingularArrayToks: ['', '\n'],
    closeSingularArrayToks: ['\n', '\n'],
  };

  protected output: string = '';
  protected rules: object;
  protected token: string = '';

  constructor(formattingRules: object = ESDefaultFormatter.defaultRules)
  {
    super();
    this.rules = formattingRules;
  }

  public getResultText(): string
  {
    return this.output.trim();
  }

  protected addText(value: any, key: string, depth: number): void
  {
    // Sandwiches the value between the tokens defined by key. Merges tokens. Strips double newlines and applies indents.
    this.token = this.indentToken(this.lintToken(this.token + this.rules[key][0]), depth);
    this.output += this.token + value.toString();
    this.token = this.rules[key][1];
  }

  protected lintToken(tok: string): string
  {
    return tok.replace('\n\n', '\n');
  }

  protected indentToken(text: string, depth: number): string
  {
    return text.replace(new RegExp('\n', 'mg'), '\n' + this.rules['spacingTok'].repeat(depth));
  }

  // parent class method implementations

  protected onValue(value: any, element: ElementInfo): void
  {
    if (typeof (value) === 'string')
    {
      value = JSON.stringify(value);
    }
    const toks: string = element.isOnlyElement() ? 'singularValueToks' : 'valueToks';
    const delimiter = element.isLastElement() ? '' : this.rules['delimiter'];
    this.addText(value + delimiter, toks, element.depth);
  }

  protected onKey(key: string, element: ElementInfo): void
  {
    const toks: string = element.isOnlyElement() ? 'singularKeyToks' : 'keyToks';
    this.addText(JSON.stringify(key) + this.rules['key'], toks, element.depth);
  }

  protected onOpenObject(obj?: object, element?: ElementInfo): void
  {
    const toks: string = Object.keys(obj).length === 1 ? 'openSingularObjectToks' : 'openObjectToks';
    this.addText(this.rules['object'][0], toks, element.depth);
  }

  protected onCloseObject(obj?: object, element?: ElementInfo): void
  {
    const toks: string = Object.keys(obj).length === 1 ? 'closeSingularObjectToks' : 'closeObjectToks';
    const delimiter: string = element.isLastElement() ? '' : this.rules['delimiter'];
    this.addText(this.rules['object'][1] + delimiter, toks, element.depth);
  }

  protected onOpenArray(arr?: any[], element?: ElementInfo): void
  {
    const toks: string = arr.length === 1 ? 'openSingularArrayToks' : 'openArrayToks';
    this.addText(this.rules['array'][0], toks, element.depth);
  }

  protected onCloseArray(arr?: any[], element?: ElementInfo): void
  {
    const toks: string = arr.length === 1 ? 'closeSingularArrayToks' : 'closeArrayToks';
    const delimiter = element.isLastElement() ? '' : this.rules['delimiter'];
    this.addText(this.rules['array'][1] + delimiter, toks, element.depth);
  }

}
export default ESDefaultFormatter;
