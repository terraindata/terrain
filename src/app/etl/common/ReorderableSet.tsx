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
// tslint:disable:max-classes-per-file strict-boolean-expressions no-shadowed-variable

import * as Immutable from 'immutable';
import * as _ from 'lodash';
import memoizeOne from 'memoize-one';
const { List, Map } = Immutable;

import
{
  ConfigType,
  instanceFnDecorator,
  makeConstructor,
  makeExtendedConstructor,
  WithIRecord,
} from 'shared/util/Classes';

// current implementation:
// O(n) inserts and deletes
// O(n log n) sorts
// There are better data structures out there but this is a quick and simple one that's also Immutable
class ReorderableSetC<T>
{
  private ordering: List<T> = List([]);

  // if after is not provided, then insert at the end
  public insert(value: T, after?: T)
  {
    const rset: ReorderableSet<T> = this as any;
    let items = rset.ordering;

    const existingPosition = items.indexOf(value);
    if (existingPosition !== -1)
    {
      items = items.delete(existingPosition);
    }

    let newPosition = items.size;
    if (after !== undefined)
    {
      const afterIndex = items.indexOf(after);
      if (afterIndex !== -1)
      {
        newPosition = afterIndex + 1;
      }
    }
    items = items.insert(newPosition, value);

    return rset.set('ordering', items);
  }

  public remove(value: T)
  {
    const rset: ReorderableSet<T> = this as any;
    let items = rset.ordering;

    const position = items.indexOf(value);
    if (position !== -1)
    {
      items = items.delete(position);
    }

    return rset.set('ordering', items);
  }

  // costs O(n) time to create, comparison is O(1)
  public comparator(): (a: T, b: T) => number
  {
    const lookup: Immutable.Map<T, number> = Map(this.ordering.map((value, index) => [value, index]));
    return (a: T, b: T) => {
      const aPos = lookup.get(a);
      const bPos = lookup.get(b);
      if (aPos === undefined || bPos === undefined)
      {
        return 0;
      }
      else
      {
        return aPos - bPos;
      }
    }
  }
}

export type ReorderableSet<T> = WithIRecord<ReorderableSetC<T>>;

const _RealReorderableSet = makeExtendedConstructor(ReorderableSetC, true);
export function _ReorderableSet<T>(config?: ConfigType<ReorderableSetC<T>>, deep?: boolean): WithIRecord<ReorderableSetC<T>>
{
  return _RealReorderableSet(config, deep) as any;
}
