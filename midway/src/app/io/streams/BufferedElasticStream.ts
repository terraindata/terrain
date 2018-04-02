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

import ElasticClient from '../../../database/elastic/client/ElasticClient';
import { ElasticStream } from '../../../database/elastic/query/ElasticStream';
import SafeReadable from './SafeReadable';

/**
 * A buffered ElasticStream source
 */
export default class BufferedElasticStream extends SafeReadable
{
  public maxBufferSize: number = 8;
  public buffer: object[] = [];

  private query: any;
  private stream: SafeReadable;

  private _shouldContinue: boolean = true;
  private _isSourceEmpty: boolean = false;

  private _onBufferFull: (buffer: object[]) => void;
  private _onRead: () => void;
  private _onError: (e: any) => void;
  private _onEnd: () => void;

  constructor(client: ElasticClient, query: any, onBufferFull: (buffer: object[]) => void, size: number = 8)
  {
    super({
      objectMode: true,
    });

    this.query = query;
    this.stream = new ElasticStream(client, query);
    this.maxBufferSize = size;

    this._onBufferFull = onBufferFull;
    this._onRead = this.readStream.bind(this);
    this._onError = (e) => this.emit('error', e);
    this._onEnd = this._final.bind(this);

    this.stream.on('readable', this._onRead);
    this.stream.on('error', this._onError);
    this.stream.on('end', this._onEnd);
  }

  public _read(): void
  {
    if (!this._isSourceEmpty
      && this.buffer.length < this.maxBufferSize)
    {
      this._shouldContinue = true;
    }
  }

  public _destroy(error, callback)
  {
    this._final(callback);
  }

  public _final(callback)
  {
    this.stream.removeListener('readable', this._onRead);
    this.stream.removeListener('error', this._onError);
    this.stream.removeListener('end', this._onEnd);

    this._shouldContinue = false;
    this._isSourceEmpty = true;

    if (callback !== undefined)
    {
      callback();
    }
  }

  public resetBuffer(): any[]
  {
    const buffer = this.buffer;
    this.buffer = [];
    this._shouldContinue = true;
    return buffer;
  }

  public isEmpty(): boolean
  {
    return this._isSourceEmpty && (this.buffer.length === 0);
  }

  private readStream(): void
  {
    // should we keep reading from the source streams?
    if (!this._shouldContinue)
    {
      return;
    }

    // if yes, keep buffering inputs from the source stream
    const obj = this.stream.read();
    if (obj === null)
    {
      this._isSourceEmpty = true;
    }
    else
    {
      this.buffer.push(obj);
    }

    // if we have data buffered up to maxBufferSize, swap the buffer list out
    // and dispatch the onBufferFull callback
    if (this.buffer.length >= this.maxBufferSize ||
      this._isSourceEmpty && this.buffer.length > 0)
    {
      const buffer = this.resetBuffer();
      this._onBufferFull(buffer);
    }
  }
}
