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

import DatabaseController from '../../database/DatabaseController';
import ElasticClient from '../../database/elastic/client/ElasticClient';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import StatusHistory from '../statusHistory/StatusHistory';
import UserConfig from '../users/UserConfig';
import * as Util from '../Util';
import { versions } from '../versions/VersionRouter';
import ItemConfig from './ItemConfig';

export class Items
{
  private itemTable: Tasty.Table;

  constructor()
  {
    this.itemTable = new Tasty.Table(
      'items',
      ['id'],
      [
        'meta',
        'name',
        'parent',
        'status',
        'type',
      ],
    );
  }

  public async delete(id: number): Promise<ItemConfig[]>
  {
    return App.DB.delete(this.itemTable, { id } as object) as Promise<ItemConfig[]>;
  }

  public async select(columns: string[], filter: object): Promise<ItemConfig[]>
  {
    return new Promise<ItemConfig[]>(async (resolve, reject) =>
    {
      const rawResults = await App.DB.select(this.itemTable, columns, filter);
      const results: ItemConfig[] = rawResults.map((result: object) => new ItemConfig(result));
      resolve(results);
    });
  }

  public async get(id?: number): Promise<ItemConfig[]>
  {
    if (id !== undefined)
    {
      return this.select([], { id });
    }
    return this.select([], {});
  }

  public parseDeployedName(algorithm: ItemConfig): string
  {
    if (algorithm.meta === undefined)
    {
      return '';
    }
    const meta = JSON.parse(algorithm.meta);
    if (meta['deployedName'] === undefined)
    {
      return '';
    }
    return meta['deployedName'];
  }

  public async getLiveAlgorithms(ids: number[]): Promise<string[] | object[]>
  {
    return new Promise<string[] | object[]>(async (resolve, reject) =>
    {
      if (ids.length === 0)
      {
        const items: ItemConfig[] = await this.select([], { type: 'ALGORITHM', status: 'LIVE' } as object);
        const liveItems: object[] = items.map((item) =>
        {
          return { id: item.id, name: this.parseDeployedName(item as ItemConfig) };
        });
        return resolve(liveItems);
      }
      else
      {
        const liveItems: string[] = await Promise.all(ids.map(async (id) =>
        {
          const items: ItemConfig[] = await this.select([], { id, type: 'ALGORITHM', status: 'LIVE' } as object);
          return items.length !== 0 ? this.parseDeployedName(items[0] as ItemConfig) as string : '' as string;
        }));
        return resolve(liveItems);
      }
    });
  }

  public async checkStatusAlgorithms(dbid: number): Promise<string[] | string>
  {
    return new Promise<string[] | string>(async (resolve, reject) =>
    {
      const result: string[] | string = await this._getAllAlgorithmsInCluster(dbid);
      if (!Array.isArray(result))
      {
        return reject(result as string);
      }
      return resolve(result);
    });
  }

