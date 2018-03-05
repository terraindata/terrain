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

import { List } from 'immutable';

export type WayPoint = string;
export type KeyPath = List<WayPoint>;
export const KeyPath = (args: WayPoint[] = []) => List<WayPoint>(args);

/**
 * A utility function to see if two KeyPaths are equal.
 * Just loops over the waypoints.  "Deep equals."
 *
 * @param {KeyPath} toCheck One of two KeyPaths to compare
 * @param {KeyPath} toMatch The other KeyPath to compare
 * @returns {boolean} Whether `toCheck` is equal to `toMatch`
 */
export function keyPathPrefixMatch(toCheck: KeyPath, toMatch: KeyPath): boolean
{
  if (toMatch.size === 0)
  {
    return true;
  }

  if (toCheck.size < toMatch.size)
  {
    return false;
  }

  for (let i: number = 0; i < toMatch.size; i++)
  {
    if (toMatch.get(i) !== toCheck.get(i))
    {
      return false;
    }
  }
  return true;
}

/**
 * A utility function for replacing a prefix of a KeyPath
 * (first few `Waypoint`s) with another KeyPath.  This is
 * useful, for example, when doing a nested rename of some
 * deep field, when several `Waypoint`s of the field may
 * change or be removed.
 *
 * @param {KeyPath} toUpdate    The original KeyPath to update
 * @param {KeyPath} toReplace   The "subset" of `toUpdate` that
 *                              will be replaced.
 * @param {KeyPath} replaceWith What to replace `toReplace` with
 * @returns {KeyPath} The updated `KeyPath`
 */
export function updateKeyPath(toUpdate: KeyPath, toReplace: KeyPath, replaceWith: KeyPath): KeyPath
{
  let updated: KeyPath = replaceWith;
  for (let i: number = toReplace.size; i < toUpdate.size; i++)
  {
    updated = updated.push(toUpdate.get(i));
  }

  return updated;
}
