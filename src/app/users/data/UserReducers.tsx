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
import Ajax from './../../util/Ajax';
import * as UserTypes from './../UserTypes';
import ActionTypes from './UserActionTypes';

const UserReducers = {};

UserReducers[ActionTypes.change] =
  (state, action) =>
    state.setIn(['users', action.payload.user.id], action.payload.user);

UserReducers[ActionTypes.fetch] =
  (state, action) =>
  {
    return state.set('loading', true);
  };

UserReducers[ActionTypes.setUsers] =
  (state, action) =>
  {
    return state.set('users', action.payload.users)
      .set('currentUser', action.payload.users.get(action.payload.currentUserId))
      .set('loading', false)
      .set('loaded', true);
  };

// This currentUser reference is hacky, and we should change it.
UserReducers[ActionTypes.updateCurrentUser] =
  (state, action) =>
    state.set('currentUser',
      state.getIn(['users', action.payload.id]));

UserReducers[ActionTypes.completeTutorial] =
  (
    state: UserTypes.UserState,
    action: Action<{
      stepId: string,
      complete: boolean,
    }>,
  ) =>
  {
    state = state.setIn(
      ['users', state.currentUser.id, 'tutorialStepsCompleted', action.payload.stepId],
      action.payload.complete,
    );

    const user = state.users.get(state.currentUser.id);
    Ajax.saveUser(user, () => { }, () => { });

    state = state.set('currentUser', user); // update the version of the current user reference
    return state;
  };

const UserReducersWrapper = (state: UserTypes.UserState = UserTypes._UserState(), action) =>
{
  let nextState = state;
  if (UserReducers[action.type] !== undefined)
  {
    nextState = UserReducers[action.type](state, action);
  }

  return nextState;
};

export default UserReducersWrapper;
