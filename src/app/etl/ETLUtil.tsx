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
// tslint:disable:import-spacing max-classes-per-file strict-boolean-expressions

import * as Immutable from 'immutable';
import * as _ from 'lodash';
const { List, Map } = Immutable;

import { MidwayError } from 'shared/error/MidwayError';
import { AllBackendsMap } from 'src/database/AllBackends';
import BackendInstance from 'src/database/types/BackendInstance';
import MidwayQueryResponse from 'src/database/types/MidwayQueryResponse';
import { _Query, Query, queryForSave } from 'src/items/types/Query';
import { Ajax } from 'util/Ajax';

import { makeConstructor, makeExtendedConstructor, recordForSave, WithIRecord } from 'src/app/Classes';

// like elements of field tree proxy, you shouldn't hold references to PropertyTracker
/*
 *  PropertyTracker is an object that wraps around an object and remembers which properties you've "seen".
 *  This enables you to tell if two objects are "visibly" equal to each other.
 *  Two objects a and b are visibly equal to each other if and only if
 *  For each property K of the objects that you've seen, a[K] === b[K]
 */

export class PropertyTracker<T>
{
  private seen: any = { };

  constructor(private getItem: () => T) { }

  public reset()
  {
    this.seen = { };
  }

  public get<K extends keyof T>(key: K): T[K]
  {
    this.seen[key] = true;
    return this.getItem()[key];
  }

  public getSeen()
  {
    return Object.keys(this.seen);
  }

  public isVisiblyEqual(a: T, b: T)
  {
    return isVisiblyEqual(a, b, Object.keys(this.seen));
  }
}

export function isVisiblyEqual<T>(a: T, b: T, seen: Array<string | number>)
{
  for (const k of seen)
  {
    if (a[k] !== b[k])
    {
      return false;
    }
  }
  return true;
}

export function compareObjects(a: object, b: object, custom: {[k: string]: (x, y) => boolean} = {})
{
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length)
  {
    return false;
  }
  for (const key of aKeys)
  {
    if (!b.hasOwnProperty(key))
    {
      return false;
    }
    const compareFn = custom[key];
    if (compareFn !== undefined)
    {
      if (compareFn(a[key], b[key]) === false)
      {
        return false;
      }
    }
    else if (a[key] !== b[key])
    {
      return false;
    }
  }
  return true;
}

// TODO make these tests
// console.log(true === compareObjects(
//   { a: 5 },
//   { a: 5 },
// ));
// console.log(true === compareObjects(
//   { a: 'hello', b: 'goodbye' },
//   { a: 'hello', b: 'goodbye' },
// ));
// console.log(false === compareObjects(
//   { a: 'hello', b: 'goodbye' },
//   { a: 'hello', b: 'goodbyez' },
// ));
// console.log(false === compareObjects(
//   { a: 'hello', b: 'goodbye' },
//   { a: 'hello', b: 'goodbye', c: 'extra' },
// ));
// console.log(false === compareObjects(
//   { a: 'hello', b: 'goodbye', c: 'extra' },
//   { a: 'hello', b: 'goodbye' },
// ));
// console.log(false === compareObjects(
//   { a: 'hello', b: 'goodbye' },
//   { a: 'hello', c: 'goodbye' },
// ));
// console.log(false === compareObjects(
//   { a: 'hello', c: 'goodbye' },
//   { a: 'hello', b: 'goodbye' },
// ));
// console.log(true === compareObjects(
//   { 0: 'hello', 1: 'goodbye' },
//   { 0: 'hello', 1: 'goodbye' },
// ));
// console.log(true === compareObjects(
//   { a: null, b: undefined },
//   { a: null, b: undefined },
// ));
// console.log(false === compareObjects(
//   { a: undefined, b: 'hi' },
//   { b: 'hi', c: undefined },
// ));
// console.log(false === compareObjects(
//   { b: 'hi', c: undefined },
//   { a: undefined, b: 'hi' },
// ));
// console.log(true === compareObjects(
//   { a: 'hello', b: 'goodbye' },
//   { a: 'hello', b: 'goodbyez' },
//   { b: (x, y) => true }
// ));
// console.log(true === compareObjects(
//   { a: 'hellos', b: 'goodbye' },
//   { a: 'hello', b: 'goodbye' },
//   { a: (x, y) => true }
// ));
// console.log(false === compareObjects(
//   { a: 'hello', b: 'goodbye' },
//   { a: 'hello', b: 'goodbye' },
//   { b: (x, y) => false }
// ));
// console.log(false === compareObjects(
//   { a: 'hello', b: 'goodbye' },
//   { a: 'hello', b: 'goodbye' },
//   { a: (x, y) => false }
// ));
// console.log(false === compareObjects(
//   { a: 'hello', b: 'goodbye' },
//   { a: 'hello', b: 'goodbye' },
//   { a: (x, y) => false, b: (x, y) => true }
// ));
// console.log(false === compareObjects(
//   { a: 'hello', b: 'goodbye' },
//   { a: 'hello', b: 'goodbye' },
//   { b: (x, y) => true, a: (x, y) => false }
// ));
