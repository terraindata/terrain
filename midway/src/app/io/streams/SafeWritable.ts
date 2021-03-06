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

import { Writable, WritableOptions } from 'stream';

/**
 * A safe writable stream wrapper
 */
export class SafeWritable extends Writable
{
  constructor(opts?: WritableOptions)
  {
    super(opts);

    // emit all caught errors
    this.on('error', this.emit);
  }

  public _write(chunk: any, encoding: string, callback: (err?: Error) => void): void
  {
    try
    {
      super._write(chunk, encoding as BufferEncoding, callback);
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public _writev(chunks: Array<{ chunk: any, encoding: BufferEncoding }>, callback: (err?: Error) => void): void
  {
    try
    {
      super._writev(chunks, callback);
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public _destroy(error: Error, callback: any)
  {
    if (error !== null && error !== undefined)
    {
      this.emit('error', error);
      return;
    }

    try
    {
      super._destroy(error, this.makeSafe(callback));
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public _final(callback: any)
  {
    try
    {
      super._final(this.makeSafe(callback));
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public addListener(event: string, listener: (...args: any[]) => void): this
  {
    try
    {
      return super.addListener(event, this.makeSafe(listener, event));
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public prependListener(event: string, listener: (...args: any[]) => void): this
  {
    try
    {
      return super.prependListener(event, this.makeSafe(listener, event));
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public prependOnceListener(event: string, listener: (...args: any[]) => void): this
  {
    try
    {
      return super.prependOnceListener(event, this.makeSafe(listener, event));
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public removeListener(event: string, listener: (...args: any[]) => void): this
  {
    try
    {
      return super.removeListener(event, this.makeSafe(listener, event));
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public on(event: string, listener: (...args: any[]) => void): this
  {
    try
    {
      return super.on(event, this.makeSafe(listener, event));
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public once(event: string, listener: (...args: any[]) => void): this
  {
    try
    {
      return super.once(event, this.makeSafe(listener, event));
    }
    catch (e)
    {
      this.emit('error', e);
    }
  }

  public makeSafe(listener: (...args: any[]) => void, event?: string): (...args: any[]) => void
  {
    if (event === 'error')
    {
      return listener;
    }

    return (...args: any[]): void =>
    {
      try
      {
        listener(...args);
      }
      catch (e)
      {
        this.emit('error', e);
      }
    };
  }
}

export default SafeWritable;
