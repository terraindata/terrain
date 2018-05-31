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

import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';
import * as winston from 'winston';

import * as Util from '../../AppUtil';
import ExportTemplateConfig from './ExportTemplateConfig';
import { ExportTemplates } from './ExportTemplates';

const Router = new KoaRouter();
export const exportTemplates = new ExportTemplates();

Router.get('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting all exportTemplates');
  ctx.body = await exportTemplates.get();
});

Router.get('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting template ID ' + String(ctx.params.id));
  ctx.body = await exportTemplates.get(Number(ctx.params.id));
});

Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting filtered exportTemplates');
  const request: object = ctx.request.body.body;
  const filter: object = {};
  if (request !== undefined)
  {
    if (request['dbid'] !== undefined)
    {
      filter['dbid'] = request['dbid'];
    }
    if (request['dbname'] !== undefined)
    {
      filter['dbname'] = request['dbname'];
    }
    if (request['tablename'] !== undefined)
    {
      filter['tablename'] = request['tablename'];
    }
    if (request['exportOnly'] === true)
    {
      filter['export'] = true;
    }
    if (request['importOnly'] === true)
    {
      throw new Error('Only export is allowed.');
    }
    if (request['importOnly'] === true && request['exportOnly'] === true)
    {
      throw new Error('Only export is allowed.');
    }
  }
  ctx.body = await exportTemplates.select([], filter);
});

Router.post('/create', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('add new template');
  const template: ExportTemplateConfig = ctx.request.body.body;
  Util.verifyParameters(template, ['dbid', 'dbname', 'name', 'tablename']);
  Util.verifyParameters(template, ['columnTypes', 'originalNames', 'primaryKeys', 'transformations']);
  if (template.id !== undefined)
  {
    throw new Error('Invalid parameter template ID');
  }
  ctx.body = await exportTemplates.upsert(ctx.state.user, template);
});

Router.post('/updateAccessToken', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('update access token');
  const templateObj: object = ctx.request.body.body;
  if (templateObj['id'] === undefined)
  {
    throw new Error('Invalid parameter template ID');
  }
  ctx.body = await exportTemplates.updateAccessToken(ctx.state.user, templateObj['id']);
});

Router.post('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('editing existing template');
  const template: ExportTemplateConfig = ctx.request.body.body;
  if (template['id'] === undefined)
  {
    template['id'] = Number(ctx.params.id);
  }
  else
  {
    if (template['id'] !== Number(ctx.params.id))
    {
      throw new Error('Template ID does not match the supplied id in the URL.');
    }
  }

  ctx.body = await exportTemplates.upsert(ctx.state.user, template);
});

Router.post('/delete/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('deleting template');
  ctx.body = await exportTemplates.delete(ctx.state.user, ctx.params.id);
});

export default Router;
