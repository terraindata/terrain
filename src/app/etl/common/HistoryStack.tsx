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

type ImmHistory<T> = WithIRecord<HistoryStackC<T>>;

class HistoryStackC<T>
{
  public maxSize: number = 50;
  private pastItems: List<T> = List([]);
  private nextItems: List<T> = List([]);
  private currentItem: T = null;

  public getCurrentItem(): T
  {
    return this.currentItem;
  }

  public canUndo()
  {
    return this.currentItem !== null && this.pastItems.size > 0;
  }

  public canRedo()
  {
    return this.currentItem !== null && this.nextItems.size > 0;
  }

  public clearHistory(): ImmHistory<T>
  {
    let history: ImmHistory<T> = this as any;
    history = history
      .update('pastItems', (items) => items.clear())
      .update('nextItems', (items) => items.clear())
      .set('currentItem', null);
    return history;
  }

  // set the current item without mutating the history
  // be careful when using this
  public setItem(item: T): ImmHistory<T>
  {
    const history: ImmHistory<T> = this as any;
    return history.set('currentItem', item);
  }

  // like setItem, but updates the item like with immutable update()
  public updateItem(fn: (item: T) => T): ImmHistory<T>
  {
    let history: ImmHistory<T> = this as any;
    history = history.set('currentItem', fn(this.currentItem));
    return history;
  }

  // add a new item to the history. If there is a nextItems stack, then it will be cleared
  public pushItem(item: T): ImmHistory<T>
  {
    let history: ImmHistory<T> = this as any;
    history = history.update('nextItems', (nextItems) => nextItems.clear());
    if (history.currentItem !== null)
    {
      history = history.update('pastItems', (pastItems) => pastItems.push(history.currentItem));
      if (history.pastItems.size > this.maxSize)
      {
        history = history.update('pastItems', (pastItems) => pastItems.slice(-1 * this.maxSize));
      }
    }
    history = history.set('currentItem', item);
    return history;
  }

  public undoHistory(): ImmHistory<T>
  {
    let history: ImmHistory<T> = this as any;
    if (this.canUndo())
    {
      history = history.update('nextItems', (nextItems) => nextItems.push(history.currentItem));
      const newCurrentItem = history.pastItems.last();
      history = history.update('pastItems', (pastItems) => pastItems.pop());
      history = history.set('currentItem', newCurrentItem);
      return history;
    }
    else
    {
      return history;
    }
  }

  public redoHistory()
  {
    let history: ImmHistory<T> = this as any;
    if (this.canRedo())
    {
      history = history.update('pastItems', (pastItems) => pastItems.push(history.currentItem));
      const newCurrentItem = history.nextItems.last();
      history = history.update('nextItems', (nextItems) => nextItems.pop());
      history = history.set('currentItem', newCurrentItem);
      return history;
    }
    else
    {
      return history;
    }
  }
}

export type HistoryStack<T> = WithIRecord<HistoryStackC<T>>;

const _RealHistoryStack = makeExtendedConstructor(HistoryStackC, true);
export function _HistoryStack<T>(config?: ConfigType<HistoryStackC<T>>, deep?: boolean): WithIRecord<HistoryStackC<T>>
{
  return _RealHistoryStack(config, deep) as any;
}
