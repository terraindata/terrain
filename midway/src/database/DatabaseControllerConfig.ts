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

import DatabaseController from './DatabaseController';

import ElasticConfig from './elastic/ElasticConfig';
import ElasticController from './elastic/ElasticController';

import MySQLConfig from './mysql/MySQLConfig';
import MySQLController from './mysql/MySQLController';

import PostgreSQLConfig from './pg/PostgreSQLConfig';
import PostgreSQLController from './pg/PostgreSQLController';

import SQLiteConfig from './sqlite/SQLiteConfig';
import SQLiteController from './sqlite/SQLiteController';

export class DatabaseControllerConfig
{
  public static makeDatabaseController(
    type: string,
    id: number,
    dsnString: string,
    analyticsIndex?: string,
    analyticsType?: string): DatabaseController
  {
    type = type.toLowerCase();
    const config = new DatabaseControllerConfig(type, dsnString);
    if (type === 'sqlite')
    {
      return new SQLiteController(config.getConfig(), id, 'SQLite');
    }
    else if (type === 'mysql')
    {
      return new MySQLController(config.getConfig(), id, 'MySQL');
    }
    else if (type === 'postgres')
    {
      return new PostgreSQLController(config.getConfig(), id, 'PostgreSQL');
    }
    else if (type === 'elasticsearch' || type === 'elastic')
    {
      return new ElasticController(config.getConfig(), id, 'Elastic', analyticsIndex, analyticsType);
    }
    else
    {
      throw new Error('Error making new database controller: undefined database type "' + type + '".');
    }
  }

  private config: SQLiteConfig | MySQLConfig | ElasticConfig | PostgreSQLConfig;

  constructor(type: string, dsnString: string)
  {
    if (type === 'sqlite')
    {
      this.config = {
        filename: dsnString,
      } as SQLiteConfig;
    }
    else if (type === 'mysql' || type === 'postgres')
    {
      const idx0 = dsnString.lastIndexOf('@');
      const idx1 = dsnString.lastIndexOf('/');
      const end = idx1 > 0 ? idx1 : dsnString.length;
      const h0 = dsnString.substr(0, idx0);
      const h1 = dsnString.substr(idx0 + 1, end);
      const h2 = (idx1 > 0) ? dsnString.substr(idx1 + 1, dsnString.length - idx1) : undefined;
      const q1 = h0.split(':');
      const q2 = h1.split(':');

      if (q1.length !== 2 || q2.length !== 2)
      {
        throw new Error('Error interpreting DSN parameter for MySQL.');
      }

      const user: string = q1[0];
      const password: string = q1[1];
      const host: string = q2[0];
      const port: number = parseInt(q2[1], 10);
      const database: string = (h2 !== undefined && h2 !== '') ? h2 : 'midway';

      this.config = {
        user,
        password,
        host,
        port,
        database,
      };
    }
    else if (type === 'elasticsearch' || type === 'elastic')
    {
      this.config = {
        hosts: [dsnString],
        keepAlive: false,
        requestTimeout: 180000,
      } as ElasticConfig;
    }
    else
    {
      throw new Error('Error parsing database connection parameters.');
    }
  }

  public getConfig(): any
  {
    return this.config;
  }
}

export default DatabaseControllerConfig;
