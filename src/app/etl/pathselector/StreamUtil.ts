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
// tslint:disable:switch-default

import * as clarinet from 'clarinet';

export default class StreamUtil
{
  public static completeStream(jsonStringStream: string)
  {
    const parser = clarinet.createStream();
    const bracketStack = [];
    let stringStream = '';
    console.log(parser);
    parser.on('openarray', () =>
    {
      bracketStack.push('[');
      stringStream = stringStream + '[';
    });

    parser.on('closearray', () =>
    {
      const recent = bracketStack.pop();
      if (stringStream.slice(-2) === ', ')
      {
        stringStream = stringStream.slice(0, -2);
      }
      stringStream = stringStream + ']' + ', ';
      if (recent !== '[')
      {
        throw new Error('Error parsing');
      }
    });

    parser.on('openobject', (key) =>
    {
      // console.log(key);
      bracketStack.push('{');
      stringStream = stringStream + '{' + `"${key}":`;
    });

    parser.on('closeobject', () =>
    {
      const recent = bracketStack.pop();
      if (stringStream.slice(-2) === ', ')
      {
        stringStream = stringStream.slice(0, -2);
      }
      stringStream = stringStream + '}' + ', ';
      if (recent !== '{')
      {
        throw new Error('Error parsing');
      }
    });

    parser.on('key', (name) =>
    {
      // console.log(name);
      stringStream = stringStream + `"${name}":`;
    });

    parser.on('value', (value) =>
    {
      let valueString: string;
      // console.log(value);
      const valueType = typeof value;
      switch (valueType)
      {
        case 'number':
          valueString = value.toString();
          break;
        case 'string':
          valueString = `"${value}"`;
          // console.log(valueString);
          break;
        case 'boolean':
          valueString = `${value}`;
          break;
        case 'undefined':
          valueString = `${value}`;
          break;
        case 'object':
          // the only value that reaches here is null because typeof null returns 'object'
          // for expected objects and arrays, 'openobject' and 'openarray' should be called first
          // so they should never reach here technically
          valueString = `${value}`;
          break;
      }
      stringStream = stringStream + valueString + ', ';
    });

    parser.on('end', () =>
    {
      return [bracketStack, stringStream];
    });

    parser.on('error', (e) =>
    {
      throw new Error('Error parsing');
    });

    parser.write(jsonStringStream);
    return [bracketStack, stringStream];
  }

  public static fixStringStream(rawStringStream: string): string
  {
    let correctedString;
    // console.log(rawStringStream);
    const checkBracketOrKey = rawStringStream.slice(-1);
    const checkValue = rawStringStream.slice(-2);
    // console.log(checkBracketOrKey);
    // console.log(checkValue);
    switch (checkBracketOrKey)
    {
      case '[':
        correctedString = rawStringStream.slice(0, -1);
        break;
      case '{':
        correctedString = rawStringStream.slice(0, -1);
        break;
      case ']':
        correctedString = rawStringStream;
        break;
      case '}':
        correctedString = rawStringStream;
        break;
      case ':':
        const splitString = rawStringStream.split(',');
        splitString.pop();
        if (splitString.length < 0)
        {
          throw new Error('Error parsing');
        }
        else
        {
          correctedString = splitString.join(',');
        }
        break;
      default:
        if (checkValue === ', ')
        {
          correctedString = rawStringStream.slice(0, -2);
        }
        else
        {
          throw new Error('Error parsing');
        }
        break;
    }
    return correctedString;
  }

  public static formatJsonString(jsonString: string): object
  {
    const results: object = this.completeStream(jsonString);
    // console.log(results);
    const bracketStack: string[] = results[0];
    const rawStringStream: string = results[1];
    // console.log(rawStringStream);
    let fixedStringStream: string = this.fixStringStream(rawStringStream);
    // console.log(fixedStringStream);

    if (bracketStack === [])
    {
      return JSON.parse(fixedStringStream); // no incomplete parens
    }
    else
    {
      while (bracketStack.length > 0)
      {
        const unclosedBracket = bracketStack.pop();
        if (unclosedBracket === '[')
        {
          fixedStringStream = fixedStringStream + ']';
        }
        else // unclosed object, unclosedBracket === '{'
        {
          fixedStringStream = fixedStringStream + '}';
        }
      }
      // console.log(fixedStringStream);
      if (fixedStringStream.slice(0, 1) === '[') // can't parse if wrapped in array
      {
        // console.log([fixedStringStream.slice(1, -1)]);
        return [JSON.parse(fixedStringStream.slice(1, -1))];
      }
      return JSON.parse(fixedStringStream);
    }
  }
}
