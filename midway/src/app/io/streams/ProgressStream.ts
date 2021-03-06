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

import { EventEmitter } from 'events';
import { Duplex, Writable } from 'stream';

import { MidwayLogger } from '../../log/MidwayLogger';

/**
 * Monitors progress of the writable stream
 */
export default class ProgressStream extends Duplex
{
  private writer: Writable;
  private frequency: number;
  private asyncRead: any = null;
  private doneWriting: boolean = false;

  private count: number = 0;
  private errors: number = 0;

  constructor(writer: Writable, frequency: number = 3000)
  {
    super({
      allowHalfOpen: true,
      readableObjectMode: false,
      writableObjectMode: true,
      highWaterMark: writer.writableHighWaterMark,
    });

    this.frequency = frequency;
    this.writer = writer;
    this.writer.on('error', (e) =>
    {
      MidwayLogger.error(e.toString());
      this.errors++;
    });

    this.writer.on('finish', () =>
    {
      this.doneWriting = true;
      this.push(null);
    });
  }

  public _write(chunk: any, encoding: string, callback: (err?: Error) => void)
  {
    this.writer.write(chunk, encoding as BufferEncoding, (err?: Error) =>
    {
      if (err === undefined)
      {
        this.count++;
      }

      callback(err);
    });
  }

  public _writev(chunks: Array<{ chunk: any, encoding: string }>, callback: (err?: Error) => void): void
  {
    let numChunks = chunks.length;
    const done = new EventEmitter();
    done.on('done', callback);

    chunks.forEach((c) => this._write(c.chunk, c.encoding, (err?: Error) =>
    {
      if (--numChunks === 0)
      {
        done.emit('done');
      }
    }));
  }

  public _read()
  {
    if (this.asyncRead === null && !this.doneWriting)
    {
      this.asyncRead = setTimeout(() =>
      {
        if (!this.doneWriting)
        {
          this.asyncRead = null;
          this.push(this.progress());
        }
      },
        this.frequency);
    }
  }

  public _final(callback)
  {
    if (this.asyncRead !== null)
    {
      clearTimeout(this.asyncRead);
      this.asyncRead = null;

      if (!this.doneWriting)
      {
        this.doneWriting = true;
        this.push(this.progress());
      }
    }

    this.writer.end(callback);
  }

  public progress()
  {
    return JSON.stringify({
      successful: this.count,
      failed: this.errors,
    }) + '\n';
  }

}
