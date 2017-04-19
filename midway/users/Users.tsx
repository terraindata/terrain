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

// https://github.com/ortoo/oauth2orize/blob/master/examples/express2/db/users.js
// TODO THIS IS A STUB. REPLACE WITH ORM

import * as bcrypt from 'bcrypt';
import * as winston from 'winston';

import SQLiteExecutor from '../tasty/SQLiteExecutor';
import srs = require('secure-random-string');
import Tasty from '../tasty/Tasty';

const saltRounds = 10;
// CREATE TABLE users (id integer PRIMARY KEY, accessToken text NOT NULL, email text NOT NULL, isDisabled bool NOT NULL
// , isSuperUser bool NOT NULL, name text NOT NULL, password text NOT NULL, timezone string NOT NULL)
let User = new Tasty.Table('users', ['id'], ['accessToken', 'email', 'isDisabled', 'isSuperUser', 'Meta', 'name',
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
};

export const Users =
{
  createOrUpdate: async (req) =>
  {
    if (!req.password)
    {
      return new Promise(async (resolve, reject) =>
        {
          resolve(null);
        });
    }
    return new Promise(async (resolve, reject) =>
    {
      bcrypt.hash(req.password, saltRounds, async (err, hash) =>
      {
        let storedAccessToken = '';
        if (req.id)
        {
          let user = await Users.find(req.id);
          if (user && user.length !== 0)
          {
            storedAccessToken = user[0].accessToken;
          }
        }
        let newUser: UserConfig =
        {
          accessToken: storedAccessToken,
          email: req.email,
          id : req.id ? req.id : -1,
          isDisabled: req.isDisabled ? 1 : 0,
          isSuperUser: req.isSuperUser ? 1 : 0,
          name: req.name ? req.name : '',
          password: hash,
          timezone: req.timezone ? req.timezone : 'PST', // or whatever default timezone we want
        };
        if (!req.id)
        {
          delete newUser.id;
        }
        let query = new Tasty.Query(User).upsert(
          newUser);
        let qstr = Tasty.SQLite.generate(query);
        let sqlite = new SQLiteExecutor();
        let users = await sqlite.query(qstr);
        resolve(users);
      });
    });
  },
  find: async (id) =>
  {
    let query = new Tasty.Query(User);
    query.filter(User['id'].equals(id));
    let qstr = Tasty.SQLite.generate(query);
    let sqlite = new SQLiteExecutor();
    let results = await sqlite.query(qstr);
    return results;
  },
  findByAccessToken: async (id, accessToken) =>
  {
    let query = new Tasty.Query(User);
    query.filter(User['id'].equals(id)).filter(User['accessToken'].equals(accessToken));
    let qstr = Tasty.SQLite.generate(query);
    let sqlite = new SQLiteExecutor();
    let results = await sqlite.query(qstr);
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
  findByUsername: async (email, password) =>
  {
    let query = new Tasty.Query(User);
    query.filter(User['email'].equals(email));
    let qstr = Tasty.SQLite.generate(query);
    let sqlite = new SQLiteExecutor();
    let results = await sqlite.query(qstr);
    if (results && results.length === 0)
    {
      return new Promise(async (resolve, reject) =>
      {
        resolve(null);
      });
    }

    let user = results[0];
    return new Promise(async (resolve, reject) =>
    {
      bcrypt.compare(password, user.password, async (err, res) =>
      {
        if (res)
        {
          if (user.accessToken.length === 0)
          {
            user.accessToken = srs(
              {
                length: 256,
              });
            let updateQuery = new Tasty.Query(User).upsert(user);
            qstr = Tasty.SQLite.generate(updateQuery);
            let success = await sqlite.query(qstr);
          }
          resolve(user);
        } else {
          resolve(null);
        }
      });
    });
  },
  getTemplate: async () =>
  {
    let emptyObj: UserConfig =
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
    let query = new Tasty.Query(User);
    query.filter(User['id'].equals(id)).filter(User['accessToken'].equals(accessToken));
    let qstr = Tasty.SQLite.generate(query);
    let sqlite = new SQLiteExecutor();
    let results = await sqlite.query(qstr);
    if (results && results.length === 0)
    {
      return new Promise(async (resolve, reject) =>
      {
        resolve(null);
      });
    }

    let user = results[0];
    user.accessToken = '';
    let updateQuery = new Tasty.Query(User).upsert(user);
    qstr = Tasty.SQLite.generate(updateQuery);
    let success = await sqlite.query(qstr);
    return success;
  },
  replace: async (user, id?) =>
  {
    let query = new Tasty.Query(User);
    if (id)
    {
      user['id'] = id;
    }
    query.upsert(user);
    let qstr = Tasty.SQLite.generate(query);
    let sqlite = new SQLiteExecutor();
    let replaceStatus = await sqlite.query(qstr);
    return replaceStatus;
  },
};

export default Users;
