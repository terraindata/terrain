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

import aesjs = require('aes-js');
import sha1 = require('sha1');

import IntegrationConfig from './IntegrationConfig';
import { IntegrationPermission, IntegrationPermissionLevels } from './IntegrationPermissionLevels';
import IntegrationSimpleConfig from './IntegrationSimpleConfig';

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import * as Util from '../AppUtil';
import UserConfig from '../users/UserConfig';
import { users } from '../users/UserRouter';
import { versions } from '../versions/VersionRouter';

export class Integrations
{
  private integrationTable: Tasty.Table;
  private key: any;
  private privateKey: string;

  constructor()
  {
    this.integrationTable = new Tasty.Table(
      'integrations',
      ['id'],
      [
        'authConfig',
        'connectionConfig',
        'createdBy',
        'meta',
        'name',
        'readPermission',
        'type',
        'writePermission',
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

  public async delete(user: UserConfig, id: number): Promise<IntegrationConfig[] | string>
  {
    return new Promise<IntegrationConfig[] | string>(async (resolve, reject) =>
    {
      const deletedIntegrations: IntegrationConfig[] = await this.get(user, id);
      if (deletedIntegrations.length === 0)
      {
        return reject('Integration does not exist.');
      }
      await App.DB.delete(this.integrationTable, { id });
      return resolve(deletedIntegrations);
    });
  }

  public async get(user: UserConfig, id?: number, type?: string): Promise<IntegrationConfig[]>
  {
    return new Promise<IntegrationConfig[]>(async (resolve, reject) =>
    {
      const rawIntegrations = await App.DB.select(this.integrationTable, [], { id, type });
      const integrations: IntegrationConfig[] = rawIntegrations.map((result: object) => new IntegrationConfig(result));
      resolve(await Promise.all(integrations.map(async (integration) =>
      {
        if (integration.authConfig !== '')
        {
          integration.authConfig = JSON.parse(await this._decrypt(integration.authConfig));
        }

        if (integration.connectionConfig !== '')
        {
          integration.connectionConfig = JSON.parse(integration.connectionConfig);
        }
        return integration;
      })));
    });
  }

  // returns a string of names and ids that match given type
  public async getSimple(user: UserConfig, type?: string): Promise<IntegrationSimpleConfig[]>
  {
    const rawIntegrations = await App.DB.select(this.integrationTable, [], { type });
    return rawIntegrations.map((result: object) => new IntegrationSimpleConfig(result));
  }

  public async upsert(user: UserConfig, integration: IntegrationConfig): Promise<IntegrationConfig>
  {
    return new Promise<IntegrationConfig>(async (resolve, reject) =>
    {
      // check privileges
      if (!user.isSuperUser)
      {
        return reject('Cannot create/update integrations as non-super user.');
      }
      const defaultCreatedBy: number = user.id !== undefined ? user.id : -1;
      // if modifying existing integration, check for existence
      if (integration.id !== undefined)
      {
        const integrations: IntegrationConfig[] = await this.get(user, integration.id);
        if (integrations.length === 0)
        {
          // integration id specified but integration not found
          return reject('Invalid integration id passed');
        }

        const id = integrations[0].id;
        if (id === undefined)
        {
          return reject('Integration does not have an id');
        }

        // insert a version to save the past state of this integration
        await versions.create(user, 'integrations', id, integrations[0]);
        integration = Util.updateObject(integrations[0], integration);
      }
      else
      {
        integration.createdBy = defaultCreatedBy;
      }

      // set default values
      if (integration.authConfig !== undefined && integration.authConfig !== null)
      {
        integration.authConfig = await this._encrypt(JSON.stringify(integration.authConfig)) as string;
      }
      else
      {
        integration.authConfig = '';
      }

      if (integration.connectionConfig !== undefined && integration.connectionConfig !== null)
      {
        integration.connectionConfig = JSON.stringify(integration.connectionConfig);
      }
      else
      {
        integration.connectionConfig = '';
      }

      integration.createdBy = (integration.createdBy !== undefined && integration.createdBy !== null)
        ? integration.createdBy : defaultCreatedBy;
      integration.lastModified = new Date();
      integration.meta = (integration.meta !== undefined && integration.meta !== null) ? integration.meta : '';
      integration.name = (integration.name !== undefined && integration.name !== null) ? integration.name : '';
      integration.readPermission = (integration.readPermission !== undefined && integration.readPermission !== null)
        ? integration.readPermission : IntegrationPermission.Admin;
      integration.type = (integration.type !== undefined && integration.type !== null)
        ? integration.type : IntegrationPermission.Default;
      integration.writePermission = (integration.writePermission !== undefined && integration.writePermission !== null)
        ? integration.writePermission : IntegrationPermission.Admin;

      const newIntegration: IntegrationConfig[] = await App.DB.upsert(this.integrationTable, integration) as IntegrationConfig[];
      newIntegration[0].authConfig = null; // sanitize integrations
      if (newIntegration[0].connectionConfig !== '')
      {
        newIntegration[0].connectionConfig = JSON.parse(newIntegration[0].connectionConfig);
      }
      resolve(newIntegration[0]);
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

export default Integrations;
