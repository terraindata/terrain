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

import { Readable, Writable } from 'stream';

import { SinkConfig, SourceConfig } from '../../../../../shared/etl/types/EndpointTypes';
import { TransformationEngine } from '../../../../../shared/transformations/TransformationEngine';
import AEndpointStream from './AEndpointStream';

import { ElasticMapping } from '../../../../../shared/etl/mapping/ElasticMapping';
import DatabaseController from '../../../database/DatabaseController';
import ElasticClient from '../../../database/elastic/client/ElasticClient';
import { ElasticWriter } from '../../../database/elastic/streams/ElasticWriter';
import { ElasticDB } from '../../../database/elastic/tasty/ElasticDB';
import DatabaseRegistry from '../../../databaseRegistry/DatabaseRegistry';
import { databases } from '../../database/DatabaseRouter';
import { QueryHandler } from '../../query/QueryHandler';
import { SinkStreamConfig } from '../SourceSinkStream';

export default class ElasticEndpoint extends AEndpointStream
{
  constructor(private options: SinkStreamConfig = {})
  {
    super();
  }

  public async getSource(source: SourceConfig): Promise<Readable>
  {
    const { serverId, dbId, query } = source.options as any;

    const id = (dbId !== undefined) ? dbId : (serverId !== undefined) ? serverId : null;
    const controller: DatabaseController = await this.getController(id);

    const qh: QueryHandler = controller.getQueryHandler();
    const payload = {
      database: controller.getID(),
      type: 'search',
      streaming: true,
      body: query,
    };

    return qh.handleQuery(payload) as Promise<Readable>;
  }

  public async getSink(sink: SinkConfig, engine?: TransformationEngine): Promise<Writable>
  {
    const { serverId, dbId, database, table } = sink.options as any;

    const id = (dbId !== undefined) ? dbId : (serverId !== undefined) ? serverId : null;
    const controller: DatabaseController = await this.getController(id);

    let primaryKey: string;
    if (engine !== undefined)
    {
      const db: ElasticDB = controller.getTasty().getDB() as ElasticDB;
      const elasticMapping = new ElasticMapping(engine, this.options.isMerge);
      const pKey: string | null = elasticMapping.getPrimaryKey();
      if (pKey !== null)
      {
        primaryKey = pKey;
      }
      await db.putESMapping(database, table, elasticMapping.getMapping());
    }

    const client: ElasticClient = controller.getClient() as ElasticClient;
    return new ElasticWriter(client, database, table, primaryKey);
  }

  private async getController(id: number | string | null): Promise<DatabaseController>
  {
    let controller: DatabaseController | undefined;
    if (typeof id === 'string')
    {
      controller = DatabaseRegistry.getByName(id);
    }
    else if (typeof id === 'number')
    {
      controller = DatabaseRegistry.get(id);
    }

    if (controller === undefined)
    {
      throw new Error('Database or server id ' + String(id) + ' is invalid.');
    }

    if (controller.getType() !== 'ElasticController')
    {
      throw new Error('Invalid controller for Elastic endpoint');
    }

    return controller;
  }
}
