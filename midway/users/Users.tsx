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
import * as Tasty from '../tasty/Tasty';
import Util from '../Util';

const saltRounds = 10;
// CREATE TABLE users (id integer PRIMARY KEY, accessToken text NOT NULL, email text NOT NULL, isDisabled bool NOT NULL
// , isSuperUser bool NOT NULL, name text NOT NULL, password text NOT NULL, timezone string NOT NULL)
const User = new Tasty.Table('users', ['id'], ['accessToken', 'email', 'isDisabled', 'isSuperUser', 'Meta', 'name',
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
      let user;
      const newUser: UserConfig =
      {
        email: '',
        password: '',
      };
      // update
      if (req.id)
      {
        user = await Users.find(req.id);
        const userExists: boolean = !!user && user.length !== 0;
        if (!userExists)
        {
          resolve('User with that id not found');
          return;
        }
        if (req.email !== user[0].email || req.password)
        {
          requirePassword = true;
          if (!req.password)
          {
            resolve('Must provide password if updating email');
            return;
          }
        }
        newUser['accessToken'] = user[0].accessToken;
        newUser['email'] = req.email ? req.email : user[0].email;
        newUser['id'] = req.id;
        newUser['isDisabled'] = req.isDisabled ? 1 : (user[0].isDisabled ? 1 : 0);
        newUser['isSuperUser'] = req.isSuperUser ? 1 : (user[0].isSuperUser ? 1 : 0);
        newUser['name'] = req.name ? req.name : '';
        newUser['password'] = userExists ? user[0].password : '';
        newUser['timezone'] = req.timezone ? req.timezone : 'PST'; // or whatever default timezone we want
      } else // create
      {
        if (!req.email || !req.password)
        {
          resolve('Require both email and password for user creation');
          return;
        }
        if (req.oldPassword)
        {
          resolve('No existing password for non-existent user');
          return;
        }
        newUser['accessToken'] = '';
        newUser['email'] = req.email;
        newUser['isDisabled'] = req.isDisabled ? 1 : 0;
        newUser['isSuperUser'] = req.isSuperUser ? 1 : 0;
        newUser['name'] = req.name ? req.name : '';
        bcrypt.hash(req.password, saltRounds, async (errHash, hash) =>
        {
          newUser['password'] = hash;
          resolve(Users.upsert(newUser));
          return;
        });
        newUser['timezone'] = req.timezone ? req.timezone : 'PST'; // or whatever default timezone we want
      }

      // update passwords, if necessary
      if (requirePassword && req.password && req.oldPassword)
      {
        bcrypt.compare(req.oldPassword, user[0].password, async (err, res) =>
        {
          if (res)
          {
            bcrypt.hash(req.password, saltRounds, async (errHash, hash) =>
            {
              newUser.password = hash;
              resolve(Users.upsert(newUser));
              return;
            });
          } else
          {
            resolve('Invalid password');
            return;
          }
        });
      } else if (requirePassword && req.password && !req.oldPassword) // email change
      {
        bcrypt.compare(req.password, user[0].password, async (err, res) =>
        {
          if (res)
          {
            resolve(Users.upsert(newUser));
          } else
          {
            resolve('Invalid password');
            return;
          }
        });
      } else if (requirePassword && !req.password) // if password isn't provided
      {
        resolve('Password required');
        return;
      } else
      {
        resolve(Users.upsert(newUser)); // anything else
      }
    });
  },

  find: async (id) =>
  {
    const query = new Tasty.Query(User);
    query.filter(User['id'].equals(id));
    const qstr = Tasty.Tasty.generate(Tasty.SQLite, query);
    const results = await Util.execute(qstr);
    return results;
  },

  findByAccessToken: async (id, accessToken) =>
  {
    const query = new Tasty.Query(User);
    query.filter(User['id'].equals(id)).filter(User['accessToken'].equals(accessToken));
    const qstr = Tasty.Tasty.generate(Tasty.SQLite, query);
    const results = await Util.execute(qstr);
    return new Promise(async (resolve, reject) =>
    {
      if (results.length > 0)
      {
        resolve(results[0]);
      } else {
        resolve(null);
      }
    });
  },

  findByEmail: async (email, password) =>
  {
    const query = new Tasty.Query(User);
    query.filter(User['email'].equals(email));
    let qstr = Tasty.Tasty.generate(Tasty.SQLite, query);
    const results = await Util.execute(qstr);
    if (results && results.length === 0)
    {
      return new Promise(async (resolve, reject) =>
      {
        resolve(null);
      });
    } else
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
              const updateQuery = new Tasty.Query(User).upsert(user);
              qstr = Tasty.Tasty.generate(Tasty.SQLite, updateQuery);
              const success = await Util.execute(qstr);
            }
            resolve(user);
          } else {
            resolve(null);
          }
        });
      });
    }
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

  logout: async (id, accessToken) =>
  {
    const query = new Tasty.Query(User);
    query.filter(User['id'].equals(id)).filter(User['accessToken'].equals(accessToken));
    let qstr = Tasty.Tasty.generate(Tasty.SQLite, query);
    const results = await Util.execute(qstr);
    if (results && results.length === 0)
    {
      return null;
    }
    const user = results[0];
    user['accessToken'] = '';
    const updateQuery = new Tasty.Query(User).upsert(user);
    qstr = Tasty.Tasty.generate(Tasty.SQLite, updateQuery);
    const success = await Util.execute(qstr);
    return success;
  },

  replace: async (user, id?) =>
  {
    const query = new Tasty.Query(User);
    if (id)
    {
      user['id'] = id;
    }
    query.upsert(user);
    const qstr = Tasty.Tasty.generate(Tasty.SQLite, query);
    return await Util.execute(qstr);

  },

  upsert: async (newUser) =>
  {
    const query = new Tasty.Query(User);
    query.upsert(newUser);
    const qstr = Tasty.Tasty.generate(Tasty.SQLite, query);
    const users = await Util.execute(qstr);
    return 'Success';
  },
};

export default Users;
