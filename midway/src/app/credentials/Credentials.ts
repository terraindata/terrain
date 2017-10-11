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

import DeployVariant from '../../../../shared/deploy/DeployVariant';
import DatabaseController from '../../database/DatabaseController';
import ElasticClient from '../../database/elastic/client/ElasticClient';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import { UserConfig } from '../users/Users';
import * as Util from '../Util';
import { versions } from '../versions/VersionRouter';

export const DV: DeployVariant = new DeployVariant();

// CREATE TABLE items (id integer PRIMARY KEY, meta text, name text NOT NULL, \
// parent integer, status text, type text);

export interface ItemConfig
{
  id?: number;
  meta?: string;
  name: string;
  parent?: number;
  status?: string;
  type?: string;
}

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
    const idObj: object = { id };
    return App.DB.delete(this.itemTable, { id } as object) as Promise<ItemConfig[]>;
  }

  public async select(columns: string[], filter: object): Promise<ItemConfig[]>
  {
    return App.DB.select(this.itemTable, columns, filter) as Promise<ItemConfig[]>;
  }

  public async get(id?: number): Promise<ItemConfig[]>
  {
    if (id !== undefined)
    {
      return this.select([], { id });
    }
    return this.select([], {});
  }

  public async getLiveVariants(ids?: number[]): Promise<string[] | string>
  {
    return new Promise<string[] | string>(async (resolve, reject) =>
    {
      if (ids === undefined)
      {
        return reject('Must provide an array of item IDs.');
      }
      const liveItems: string[] = [];
      for (const id of ids)
      {
        if (ids.hasOwnProperty(id))
        {
          const items: ItemConfig[] = await this.select([], { id, type: 'VARIANT', status: 'LIVE' } as object);
          if (items.length !== 0)
          {
            liveItems.push(DV.getVariantDeployedName(items[0] as ItemConfig));
          }
          else
          {
            liveItems.push('');
          }
        }
      }
      return resolve(liveItems);
    });
  }

  public async checkStatusVariants(dbid: number): Promise<string[] | string>
  {
    return new Promise<string[] | string>(async (resolve, reject) =>
    {
      const database: DatabaseController | undefined = DatabaseRegistry.get(dbid);
      if (database === undefined)
      {
        return reject('Database "' + dbid.toString() + '" not found.');
      }
      if (database.getType() !== 'ElasticController')
      {
        return reject('Status metadata currently is only supported for Elastic databases.');
      }
      const elasticClient: ElasticClient = database.getClient() as ElasticClient;
      elasticClient.cluster.state({}, function getState(err, resp)
      {
        let storedScriptNames: string[] = [];
        // console.log(resp);
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

  // both regular and superusers can create items
  // only superusers can change existing items that are not BUILD status
  // both regular and superusers can change items that are not LIVE or DEFAULT status
  public async upsert(user: UserConfig, item: ItemConfig): Promise<ItemConfig>
  {
    return new Promise<ItemConfig>(async (resolve, reject) =>
    {
      // check privileges if setting to live/default
      if (user.isSuperUser === 0 && (item.status === 'LIVE' || item.status === 'DEFAULT'))
      {
        return reject('Cannot set item status as LIVE or DEFAULT as non-superuser');
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
        if (user.isSuperUser === 0 && (status === 'LIVE' || status === 'DEFAULT'))
        {
          // only superusers can update live / default items
          return reject('Cannot update LIVE or DEFAULT item as non-superuser');
        }

        const id = items[0].id;
        if (id === undefined)
        {
          return reject('Item does not have an ID');
        }

        // insert a version to save the past state of this item
        await versions.create(user, 'items', id, items[0]);

        item = Util.updateObject(items[0], item);
      }

      resolve(await App.DB.upsert(this.itemTable, item) as ItemConfig);
    });
  }
}

export default Items;
