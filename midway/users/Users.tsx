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

import * as bcrypt from 'bcrypt';
import * as winston from 'winston';

import srs = require('secure-random-string');
import DB from '../DB';
import * as Tasty from '../tasty/Tasty';

const saltRounds = 10;
// CREATE TABLE users (id integer PRIMARY KEY, accessToken text NOT NULL, email text NOT NULL, isDisabled bool NOT NULL
// , isSuperUser bool NOT NULL, name text NOT NULL, password text NOT NULL, timezone string NOT NULL)
const User = new Tasty.Table('users', ['id'], ['accessToken', 'email', 'isDisabled', 'isSuperUser', 'name',
  'password', 'timezone']);

export interface UserConfig
{
  accessToken?: string;
  email: string;
  id?: number;
  isDisabled?: boolean | number;
  isSuperUser?: boolean | number;
  name?: string;
  password: string;
  timezone?: string;
}

export const Users =
{
  createOrUpdate: async (req) =>
  {
    return new Promise(async (resolve, reject) =>
    {
      let requirePassword: boolean = false;
      const reqBody = req['body'];
      let user;
      const newUser: UserConfig =
      {
        email: '',
        password: '',
      };
      // update
      if (reqBody.id)
      {
        user = await Users.find(reqBody.id);
        const userExists: boolean = !!user && user.length !== 0;
        if (!userExists)
        {
          resolve('User with that id not found');
          return;
        }
        if (reqBody.email !== user[0].email || reqBody.password)
        {
          requirePassword = true;
          if (!reqBody.password)
          {
            resolve('Must provide password if updating email');
            return;
          }
        }
        newUser['accessToken'] = user[0].accessToken;
        newUser['email'] = reqBody.email ? reqBody.email : user[0].email;
        newUser['id'] = reqBody.id;
        newUser['isDisabled'] = req['callingUser'] && req['callingUser'].isSuperUser
          && reqBody.isDisabled !== undefined ? (reqBody.isDisabled ? 1 : 0) : (user[0].isDisabled ? 1 : 0);
        newUser['isSuperUser'] = req['callingUser'] && req['callingUser'].isSuperUser
          && reqBody.isSuperUser !== undefined ? (reqBody.isSuperUser ? 1 : 0) : (user[0].isSuperUser ? 1 : 0);
        newUser['name'] = reqBody.name || user[0].name;
        newUser['password'] = user[0].password;
        newUser['timezone'] = reqBody.timezone ? reqBody.timezone : 'PST'; // or whatever default timezone we want
      }
      else // create
      {
        if (!reqBody.email || !reqBody.password)
        {
          resolve('Require both email and password for user creation');
          return;
        }
        if (reqBody.oldPassword)
        {
          resolve('No existing password for non-existent user');
          return;
        }
        newUser['accessToken'] = '';
        newUser['email'] = reqBody.email;
        newUser['isDisabled'] = reqBody.isDisabled ? 1 : 0;
        newUser['isSuperUser'] = reqBody.isSuperUser ? 1 : 0;
        newUser['name'] = reqBody.name ? reqBody.name : '';
        newUser['timezone'] = reqBody.timezone ? reqBody.timezone : 'PST'; // or whatever default timezone we want
        bcrypt.hash(reqBody.password, saltRounds, async (errHash, hash) =>
        {
          newUser['password'] = hash;
          resolve(Users.upsert(newUser));
          return;
        });
      }

      // update passwords, if necessary
      if (requirePassword && reqBody.password && reqBody.oldPassword)
      {
        bcrypt.compare(reqBody.oldPassword, user[0].password, async (err, res) =>
        {
          if (res)
          {
            bcrypt.hash(reqBody.password, saltRounds, async (errHash, hash) =>
            {
              newUser.password = hash;
              resolve(Users.upsert(newUser));
              return;
            });
          }
          else
          {
            resolve('Invalid password');
            return;
          }
        });
      }
      else if (requirePassword && reqBody.password && !reqBody.oldPassword) // email change
      {
        bcrypt.compare(reqBody.password, user[0].password, async (err, res) =>
        {
          if (res)
          {
            resolve(Users.upsert(newUser));
          }
          else
          {
            resolve('Invalid password');
            return;
          }
        });
      }
      else if (requirePassword && !reqBody.password) // if password isn't provided
      {
        resolve('Password required');
        return;
      }
      else
      {
        resolve(Users.upsert(newUser)); // anything else
      }
    });
  },

  find: async (id: number) =>
  {
    return await DB.select(User, [], { id });
  },

  getTemplate: async () =>
  {
    const emptyObj: UserConfig =
    {
      accessToken: '',
      email: '',
      name: '',
      password: '',
      timezone: '',
    };
    return emptyObj;
  },

  loginWithAccessToken: async (id: number, accessToken: string) =>
  {
    const results = await DB.select(User, [], { id, accessToken });
    return new Promise(async (resolve, reject) =>
    {
      if (results.length > 0)
      {
        resolve(results[0]);
      }
      else {
        resolve(null);
      }
    });
  },

  loginWithEmail: async (email: string, password: string) =>
  {
    const results = await DB.select(User, [], { email });
    if (results && results.length === 0)
    {
      return new Promise(async (resolve, reject) =>
      {
        resolve(null);
      });
    }
    else
    {
      const user = results[0];
      return new Promise(async (resolve, reject) =>
      {
        bcrypt.compare(password, user['password'], async (err, res) =>
        {
          if (res)
          {
            if (user['accessToken'].length === 0)
            {
              user['accessToken'] = srs(
                {
                  length: 256,
                });
              await DB.upsert(User,  user);
            }
            resolve(user);
          }
          else {
            resolve(null);
          }
        });
      });
    }
  },

  logout: async (id: number, accessToken: string) =>
  {
    const results = await DB.select(User, [], { id, accessToken });
    if (results && results.length === 0)
    {
      return null;
    }
    const user = results[0];
    user['accessToken'] = '';
    return await DB.upsert(User, user);
  },

  replace: async (user, id?) =>
  {
    if (id)
    {
      user['id'] = id;
    }
    return await DB.upsert(User, user);
  },

  upsert: async (newUser) =>
  {
    return await DB.upsert(User, newUser);
  },
};

export default Users;
