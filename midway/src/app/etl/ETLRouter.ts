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
import * as stream from 'stream';

import { SourceConfig } from 'shared/etl/types/EndpointTypes';
import * as Util from '../AppUtil';
import BufferTransform from '../io/streams/BufferTransform';
import { Permissions } from '../permissions/Permissions';
import StreamUtil from './pathselector/StreamUtil';
import { getSourceStream, getSourceStreamPreview } from './SourceSinkStream';
import * as TemplateRouter from './TemplateRouter';

const Router = new KoaRouter();
const perm: Permissions = new Permissions();
export const initialize = () => TemplateRouter.initialize();

Router.use('/templates', TemplateRouter.default.routes(), TemplateRouter.default.allowedMethods());

interface ETLUIPreviewConfig
{
  source: SourceConfig;
  size?: number;
  fileString?: string;
  rawString?: boolean;
}

Router.post('/preview', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const request: ETLUIPreviewConfig = ctx.request.body['body'];
  const previewName = 'preview';

  Util.verifyParameters(request, ['source']);

  const source: SourceConfig = request.source;
  const files = [];
  if (source.type === 'Upload')
  {
    if (request.fileString === undefined)
    {
      throw new Error('Preview of Upload sources require a filestring');
    }
    const mockStream = new stream.Readable();
    mockStream.push(request.fileString);
    mockStream.push(null);
    mockStream['fieldname'] = previewName;
    files.push(mockStream);
  }

  if (request.size === undefined)
  {
    request.size = 100;
  }

  // get a preview up to "size" rows from the specified source
  try
  {
    const sourceStreamPreview: any = await getSourceStreamPreview(previewName, source, files, request.size, request.rawString);
    if (request.rawString === true)
    {
      let parsedString;
      try
      {
        parsedString = JSON.parse(sourceStreamPreview);
      }
      catch (e)
      {
        parsedString = StreamUtil.formatJsonString(sourceStreamPreview);
      }
      ctx.body = {
        result: parsedString,
      };
    }
    else
    {
      ctx.body = sourceStreamPreview;
    }
  }
  catch (e)
  {
    throw new Error('Source stream preview was not received');
  }
});

export default Router;
