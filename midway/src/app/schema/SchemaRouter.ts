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

import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';
import * as winston from 'winston';

import DatabaseController from '../../database/DatabaseController';
import ElasticDB from '../../database/elastic/tasty/ElasticDB';
import DatabaseRegistry from '../../databaseRegistry/DatabaseRegistry';
import { Permissions } from '../permissions/Permissions';

import * as Tasty from '../../tasty/Tasty';
import * as Util from '../Util';

const Router = new KoaRouter();
const perm: Permissions = new Permissions();

async function getSchema(databaseID: number): Promise<string>
{
  const database: DatabaseController | undefined = DatabaseRegistry.get(databaseID);
  if (database === undefined)
  {
    throw new Error('Database "' + databaseID.toString() + '" not found.');
  }
  const schema: Tasty.Schema = await database.getTasty().schema();
  return schema.toString();
}

async function deleteElasticIndex(dbid: number, dbname: string)
{
  const database: DatabaseController | undefined = DatabaseRegistry.get(dbid);
  if (database === undefined)
  {
    throw new Error('Database "' + dbid.toString() + '" not found.');
  }

  winston.info(`Deleting Elastic Index ${dbname} of database ${dbid}`);
  const elasticDb = database.getTasty().getDB() as ElasticDB;
  await elasticDb.deleteIndex(dbname);
  winston.info(`Deleted Elastic Index ${dbname} of database ${dbid}`);

  return 'ok';
}

Router.get('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting all schema');
  const request = ctx.request.body.body;
  if (request !== undefined && request.database !== undefined)
  {
    ctx.body = await getSchema(request.database);
  }
  else
  {
    ctx.body = '';
    // tslint:disable-next-line:no-unused-variable
    for (const [id, database] of DatabaseRegistry.getAll())
    {
      ctx.body += await getSchema(id);
    }
  }
});

Router.get('/:database', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('get schema');
  ctx.body = await getSchema(ctx.params.database);
});

Router.post('/database/delete', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const params = ctx.request.body.body;
  Util.verifyParameters(params, ['language', 'dbname', 'dbid']);
  await perm.ImportPermissions.verifyDefaultRoute(ctx.state.user, params);
  switch (params.language)
  {
    case 'elastic':
      await deleteElasticIndex(params.dbid, params.dbname);
      break;
    default:
      throw new Error(`Deleting database of type '${params.language}' is unsupported`);
  }
  ctx.body = { message: 'successfully deleted database' };
});

export default Router;
