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
import * as Util from '../AppUtil';
import UserConfig from './UserConfig';

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
        'meta',
      ],
    );
  }

  public async initializeDefaultUser(): Promise<void>
  {
    const userExists = await this.select(['id'], { email: 'admin@terraindata.com' });
    if (userExists.length === 0)
    {
      try
      {
        await this.create({
          accessToken: '',
          email: 'admin@terraindata.com',
          isSuperUser: true,
          name: 'Terrain Admin',
          password: 'CnAATPys6tEB*ypTvqRRP5@2fUzTuY!C^LZP#tBQcJiC*5',
          isDisabled: false,
          timezone: '',
        });
      }
      catch (e)
      {
        throw new Error('Problem creating default user: ' + String(e));
      }
    }
  }

  public async create(user: UserConfig): Promise<UserConfig>
  {
    if (user.email === undefined || user.password === undefined)
    {
      throw new Error('Require both email and password for user creation');
    }

    const existingUsers = await this.select(['id'], { email: user.email });
    if (existingUsers.length !== 0)
    {
      throw new Error('User with email ' + String(user.email) + ' already exists.');
    }

    const newUser: UserConfig =
      {
        accessToken: user.accessToken === undefined ? '' : user.accessToken,
        email: user.email,
        isDisabled: user.isDisabled === undefined ? false : user.isDisabled,
        isSuperUser: user.isSuperUser === undefined ? false : user.isSuperUser,
        name: user.name === undefined ? '' : user.name,
        password: await this.hashPassword(user.password),
        timezone: user.timezone === undefined ? '' : user.timezone,
        meta: user.meta === undefined ? '{}' : user.meta,
      };
    return this.upsert(newUser);
  }

  public async update(user: UserConfig): Promise<UserConfig>
  {
    return new Promise<UserConfig>(async (resolve, reject) =>
    {
      const results = await this.get(user.id);
      if (results.length === 0)
      {
        return reject('User id not found');
      }

      const oldUser = results[0];

      // authenticate if email change or password change
      if (user.email !== oldUser.email || user.oldPassword !== undefined)
      {
        if (user.password === undefined)
        {
          return reject('Must provide password if updating email or password');
        }

        const unhashedPassword: string = user.oldPassword === undefined ? user.password : user.oldPassword;
        user.password = await this.hashPassword(user.password);

        if (user.oldPassword !== undefined)
        {
          user.oldPassword = await this.hashPassword(user.oldPassword);
        }

        const passwordsMatch: boolean = await this.comparePassword(unhashedPassword, oldUser.password);
        if (!passwordsMatch)
        {
          return reject('Password does not match');
        }
      }

      user = Util.updateObject(oldUser, user);
      resolve(await this.upsert(user));
    });
  }

  public async select(columns: string[], filter: object): Promise<UserConfig[]>
  {
    return new Promise<UserConfig[]>(async (resolve, reject) =>
    {
      const rawResults = await App.DB.select(this.userTable, columns, filter);
      const results: UserConfig[] = rawResults.map((result: object) => new UserConfig(result));
      resolve(results);
    });
  }

  public async get(id?: number): Promise<UserConfig[]>
  {
    if (id !== undefined)
    {
      return this.select([], { id });
    }
    return this.select([], {});
  }

  public async loginWithAccessToken(id: number, accessToken: string): Promise<UserConfig | null>
  {
    return new Promise<UserConfig | null>(async (resolve, reject) =>
    {
      const results: UserConfig[] = await this.select([], { id, accessToken }) as UserConfig[];
      if (results.length > 0 && results[0]['accessToken'].length !== 0)
      {
        resolve(results[0]);
      }
      else
      {
        resolve(null);
      }
    });
  }

  public async loginWithEmail(email: string, password: string): Promise<UserConfig | null>
  {
    winston.info('logging in with email ' + email + ' and password ' + password);
    return new Promise<UserConfig | null>(async (resolve, reject) =>
    {
      const results = await this.select([], { email });
      if (results.length === 0)
      {
        winston.info('none');
        return resolve(null);
      }
      else
      {
        const user: UserConfig = results[0];
        if (user.accessToken === undefined)
        {
          winston.info('no access token');
          return resolve(null);
        }
        const passwordsMatch: boolean = await this.comparePassword(password, user.password);
        if (passwordsMatch)
        {
          if (user.accessToken.length === 0 || user.accessToken === 'ImAnAdmin')
          {
            user.accessToken = srs(
              {
                length: 256,
              });
            await this.upsert(user);
          }
          winston.info('user');
          resolve(user);
        }
        else
        {
          winston.info('wrong pass');
          resolve(null);
        }
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
        return reject('Cannot find user');
      }

      const user: UserConfig = results[0] as UserConfig;
      user.accessToken = '';
      await this.upsert(user);
      resolve('Success');
    });
  }

  public async upsert(newUser: UserConfig): Promise<UserConfig>
  {
    return App.DB.upsert(this.userTable, newUser) as Promise<UserConfig>;
  }

  private async hashPassword(password: string): Promise<string>
  {
    return bcrypt.hash(password, this.saltRounds);
  }

  private async comparePassword(oldPassword: string, newPassword: string): Promise<boolean>
  {
    return bcrypt.compare(oldPassword, newPassword);
  }
}

export default Users;
