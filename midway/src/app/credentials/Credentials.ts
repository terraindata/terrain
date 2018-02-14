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

// NB: this file should never be exposed directly via API routes except to localhost!
// It must only be called from inside midway and exposed via those routes, or exposed
// via /credentials to localhost for testing purposes

import aesjs = require('aes-js');
import sha1 = require('sha1');

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import UserConfig from '../users/UserConfig';
import { users } from '../users/UserRouter';
import * as Util from '../Util';
import { versions } from '../versions/VersionRouter';
import CredentialConfig from './CredentialConfig';

export class Credentials
{
  private credentialTable: Tasty.Table;
  private key: any;
  private privateKey: string;

  constructor()
  {
    this.credentialTable = new Tasty.Table(
      'credentials',
      ['id'],
      [
        'createdBy',
        'meta',
        'name',
        'permissions',
        'type',
      ],
    );

    // AES 128 requires a key that is 16, 24, or 32 bytes
    this.privateKey = sha1(`0VAtqVlzusw8nqA8TMoSfGHR3ik3dB-c9t4-gKUjD5iRbsWQWRzeL
                       -6mBtRGWV4M2A7ZZryVT7-NZjTvzuY7qhjrZdJTv4iGPmcbta-3iL
                       kgfEzY3QufFvm14dqtzfsCXhboiOC23idadrMNGlQwyJ783XlGwLB
                       xDeGI01olmhg0oiNCeoGc_4zDrHq3wcgcwQ_mpZYAj9mJsv_OI_yD
                       iN83Y_gDQCTzA9u3NdmmxquD2jSrR2fSKRokspxqBjb5`).substring(0, 16);
    this.key = aesjs.utils.utf8.toBytes(this.privateKey);
  }

  public async get(id?: number, type?: string): Promise<CredentialConfig[]>
  {
    return new Promise<CredentialConfig[]>(async (resolve, reject) =>
    {
      const rawCreds = await App.DB.select(this.credentialTable, [], { id, type });
      const creds = rawCreds.map((result: object) => new CredentialConfig(result));
      return resolve(await Promise.all(creds.map(async (cred) =>
      {
        cred.meta = await this._decrypt(cred.meta);
        return cred;
      })));
    });
  }

  public async getAsStrings(id?: number, type?: string): Promise<string[]>
  {
    return new Promise<string[]>(async (resolve, reject) =>
    {
      const creds: CredentialConfig[] = await App.DB.select(this.credentialTable, [], { id, type }) as CredentialConfig[];
      return resolve(await Promise.all(creds.map(async (cred) =>
      {
        return this._decrypt(cred.meta);
      })));
    });
  }

  // returns a string of credentials that match given type
  public async getByType(type?: string): Promise<string[]>
  {
    return new Promise<string[]>(async (resolve, reject) =>
    {
      const rawCreds = await App.DB.select(this.credentialTable, [], { type });
      const creds = rawCreds.map((result: object) => new CredentialConfig(result));
      return resolve(await Promise.all(creds.map(async (cred) =>
      {
        return this._decrypt(cred.meta);
      })));
    });
  }

  // returns a string of names and ids that match given type
  public async getNames(type?: string): Promise<object[]>
  {
    return new Promise<object[]>(async (resolve, reject) =>
    {
      const rawCreds = await App.DB.select(this.credentialTable, [], { type });
      const creds = rawCreds.map((result: object) => new CredentialConfig(result));
      return resolve(await Promise.all(creds.map(async (cred) =>
      {
        return {
          createdBy: cred.createdBy,
          id: cred['id'],
          name: cred.name,
          permissions: cred['permissions'],
          type: cred.type,
        };
      })));
    });
  }

  public async initializeLocalFilesystemCredential(): Promise<void>
  {
    const userExists = await users.select([], { email: 'admin@terraindata.com' });
    if (userExists.length !== 0)
    {
      const localConfigs: string[] = await this.getByType('local');
      if (localConfigs.length === 0)
      {
        const seedUser = userExists[0];
        const localCred: CredentialConfig =
          {
            createdBy: seedUser.id as number,
            meta: '',
            name: 'Local Filesystem Config',
            permissions: 0,
            type: 'local',
          };
        await this.upsert(seedUser, localCred);
      }
    }
  }

  public async upsert(user: UserConfig, cred: CredentialConfig): Promise<CredentialConfig>
  {
    return new Promise<CredentialConfig>(async (resolve, reject) =>
    {
      // check privileges
      if (!user.isSuperUser)
      {
        return reject('Cannot create/update credentials as non-super user.');
      }
      // if modifying existing credential, check for existence
      if (cred.id !== undefined)
      {
        cred.permissions = cred.permissions === undefined ? 0 : cred.permissions;
        const creds: CredentialConfig[] = await this.get(cred.id);
        if (creds.length === 0)
        {
          // cred id specified but cred not found
          return reject('Invalid credential id passed');
        }

        if (creds[0].createdBy !== user.id)
        {
          return reject('Only the user who created this credential can modify it.');
        }
        const id = creds[0].id;
        if (id === undefined)
        {
          return reject('Credential does not have an id');
        }

        // insert a version to save the past state of this credential
        await versions.create(user, 'credentials', id, creds[0]);

        if (cred.meta !== undefined)
        {
          cred.meta = await this._encrypt(cred.meta);
        }
        cred = Util.updateObject(creds[0], cred);
      }
      else
      {
        cred.createdBy = user.id !== undefined ? user.id : -1;
        cred.meta = await this._encrypt(cred.meta);
      }
      let newCredObj: object = await App.DB.upsert(this.credentialTable, cred) as object;

      const newCred: CredentialConfig[] = newCredObj as CredentialConfig[];
      newCred[0].meta = ''; // sanitize credentials
      newCredObj = newCred as object;
      return resolve(newCredObj as CredentialConfig);
    });
  }

  // use standard AES 128 decryption
  private async _decrypt(msg: string, privateKey?: string): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      const key: any = privateKey !== undefined ? aesjs.utils.utf8.toBytes(privateKey) : this.key;
      const msgBytes: any = aesjs.utils.hex.toBytes(msg);
      const aesCtr: any = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
      return resolve(aesjs.utils.utf8.fromBytes(aesCtr.decrypt(msgBytes)));
    });
  }

  // use standard AES 128 rencryption
  private async _encrypt(msg: string, privateKey?: string): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      const key: any = privateKey !== undefined ? aesjs.utils.utf8.toBytes(privateKey) : this.key;
      const msgBytes: any = aesjs.utils.utf8.toBytes(msg);
      const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
      return resolve(aesjs.utils.hex.fromBytes(aesCtr.encrypt(msgBytes)));
    });
  }
}

export default Credentials;
