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
import { _AuthState, AuthState } from 'auth/AuthTypes';
import { AuthActions as Actions } from 'auth/data/AuthRedux';
import * as Immutable from 'immutable';
import { Ajax, createMockStore } from '../../helpers';

const MIDWAY_BASE_URL = `${MIDWAY_HOST}/midway/v1`;

const loginResponse =
  {
    accessToken: 'valid_access_token',
    id: 1,
  };

const logoutResponse =
  {
    accessToken: '',
    email: 'luser@terraindata.com',
    id: 1,
    isDisabled: 0,
    isSuperUser: 1,
    meta: '{}',
    name: 'Terrain Admin',
    oldPassword: null,
    password: '$2a$10$HWMqhIOEnaVwmaT5R3trBuuutBGq0ljGbdCMv6s0sZfyT7vCo.JSO',
    timezone: '',
  };

const mockStore = createMockStore();

describe('AuthActions', () =>
{
  const auth: AuthState = _AuthState();
  const schema: AuthState = _AuthState({
    id: 1,
    accessToken: 'valid_access_token',
  });

  describe('#login', () =>
  {
    it('should create a login action', () =>
    {
      const expectedActions = [
        {
          type: 'auth.login',

          payload: {
            id: 2,
            accessToken: 'another_valid_token',
            actionType: 'login',
          },
        },
      ];

      const store = mockStore(Immutable.Map({ auth }));

      store.dispatch(Actions({
        actionType: 'login',
        accessToken: 'another_valid_token',
        id: 2,
      }));
      expect(store.getActions()).toEqual(expectedActions);
    });
  });

  describe('#logout', () =>
  {
    it('should create a logout action', () =>
    {
      const expectedActions = [
        {
          type: 'auth.logout',
          payload: {
            actionType: 'logout',
          },
        },
      ];

      const store = mockStore(Immutable.Map({ auth }));

      store.dispatch(Actions({
        actionType: 'logout',
      }));
      expect(store.getActions()).toEqual(expectedActions);
    });
  });
});
