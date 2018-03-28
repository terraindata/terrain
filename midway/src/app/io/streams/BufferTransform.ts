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

import { Readable } from 'stream';

/**
 * Consumes an input source stream and turns it into an array
 */
export default class BufferTransform
{
  public static toArray(stream: Readable): Promise<any[]>
  {
    return new Promise<any[]>((resolve, reject) =>
    {
      const bufferTransform = new BufferTransform(stream,
        (err, arr) =>
        {
          if (err !== null || err !== undefined)
          {
            reject(err);
          }
          else
          {
            resolve(arr);
          }
        });
    });
  }

  private arr: any[];
  private stream: Readable;
  private callback: (err, arr) => void;

  private _onData: (doc) => void;
  private _onEvent: (err) => void;

  constructor(stream: Readable, callback: (err: Error, arr: any[]) => void)
  {
    this.arr = [];
    this.stream = stream;
    this.callback = callback;

    this._onData = this.onData.bind(this);
    this._onEvent = this.onEvent.bind(this);

    this.stream.on('data', this._onData);
    this.stream.on('end', this._onEvent);
    this.stream.on('error', this._onEvent);
    this.stream.on('close', this._onEvent);
  }

  private onData(doc: any): void
  {
    this.arr.push(doc);
  }

  private onEvent(err: any): void
  {
    this._final();
    this.callback(err, this.arr);
  }

  private _final(): void
  {
    this.stream.removeListener('data', this._onData);
    this.stream.removeListener('end', this._onEvent);
    this.stream.removeListener('error', this._onEvent);
    this.stream.removeListener('close', this._onEvent);
  }
}
