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

// Yet another deep JSON getter/setter module

import { List } from 'immutable';
// import isPrimitive = require('is-primitive');

export type KeyPath = List<string | string[]>;
export const KeyPath = (args: Array<string | string[]> = []) => List<string | string[]>(args);

export function get(obj: object, path: KeyPath): any
{
  // console.log('obj, path:');
  // console.log(obj);
  // console.log(path);
  if (path.size === 0)
  {
    return obj;
  }

  if (obj.constructor === Array)
  {
    const idx: number = parseInt(path.get(0) as string, 10);
    if (idx < (obj as any[]).length)
    {
      return get(obj[idx], path.shift());
    }
    return undefined;
  }

  const keys: string[] = Object.keys(obj);
  for (let i: number = 0; i < keys.length; ++i)
  {
    if (keys[i] === path.get(0))
    {
      return get(obj[keys[i]], path.shift());
    }
  }

  return undefined;
}

export function set(obj: object, path: KeyPath, value: any, options: object = {}): void
{
  if (path.size === 0)
  {
    obj = value;
    return;
  }

  if (path.size === 1)
  {
    if (obj.constructor === Array)
    {
      if (parseInt(path.get(0) as string, 10) < (obj as any[]).length || options['create'] === true)
      {
        obj[parseInt(path.get(0) as string, 10)] = value;
      }
    }
    else if (typeof obj === 'object')
    {
      if (obj.hasOwnProperty(path.get(0) as string) || options['create'] === true)
      {
        obj[path.get(0) as string] = value;
      }
    }
    return;
  }

  if (obj.constructor === Array)
  {
    const idx: number = parseInt(path.get(0) as string, 10);
    if (idx < (obj as any[]).length)
    {
      return set(obj[idx], path.shift(), value, options);
    }
    return;
  }

  const keys: string[] = Object.keys(obj);
  for (let i: number = 0; i < keys.length; ++i)
  {
    if (keys[i] === path.get(0))
    {
      return set(obj[keys[i]], path.shift(), value, options);
    }
  }

  if (options['create'] === true)
  {
    obj[path.get(0) as string] = {};
    return set(obj[path.get(0) as string], path.shift(), value, options);
  }
}
