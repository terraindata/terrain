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

// Copyright 2018 Terrain Data, Inc.

// tslint:disable:no-console

import * as Deque from 'double-ended-queue';
import * as elasticsearch from 'elasticsearch';
import { Readable } from 'stream';

import { MidwayLogger } from '../midway/src/app/log/MidwayLogger';
import DatabaseControllerConfig from '../midway/src/database/DatabaseControllerConfig';
import ElasticClient from '../midway/src/database/elastic/client/ElasticClient';
import ElasticConfig from '../midway/src/database/elastic/ElasticConfig';
import ElasticController from '../midway/src/database/elastic/ElasticController';
import ElasticReader from '../midway/src/database/elastic/streams/ElasticReader';
import ElasticWriter from '../midway/src/database/elastic/streams/ElasticWriter';

MidwayLogger.level = 'z';

function uncaughtExceptionHandler(err: Error): void
{
  console.error('Uncaught Exception: ' + err.toString());
  if (err.stack !== undefined)
  {
    console.error(err.stack);
  }
}

function unhandledRejectionHandler(err: Error): void
{
  console.error('Unhandled Promise Rejection: ' + err.toString());
  if (err.stack !== undefined)
  {
    console.error(err.stack);
  }
}

process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', unhandledRejectionHandler);

const unused = (async () =>
{
  if (process.argv.length < 5)
  {
    console.log('Bad args. Requires [srcDsn] [dstDsn] [newPrefix] [oldPrefix=\'\']');
    return;
  }
  const srcDsn = process.argv[2];
  const dstDsn = process.argv[3];
  const prefix = process.argv[4];
  const oldPrefix = process.argv[5] != null ? process.argv[5] : '';
  if (oldPrefix === prefix)
  {
    console.log('Bad args.');
    return;
  }
  const srcElasticClient: ElasticClient = (await DatabaseControllerConfig.makeDatabaseController(
    {
      id: 1,
      name: 'source',
      type: 'elastic',
      host: '',
      dsn: srcDsn,
      isAnalytics: false,
      isProtected: false,
    },
  )).getClient();
  const dstElasticClient: ElasticClient = (await DatabaseControllerConfig.makeDatabaseController(
    {
      id: 2,
      name: 'destination',
      type: 'elastic',
      host: '',
      dsn: dstDsn,
      isAnalytics: false,
      isProtected: false,
    },
  )).getClient();
  const result = await srcElasticClient.indices.getMapping({});
  for (const oldIndex of Object.keys(result))
  {
    if (oldIndex.startsWith('.'))
    {
      continue;
    }
    if (!oldIndex.startsWith(oldPrefix))
    {
      continue;
    }
    const mappings = result[oldIndex].mappings;
    const index = prefix + oldIndex.substring(oldPrefix.length);
    try
    {
      await dstElasticClient.indices.delete({ index });
    }
    catch (e)
    {
    }
    await dstElasticClient.indices.create({ index });
    for (const type of Object.keys(mappings))
    {
      await dstElasticClient.indices.putMapping(
        {
          index,
          type,
          body: mappings[type],
        },
      );
      console.log('Mapping migrated for index: ' + index + ', type: ' + type);
      const reader = new OneToManyReader(
        new ElasticReader(srcElasticClient, { query: { bool: { filter: { term: { _index: oldIndex } } } } }, true),
        (one) =>
          one.hits.hits.map((obj) =>
          {
            obj._source._id = obj._id;
            return obj._source;
          }),
      );
      const writer = new ElasticWriter(dstElasticClient, index, type, '_id');
      writer.on('error', (e) => console.log(String(e) + '\n' + String(e.stack)));
      reader.pipe(writer);
      let cnt = 0;
      reader.on('data', () => cnt++);
      reader.once('end', () => console.log(`${cnt} documents migrated for index: ` + index + ', type: ' + type));
    }
  }
})();

class OneToManyReader extends Readable
{
  private queue = new Deque<any>();
  private canPush = false;
  private canRead = false;

  constructor(private reader: Readable, private f: (one: any) => any[])
  {
    super({
      objectMode: true,
    });
    reader.once('end', () => this.push(null));
    reader.on('readable', () =>
    {
      this.canRead = true;
      if (this.canPush)
      {
        this._read();
      }
    });
  }

  public _read()
  {
    this.canPush = true;
    while (this.queue.length > 0 && this.push(this.queue.shift()))
    {
    }
    if (this.queue.length > 0)
    {
      this.canPush = false;
      return;
    }
    if (!this.canRead)
    {
      return;
    }
    let one = this.reader.read();
    if (one == null)
    {
      this.canRead = false;
      return;
    }
    let i;
    while (one != null)
    {
      const many = this.f(one);
      i = 0;
      while (i < many.length && this.push(many[i++]))
      {
      }
      if (i !== many.length)
      {
        this.canPush = false;
        while (i < many.length)
        {
          this.queue.push(many[i++]);
        }
        return;
      }
      one = this.reader.read();
    }
    this.canRead = false;
  }
}
