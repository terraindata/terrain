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

import SQLiteExecutor from '../tasty/SQLiteExecutor';
import Tasty from '../tasty/Tasty';
import Util from '../Util';

// CREATE TABLE items (id integer PRIMARY KEY, meta text NOT NULL, name text NOT NULL, \
// parentItemId integer NOT NULL, status text NOT NULL, type text NOT NULL);
let Item = new Tasty.Table('items', ['id'], ['meta', 'name', 'parentItemId', 'status', 'type']);

export interface ItemConfig
{
  id?: number;
  meta?: string;
  name: string;
  parentItemId: number;
  status?: string;
  type?: string;
};

export const Items =
{
  createOrUpdateItem: async (user, req) =>
  {
    // both regular and superusers can create items
    // only superusers can change existing items that are not BUILD status
    // both regular and superusers can change items thar are not LIVE or DEFAULT status
    delete req.id;
    delete req.accessToken;
    let returnStatus = 'Incorrect parameters';
    let items = await Items.find(req.itemId);
    let itemExists: boolean = (items && items.length !== 0) ? true : false;
    if (user.isSuperUser && req.status)
    {
      delete req.status;
    }
    if ((!itemExists || user.isSuperUser)
      || (!user.isSuperUser && itemExists
        && !(items[0].status === 'LIVE' || items[0].status === 'DEFAULT')
        && req.status && !(req.status === 'LIVE' || req.status === 'DEFAULT')))
    {
      // define which other parameters need to be present for create/update
      if (req.parentItemId !== undefined && req.name !== undefined)
      {
        returnStatus = await Util.createOrUpdate(Items, req);
      }
    }
    return returnStatus;
  },
  find: async (id) =>
  {
    if (!id)
    {
      return null;
    }
    let query = new Tasty.Query(Item);
    query.filter(Item['id'].equals(id));
    let qstr = Tasty.SQLite.generate(query);
    let sqlite = new SQLiteExecutor();
    let items = await sqlite.query(qstr);
    return items;
  },
  getAll: async () =>
  {
    let query = new Tasty.Query(Item);
    let qstr = Tasty.SQLite.generate(query);
    let sqlite = new SQLiteExecutor();
    let items = await sqlite.query(qstr);
    return items;
  },
  getTemplate: async () =>
  {
    let emptyObj: ItemConfig =
    {
      meta: '',
      name: '',
      parentItemId: 0,
      status: '',
      type: '',
    };
    return emptyObj;
  },
  replace: async (item, id?) =>
  {
    let query = new Tasty.Query(Item);
    if (id)
    {
      item['id'] = id;
    }
    query.upsert(item);
    let qstr = Tasty.SQLite.generate(query);
    let sqlite = new SQLiteExecutor();
    let replaceStatus = await sqlite.query(qstr);
    return replaceStatus;
  },
};

export default Items;
