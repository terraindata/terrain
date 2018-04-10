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

import * as SSH from 'ssh2';
import * as stream from 'stream';
import { promisify } from 'util';

import { ElasticMapping } from 'shared/etl/mapping/ElasticMapping';
import
{
  DefaultSinkConfig,
  DefaultSourceConfig,
  SinkConfig,
  SourceConfig,
} from 'shared/etl/types/EndpointTypes';
import { TransformationEngine } from 'shared/transformations/TransformationEngine';

import DatabaseController from '../../database/DatabaseController';
import ElasticClient from '../../database/elastic/client/ElasticClient';
import { ElasticWriter } from '../../database/elastic/streams/ElasticWriter';
import { ElasticDB } from '../../database/elastic/tasty/ElasticDB';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import * as Util from '../AppUtil';
import CredentialConfig from '../credentials/CredentialConfig';
import { credentials } from '../credentials/CredentialRouter';
import CSVTransform from '../io/streams/CSVTransform';
import JSONTransform from '../io/streams/JSONTransform';
import ProgressTransform from '../io/streams/ProgressTransform';
import { QueryHandler } from '../query/QueryHandler';

import { databases } from '../database/DatabaseRouter';
import ExportTransform from './ExportTransform';
import { TemplateConfig } from './TemplateConfig';
import Templates from './Templates';

export async function getSourceStream(name: string, source: SourceConfig, files?: stream.Readable[]): Promise<stream.Readable>
{
  return new Promise<stream.Readable>(async (resolve, reject) =>
  {
    let sourceStream: stream.Readable;
    switch (source.type)
    {
      case 'Algorithm':
        const algorithmId = source.options['algorithmId'];
        const query: string = await Util.getQueryFromAlgorithm(algorithmId);
        const dbId: number = await Util.getDBFromAlgorithm(algorithmId);
        const algorithmStream = await getElasticReaderStream(dbId, query);
        const exportTransform = new ExportTransform();
        sourceStream = algorithmStream.pipe(exportTransform);
        break;
      case 'Upload':
        if (files === undefined || files.length === 0)
        {
          throw new Error('No file(s) found in multipart formdata');
        }

        const importStream = files.find((f) => f['fieldname'] === name);
        if (importStream === undefined)
        {
          throw new Error('Error finding source stream ' + name);
        }

        switch (source.fileConfig.fileType)
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
        const credentialId = source.options['credentialId'];
        const creds: CredentialConfig[] = await credentials.get(credentialId);
        if (creds.length === 0)
        {
          throw new Error('Invalid SFTP credentials ID.');
        }

        let sftpConfig: object = {};
        try
        {
          sftpConfig = JSON.parse(creds[0].meta);
        }
        catch (e)
        {
          throw new Error('Error retrieving credentials for ID ' + String(credentialId));
        }

        const sftp: SSH.SFTPWrapper = await getSFTPClient(sftpConfig);
        const sftpImportStream = sftp.createReadStream(source.options['filepath']);
        switch (source.fileConfig.fileType)
        {
          case 'json':
            sourceStream = sftpImportStream.pipe(JSONTransform.createImportStream());
            break;
          case 'csv':
            sourceStream = sftpImportStream.pipe(CSVTransform.createImportStream());
            break;
          default:
            throw new Error('Download file type must be either CSV or JSON.');
        }
        break;
      case 'Http':
      default:
        throw new Error('not implemented.');
    }
    resolve(sourceStream);
  });
}

export async function getSinkStream(sink: SinkConfig, engine: TransformationEngine): Promise<stream.Duplex>
{
  return new Promise<stream.Duplex>(async (resolve, reject) =>
  {
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
        const controller = await getControllerByName(serverId);
        const client: ElasticClient = controller.getClient() as ElasticClient;
        const elasticDB: ElasticDB = controller.getTasty().getDB() as ElasticDB;

        // create mapping
        const elasticMapping = new ElasticMapping(engine);
        await elasticDB.putESMapping(database, table, elasticMapping.getMapping());

        const primaryKey = elasticMapping.getPrimaryKey();
        const elasticStream = new ElasticWriter(client, database, table, primaryKey);
        sinkStream = new ProgressTransform(elasticStream);
        break;
      case 'Sftp':
        let exportStream: stream.Writable;
        switch (sink.fileConfig.fileType)
        {
          case 'json':
            exportStream = JSONTransform.createExportStream();
            break;
          case 'csv':
            exportStream = CSVTransform.createExportStream();
            break;
          default:
            throw new Error('Export file type must be either CSV or JSON.');
        }

        // get SFTP credentials
        const credentialId = sink.options['credentialId'];
        const creds: CredentialConfig[] = await credentials.get(credentialId);
        if (creds.length === 0)
        {
          throw new Error('Invalid SFTP credentials ID.');
        }

        let sftpConfig: object = {};
        try
        {
          sftpConfig = JSON.parse(creds[0].meta);
        }
        catch (e)
        {
          throw new Error('Error retrieving credentials for ID ' + String(credentialId));
        }

        const sftp: SSH.SFTPWrapper = await getSFTPClient(sftpConfig);
        const sftpStream = sftp.createWriteStream(sink.options['filepath']);
        sinkStream = new ProgressTransform(exportStream.pipe(sftpStream));
        break;
      case 'Http':
      default:
        throw new Error('not implemented.');
    }

    resolve(sinkStream);
  });
}

export async function getControllerByName(name: string): Promise<DatabaseController>
{
  const db = await databases.select([], { name });
  if (db.length < 1 || db[0].id === undefined)
  {
    throw new Error(`Database ${String(name)} not found.`);
  }

  const controller: DatabaseController | undefined = DatabaseRegistry.get(db[0].id as number);
  if (controller === undefined)
  {
    throw new Error(`Database id ${String(db[0].id)} is invalid.`);
  }

  return controller;
}

export async function getMergeJoinStream(name: string, indices: object[], options: object): Promise<stream.Readable>
{
  const mergeJoinKey = options['outputKey'];
  const query = {
    size: 2147483647,
    query: {
      bool: {
        filter: [
          {
            match: {
              _index: indices[0]['index'],
            },
          },
          {
            match: {
              _type: indices[0]['type'],
            },
          },
        ],
      },
    },
    mergeJoin: {
      joinKey: options['leftJoinKey'],
      [mergeJoinKey]: {
        query: {
          bool: {
            filter: [
              {
                match: {
                  _index: indices[1]['index'],
                },
              },
              {
                match: {
                  _type: indices[1]['type'],
                },
              },
            ],
          },
        },
      },
    },
  };

  const controller = await getControllerByName(name);
  const dbId: number = controller.getID();
  const elasticStream = await getElasticReaderStream(dbId, JSON.stringify(query));
  const exportTransform = new ExportTransform();
  return elasticStream.pipe(exportTransform);
}

async function getElasticReaderStream(dbId: number, query: string): Promise<stream.Readable>
{
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
    body: query,
  };

  const elasticStream = await qh.handleQuery(payload) as stream.Readable;
  if (elasticStream === undefined)
  {
    throw new Error('Error creating new source stream from algorithm');
  }

  return elasticStream;
}

// TODO: move into a separate file
async function getSFTPClient(config: object)
{
  return new Promise<SSH.SFTPWrapper>((resolve, reject) =>
  {
    const client = new SSH.Client();
    client.on('ready', () =>
    {
      client.sftp((err, sftpClient) =>
      {
        if (err !== null && err !== undefined)
        {
          return reject(err);
        }
        else
        {
          return resolve(sftpClient);
        }
      });
    }).on('error', reject)
      .connect(config);
  });
}
