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
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import * as Util from '../Util';

// CREATE TABLE users (id integer PRIMARY KEY, accessToken text NOT NULL, email text NOT NULL, isDisabled bool NOT NULL
// , isSuperUser bool NOT NULL, name text NOT NULL, oldPassword text, password text NOT NULL, timezone string)

export interface UserConfig
{
  accessToken?: string;
  email: string;
  id?: number;
  isDisabled?: boolean;
  isSuperUser?: boolean;
  name?: string;
  oldPassword?: string;
  password: string;
  timezone?: string;
}

export class Users
{
  private readonly saltRounds = 10;
  private userTable: Tasty.Table;

  constructor()
  {
    this.userTable = new Tasty.Table(
      'users',
      ['id'],
      [
        'accessToken',
        'email',
        'isDisabled',
        'isSuperUser',
        'name',
        'oldPassword',
        'password',
        'timezone',
      ],
    );
  }

  public async create(user: UserConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (!user.email || !user.password)
      {
        return reject('Require both email and password for user creation');
      }

      const newUser: UserConfig =
        {
          accessToken: '',
          email: user.email,
          isDisabled: user.isDisabled || false,
          isSuperUser: user.isSuperUser || false,
          name: user.name || '',
          password: await this.hashPassword(user.password),
          timezone: user.timezone || '',
        };

      await this.upsert(newUser);
      resolve('Success');
    });
  }

  public async update(isSuperUser: boolean, user: UserConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      const results = await this.get(user.id);
      if (results.length === 0)
      {
        return reject('User id not found');
      }

      const oldUser = results[0];
      if (!isSuperUser && (user.isDisabled !== undefined || user.isSuperUser !== undefined))
      {
        return reject('Only superuser can change user privileges or status');
      }

      // authenticate if email change or password change
      if (user.email !== oldUser.email || user.oldPassword)
      {
        if (!user.password)
        {
          return reject('Must provide password if updating email or password');
        }

        user.password = await this.hashPassword(user.password);
        if (user.oldPassword)
        {
          user.oldPassword = await this.hashPassword(user.oldPassword);
        }
        const hashedPassword = user.oldPassword || user.password;
        const passwordsMatch: boolean = await this.comparePassword(hashedPassword, oldUser.password);
        if (!passwordsMatch)
        {
          return reject('Password does not match');
        }
      }

      user = Util.updateObject(oldUser, user);
      await this.upsert(user);
      resolve('Success');
    });
  }

  public async get(id?: number): Promise<UserConfig[]>
  {
    if (id !== undefined)
    {
      return App.DB.select(this.userTable, [], { id }) as any;
    }
    return App.DB.select(this.userTable, [], {}) as any;
  }

  public async loginWithAccessToken(id: number, accessToken: string): Promise<UserConfig>
  {
    return new Promise<UserConfig>(async (resolve, reject) =>
    {
      const results: UserConfig[] = await App.DB.select(this.userTable, [], { id, accessToken }) as UserConfig[];
      if (results.length > 0)
      {
        resolve(results[0]);
      }
      else
      {
        resolve(null);
      }
    });
  }

  public async loginWithEmail(email: string, password: string)
  {
    return new Promise(async (resolve, reject) =>
    {
      const results: UserConfig[] = await App.DB.select(this.userTable, [], { email }) as UserConfig[];
      if (results.length === 0)
      {
        resolve(null);
      }
      else
      {
        const user: UserConfig = results[0] as UserConfig;
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
              await this.upsert(user);
            }
            resolve(user);
          }
          else
          {
            resolve(null);
          }
        });
      }
    });
  }

  public async logout(id: number, accessToken: string): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      const results = await App.DB.select(this.userTable, [], { id, accessToken });
      if (results.length === 0)
      {
        reject('Cannot find user');
      }

      const user: UserConfig = results[0] as UserConfig;
      user.accessToken = '';
      await this.upsert(user);
      resolve('Success');
    });
  }

  public async upsert(newUser: UserConfig)
  {
    return App.DB.upsert(this.userTable, newUser);
  }

  private async hashPassword(password: string): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      bcrypt.hash(password, this.saltRounds, Util.makePromiseCallback(resolve, reject));
    });
  }

  private async comparePassword(oldPassword: string, newPassword: string): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      bcrypt.compare(oldPassword, newPassword, Util.makePromiseCallback(resolve, reject));
    });
  }
}

export default Users;
