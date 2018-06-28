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
import { Readable, Transform, Writable } from 'stream';
import * as winston from 'winston';

import { SafeWritable } from './SafeWritable';
/**
 * A log stream
 */
export default class LogStreamWritable extends SafeWritable
{
  private buffers: string[];
  private abortThreshold: number;
  private errorCount: number;
  private count: number;

  constructor(abortThreshold: number = 1000, initialCount = 1)
  {
    super({ objectMode: true });

    this.count = initialCount;

    this.on('pipe', (src) =>
    {
      this.increment();
    });
  }

  public push(chunk: any, encoding?: string): boolean
  {
    if (chunk === null)
    {
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

  public decrement()
  {
    console.log('Decrement BEFORE ', this.count);
    this.count--;
    console.log('Decrement AFTER ', this.count);
    if (this.count === 0)
    {
      this.push(null);
    }
  }

  public increment()
  {
    console.log('INCREMENT BEFORE ', this.count);
    this.count++;
    console.log('INCREMENT AFTER ', this.count);
  }
}
