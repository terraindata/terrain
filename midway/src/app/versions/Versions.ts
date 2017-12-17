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

// CREATE TABLE versions (id integer PRIMARY KEY, \
// objectType text NOT NULL, objectId integer NOT NULL, \
// object text NOT NULL, createdAt datetime DEFAULT CURRENT_TIMESTAMP, createdByUserId integer NOT NULL);

export interface VersionConfig
{
  createdByUserId: number;
  id?: number;
  object: string;
  objectId: number;
  objectType: string;
}

export class Versions
{
  private versionTable: Tasty.Table;

  constructor()
  {
    this.versionTable = new Tasty.Table(
      'versions',
      ['id'],
      [
        'createdAt',
        'createdByUserId',
        'object',
        'objectId',
        'objectType',
      ],
    );
  }

  public async create(user: UserConfig, type: string, id: number, obj: object): Promise<VersionConfig>
  {
    if (user.id === undefined)
    {
      throw new Error('User ID unknown');
    }
    // can only insert
    const newVersion: VersionConfig =
      {
        createdByUserId: user.id,
        object: JSON.stringify(obj),
        objectId: id,
        objectType: type,
      };
    const results = await this.get();
    newVersion.id = results.length + 1;
    return App.DB.upsert(this.versionTable, newVersion) as Promise<VersionConfig>;
  }

  public async find(id: number): Promise<VersionConfig[]>
  {
    return App.DB.select(this.versionTable, [], { id }) as Promise<VersionConfig[]>;
  }

  public async get(objectType?: string, objectId?: number): Promise<VersionConfig[]>
  {
    let result: Promise<object[]>;
    if (objectId !== undefined && objectType !== undefined)
    {
      result = App.DB.select(this.versionTable, [], { objectType, objectId });
    }
    else if (objectId !== undefined)
    {
      result = App.DB.select(this.versionTable, [], { objectType });
    }
    else
    {
      result = App.DB.select(this.versionTable, [], {});
    }
    return result as Promise<VersionConfig[]>;
  }
}

export default Versions;
