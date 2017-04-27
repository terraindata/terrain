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

import DB from '../DB';
import * as Tasty from '../tasty/Tasty';
import { UserConfig } from '../users/Users';

// CREATE TABLE items (id integer PRIMARY KEY, meta text, name text NOT NULL, \
// parentItemId integer NOT NULL, status text, type text);

export interface ItemConfig
{
  id?: number;
  meta?: string;
  name: string;
  parentItemId: number;
  status?: string;
  type?: string;
}

export class Items
{
  private itemTable: Tasty.Table;

  constructor()
  {
    this.itemTable = new Tasty.Table('items', ['id'], ['meta', 'name', 'parentItemId', 'status', 'type']);
  }

  public async upsert(user: UserConfig, item: ItemConfig): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      // both regular and superusers can create items
      // only superusers can change existing items that are not BUILD status
      // both regular and superusers can change items that are not LIVE or DEFAULT status

      // check if all the required parameters are passed
      if (item === undefined || (item && (item.parentItemId === undefined || item.name === undefined)))
      {
        reject('Insufficient parameters passed');
      }

      let status: string = item.status || '';

      // item id specified but item not found
      if (item.id !== undefined)
      {
        const items = await this.get(item.id);
        if (items.length === 0)
        {
          reject('Invalid item id passed');
        }

        status = items[0].status || status;
      }

      // check privileges
      if (!user.isSuperUser && (status === 'LIVE' || status === 'DEFAULT'))
      {
        reject('Unauthorized');
      }

      try
      {
        await DB.getDB().upsert(this.itemTable, item);
        resolve('Success');
      }
      catch (e)
      {
        reject(e);
      }
    });
  }

  public async get(id?: number): Promise<ItemConfig[]>
  {
    if (id !== undefined)
    {
      return DB.getDB().select(this.itemTable, [], { id });
    }
    return DB.getDB().select(this.itemTable, [], {});
  }
}

export default Items;
