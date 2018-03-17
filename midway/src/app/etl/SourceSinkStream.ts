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

import
{
  DefaultSinkConfig,
  DefaultSourceConfig,
  SinkConfig,
  SourceConfig,
} from 'shared/etl/types/EndpointTypes';

import DatabaseController from '../../database/DatabaseController';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import CSVTransform from '../io/streams/CSVTransform';
import JSONTransform from '../io/streams/JSONTransform';
import { QueryHandler } from '../query/QueryHandler';
import * as Util from '../Util';

import { TemplateConfig } from './TemplateConfig';
import Templates from './Templates';

export async function getSourceStream(sources: DefaultSourceConfig): Promise<stream.Readable>
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
        const algorithmId = src.options.algorithmId;
        const dbId = 1;

        const database: DatabaseController | undefined = DatabaseRegistry.get(dbId);
        if (database === undefined)
        {
          throw new Error(`Database ${String(dbId)} not found.`);
        }

        if (database.getType() !== 'ElasticController')
        {
          throw new Error('Algorithm source only supports Elastic databases.');
        }

        const query: string = await Util.getQueryFromAlgorithm(algorithmId);
        const qh: QueryHandler = database.getQueryHandler();
        const payload = {
          database: dbId,
          type: 'search',
          streaming: true,
          databasetype: 'elastic',
          body: query,
        };

        sourceStream = await qh.handleQuery(payload) as stream.Readable;
        if (sourceStream === undefined)
        {
          throw new Error('Error creating new source stream');
        }
        break;
      case 'Upload':
      case 'Sftp':
      case 'Http':
      default:
        throw new Error('not implemented.');
    }
    resolve(sourceStream);
  });
}

export async function getSinkStream(sinks: DefaultSinkConfig): Promise<stream.Transform>
{
  return new Promise<stream.Transform>(async (resolve, reject) =>
  {
    if (sinks._default === undefined)
    {
      throw new Error('Default sink not found.');
    }

    const sink: SinkConfig = sinks._default;
    let sinkStream: stream.Transform;

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
      case 'Sftp':
      case 'Http':
      default:
        throw new Error('not implemented.');
    }

    resolve(sinkStream);
  });
}
