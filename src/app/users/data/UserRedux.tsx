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
import { _UserState, UserState, User, _User, UserMap } from 'users/UserTypes';
import
{
  ConstrainedMap,
  GetType,
  TerrainRedux,
  Unroll,
} from 'store/TerrainRedux';
import Ajax from 'util/Ajax';
import * as Immutable from 'immutable';
import * as _ from 'lodash';

export interface UserActionTypes
{
  change: {
    actionType: 'change';
    user: User;
  },
  fetch: {
    actionType: 'fetch';
  },
  setUsers: {
    actionType: 'setUsers';
    users: Immutable.Map<ID, User>;
    currentUserId: ID;
  },
  updateCurrentUser: {
    actionType: 'updateCurrentUser';
    id: ID;
  },
  completeTutorial: {
    actionType: 'completeTutorial';
    complete: boolean,
    stepId: number,
  },
}

class UserRedux extends TerrainRedux<UserActionTypes, UserState>
{
  public namespace: string = 'users';

  public reducers: ConstrainedMap<UserActionTypes, UserState> =
  {
    change: (state, action) =>
      state.setIn(['users', action.payload.user.id], action.payload.user),

    fetch: (state, action) =>
    {
      return state.set('loading', true);
    },

    setUsers: (state, action) =>
    {
      return state.set('users', action.payload.users)
        .set('currentUser', action.payload.users.get(action.payload.currentUserId))
        .set('loading', false)
        .set('loaded', true);
    },

    // This currentUser reference is hacky, and we should change it.
    updateCurrentUser: (state, action) =>
      state.set('currentUser', state.getIn(['users', action.payload.id])),

    completeTutorial: (state, action) =>
    {
      state = state.setIn(
        ['users', state.currentUser.id, 'tutorialStepsCompleted', action.payload.stepId],
        action.payload.complete,
      );

      const user = state.users.get(state.currentUser.id);
      Ajax.saveUser(user, () => { }, () => { });

      state = state.set('currentUser', user); // update the version of the current user reference
      return state;
    },
  };

  public fetchAction(dispatch, getState)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'fetch',
    });
    Ajax.getUsers((usersObj) =>
    {
      let users: UserMap = Immutable.Map<any, User>({});
      _.map(usersObj, (userObj, userId) =>
      {
        users = users.set(
          +userId,
          _User(userObj),
        );
      });

      directDispatch({
        actionType: 'setUsers',
        users,
        currentUserId: getState().get('auth').id,
      });
    });
  }

  public overrideAct(action: Unroll<UserActionTypes>)
  {
    if (action.actionType === 'fetch')
    {
      console.error({action})
      return this.fetchAction.bind(this);
    }
  }
}

const ReduxInstance = new UserRedux();
export const UserActions = ReduxInstance._actionsForExport();
export const UserReducers = ReduxInstance._reducersForExport(_UserState);
export declare type UserActionType<K extends keyof UserActionTypes> = GetType<K, UserActionTypes>;
