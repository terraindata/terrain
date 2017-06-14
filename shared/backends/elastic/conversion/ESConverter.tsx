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

class ElementInfo
{
  /*
   *  Data container with immutable members
   *  Index is element's position underneath its parent (so 0 if it's root level)
   */
  constructor(
    public readonly index: number,
    public readonly container: any[] | object = undefined, //parent of element: undefined for values under root
    public readonly keys: string[] = undefined, //undefined for values inside arrays or under root
  ){}
  public containerSize() : number
  {
    if(this.container === undefined)
    {
      return 1;
    }
    else if(this.container instanceof Array)
    {
      return this.container.length;
    }
    else 
    {
      return this.keys.length;
    }
  }
  public isLastElement() : boolean
  {
    return this.index + 1 === this.containerSize();
  }
  public isFirstElement() : boolean
  {
    return this.index === 0;
  }
  public isOnlyElement() : boolean
  {
    return this.containerSize() === 1;
  }
}
abstract class ObjectFormatter
{
  abstract getResultText(): string;
  //vvvv handlers called while traversing the object
  abstract onValue(val: any, element?: ElementInfo): void;
  abstract onKey(key: string, element?: ElementInfo): void;
  abstract onOpenObject(obj?: object, element?: ElementInfo): void;
  abstract onCloseObject(obj?: object, element?: ElementInfo): void;
  abstract onOpenArray(arr?: any[], element?: ElementInfo): void;
  abstract onCloseArray(arr?: any[], element?: ElementInfo): void;
  protected onEnd(): void {};
  protected onError(err: Error, element?: ElementInfo): void {console.error(err);};
  protected sortKeys(keys: string[], element?: ElementInfo): string[] {return keys;}; //traverse keys in order of returned array
  //^^^^
  constructor(){}
  public parseObject(obj: any)
  {
    try
    {
      this.traverseObject(obj, new ElementInfo(0));
      this.onEnd();
    }
    catch(e)
    {
      this.onError(e);
    }
  }
  protected traverseObject(obj: any, element: ElementInfo): void
  {
    switch(typeof obj)
    {
      case 'string':
      case 'number':
      case 'boolean':
      case 'undefined':
        this.onValue(obj, element);
        break;
      case 'object':
        if(obj instanceof Array)
        {
          this.onOpenArray(obj, element);
          for(let i = 0; i < obj.length; i++)
          {
            this.traverseObject(obj[i], new ElementInfo(i, obj));
          }
          this.onCloseArray(obj, element);
        }
        else if(obj === null)
        {
          this.onValue(null, element);
        }
        else
        {
          let keys = this.sortKeys(Object.keys(obj), element);
          this.onOpenObject(obj, element);
          for(let i = 0; i < keys.length; i++)
          {
            let innerElement : ElementInfo = new ElementInfo(i, obj, keys);
            this.onKey(keys[i], innerElement);
            this.traverseObject(obj[keys[i]], innerElement);
          }
          this.onCloseObject(obj, element);
        }
        break;
      default:
        throw new Error('Error while traversing object: "' + (typeof obj) + '" is not a valid type');
    }
  }
}
class ESFormatter extends ObjectFormatter
{
  /*
   *  Default formatter implementation.
   */
  protected static readonly defaultRules = 
  {
    'delimiter' : ',',
    'object' : ['{', '}'],
    'array' : ['[', ']'],
    'key' : ':',
    'spacingTok' : '  ', //tokens are cosmetic
    'valueToks' : ['', '\n'],
    'singularValueToks' : ['', ''],
    'keyToks' : ['\n', ' '],
    'singularKeyToks' : ['', ' '],
    'openObjectToks' : ['\n', '\n'],
    'closeObjectToks' : ['\n', '\n'],
    'openArrayToks' : ['\n', '\n'],
    'closeArrayToks' : ['\n', '\n'],
    'openSingularObjectToks' : ['', ''],
    'closeSingularObjectToks' : ['', ''],
    'openSingularArrayToks' : ['', ''],
    'closeSingularArrayToks' : ['', '']
  };
  protected depth: number = 0;
  protected output: string = '';
  protected rules: object;
  protected token: string = '';
  constructor(formattingRules : object = ESFormatter.defaultRules)
  {
    super();
    this.rules = formattingRules;
  }
  protected addText(value: any, key: string): void
  {
    //Sandwiches the value between the tokens defined by key. Merges tokens. Strips double newlines and applies indents.
    this.token = this.indentToken(this.lintToken(this.token + this.rules[key][0]));
    this.output += this.token + value.toString();
    this.token = this.rules[key][1];
  }
  protected lintToken(tok: string): string
  {
    return tok.replace('\n\n', '\n');
  }
  protected indentToken(text: string): string
  {
    return text.replace(new RegExp('\n', 'mg'), '\n' + this.rules['spacingTok'].repeat(this.depth));
  }
  //vvv overrides vvv
  onValue(value: any, element: ElementInfo): void
  {
    if(typeof(value) == 'string')
    {
      value = JSON.stringify(value);
    }
    let toks : string = element.isOnlyElement() ? 'singularValueToks' : 'valueToks';
    let delimiter = element.isLastElement() ? '' : this.rules['delimiter'];
    this.addText(value + delimiter, toks);
  }
  onKey(key: string, element: ElementInfo): void
  {
    let toks : string = element.isOnlyElement() ? 'singularKeyToks' : 'keyToks';
    this.addText(JSON.stringify(key) + this.rules['key'], toks);
  }
  onOpenObject(obj?: object, element?: ElementInfo): void
  {
    let toks : string = Object.keys(obj).length === 1 ? 'openSingularObjectToks' : 'openObjectToks';
    this.addText(this.rules['object'][0], toks);
    this.depth += 1;
  }
  onCloseObject(obj?: object, element?: ElementInfo): void
  {
    this.depth -= 1;
    let toks : string = Object.keys(obj).length === 1 ? 'closeSingularObjectToks' : 'closeObjectToks';
    let delimiter : string = element.isLastElement() ? '' : this.rules['delimiter'];
    this.addText(this.rules['object'][1] + delimiter, toks);
  }
  onOpenArray(arr?: any[], element?: ElementInfo): void
  {
    let toks : string = arr.length === 1 ? 'openSingularArrayToks' : 'openArrayToks';
    this.addText(this.rules['array'][0], toks);
    this.depth += 1;
  }
  onCloseArray(arr?: any[], element?: ElementInfo): void
  {
    this.depth -= 1;
    let toks : string = arr.length === 1 ? 'closeSingularArrayToks' : 'closeArrayToks';
    let delimiter = element.isLastElement() ? '' : this.rules['delimiter'];
    this.addText(this.rules['array'][1] + delimiter, toks);
  }
  getResultText(): string
  {
    return this.output;
  }
}
class ESConverter
{
  public static formatES(query: object | string, previousCode?: string): string
  {
    let formatter = new ESFormatter();
    formatter.parseObject(query);
    return formatter.getResultText();
  }
}
export default ESConverter;