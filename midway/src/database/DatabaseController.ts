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

import * as winston from 'winston';

import { DatabaseConfig } from '../app/database/DatabaseConfig';
import QueryHandler from '../app/query/QueryHandler';
import * as Tasty from '../tasty/Tasty';
import DatabaseControllerStatus from './DatabaseControllerStatus';

/**
 * An client which acts as a selective isomorphic wrapper around
 * the sqlite3 API
 */
abstract class DatabaseController
{
  private id: number;                       // unique id
  private lsn: number;                      // log sequence number
  private type: string;                     // connection type
  private name: string;                     // connection name
  private header: string;                   // log entry header
  private config: DatabaseConfig;           // database configuration
  private status: DatabaseControllerStatus; // controller status

  constructor(type: string, id: number, name: string)
  {
    this.id = id;
    this.lsn = -1;
    this.type = type;
    this.name = name;
    this.header = 'DB:' + this.id.toString() + ':' + this.name + ':' + this.type + ':';
    this.config = null;
    this.status = DatabaseControllerStatus.UNKNOWN;
  }

  public log(methodName: string, info?: any, moreInfo?: any)
  {
    const header = this.header + (++this.lsn).toString() + ':' + methodName;
    winston.info(header);
    if (info !== undefined)
    {
      winston.debug(header + ': ' + JSON.stringify(info, null, 1));
    }
    if (moreInfo !== undefined)
    {
      winston.debug(header + ': ' + JSON.stringify(moreInfo, null, 1));
    }
  }

  public getID(): number
  {
    return this.id;
  }

  public getType(): string
  {
    return this.type;
  }

  public getName(): string
  {
    return this.name;
  }

  public getStatus(): DatabaseControllerStatus
  {
    return this.status;
  }

  public getConfig(): DatabaseConfig
  {
    return this.config;
  }

  public setConfig(config: DatabaseConfig)
  {
    this.config = config;
  }

  public setStatus(status: DatabaseControllerStatus)
  {
    this.status = status;
  }

  public abstract getClient();

  public abstract getTasty(): Tasty.Tasty;

  public abstract getQueryHandler(): QueryHandler;

  public abstract getAnalyticsDB();
}

export default DatabaseController;
