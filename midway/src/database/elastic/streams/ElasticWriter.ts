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

import * as Elastic from 'elasticsearch';
import { EventEmitter } from 'events';
import * as Stream from 'stream';
import * as winston from 'winston';

import { ElasticMapping } from '../../../../../shared/etl/mapping/ElasticMapping';
import SafeWritable from '../../../app/io/streams/SafeWritable';
import ElasticClient from '../client/ElasticClient';

export class ElasticWriter extends SafeWritable
{
  private client: ElasticClient;
  private primaryKey: string | undefined;
  private index: string;
  private type: string;

  private doneWriting: boolean = false;

  private BULK_THRESHOLD: number = 10;

  constructor(client: ElasticClient, index: string, type: string, primaryKey?: string)
  {
    super({
      objectMode: true,
      highWaterMark: 1024 * 128,
    });

    this.client = client;
    this.index = index;
    this.type = type;
    this.primaryKey = primaryKey;
  }

  public _write(chunk: any, encoding: string, callback: (err?: Error) => void): void
  {
    try
    {
      if (Array.isArray(chunk))
      {
        const chunks = chunk.map((c) =>
        {
          return { chunk: c, encoding };
        });
        return this._writev(chunks, callback);
      }

      if (typeof chunk !== 'object')
      {
        this.emit('error', 'expecting chunk to be an object');
        return;
      }

      this.upsert(chunk, callback);
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public _writev(chunks: Array<{ chunk: any, encoding: string }>, callback: (err?: Error) => void): void
  {
    try
    {
      const numChunks = chunks.length;
      if (numChunks < this.BULK_THRESHOLD)
      {
        let numPending = numChunks;
        const done = new EventEmitter();
        done.on('done', callback);
        for (const chunk of chunks)
        {
          this._write(chunk.chunk, chunk.encoding, (err?) =>
          {
            if (--numPending === 0)
            {
              done.emit('done', err);
            }
          });
        }
      }
      else
      {
        this.bulkUpsert(chunks, callback);
      }
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public _destroy(error, callback)
  {
    this._final(callback);
  }

  public _final(callback)
  {
    this.doneWriting = true;
    this.client.indices.refresh({ index: this.index }, callback);
  }

  private upsert(body: object, callback: (err?: Error) => void): void
  {
    if (this.primaryKey == null || body[this.primaryKey] == null)
    {
      this.insert(body, callback);
    }
    else
    {
      const query: Elastic.UpdateDocumentParams = {
        index: this.index,
        type: this.type,
        id: body[this.primaryKey],
        body: {
          doc: body,
          doc_as_upsert: true,
        },
      };

      this.client.update(query, callback);
    }
  }

  private insert(body: object, callback: (err?: Error) => void): void
  {
    const query: Elastic.IndexDocumentParams<object> = {
      index: this.index,
      type: this.type,
      body,
    };

    if (this.primaryKey !== undefined && body[this.primaryKey] !== undefined)
    {
      query['id'] = body[this.primaryKey];
    }

    this.client.index(query, callback);
  }

  private bulkUpsert(chunks: Array<{ chunk: any, encoding: string }>, callback: (err?: Error) => void): void
  {
    if (this.primaryKey == null)
    {
      this.bulkInsert(chunks, callback);
    }
    else
    {
      const body: any[] = [];
      for (const chunk of chunks)
      {
        const command =
          {
            update: {
              _index: this.index,
              _type: this.type,
            },
          };

        if (this.primaryKey !== undefined && chunk.chunk[this.primaryKey] !== undefined)
        {
          command.update['_id'] = chunk.chunk[this.primaryKey];
        }

        const newBody = {
          doc: chunk.chunk,
          doc_as_upsert: true,
        };

        body.push(command);
        body.push(newBody);
      }

      this.client.bulk({ body }, callback);
    }

  }

  private bulkInsert(chunks: Array<{ chunk: any, encoding: string }>, callback: (err?: Error) => void): void
  {
    const body: any[] = [];
    for (const chunk of chunks)
    {
      const command =
        {
          index: {
            _index: this.index,
            _type: this.type,
          },
        };

      if (this.primaryKey !== undefined && chunk.chunk[this.primaryKey] !== undefined)
      {
        command.index['_id'] = chunk.chunk[this.primaryKey];
      }

      body.push(command);
      body.push(chunk.chunk);
    }

    this.client.bulk({ body }, callback);
  }

}

export default ElasticWriter;
