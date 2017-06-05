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

import ESModeContext from './ESModeContext';

type TokenResult = string | null;

export default class ESModeState
{
  public stack: ESModeContext[];

  public constructor()
  {
    this.stack = [];
    //this.push();
  }

  /**
   * Reads one token from the stream.
   * Mutates, updating the state based on this token.
   * Returns a style string or null for unstyled tokens.
   * @param stream
   */
  public readToken(stream: any): TokenResult
  {
    if (this.stack.length <= 0)
    {
      // TODO: handle this error case
    }

    const context: ESModeContext = this.stack[this.stack.length - 1];
    context.handler(state, stream);
  }

  private push(context: any): void
  {
    this.stack.push(context);
  }

  private static onPropertyName(state: ESModeState, stream: any): TokenResult
  {
    const nextChar = stream.peek();
    switch (nextChar)
    {
      case '{':
        // TODO: error - unexpected object, possible missing property name
        stream.next();
        return state.beginObject(stream);

      case '}':
        stream.next();
        return state.endObject(stream);

      case '"':
        return state.readString(stream);

      default:
        break;
    }

    return null;
  }

  private static onPropertyValue(state: ESModeState, stream: any): TokenResult
  {
    const nextChar = stream.peek();
    switch (nextChar)
    {
      case '{':
        stream.next();
        return state.beginObject(stream);

      case '}':
        // TODO: error - unexpected end of object
        stream.next();
        return state.endObject(stream);

      default:
        break;
    }

    return null;
  }

  private beginObject(stream: any): TokenResult
  {
    this.stack.push(new ESModeContext('{', ESModeState.onPropertyName));
    return null;
  }

  private endObject(stream: any): TokenResult
  {
    //TODO: check stack size
    this.stack.pop();
    return null;
  }

  private readString(stream: any): TokenResult
  {
    const matches : string[] = stream.match(
      /^("(?:\\(?:["\\\/bfnrt]|u[a-fA-F0-9]{4})|[^"\\\0-\x1F\x7F]+)*")/);

    console.log(matches);

    return null;
  }

}
