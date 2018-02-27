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

import { KeyPath, WayPoint } from './KeyPath';

export function find(obj: object, path: KeyPath, next: (found) => any, options: object = {}): void
{
  if (path.size === 0 || obj === undefined)
  {
    obj = next(obj);
    return;
  }

  const waypoint: WayPoint = path.get(0);

  const keys: string[] = Object.keys(obj);

  if (waypoint === '*')
  {
    const results: any[] = [];
    for (let j: number = 0; j < keys.length; j++)
    {
      find(obj[keys[j]], path.shift(), (found) =>
      {
        results[j] = found;
        return next(found);
      }, options);
    }
    obj = next(results);
    return;
  }

  if (options['create'] === true && !obj.hasOwnProperty(waypoint))
  {
    obj[waypoint] = {};
    keys.push(waypoint);
  }

  for (let i: number = 0; i < keys.length; ++i)
  {
    if (keys[i] === waypoint)
    {
      // Don't be fooled, this is the real base case...
      if (path.size === 1)
      {
        obj[keys[i]] = next(obj[keys[i]]);
        return;
      } else
      {
        return find(obj[keys[i]], path.shift(), next, options);
      }
    }
  }

  return next(undefined);
}

export function get(obj: object, path: KeyPath): any
{
  let result: any;
  find(obj, path, (found) =>
  {
    result = found;
    return found;
  });
  return result;
}

export function set(obj: object, path: KeyPath, value: any, options: object = {}): any
{
  find(obj, path, (found) =>
  {
    return value;
  }, options);
}
