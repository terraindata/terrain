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
import * as Util from '../AppUtil';
import ExportTransform from './ExportTransform';
import { TemplateConfig } from './TemplateConfig';
import Templates from './Templates';

import CSVTransform from '../io/streams/CSVTransform';
import JSONTransform from '../io/streams/JSONTransform';
import ProgressTransform from '../io/streams/ProgressTransform';

import AEndpointStream from './endpoints/AEndpointStream';
import AlgorithmEndpoint from './endpoints/AlgorithmEndpoint';
import ElasticEndpoint from './endpoints/ElasticEndpoint';
import FSEndpoint from './endpoints/FSEndpoint';
import HTTPEndpoint from './endpoints/HTTPEndpoint';
import SFTPEndpoint from './endpoints/SFTPEndpoint';

export async function getSourceStream(name: string, source: SourceConfig, files?: stream.Readable[]): Promise<stream.Readable>
{
  return new Promise<stream.Readable>(async (resolve, reject) =>
  {
    let sourceStream: stream.Readable;
    let endpoint: AEndpointStream;
    switch (source.type)
    {
      case 'Algorithm':
        endpoint = new AlgorithmEndpoint();
        const algorithmStream = await endpoint.getSource(source);
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
        endpoint = new SFTPEndpoint();
        const sftpStream = await endpoint.getSource(source);
        switch (source.fileConfig.fileType)
        {
          case 'json':
            sourceStream = sftpStream.pipe(JSONTransform.createImportStream());
            break;
          case 'csv':
            sourceStream = sftpStream.pipe(CSVTransform.createImportStream());
            break;
          default:
            throw new Error('Download file type must be either CSV or JSON.');
        }
        break;
      case 'Http':
        endpoint = new HTTPEndpoint();
        const httpStream = await endpoint.getSource(source);
        switch (source.fileConfig.fileType)
        {
          case 'json':
            sourceStream = httpStream.pipe(JSONTransform.createImportStream());
            break;
          case 'csv':
            sourceStream = httpStream.pipe(CSVTransform.createImportStream());
            break;
          default:
            throw new Error('Download file type must be either CSV or JSON.');
        }
        break;
      case 'Fs':
        endpoint = new FSEndpoint();
        const fsStream = await endpoint.getSource(source);
        switch (source.fileConfig.fileType)
        {
          case 'json':
            sourceStream = fsStream.pipe(JSONTransform.createImportStream());
            break;
          case 'csv':
            sourceStream = fsStream.pipe(CSVTransform.createImportStream());
            break;
          default:
            throw new Error('Download file type must be either CSV or JSON.');
        }
        break;
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
    let endpoint: AEndpointStream;
    let exportStream: stream.Writable;
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

        endpoint = new ElasticEndpoint();
        const elasticStream = await endpoint.getSink(sink, engine);
        sinkStream = new ProgressTransform(elasticStream);
        break;
      case 'Sftp':
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

        endpoint = new SFTPEndpoint();
        const sftpStream = await endpoint.getSink(sink);
        sinkStream = new ProgressTransform(exportStream.pipe(sftpStream));
        break;
      case 'Http':
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

        endpoint = new HTTPEndpoint();
        const httpStream = await endpoint.getSink(sink);
        sinkStream = new ProgressTransform(exportStream.pipe(httpStream));
        break;
      case 'Fs':
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

        endpoint = new HTTPEndpoint();
        const fsStream = await endpoint.getSink(sink);
        sinkStream = new ProgressTransform(exportStream.pipe(fsStream));
        break;
      default:
        throw new Error('not implemented.');
    }

    resolve(sinkStream);
  });
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

  const source = {
    options: {
      serverId: name,
      query: JSON.stringify(query),
    },
  };
  const endpoint = new ElasticEndpoint();
  const elasticStream = await endpoint.getSource(source as any as SourceConfig);
  const exportTransform = new ExportTransform();
  return elasticStream.pipe(exportTransform);
}