  public async checkAlgorithmInES(algorithmId?: number, dbid?: number, deployedName?: string): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (algorithmId === undefined || isNaN(algorithmId))
      {
        return reject('Must provide algorithm id.');
      }
      if (dbid === undefined || isNaN(dbid))
      {
        return reject('Must provide database id.');
      }
      if (deployedName === undefined || deployedName === '')
      {
        return reject('Must provide deployed name.');
      }
      const liveScripts: string = await this._checkAlgorithmInESHelper(algorithmId, dbid, deployedName);
      return resolve(liveScripts);
    });
  }

  // both regular and superusers can create items
  // only superusers can change existing items that are not BUILD status
  // both regular and superusers can change items that are not LIVE or DEFAULT status
  public async upsert(user: UserConfig, item: ItemConfig): Promise<ItemConfig>
  {
    return new Promise<ItemConfig>(async (resolve, reject) =>
    {
      // check privileges if setting to live/lock/default
      if (!user.isSuperUser && (item.status === 'LIVE' || item.status === 'DEPLOYED' || item.status === 'DEFAULT'))
      {
        return reject('Cannot set item status as LIVE, LOCK or DEFAULT as non-superuser');
      }

      // if modifying existing item, check for existence and check privileges
      if (item.id !== undefined)
      {
        const items: ItemConfig[] = await this.get(item.id);
        if (items.length === 0)
        {
          // item id specified but item not found
          return reject('Invalid item id passed');
        }

        const status = items[0].status;
        if (!user.isSuperUser && (status === 'LIVE' || status === 'DEPLOYED' || status === 'DEFAULT'))
        {
          // only superusers can update live / default items
          return reject('Cannot update LIVE, LOCK or DEFAULT item as non-superuser');
        }

        const id = items[0].id;
        if (id === undefined)
        {
          return reject('Item does not have an ID');
        }

        // insert a version to save the past state of this item
        await versions.create(user, 'items', id, items[0]);
        if (items[0].status !== item.status)
        {
          const statusHistory = new StatusHistory();
          await statusHistory.create(user, id, items[0], item.status as string);
        }

        item = Util.updateObject(items[0], item);
      }

      resolve(await App.DB.upsert(this.itemTable, item) as ItemConfig);
    });
  }

  private async _checkAlgorithmInESHelper(algorithmId: number, dbid: number, deployedName: string): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      const database: DatabaseController | undefined = DatabaseRegistry.get(dbid);
      if (database === undefined)
      {
        return resolve('Database "' + dbid.toString() + '" not found');
      }
      if (database.getType() !== 'ElasticController')
      {
        return resolve('Status metadata currently is only supported for Elastic databases');
      }
      const items: ItemConfig[] = await this.select([], { id: algorithmId } as object);
      if (items.length === 0)
      {
        return resolve('Algorithm not found');
      }

      const elasticClient: ElasticClient = database.getClient() as ElasticClient;
      elasticClient.getScript({ id: deployedName, lang: 'mustache' }, async function getState(err, resp)
      {
        if (items[0]['meta'] !== undefined)
        {
          const metaObj = JSON.parse(String(items[0]['meta']));
          if (metaObj['modelVersion'] < 3 && items[0].type === 'GROUP')
          {
            items[0].type = 'CATEGORY';
          }
          if (metaObj['modelVersion'] < 3 && items[0].type === 'ALGORITHM')
          {
            items[0].type = 'GROUP';
          }
          if (metaObj['modelVersion'] < 3 && items[0].type === 'VARIANT')
          {
            items[0].type = 'ALGORITHM';
          }
        }
        if (items[0].type !== 'ALGORITHM')
        {
          return resolve('Item is not an Algorithm');
        }
        if (resp['_id'] === deployedName && resp['found'] === true && (items[0].status === 'LIVE' || items[0].status === 'DEPLOYED'))
        {
          return resolve(`Algorithm is ${items[0].status} ${deployedName}`);
        }
        else if (resp['_id'] === deployedName && resp['found'] === true && items[0].status !== 'LIVE' && items[0].status !== 'DEPLOYED')
        {
          return resolve('Error: Algorithm found in ES instance but not LIVE or LOCK');
        }
        else if (resp['_id'] === deployedName && resp['found'] === false && (items[0].status === 'LIVE' || items[0].status === 'DEPLOYED'))
        {
          return resolve(`Error: ${items[0].status} Algorithm not found in ES instance`);
        }
        else
        {
          return resolve('Confirmed that Algorithm is not deployed');
        }
      }.bind(this));
    });
  }

  private async _getAllAlgorithmsInCluster(dbid: number): Promise<string[] | string>
  {
    return new Promise<string[] | string>(async (resolve, reject) =>
    {
      const database: DatabaseController | undefined = DatabaseRegistry.get(dbid);
      if (database === undefined)
      {
        return resolve('Database "' + dbid.toString() + '" not found.');
      }
      if (database.getType() !== 'ElasticController')
      {
        return resolve('Status metadata currently is only supported for Elastic databases.');
      }
      const elasticClient: ElasticClient = database.getClient() as ElasticClient;
      elasticClient.cluster.state({}, function getState(err, resp)
      {
        let storedScriptNames: string[] = [];
        if (resp['metadata'] !== undefined && resp['metadata']['stored_scripts'] !== undefined)
        {
          const storedScripts = resp['metadata']['stored_scripts'] as object;
          storedScriptNames = Object.keys(storedScripts);
          storedScriptNames = storedScriptNames.map((storedScriptName) =>
          {
            return storedScriptName.startsWith('mustache#') ? storedScriptName.substring(9) : '';
          }).filter((storedScriptName) =>
          {
            return storedScriptName.length > 0;
          });
        }
        return resolve(storedScriptNames);
      });
    });
  }
}

export default Items;
