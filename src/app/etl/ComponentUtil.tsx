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

export class UpdateChecker
{
  private checkFns: {
    [k: string]: (props, state?) => boolean,
  };
  private isRunning: boolean = false;

  constructor()
  {
    this.checkFns = {};
  }

  public setChecker(key: string, fn: (props, state?) => any)
  {
    if (!this.isRunning)
    {
      this.checkFns[key] = fn;
    }
  }

  public reset()
  {
    this.checkFns = {};
  }

  // returns true if any checks return true
  public runChecks(props, nextProps, state?, nextState?): boolean
  {
    this.isRunning = true;
    const result = this.executeAll(props, nextProps, state, nextState);
    this.isRunning = false;
    return result;
  }

  private executeAll(props, nextProps, state, nextState): boolean
  {
    for (const k of Object.keys(this.checkFns))
    {
      const fn = this.checkFns[k];
      if (fn(props, state) !== fn(nextProps, nextState))
      {
        return false;
      }
    }
    return true;
  }
}

/*
 *  PropertyTracker is an object that wraps around an object and remembers which properties you've "seen".
 *  This enables you to tell if two objects are "visibly" equal to each other.
 *  Two objects a and b are visibly equal to each other if and only if
 *  For each property K of the objects that you've seen, a[K] === b[K]
 *
 *  todo: look into ES6 proxies?
 */

export class PropertyTracker<T>
{
  private seen: any = {};

  constructor(private getItem: () => T) { }

  public reset()
  {
    this.seen = {};
  }

  // get the value at key - this tells the property tracker that the value has been seen
  public get<K extends keyof T>(key: K): T[K]
  {
    this.seen[key] = true;
    return this.getItem()[key];
  }

  // get the value at key without telling the property tracker that the value has been seen
  public getUntracked<K extends keyof T>(key: K): T[K]
  {
    return this.getItem()[key];
  }

  // returns null if the value has been viewed, or an array of keys that have been viewed
  public getSeen(): Array<string | number>
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

// returns true if the two objects are shallowly the same, using a custom comparator map
export function compareObjects(a: object, b: object, custom: { [k: string]: (aValue, bValue) => boolean } = {})
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
