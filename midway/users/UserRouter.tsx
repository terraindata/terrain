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

import Util from '../Util';
import { UserConfig, Users } from './Users';

const Router = new KoaRouter();

Router.get('/', async (ctx, next) =>
{
  ctx.body = '';
  winston.info('user root');
});

Router.post('/', async (ctx, next) =>
{
  ctx.body = '';
  winston.info('user post');
});

Router.post('/:id/update', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  // update user, must be super user or authenticated user updating own info
  winston.info('user update');
  let returnStatus: any = 'Incorrect parameters';
  const req = ctx.state.authInfo;
  if (!req['body'])
  {
    ctx.body = 'Fields required';
  }
  else
  {
    req['body']['id'] = ctx.params.id;
    req['callingUser'] = ctx.state.user;
    // if superuser or id to be updated is current user
    if (ctx.state.user.isSuperUser || ctx.state.authInfo.id === req['body']['id'])
    {
      returnStatus = await Users.createOrUpdate(req);
    }
    // TODO revise this once error handling is implemented in Tasty
    if (returnStatus instanceof Array)
    {
      ctx.body = 'Success';
    }
    else {
      ctx.body = returnStatus;
    }
  }
});

Router.post('/create', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  // create a user, must be admin
  winston.info('create user');
  const req = ctx.state.authInfo;
  let returnStatus: any = 'Incorrect parameters';
  if (!req.body)
  {
    ctx.body = 'Fields required';
  }
  else
  {
    if (req.body && req.body['id'])
    {
      delete req.body['id'];
    }
    if (ctx.state.user.isSuperUser)
    {
      // define which other parameters need to be present for create/update
      returnStatus = await Users.createOrUpdate(req);
    }
    // TODO revise this once error handling is implemented in Tasty
    if (returnStatus instanceof Array)
    {
      ctx.body = 'Success';
    }
    else {
      ctx.body = returnStatus;
    }
  }
});

export default Router;
