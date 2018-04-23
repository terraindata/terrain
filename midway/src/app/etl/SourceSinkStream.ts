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
import * as winston from 'winston';

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
import ProgressStream from '../io/streams/ProgressStream';

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
    let sourceStream: stream.Readable | undefined;
    let endpoint: AEndpointStream;
    let importStream: stream.Readable;

    winston.info(`Processing ${source.type} source:`, JSON.stringify(source, null, 2));
    switch (source.type)
    {
      case 'Algorithm':
        endpoint = new AlgorithmEndpoint();
        const algorithmStream = await endpoint.getSource(source);
        sourceStream = algorithmStream.pipe(new ExportTransform());
        return resolve(sourceStream);
      case 'Upload':
        if (files === undefined || files.length === 0)
        {
          throw new Error('No file(s) found in multipart formdata');
        }
        sourceStream = files.find((f) => f['fieldname'] === name);
        break;
      case 'Sftp':
        endpoint = new SFTPEndpoint();
        sourceStream = await endpoint.getSource(source);
        break;
      case 'Http':
        endpoint = new HTTPEndpoint();
        sourceStream = await endpoint.getSource(source);
        break;
      case 'Fs':
        endpoint = new FSEndpoint();
        sourceStream = await endpoint.getSource(source);
        break;
      default:
        throw new Error('not implemented.');
    }

    if (sourceStream === undefined)
    {
      throw new Error('Error finding source stream ' + name);
    }

    switch (source.fileConfig.fileType)
    {
      case 'json':
        const jsonNewlines: string | undefined = source.fileConfig.jsonNewlines ? undefined : '*';
        importStream = sourceStream.pipe(JSONTransform.createImportStream(jsonNewlines));
        break;
      case 'csv':
        importStream = sourceStream.pipe(CSVTransform.createImportStream());
        break;
      default:
        throw new Error('Download file type must be either CSV or JSON.');
    }
    resolve(importStream);
  });
}

export async function getSinkStream(sink: SinkConfig, engine: TransformationEngine): Promise<stream.Duplex>
{
  return new Promise<stream.Duplex>(async (resolve, reject) =>
  {
    let endpoint: AEndpointStream;
    let exportStream;

    winston.info(`Processing ${sink.type} sink:`, JSON.stringify(sink, null, 2));

    if (sink.type !== 'Database')
    {
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
    }

    switch (sink.type)
    {
      case 'Download':
        return resolve(exportStream);
      case 'Database':
        if (sink.options['language'] !== 'elastic')
        {
          throw new Error('Can only import into Elastic at the moment.');
        }
        endpoint = new ElasticEndpoint();
        break;
      case 'Sftp':
        endpoint = new SFTPEndpoint();
        break;
      case 'Http':
        endpoint = new HTTPEndpoint();
        break;
      case 'Fs':
        endpoint = new FSEndpoint();
        break;
      default:
        throw new Error('not implemented.');
    }

    const sinkStream = await endpoint.getSink(sink, engine);
    const writableStream = exportStream.pipe(sinkStream, { end: true });
    const progressStream = new ProgressStream(exportStream);
    resolve(progressStream);
  });
}

export async function getMergeJoinStream(serverId: string, indices: object[], options: object): Promise<stream.Readable>
{
  const query = JSON.stringify({
    size: 2147483647,
    query: {
      bool: {
        filter: [
          {
            term: {
              _index: indices[0]['index'],
            },
          },
          {
            term: {
              _type: indices[0]['type'],
            },
          },
        ],
      },
    },
    mergeJoin: {
      joinKey: options['leftJoinKey'],
      [options['outputKey']]: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  _index: indices[1]['index'],
                },
              },
              {
                term: {
                  _type: indices[1]['type'],
                },
              },
            ],
          },
        },
      },
    },
  });

  const source = {
    options: {
      serverId,
      query,
    },
  };
  const endpoint = new ElasticEndpoint();
  const elasticStream = await endpoint.getSource(source as any as SourceConfig);
  const exportTransform = new ExportTransform();
  return elasticStream.pipe(exportTransform);
}
