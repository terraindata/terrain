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

import * as stream from 'stream';

import { ElasticMapping } from 'shared/etl/mapping/ElasticMapping';
import
{
  DefaultSinkConfig,
  DefaultSourceConfig,
  SinkConfig,
  SourceConfig,
} from 'shared/etl/types/EndpointTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

import util from '../../../../shared/Util';
import DatabaseController from '../../database/DatabaseController';
import ElasticClient from '../../database/elastic/client/ElasticClient';
import { ElasticWriter } from '../../database/elastic/streams/ElasticWriter';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Util from '../AppUtil';
import CSVTransform from '../io/streams/CSVTransform';
import JSONTransform from '../io/streams/JSONTransform';
import { QueryHandler } from '../query/QueryHandler';

import { databases } from '../database/DatabaseRouter';
import ExportTransform from './ExportTransform';
import { TemplateConfig } from './TemplateConfig';
import Templates from './Templates';

export async function getSourceStream(sources: DefaultSourceConfig, files?: stream.Readable[]): Promise<stream.Readable>
{
  return new Promise<stream.Readable>(async (resolve, reject) =>
  {
    if (sources._default === undefined)
    {
      throw new Error('Default source not found.');
    }

    const src: SourceConfig = sources._default;
    let sourceStream: stream.Readable;

    switch (src.type)
    {
      case 'Algorithm':
        const algorithmId = src.options['algorithmId'];
        const query: string = await Util.getQueryFromAlgorithm(algorithmId);
        const dbId: number = await Util.getDBFromAlgorithm(algorithmId);

        const controller: DatabaseController | undefined = DatabaseRegistry.get(dbId);
        if (controller === undefined)
        {
          throw new Error(`Database ${String(dbId)} not found.`);
        }

        if (controller.getType() !== 'ElasticController')
        {
          throw new Error('Algorithm source only supports Elastic databases');
        }

        const qh: QueryHandler = controller.getQueryHandler();
        const payload = {
          database: dbId,
          type: 'search',
          streaming: true,
          databasetype: 'elastic',
          body: query,
        };

        const algorithmStream = await qh.handleQuery(payload) as stream.Readable;
        if (algorithmStream === undefined)
        {
          throw new Error('Error creating new source stream from algorithm');
        }

        const exportTransform = new ExportTransform();
        sourceStream = algorithmStream.pipe(exportTransform);
        break;
      case 'Upload':
        if (files === undefined || files.length === 0)
        {
          throw new Error('No file(s) found in multipart formdata');
        }

        // TODO: multi-source import
        const importStream = files[0];
        switch (src.fileConfig.fileType)
        {
          case 'json':
            sourceStream = importStream.pipe(JSONTransform.createImportStream());
            break;
          case 'csv':
            sourceStream = importStream.pipe(CSVTransform.createImportStream());
            break;
          default:
            throw new Error('Download file type must be either CSV or JSON.');
        }
        break;
      case 'Sftp':
      case 'Http':
      default:
        throw new Error('not implemented.');
    }
    resolve(sourceStream);
  });
}

export async function getSinkStream(sinks: DefaultSinkConfig, engine: TransformationEngine): Promise<stream.Duplex>
{
  return new Promise<stream.Duplex>(async (resolve, reject) =>
  {
    if (sinks._default === undefined)
    {
      throw new Error('Default sink not found.');
    }

    const sink: SinkConfig = sinks._default;
    let sinkStream: stream.Duplex;

    switch (sink.type)
    {
      case 'Download':
        switch (sink.fileConfig.fileType)
        {
          case 'json':
            sinkStream = JSONTransform.createExportStream();
            break;
          case 'csv':
            sinkStream = CSVTransform.createExportStream();
            break;
          default:
            throw new Error('Download file type must be either CSV or JSON.');
        }
        break;
      case 'Database':
        if (sink.options['language'] !== 'elastic')
        {
          throw new Error('Can only import into Elastic at the moment.');
        }

        const { serverId, database, table } = sink.options as any;
        const db = await databases.select([], { name: serverId });
        if (db.length < 1)
        {
          throw new Error(`Database ${String(serverId)} not found.`);
        }

        const controller: DatabaseController | undefined = DatabaseRegistry.get(db[0].id);
        if (controller === undefined)
        {
          throw new Error(`Database id ${String(db[0].id)} is invalid.`);
        }

        const client: ElasticClient = controller.getClient() as ElasticClient;

        // create the index if it doesn't exist
        await new Promise((res, rej) =>
        {
          client.indices.getMapping(
            {
              index: database,
            },
            util.promise.makeCallback(res, rej));
        }).then((mapping) => {

        }).catch(async (e) => {
          await new Promise((res, rej) => {

            client.indices.create({
              index: database,
            },
            util.promise.makeCallback(res, rej));
          });
        });

        const elasticMapping = new ElasticMapping(engine);
        const primaryKey = elasticMapping.getPrimaryKey();

        // create mapping
        await new Promise((res, rej) =>
        {
          client.indices.putMapping(
            {
              index: database,
              type: table,
              body: elasticMapping.getMapping(),
            },
            util.promise.makeCallback(res, rej));
        });
        sinkStream = new ElasticWriter(client, database, table, primaryKey);
        break;
      case 'Sftp':
      case 'Http':
      default:
        throw new Error('not implemented.');
    }

    resolve(sinkStream);
  });
}
