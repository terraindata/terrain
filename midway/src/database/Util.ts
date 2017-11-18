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

import ElasticConfig from '../database/elastic/ElasticConfig';
import ElasticController from '../database/elastic/ElasticController';

import MySQLConfig from '../database/mysql/MySQLConfig';
import MySQLController from '../database/mysql/MySQLController';

import PostgreSQLConfig from '../database/pg/PostgreSQLConfig';
import PostgreSQLController from '../database/pg/PostgreSQLController';

import SQLiteConfig from '../database/sqlite/SQLiteConfig';
import SQLiteController from '../database/sqlite/SQLiteController';

export function DSNToConfig(type: string, dsnString: string): SQLiteConfig | MySQLConfig | ElasticConfig | undefined
{
  if (type === 'sqlite')
  {
    return {
      filename: dsnString,
    } as SQLiteConfig;
  }
  else if (type === 'mysql' || type === 'postgres' || type === 'pg')
  {
    const idx = dsnString.lastIndexOf('@');
    const h0 = dsnString.substr(0, idx);
    const h1 = dsnString.substr(idx + 1, dsnString.length - idx);
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

    return {
      user,
      password,
      host,
      port,
    } as MySQLConfig;
  }
  else if (type === 'elasticsearch' || type === 'elastic')
  {
    return {
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

export function makeDatabaseController(
  type: string,
  dsnString: string,
  analyticsIndex?: string,
  analyticsType?: string): SQLiteController | MySQLController | ElasticController | PostgreSQLController
{
  type = type.toLowerCase();
  if (type === 'sqlite')
  {
    const config = DSNToConfig(type, dsnString) as SQLiteConfig;
    return new SQLiteController(config, 0, 'SQLite');
  }
  else if (type === 'mysql')
  {
    const config = DSNToConfig(type, dsnString) as MySQLConfig;
    return new MySQLController(config, 0, 'MySQL');
  }
  else if (type === 'postgresql' || type === 'pg')
  {
    const config = DSNToConfig(type, dsnString) as PostgreSQLConfig;
    return new PostgreSQLController(config, 0, 'PostgreSQL');
  }
  else if (type === 'elasticsearch' || type === 'elastic')
  {
    const config = DSNToConfig(type, dsnString) as ElasticConfig;
    return new ElasticController(config, 0, 'Elastic', analyticsIndex, analyticsType);
  }
  else
  {
    throw new Error('Error making new database controller.');
  }
}
