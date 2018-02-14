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
import * as _ from 'lodash';
import * as stream from 'stream';

import { Permissions } from '../permissions/Permissions';
import * as Util from '../Util';
import { Export, ExportConfig } from './Export';
import { Sources } from './sources/Sources';
import * as Auth from './templates/Authenticate';
import ExportTemplateRouter from './templates/ExportTemplateRouter';

const Router = new KoaRouter();
export const exprt: Export = new Export();
const perm: Permissions = new Permissions();

Router.use('/templates', ExportTemplateRouter.routes(), ExportTemplateRouter.allowedMethods());

Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const requestObj: object = JSON.parse(ctx.request.body.data).body;
  Util.verifyParameters(requestObj, ['columnTypes', 'dbid', 'filetype', 'query', 'rank', 'transformations']);
  const exprtConf: ExportConfig = requestObj as ExportConfig;

  await perm.ImportPermissions.verifyExportRoute(ctx.state.user, requestObj);

  const exportReturn: stream.Readable | string = await exprt.export(exprtConf, false);

  ctx.type = 'text/plain';
  ctx.attachment(ctx.request.body.filename);
  ctx.body = exportReturn;
});

Router.post('/types', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const typeObj: object = ctx.request.body.body;
  Util.verifyParameters(typeObj, ['dbid', 'query']);
  ctx.body = await exprt.getNamesAndTypesFromQuery(typeObj['dbid'], typeObj['query']);
});

Router.post('/headless', async (ctx, next) =>
{
  const exprtConf: ExportConfig = ctx.request.body.body;
  const authStream: object = await Auth.authenticatePersistentAccessToken(ctx.request.body);
  if (authStream['template'] === null)
  {
    ctx.body = 'Unauthorized';
    ctx.status = 400;
    return;
  }
  Util.verifyParameters(exprtConf, ['templateId']);

  if (exprtConf.templateId !== authStream['template']['id'])
  {
    ctx.body = 'Authenticating template ID does not match export template ID.';
  }
  else
  {
    ctx.body = await exprt.export(exprtConf, true);
  }
});

Router.get('/headless', async (ctx, next) =>
{
  const authStream: object = await Auth.authenticatePersistentAccessToken(ctx.request.query);
  if (authStream['template'] === null)
  {
    ctx.body = 'Unauthorized';
    ctx.status = 400;
    return;
  }
  const queryBody: object = _.extend({}, ctx.request.query);
  delete queryBody['persistentAccessToken'];
  Object.keys(queryBody).map((key) =>
  {
    try
    {
      queryBody[key] = JSON.parse(queryBody[key]);
    }
    catch (e)
    {
      // ignore
    }
  });
  const exprtConf: ExportConfig = queryBody as ExportConfig;

  if (exprtConf.templateId !== authStream['template']['id'])
  {
    ctx.body = 'Authenticating template ID does not match export template ID.';
  }
  else
  {
    ctx.body = await exprt.export(exprtConf, true);
  }
});

export default Router;
