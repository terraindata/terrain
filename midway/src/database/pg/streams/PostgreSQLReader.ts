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

import * as pg from 'pg';
import * as PGQueryStream from 'pg-query-stream';
import { Readable } from 'stream';
import * as winston from 'winston';

import SafeReadable from '../../../app/io/streams/SafeReadable';
import PostgreSQLConfig from '../PostgreSQLConfig';

export class PostgreSQLReader extends SafeReadable
{
  private config: PostgreSQLConfig;
  private stream: Readable | null = null;
  private query: PGQueryStream;

  constructor(config: PostgreSQLConfig, query: string, table?: string)
  {
    super({ objectMode: true, highWaterMark: 1024 * 8 });
    this.config = config;

    try
    {
      let queryString: string;
      if (query === '')
      {
        if (table !== undefined)
        {
          queryString = 'select * from ' + table + ' limit 100;';
        }
        else
        {
          queryString = 'select 1;';
        }
      }
      else
      {
        queryString = query;
      }

      this.query = new PGQueryStream(queryString);

      const client: pg.Client = new pg.Client(config);
      client.connect((err) =>
      {
        if (err !== null && err !== undefined)
        {
          this.stream = client.query(this.query) as Readable;
          this.stream.on('end', () => this.push(null));
          this.stream.on('data', (d) => this.push(d));
          this.stream.on('error', (e) => this.emit('error', e));
        }
      });
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public _read(size?: number)
  {
    if (this.stream !== null)
    {
      return this.stream.read(size);
    }
  }

  public _destroy(error, callback)
  {
    if (this.stream !== null)
    {
      this.stream.destroy(error);
    }

    if (callback !== undefined)
    {
      callback();
    }
  }
}

export default PostgreSQLReader;
