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
import Items from './Items';
import { IItemConfig as ItemConfig } from './Items';

const Router = new KoaRouter();

Router.get('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting all items');
  ctx.body = await Items.getAll();
});

Router.get('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting item ID ' + ctx.params.id);
  let items = await Items.find(ctx.params.id);
  ctx.body = items;
});

Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  // if admin can change existing item, otherwise don't change
  // can only create items or modify build status items as regular user
  // get item by ID
  winston.info('create/modify items');
  let req = ctx.state.authInfo;
  delete req.id;
  delete req.accessToken;
  let returnStatus = 'Incorrect parameters';
  let items = await Items.find(ctx.state.authInfo.itemId);
  if (ctx.state.user.isSuperUser
    || !(items && items.length === 0)
    || (items && items.length !== 0 && items[0].status === 'build'))
  {
    // define which other parameters need to be present for create/update
    if (req.parentItemId !== undefined && req.name !== undefined)
    {
      returnStatus = await Util.createOrUpdate(Items, req);
    }
  }
  ctx.body = returnStatus;
});

export default Router;
