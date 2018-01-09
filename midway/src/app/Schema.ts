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
import * as Tasty from '../tasty/Tasty';

const appSchemaSQL = (datetimeTypeName: string, falseValue: string, stringTypeName: string, primaryKeyType: string) => [
  `CREATE TABLE IF NOT EXISTS versions
    (id ` + primaryKeyType + ` PRIMARY KEY,
     objectType text NOT NULL,
     objectId integer NOT NULL,
     object text NOT NULL,
     createdAt ` + datetimeTypeName + ` DEFAULT CURRENT_TIMESTAMP,
     createdByUserId integer NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS items
    (id ` + primaryKeyType + ` PRIMARY KEY,
     meta text,
     name text NOT NULL,
     parent integer,
     status text,
     type text);`,
  `CREATE TABLE IF NOT EXISTS databases
    (id ` + primaryKeyType + ` PRIMARY KEY,
     name text NOT NULL,
     type text NOT NULL,
     dsn text NOT NULL,
     host text NOT NULL,
     status text,
     isAnalytics bool DEFAULT ` + falseValue + `,
     analyticsIndex text,
     analyticsType text);`,
  `CREATE TABLE IF NOT EXISTS users
    (id ` + primaryKeyType + ` PRIMARY KEY,
     accessToken text NOT NULL,
     email text NOT NULL,
     isDisabled bool NOT NULL DEFAULT false,
     isSuperUser bool NOT NULL DEFAULT false,
     name text NOT NULL,
     oldPassword text,
     password text NOT NULL,
     timezone ` + stringTypeName + `,
     meta text);`,
  `CREATE TABLE IF NOT EXISTS exportTemplates
    (id ` + primaryKeyType + ` PRIMARY KEY,
     name text,
     dbid integer NOT NULL,
     dbname text NOT NULL,
     tablename text NOT NULL,
     objectKey ` + stringTypeName + ` NOT NULL,
     originalNames text NOT NULL,
     columnTypes text NOT NULL,
     persistentAccessToken text NOT NULL,
     primaryKeyDelimiter text,
     primaryKeys text NOT NULL,
     rank bool NOT NULL,
     transformations text NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS importTemplates
    (id ` + primaryKeyType + ` PRIMARY KEY,
     name text,
     dbid integer NOT NULL,
     dbname text NOT NULL,
     tablename text NOT NULL,
     originalNames text NOT NULL,
     columnTypes text NOT NULL,
     persistentAccessToken text NOT NULL,
     primaryKeyDelimiter text,
     primaryKeys text NOT NULL,
     transformations text NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS schedules
    (id ` + primaryKeyType + ` PRIMARY KEY,
     active bool NOT NULL,
     archived bool NOT NULL,
     currentlyRunning bool NOT NULL,
     name text NOT NULL,
     jobId integer NOT NULL,
     jobType text NOT NULL,
     paramsScheduleStr text,
     schedule text NOT NULL,
     sort text NOT NULL,
     transportStr text);`,
  `CREATE TABLE IF NOT EXISTS credentials
    (id ` + primaryKeyType + ` PRIMARY KEY,
     createdBy integer NOT NULL,
     meta text NOT NULL,
     name text NOT NULL,
     permissions integer,
     type text NOT NULL); `,
  `CREATE TABLE IF NOT EXISTS metrics
    (id ` + primaryKeyType + ` PRIMARY KEY,
     database integer NOT NULL,
     label text NOT NULL,
     events text NOT NULL); `,
];

export async function createAppSchema(dbtype: string, tasty: Tasty.Tasty)
{
  if (dbtype === 'sqlite' || dbtype === 'mysql')
  {
    return tasty.getDB().execute(appSchemaSQL('datetime', '0', 'string', 'integer'));
  }
  else if (dbtype === 'postgres')
  {
    return tasty.getDB().execute(appSchemaSQL('timestamp with time zone', 'false', 'varchar(255)', 'serial'));
  }
  else
  {
    winston.warn('Auto-provisioning of app schema not supported for DB of type ' + dbtype);
  }
}

export default createAppSchema;
