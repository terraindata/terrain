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

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import { UserConfig } from '../users/Users';
import * as Util from '../Util';
import { Versions } from '../versions/Versions';

const versions = new Versions();

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
    this.itemTable = new Tasty.Table('items', ['id'], ['meta', 'name', 'parent', 'status', 'type']);
  }

  public async delete(id: number): Promise<object[]>
  {
    return App.DB.delete(this.itemTable, { id } as ItemConfig);
  }

  public async get(id?: number): Promise<ItemConfig[]>
  {
    if (id !== undefined)
    {
      return App.DB.select(this.itemTable, [], { id }) as any;
    }
    return App.DB.select(this.itemTable, [], {}) as any;
  }

  // both regular and superusers can create items
  // only superusers can change existing items that are not BUILD status
  // both regular and superusers can change items that are not LIVE or DEFAULT status
  public async upsert(user: UserConfig, item: ItemConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      // check privileges
      if (!user.isSuperUser && item.status)
      {
        if (item.id !== undefined)
        {
          return reject('Only superuser can change item status');
        }
        else
        {
          if (item.status === 'LIVE' || item.status === 'DEFAULT')
          {
            return reject('Cannot set item status as LIVE or DEFAULT as non-superuser');
          }
        }
      }

      if (item.id !== undefined)
      {
        // item id specified but item not found
        const items: ItemConfig[] = await this.get(item.id);
        if (items.length === 0)
        {
          return reject('Invalid item id passed');
        }
        if (!user.isSuperUser && items[0].status
              && (items[0].status === 'LIVE' || items[0].status === 'DEFAULT'))
        {
          return reject('Cannot update LIVE or DEFAULT item as non-superuser');
        }

        await versions.create(user, 'items', items[0].id, items[0]);
        item = Util.updateObject(items[0], item);
      }

      try
      {
        await App.DB.upsert(this.itemTable, item);
        resolve('Success');
      }
      catch (e)
      {
        reject(e);
      }
    });
  }
}

export default Items;
