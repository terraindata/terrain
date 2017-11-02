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

// tslint:disable:no-var-requires

import { Map } from 'immutable';
import * as _ from 'lodash';
import * as ReduxActions from 'redux-actions';
const Redux = require('redux');
import { BaseClass, New } from '../../Classes';

class SpotlightStateC extends BaseClass
{
  public spotlights: IMMap<string, any> = Map({});
}
export type SpotlightState = SpotlightStateC & IRecord<SpotlightStateC>;
export const _SpotlightState = (config?: { [key: string]: any }) =>
  New<SpotlightState>(new SpotlightStateC(config), config);

const DefaultState = _SpotlightState();

// TODO something better like this
// class SpotlightC extends BaseClass
// {
//   name: string;
//   color: string;

// }
// export type Spotlight = SpotlightC & IRecord<Spotlight>;
// export const _Spotlight = (config?: {[key:string]: any}) =>
//   New<Spotlight>(new SpotlightC(config), config);

interface SpotlightAction
{
  type: string;
  payload:
  {
    hit: any;
    id: string;
  };
}

export const SpotlightStore: IStore<SpotlightState> = Redux.createStore(
  ReduxActions.handleActions({
    spotlight:
    (state: SpotlightState, action: SpotlightAction) =>
    {
      const { hit, id } = action.payload;
      if (!hit)
      {
        return state.removeIn(['spotlights', id]);
      }

      return state.setIn(['spotlights', id], _.extend({ id }, hit));
    },

    clearSpotlights:
    (state: SpotlightState) =>
    {
      return state.set('spotlights', Map({}));
    },
  }, DefaultState),
  DefaultState);

export function spotlightAction(id: string, hit: any)
{
  SpotlightStore.dispatch({
    type: 'spotlight',
    payload:
    {
      id,
      hit: hit == null ? null : _.extend(hit, { id }),
    },
  });
}

export function clearSpotlightsAction()
{
  SpotlightStore.dispatch({
    type: 'clearSpotlights',
    payload:
    {
    },
  });
}

export default SpotlightStore;
