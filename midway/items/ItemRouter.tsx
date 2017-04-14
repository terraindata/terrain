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

import Items from './Items';

const Router = new KoaRouter();

Router.get('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  // return all items, or item by id
  winston.info('item root');
  ctx.body = 'item root as ' + ctx.state.user.username;
  ctx.body = Items.getAll();
});

// Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
// {
//   // change an item
//   console.log(ctx.state.authInfo);
//   winston.info('item root');
//   ctx.body = 'item root as ' + ctx.state.user.username;
// });

Router.get('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  // get item by ID
  winston.info('item root');
  let items = Items.find(ctx.params.id);
  ctx.body = items;
});

Router.post('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  // get item by ID
  winston.info('item root');
  let req = ctx.state.authInfo;

  let items = Items.find(ctx.params.id);
  // createOrUpdate(ctx.params.id);
  // if (ctx.state.user.isAdmin && (items && items.length === 0))
  // {
  //   Items.create()
  // }
  let newItem =
  {
    id: ctx.params.id,
    key0: ctx.req,
    key1: ctx.req,
  };
  // let items = Items.replace(ctx.params.id, newItem);
  ctx.body = items;
});

export default Router;
