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

import * as asyncBusboy from 'async-busboy';
import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';
import * as stream from 'stream';

import { SinkConfig, SourceConfig } from '../../../../shared/etl/types/EndpointTypes';
import * as Util from '../AppUtil';
import BufferTransform from '../io/streams/BufferTransform';
import { Permissions } from '../permissions/Permissions';
import { users } from '../users/UserRouter';
import { getSourceStream } from './SourceSinkStream';
import TemplateRouter, { templates } from './TemplateRouter';

const Router = new KoaRouter();
const perm: Permissions = new Permissions();

Router.use('/templates', TemplateRouter.routes(), TemplateRouter.allowedMethods());

Router.post('/execute', async (ctx, next) =>
{
  const { fields, files } = await asyncBusboy(ctx.req);

  Util.verifyParameters(fields, ['id', 'accessToken']);
  const user = await users.loginWithAccessToken(Number(fields['id']), fields['accessToken']);
  if (user === null)
  {
    ctx.body = 'Unauthorized';
    ctx.status = 400;
    return;
  }

  if (fields['template'] !== undefined)
  {
    const template = JSON.parse(fields['template']);
    ctx.body = await templates.execute(template, files);
  }
  else if (fields['templateID'] !== undefined)
  {
    const templateID = Number(fields['templateID']);
    ctx.body = await templates.executeById(templateID, files);
  }
  else
  {
    throw new Error('Missing template or template ID parameter.');
  }
});

interface ETLUIPreviewConfig
{
  source: SourceConfig;
  size?: number;
}

Router.post('/preview', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const request: ETLUIPreviewConfig = ctx.request.body.body;
  Util.verifyParameters(request, ['source']);

  const source: SourceConfig = request.source;
  // it's not possible to get a preview of sources of "Upload" type
  if (source.type === 'Upload')
  {
    throw new Error('Preview of "Upload" sources is not allowed');
  }

  if (request.size === undefined)
  {
    request.size = 100;
  }

  // get a preview up to "size" rows from the specified source
  const sourceStream: stream.Readable = await getSourceStream('preview', source);
  ctx.body = JSON.stringify(await BufferTransform.toArray(sourceStream, request.size));
});

export default Router;
