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

// Copyright 2018 Terrain Data, Inc.

import * as bcrypt from 'bcrypt';
import * as winston from 'winston';

import srs = require('secure-random-string');
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import * as Util from '../AppUtil';
import RecoveryTokenConfig from './RecoveryTokenConfig';
export class RecoveryTokens
{
  private recoveryTokensTable: Tasty.Table;

  public initialize()
  {
    this.recoveryTokensTable = App.TBLS.recoveryTokens;
  }

  public async create(entry: RecoveryTokenConfig): Promise<RecoveryTokenConfig>
  {
    if (entry.id === undefined)
    {
      throw new Error('Requires ID for recovery token creation');
    }
    const existingUsers = await this.select(['id'], { id: entry.id });
    if (existingUsers.length !== 0)
    {
      throw new Error('User with email ' + String(user.email) + ' already exists.');
    }
    const newRecoveryToken: RecoveryTokenConfig =
      {
        id: entry.id === undefined ? '' : entry.id,
        token: entry.token,
        createdAt: entry.createdAt,
      };
    return this.upsert(newRecoveryToken);
  }

  public async update(entry: RecoveryTokenConfig): Promise<RecoveryTokenConfig>
  {
    return new Promise<RecoveryTokenConfig>(async (resolve, reject) =>
    {
      const results = await this.get(entry.id);
      if (results.length === 0)
      {
        return reject('User id not found');
      }

      const oldEntry = results[0];

      entry = Util.updateObject(oldEntry, entry);
      resolve(await this.upsert(entry));
    });
  }

  public async select(columns: string[], filter: object): Promise<RecoveryTokenConfig>
  {
    return App.DB.select(this.recoveryTokensTable, columns, filter) as Promise<RecoveryTokenConfig[]>;
  }

  public async get(id?: number): Promise<RecoveryTokenConfig>
  {
    if (id !== undefined)
    {
      return this.select([], { id });
    }
    return this.select([], {});
  }

  public async upsert(newEntry: RecoveryTokenConfig): Promise<RecoveryTokenConfig>
  {
    winston.error('create: ' + JSON.stringify(newEntry));
    winston.error(typeof(newEntry));
    return App.DB.upsert(this.recoveryTokensTable, newEntry) as Promise<RecoveryTokenConfig>;
  }
}

export default RecoveryTokens;
