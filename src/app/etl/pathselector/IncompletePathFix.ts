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

import clarinet = require('clarinet');
const parser = clarinet.createStream();

export default class StreamUtil
{
  public static completeStream(jsonStringStream)
  {
    // let results = [];
    let bracketStack = [];
    let stringStream = '';
    parser.on('openarray', function() {
      bracketStack.push('[');
      stringStream = stringStream + '[';
    });

    parser.on('closearray', function() {
      const recent = bracketStack.pop();
      stringStream = stringStream + ']';
      if (recent !== '[')
      {
        throw new Error('Error parsing');
      }
    });

    parser.on('openobject', function(key) {
      bracketStack.push('{');
      stringStream = stringStream + '{';
    });

    parser.on('closeobject', function() {
      const recent = bracketStack.pop();
      stringStream = stringStream + '}';
      if (recent !== '{')
      {
        throw new Error('Error parsing');
      }
    });

    parser.on('key', function(name) {
      stringStream = stringStream + `"${name}":`;
    });

    parser.on('value', function(value) {
      let valueString;
      const valueType = typeof value;
      switch (valueType) {
        case 'number':
          valueString = value.toString();
          break;
        case 'string':
          valueString = value;
        case 'boolean':
          valueString = `${value}`;
        case 'undefined':
          valueString = `${value}`;
        case 'object': 
        // the only value that reaches here is null because typeof null returns 'object'
        // for expected objects and arrays, 'openobject' and 'openarray' should be called first
        // so they should never reach here technically
          valueString = `${value}`;
        default:
          throw new Error('Unrecognized type');
          break;
      }
      stringStream = stringStream + valueString + ', '
    });
    return [bracketStack, stringStream];
  }

  public fixStringStream(rawStringStream)
  {
    
  }

  public static formatJsonString(jsonString)
  {
    // apply clarinet parsing to jsonString
    const results = this.completeStream(jsonString);
    const bracketStack = results[0];
    const rawStringStream = results[1];
    const fixedStringStream = this.fixStringStream(rawStringStream);

    if (bracketStack === [])
    {
      return jsonString; // no incomplete parens
    }
    else
    {
      while (bracketStack.length > 0)
      {
        const unclosedBracket = bracketStack.pop();
        if (unclosedBracket === '[')
        {
          jsonString += ']';
        }
        else // unclosed object, unclosedBracket === '{'
        {
          jsonString += '}';
        }
      }
      return jsonString;
    }
  }
}