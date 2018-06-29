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

import * as _ from 'lodash';
import { KeyPath } from 'shared/util/KeyPath';
import * as yadeep from 'shared/util/yadeep';
import EngineUtil from 'shared/transformations/util/EngineUtil';

export type Relation = 'one' | 'many';

/*
General method for seeing if 2 keypaths are "compatible"
Take both keypaths
Match the fronts to find the longest match
e.g.
[foo, bar, -1, X, Y, Z]
[foo, bar, -1, A, B, C]
would have [foo, bar, -1] as the longest common match.

Now take the remaining part of the keypath for each path.
In this case it would be [X, Y, Z] and [A, B, C]
As long as at least one of them is singular (no wildcards), then the two are compatible.

General rule: Compatible keypaths are anything that can be posed as a one to one, many to one, or a one to many.
*/

export default class TopologyUtil
{
  public static isKeyPathSingular(kp: KeyPath, from = 0): boolean
  {
    for (let i = from; i < kp.size; i++)
    {
      if (kp.get(i) === -1)
      {
        return false;
      }
    }
    return true;
  }

  // returns the first position where the keypaths differ
  public static getDifferingBaseIndex(kp1: KeyPath, kp2: KeyPath): number
  {
    let i;
    const minSize = Math.min(kp1.size, kp2.size);
    for (i = 0; i < minSize; i++)
    {
      if (kp1.get(i) !== kp2.get(i))
      {
        break;
      }
    }
    return i;
  }

  /*
   *  do the keypaths represent one-to-one, one-to-many, many-to-one, or many-to-many relationships?
   */
  public static getRelation(kp1: KeyPath, kp2: KeyPath): [Relation, Relation]
  {
    const baseIndex = TopologyUtil.getDifferingBaseIndex(kp1, kp2);
    const relation1 = TopologyUtil.isKeyPathSingular(kp1, baseIndex) ? 'one' : 'many';
    const relation2 = TopologyUtil.isKeyPathSingular(kp2, baseIndex) ? 'one' : 'many';
    return [relation1, relation2];
  }

  /*
   *  Given two keypaths that are one-to-one related, return a function that
   *  translates singular paths that match kp1 to singular paths that match kp2.
   *  E.G. kp1 is [foo, -1, bar] and kp2 is [foo, -1, baz]
   *  createOneToOneMatcher(kp1, kp2)([foo, 3, bar]) ---> [foo, 3, baz]
   */
  public static createOneToOneMatcher(kp1: KeyPath, kp2: KeyPath): (kp: KeyPath) => KeyPath
  {
    const baseIndex = TopologyUtil.getDifferingBaseIndex(kp1, kp2);
    const wildcards = [];
    for (let i = 0; i < baseIndex; i++)
    {
      if (kp1.get(i) === -1)
      {
        wildcards.push(i);
      }
    }
    if (wildcards.length === 0)
    {
      return (kp) => kp2;
    }
    else
    {
      // in the absence of benchmarking to find out what's most efficient
      // assume most times we only do 1 or 2 sets
      return (kp: KeyPath) => {
        let ret = kp2;
        for (const i of wildcards)
        {
          ret = kp2.set(i, kp.get(i));
        }
        return ret;
      };
    }
  }

  /*
   * referenceKP can contain -1
   * matchKP should not contain -1
   */
  public static createLocalMatcher(referenceKP: KeyPath, matchKP: KeyPath): (newKP: KeyPath) => KeyPath
  {
    if (referenceKP.size !== matchKP.size || referenceKP.size === 0)
    {
      return null;
    }

    const replacements: {
      [k: number]: number;
    } = {};

    let maxIndex = -1;

    for (let i = 0; i < referenceKP.size; i++)
    {
      const searchIndex = referenceKP.get(i);
      const matchIndex = matchKP.get(i);
      if (searchIndex !== matchIndex)
      {
        if (typeof searchIndex !== 'number' || typeof matchIndex !== 'number')
        {
          return null;
        }
        else
        {
          replacements[i] = matchIndex;
          maxIndex = i;
        }
      }
    }

    const baseMatchPath = matchKP.slice(0, maxIndex + 1);

    return (newKP: KeyPath) =>
    {
      if (maxIndex === -1)
      {
        return newKP;
      }
      else
      {
        const toTransplant = newKP.slice(maxIndex + 1);
        return baseMatchPath.concat(toTransplant).toList();
      }

    };
  }

  // returns true if two given keypaths represent fields that are "local" to each other.
  // fields are local if they are unambiguously traversable to each other.
  // e.g. [a] is local to [b] and [c, d]
  // [a, -1, b] would be local to [a, -1, c]
  // [a] would not be local to [c, -1, d]
  public static areFieldsLocal(kp1, kp2): boolean
  {
    const lastIndex1: number = kp1.findLastIndex((value, index) => EngineUtil.isWildcardField(kp1, index));
    const concretePath1 = kp1.slice(0, lastIndex1 + 1);
    const lastIndex2: number = kp2.findLastIndex((value, index) => EngineUtil.isWildcardField(kp2, index));
    const concretePath2 = kp2.slice(0, lastIndex2 + 1);

    if (lastIndex2 !== lastIndex1 || !concretePath1.equals(concretePath2))
    {
      return false;
    }
    else
    {
      // check if fields are wildcards themselves?
      return true;
    }
  }
}
