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

// tslint:disable:no-var-requires variable-name strict-boolean-expressions no-unused-expression

import * as Immutable from 'immutable';
import * as _ from 'underscore';
const Redux = require('redux');

import BackendInstance from './../../../../shared/backends/types/BackendInstance';
import AuthStore from './../../auth/data/AuthStore';
import RoleStore from './../../roles/data/RolesStore';
import UserStore from './../../users/data/UserStore';
import * as LibraryTypes from './../LibraryTypes';
import Actions from './LibraryActions';
import { CleanLibraryActionTypes, LibraryActionTypes } from './LibraryActionTypes';

import { ItemStatus } from '../../../../shared/items/types/Item';
import BuilderActions from '../../builder/data/BuilderActions';
import Util from './../../util/Util';

import Ajax from './../../util/Ajax';

type Group = LibraryTypes.Group;
type Algorithm = LibraryTypes.Algorithm;
type Variant = LibraryTypes.Variant;

class LibraryStateC
{
  public loaded = false;
  public loading = true;
  public dbs: List<BackendInstance> = Immutable.List([]);
  public dbsLoaded: boolean = false;

  public groups: IMMap<ID, Group> = null;
  public algorithms: IMMap<ID, Algorithm> = null;
  public variants: IMMap<ID, Variant> = null;

  // these are set these on initial load
  public prevGroups: IMMap<ID, Group> = null;
  public prevAlgorithms: IMMap<ID, Algorithm> = null;
  public prevVariants: IMMap<ID, Variant> = null;

  public groupsOrder: List<ID> = Immutable.List([]);

  public changingStatus: boolean = false;
  public changingStatusOf: LibraryTypes.Variant = null;
  public changingStatusTo: ItemStatus = 'BUILD';
}
const LibraryState_Record = Immutable.Record(new LibraryStateC());
export interface LibraryState extends LibraryStateC, IRecord<LibraryState> { }
export const _LibraryState = (config?: any) =>
{
  return new LibraryState_Record(Util.extendId(config || {})) as any as LibraryState;
};

const DefaultState = _LibraryState();

import LibraryReducers from './LibraryReducers';

function saveStateOf(current: IMMap<ID, any>, previous: IMMap<ID, any>)
{
  if (current !== previous)
  {
    current && previous && current.map((curItem: any, curId: ID) =>
    {
      const prevItem = previous.get(curId);
      if (curItem !== prevItem)
      {
        // should save
        Ajax.saveItem(curItem);
      }
    });
  }
}

export const LibraryStore: IStore<LibraryState> = Redux.createStore(
  (state: LibraryState = DefaultState, action) =>
  {
    if (LibraryReducers[action.type])
    {
      state = LibraryReducers[action.type](state, action);
    }

    if (CleanLibraryActionTypes.indexOf(action.type) === -1)
    {
      // save the new state
      saveStateOf(state.groups, state.prevGroups);
      saveStateOf(state.algorithms, state.prevAlgorithms);
      saveStateOf(state.variants, state.prevVariants);
    }

    state = state
      .set('prevGroups', state.groups)
      .set('prevAlgorithms', state.algorithms)
      .set('prevVariants', state.variants);

    return state;
  }
  , DefaultState);

export default LibraryStore;
