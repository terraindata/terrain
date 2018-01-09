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

import csvWriter = require('csv-write-stream');

import * as _ from 'lodash';
import * as stream from 'stream';
import * as winston from 'winston';

import { Credentials } from '../../credentials/Credentials';

import * as Tasty from '../../../../src/tasty/Tasty';
import DatabaseController from '../../../database/DatabaseController';
import MySQLClient from '../../../database/mysql/client/MySQLClient';
import DatabaseRegistry from '../../../databaseRegistry/DatabaseRegistry';

export const credentials: Credentials = new Credentials();

let tasty: Tasty.Tasty;

export interface MySQLSourceConfig
{
  id: number;
  tablename: string;
  query: string;
}

export interface MySQLRowConfig
{
  rows: object[];
}

export class MySQL
{

  public async getQueryAsCSVStream(mysqlRowConfig: MySQLRowConfig | string): Promise<stream.Readable | string>
  {
    return new Promise<stream.Readable | string>(async (resolve, reject) =>
    {
      const writer = csvWriter();
      const pass = new stream.PassThrough();
      writer.pipe(pass);
      if (typeof mysqlRowConfig === 'string')
      {
        return resolve(mysqlRowConfig);
      }
      if ((mysqlRowConfig as MySQLRowConfig).rows.length > 0)
      {
        (mysqlRowConfig as MySQLRowConfig).rows.forEach((row) =>
        {
          writer.write(row);
        });
      }
      writer.end();
      resolve(pass);
    });
  }

  public async runQuery(mysqlConfig: MySQLSourceConfig): Promise<MySQLRowConfig | string>
  {
    return new Promise<MySQLRowConfig | string>(async (resolve, reject) =>
    {
      try
      {
        const mysqlRowConfig: MySQLRowConfig =
          {
            rows: [],
          };
        const database: DatabaseController | undefined = DatabaseRegistry.get(mysqlConfig.id);
        if (database !== undefined)
        {
          if (database.getType() !== 'MySQLController')
          {
            return resolve('MySQL source requires a MySQL database ID.');
          }
          tasty = database.getTasty() as Tasty.Tasty;
          mysqlRowConfig.rows = await tasty.getDB().execute([mysqlConfig.query]) as object[];
          resolve(mysqlRowConfig);
        }
        else
        {
          return resolve('Database not found.');
        }
      }
      catch (e)
      {
        resolve((e as any).toString());
      }
    });
  }
}

export default MySQL;
