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

import DatabaseController from '../../database/DatabaseController';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Scripts from '../../scripts/Scripts';
import * as Util from '../AppUtil';
import { metrics } from '../events/EventRouter';
import UserConfig from '../users/UserConfig';
import SchemaMetadataConfig from './SchemaMetadataConfig';

export class SchemaMetadata
{
  private schemaMetadataTable: Tasty.Table;

  constructor()
  {
    this.schemaMetadataTable = new Tasty.Table(
      'schemaMetadata',
      ['id'],
      [
        'columnId',
        'starred',
        'count',
        'countByAlgorithm',
      ],
    );
  }

  public async select(columns: string[], filter: object): Promise<SchemaMetadataConfig[]>
  {
    return new Promise<SchemaMetadataConfig[]>(async (resolve, reject) =>
    {
      const rawResults = await App.DB.select(this.schemaMetadataTable, columns, filter);
      const results: SchemaMetadataConfig[] = rawResults.map((result: object) => new SchemaMetadataConfig(result));
      resolve(results);
    });
  }

  public async get(id?: number): Promise<SchemaMetadataConfig[]>
  {
    if (id !== undefined)
    {
      return this.select([], { id });
    }
    return this.select([], {});
  }

  public async upsert(user: UserConfig, schemaMetadata: SchemaMetadataConfig): Promise<SchemaMetadataConfig>
  {
    return new Promise<SchemaMetadataConfig>(async (resolve, reject) =>
    {
      // Modifying an existing schema metadata, make sure the schema metadata exists in midway combine the new
      // information with the stored information
      if (schemaMetadata.id !== undefined)
      {
        const schemaMetadatas: SchemaMetadataConfig[] = await this.get(schemaMetadata.id);
        if (schemaMetadatas.length === 0)
        {
          return reject('Invalid schema metadata id passed');
        }
        const newCountByAlgorithm = JSON.parse(schemaMetadata.countByAlgorithm !== undefined ?
          schemaMetadata.countByAlgorithm : '{}');
        const oldCountByAlgorithm = JSON.parse(schemaMetadatas[0].countByAlgorithm !== undefined ?
          schemaMetadatas[0].countByAlgorithm : '{}');
        schemaMetadata = Util.updateObject(schemaMetadatas[0], schemaMetadata);
        schemaMetadata.countByAlgorithm = JSON.stringify(Util.updateObject(newCountByAlgorithm, oldCountByAlgorithm));
      }
      // If the id hasn't been set...
      else
      {
        // Check to see an item with the same columnId exists in the DB, if so, update this one.
        const results: SchemaMetadataConfig[] = await this.select(
          ['columnId',
            'count',
            'countByAlgorithm',
            'id',
            'starred',
          ],
          {
            columnId: schemaMetadata.columnId,
          });
        if (results.length > 0)
        {
          const newCountByAlgorithm = JSON.parse(schemaMetadata.countByAlgorithm !== undefined ?
            schemaMetadata.countByAlgorithm : '{}');
          const oldCountByAlgorithm = JSON.parse(results[0].countByAlgorithm !== undefined ?
            results[0].countByAlgorithm : '{}');
          schemaMetadata = Util.updateObject(results[0], schemaMetadata);
          schemaMetadata.countByAlgorithm = JSON.stringify(Util.updateObject(newCountByAlgorithm, oldCountByAlgorithm));
        }
        // If it is a new item, make sure that all of the fields (count, starred, countByAlgorithm) are set
        else
        {
          if (schemaMetadata.columnId === undefined)
          {
            reject('SchemaMetadata must have a column id');
          }
          if (schemaMetadata.count === undefined)
          {
            schemaMetadata.count = 0;
          }
          if (schemaMetadata.countByAlgorithm === undefined)
          {
            schemaMetadata.countByAlgorithm = '{}';
          }
          if (schemaMetadata.starred === undefined)
          {
            schemaMetadata.starred = false;
          }
        }
      }
      resolve(await App.DB.upsert(this.schemaMetadataTable, schemaMetadata) as SchemaMetadataConfig);
    });
  }

  // First, look in database by id or by column id for the item
  // if it is in there, increment it's count by 1
  // Look for that algorithm id in its countByAlgorithm -> if there, increment, otherwise add and set to 1
  // otherwise, create a new item with the given column id and set it's count to 1
  // set countByAlgirithm to {algorithmId: 1}
  // stringify countByAlgorithm
  // upsert it into thet data base
  public async increment(user: UserConfig, columnId: string, algorithmId: number): Promise<SchemaMetadataConfig>
  {
    const algorithmIdString = String(algorithmId);
    return new Promise<SchemaMetadataConfig>(async (resolve, reject) =>
    {
      let schemaMetadata: SchemaMetadataConfig;
      const results: SchemaMetadataConfig[] = await this.select(
        ['columnId',
          'count',
          'countByAlgorithm',
          'id',
          'starred',
        ],
        {
          columnId,
        });
      if (results.length > 0)
      {
        schemaMetadata = results[0];
        const oldCountByAlgorithm = JSON.parse(results[0].countByAlgorithm !== undefined ?
          results[0].countByAlgorithm : '{}');
        if (oldCountByAlgorithm[algorithmIdString] !== undefined)
        {
          oldCountByAlgorithm[algorithmIdString] += 1;
        }
        else
        {
          oldCountByAlgorithm[algorithmIdString] = 1;
        }
        schemaMetadata['countByAlgorithm'] = JSON.stringify(oldCountByAlgorithm);
        schemaMetadata['count'] += 1;
      }
      else
      {
        if (columnId === undefined)
        {
          reject('SchemaMetadata must have a column id');
        }
        schemaMetadata = {
          columnId,
          count: 1,
          starred: false,
          countByAlgorithm: JSON.stringify({ [algorithmIdString]: 1 }),
        };
      }
      resolve(await App.DB.upsert(this.schemaMetadataTable, schemaMetadata) as SchemaMetadataConfig);
    });
  }
}

export default SchemaMetadata;
