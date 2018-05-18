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

import { Readable, Transform, Writable } from 'stream';
import * as winston from 'winston';

/**
 * A log stream
 */
export default class LogStream extends Readable
{
  private buffers: string[];
  private abortThreshold: number;
  private errorCount: number;

  constructor(abortThreshold: number = 1000)
  {
    super();

    this.buffers = [];
    this.abortThreshold = abortThreshold;
    this.errorCount = 0;
  }

  public _read(size?: number)
  {
    this.drainLog();
  }

  public _destroy(error, callback)
  {
    this.drainLog();
    callback();
  }

  public push(chunk: any, encoding?: string): boolean
  {
    if (chunk === null)
    {
      this.drainLog();
      return super.push(null);
    }

    const logMsg = {
      timestamp: new Date(),
      level: 'info',
      message: '',
    };

    try
    {
      const c = JSON.parse(chunk);
      if (c.timestamp !== undefined)
      {
        logMsg.timestamp = c.timestamp;
      }

      if (c.level !== undefined)
      {
        logMsg.level = c.level;
      }

      if (c.message !== undefined)
      {
        logMsg.message = c.message;
      }
    }
    catch (e)
    {
      logMsg.message = chunk;
    }

    return super.push(JSON.stringify(logMsg), encoding);
  }

  public addStream(stream: Readable | Writable | Transform)
  {
    stream.on('error', (e: Error) =>
    {
      this.errorCount++;

      if (this.errorCount >= this.abortThreshold)
      {
        this.drainLog();
        this.emit('error', e);
        stream.destroy(e);
        return;
      }

      this.log(e.toString());
    });
  }

  public addStreams(...streams: Array<Readable | Writable | Transform>): void
  {
    for (const stream of streams)
    {
      this.addStream(stream);
    }
  }

  public log(message: string, level: string = 'info')
  {
    const timestamp = new Date();
    const msg: string = level + ':' + message;
    if (level === 'warn')
    {
      winston.warn(msg);
    }
    else if (level === 'error')
    {
      winston.error(msg);
    }
    else
    {
      winston.info(msg);
    }

    this.buffers.push(JSON.stringify({
      timestamp,
      level,
      message,
    }));
  }

  public info(message: string)
  {
    this.log(message, 'info');
  }

  public warn(message: string)
  {
    this.log(message, 'warn');
  }

  public error(message: string)
  {
    this.log(message, 'error');
  }

  private drainLog()
  {
    let buffer = this.buffers.shift();
    while (buffer !== undefined)
    {
      this.push(buffer);
      buffer = this.buffers.shift();
    }
  }
}
