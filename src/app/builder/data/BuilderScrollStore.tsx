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

// tslint:disable:no-var-requires strict-boolean-expressions variable-name

import * as ReduxActions from 'redux-actions';
import { BaseClass, createRecordType } from 'shared/util/Classes';
const Redux = require('redux');

export class BuilderScrollStateClass extends BaseClass
{
  public columnTop: number = 0;
  public columnHeight: number = 0;
  public columnScroll: number = 0;
  public totalHeight: number = 0;
}
export interface BuilderScrollState extends BuilderScrollStateClass, IMap<BuilderScrollState> { }
const BuilderScrollState_Record = createRecordType(new BuilderScrollStateClass(), 'BuilderScrollStateClass');
const _BuilderScrollState = (config?: any) =>
{
  return new BuilderScrollState_Record(config || {}) as any as BuilderScrollState;
};

const DefaultState = _BuilderScrollState();

interface BuilderScrollAction
{
  type: string;
  payload:
  {
    columnTop: number;
    columnHeight: number;
    columnScroll: number;
    totalHeight: number;
  };
}

export const BuilderScrollStore: IStore<BuilderScrollState> = Redux.createStore(
  ReduxActions.handleActions({
    scroll:
      (state: BuilderScrollState, action: BuilderScrollAction) =>
      {
        const { columnTop, columnHeight, columnScroll, totalHeight } = action.payload;

        if (
          columnTop !== state.columnTop || columnHeight !== state.columnHeight
          || columnScroll !== state.columnScroll || totalHeight !== state.totalHeight
        )
        {
          return state
            .set('columnTop', columnTop)
            .set('columnHeight', columnHeight)
            .set('columnScroll', columnScroll)
            .set('totalHeight', totalHeight);
        }

        return state;
      },
  }, DefaultState),
  DefaultState);

export function scrollAction(columnTop: number, columnHeight: number, columnScroll: number, totalHeight: number)
{
  BuilderScrollStore.dispatch({
    type: 'scroll',
    payload:
    {
      columnTop,
      columnHeight,
      columnScroll,
      totalHeight,
    },
  });
}

export default BuilderScrollStore;
