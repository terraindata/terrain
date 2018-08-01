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
// tslint:disable:no-empty
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import { responseToRecordConfig } from 'shared/util/Classes';
import
{
  ConstrainedMap,
  GetType,
  TerrainRedux,
  Unroll,
} from 'store/TerrainRedux';
import UserApi from 'users/UserApi';
import { _User, _UserState, User, UserMap, UserState } from 'users/UserTypes';
import XHR from 'util/XHR';
import { MidwayError } from '../../../../shared/error/MidwayError';

export interface UserActionTypes
{
  create?: {
    actionType: 'create';
    user: Partial<User> & { password: string };
  };
  createStart: {
    actionType: 'createStart';
  };
  createSuccess: {
    actionType: 'createSuccess';
    user: User;
  };
  createFailure: {
    actionType: 'createFailure';
  };

  change?: {
    actionType: 'change';
    user: User;
    meta?: object;
  };
  changeStart: {
    actionType: 'changeStart';
  };
  changeSuccess: {
    actionType: 'changeSuccess';
    user: User;
  };
  changeFailure: {
    actionType: 'changeFailure';
  };

  fetch?: {
    actionType: 'fetch',
  };
  fetchStart: {
    actionType: 'fetchStart';
  };
  fetchSuccess: {
    actionType: 'fetchSuccess';
    users: Immutable.Map<ID, User>;
    currentUserId: ID;
  };
  fetchFailure: {
    actionType: 'fetchFailure';
  };

  changePassword?: {
    actionType: 'changePassword';
    userId: ID;
    currentPassword: string;
    newPassword: string;
  };

  updateCurrentUser: {
    actionType: 'updateCurrentUser';
    id: ID;
  };
}

class UserRedux extends TerrainRedux<UserActionTypes, UserState>
{
  public namespace: string = 'users';
  public api: UserApi = new UserApi(XHR.getInstance());

  public reducers: ConstrainedMap<UserActionTypes, UserState> =
    {
      createStart: (state, action) =>
      {
        return state.set('loading', true);
      },

      createSuccess: (state, action) =>
      {
        const { user } = action.payload;
        return state.setIn(['users', user.id], user)
          .set('currentUser', user)
          .set('loading', false)
          .set('loaded', true);
      },

      createFailure: (state, action) => {
        return state;
      },

      changeStart: (state, action) =>
      {
        return state.set('loading', true);
      },

      changeSuccess: (state, action) =>
      {
        const { user } = action.payload;
        return state.setIn(['users', user.id], user)
          .set('currentUser', user)
          .set('loading', false)
          .set('loaded', true);
      },

      changeFailure: (state, action) => {
        return state;
      },

      fetchStart: (state, action) =>
      {
        return state.set('loading', true);
      },

      fetchSuccess: (state, action) =>
      {
        return state.set('users', action.payload.users)
          .set('currentUser', action.payload.users.get(action.payload.currentUserId))
          .set('loading', false)
          .set('loaded', true);
      },

      fetchFailure: (state, action) => {
        return state;
      },

      // This currentUser reference is hacky, and we should change it.
      updateCurrentUser: (state, action) =>
        state.set('currentUser', state.getIn(['users', action.payload.id])),
    };

  public fetch(action, dispatch, getState)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'fetch',
    });

    return this.api.getUsers()
      .then((usersResponse) =>
      {
        const usersObj = {};
        usersResponse.data.map(
          (user) =>
          {
            usersObj[user['id']] = responseToRecordConfig(user);
          },
        );

        let users: UserMap = Immutable.Map<any, User>();
        _.map(usersObj, (userObj, userId) =>
        {
          users = users.set(
            +userId,
            _User(userObj),
          );
        });

        directDispatch({
          actionType: 'fetchSuccess',
          users,
          currentUserId: getState().get('auth').id,
        });

        return Promise.resolve(users);
      });
  }

  public create(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'createStart',
    });

    const { user } = action;

    return this.api.createUser(user)
      .then((response) =>
      {
        const createdUser = responseToRecordConfig(response.data[0]);
        directDispatch({
          actionType: 'createSuccess',
          user: _User(createdUser),
        });

        return Promise.resolve(createdUser);
      });
  }

  public change(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'changeStart',
    });

    const { user, meta } = action;

    return this.api.saveUser({ user, meta })
      .then((response) =>
      {
        const updatedUser = responseToRecordConfig(response.data[0]);
        directDispatch({
          actionType: 'changeSuccess',
          user: _User(updatedUser),
        });

        return Promise.resolve(updatedUser);
      });
  }

  public changePassword(action, dispatch)
  {
    const directDispatch = this._dispatchReducerFactory(dispatch);
    directDispatch({
      actionType: 'changeStart',
    });

    const { userId, currentPassword, newPassword } = action;

    return this.api.changePassword(userId, currentPassword, newPassword)
      .then((response) =>
      {
        const updatedUser = responseToRecordConfig(response.data[0]);
        directDispatch({
          actionType: 'changeSuccess',
          user: _User(updatedUser),
        });

        return Promise.resolve(updatedUser);
      });
  }

  public overrideAct(action: Unroll<UserActionTypes>)
  {
    const asyncActions = [
      'fetch',
      'create',
      'change',
      'changePassword',
    ];

    if (asyncActions.indexOf(action.actionType) > -1)
    {
      return this[action.actionType].bind(this, action);
    }
  }
}

const ReduxInstance = new UserRedux();
export const UserActions = ReduxInstance._actionsForExport();
export const UserReducers = ReduxInstance._reducersForExport(_UserState);
export declare type UserActionType<K extends keyof UserActionTypes> = GetType<K, UserActionTypes>;
