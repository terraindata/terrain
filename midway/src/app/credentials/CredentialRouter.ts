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

// NB: This router only exists for testing purposes.
// If using a proxy, be sure to set app.proxy = true

import * as passport from 'koa-passport';
import * as KoaRouter from 'koa-router';
import * as Util from '../AppUtil';
import { Permissions } from '../permissions/Permissions';
import { UserConfig } from '../users/UserConfig';
import CredentialConfig from './CredentialConfig';
import Credentials from './Credentials';

const Router = new KoaRouter();
export const credentials: Credentials = new Credentials();
const perm: Permissions = new Permissions();

Router.get('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  if (ctx.request.ip !== '::1' && ctx.request.ip !== '::ffff:127.0.0.1')
  {
    ctx.body = 'Unauthorized';
  }
  else
  {
    ctx.body = await credentials.get();
  }
});

// Get connections from credentials table, requires type=<one of allowedTypes>
Router.get('/credentials', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  await perm.CredentialPermissions.verifyPermission(ctx.state.user as UserConfig, ctx.req);
  ctx.body = await credentials.getNames(ctx.query.type);
});

Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  if (ctx.request.ip !== '::1' && ctx.request.ip !== '::ffff:127.0.0.1')
  {
    ctx.body = 'Unauthorized';
  }
  else
  {
    const cred: CredentialConfig = ctx.request.body.body;
    Util.verifyParameters(cred, ['name', 'type', 'meta']);
    ctx.body = await credentials.upsert(ctx.state.user, cred);
  }
});

export default Router;
