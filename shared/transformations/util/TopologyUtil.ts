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

export default class TopologyUtil
{
  
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
    const lastIndex1: number = kp1.findLastIndex((value, index) => !EngineUtil.isNamedField(kp1, index));
    const concretePath1 = kp1.slice(0, lastIndex1 + 1);
    const lastIndex2: number = kp2.findLastIndex((value, index) => !EngineUtil.isNamedField(kp2, index));
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
