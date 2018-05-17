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

import * as Util from '../Util';
import ItemConfig from './ItemConfig';
import Items from './Items';
export * from './Items';

const Router = new KoaRouter();
export const items: Items = new Items();

Router.get('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  let getItems: ItemConfig[] = [];
  if (ctx.query.type !== undefined)
  {
    const typeArr: string[] = ctx.query.type.split(',');
    for (const type of typeArr)
    {
      getItems = getItems.concat(await items.select([], { type }));
    }
  }
  else
  {
    winston.info('getting all items');
    getItems = await items.get();
  }
  ctx.body = getItems;
});

Router.get('/live', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  let typeArr: number[] = [];
  if (ctx.query.ids !== undefined)
  {
    typeArr = ctx.query.ids.split(',').map((val) =>
    {
      const parsed: number = parseInt(val as string, 10);
      if (isNaN(parsed))
      {
        throw new Error('Invalid input format for ids');
      }
      return parsed;
    });
  }
  ctx.body = JSON.stringify(await items.getLiveAlgorithms(typeArr));
});

Router.get('/live/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const status: string = await items.checkAlgorithmInES(
    ctx.params.id,
    parseInt(ctx.query.dbid as string, 10),
    String(ctx.query.deployedName),
  );
  ctx.body = JSON.stringify(status);
});

Router.get('/status/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting status from DB ID ' + String(ctx.params.id));
  ctx.body = await items.checkStatusAlgorithms(parseInt(ctx.params.id, 10));
});

Router.get('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting item ID ' + String(ctx.params.id));
  ctx.body = await items.get(ctx.params.id);
});

Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('create items');
  const item: ItemConfig = ctx.request.body.body;
  Util.verifyParameters(item, ['name']);
  if (item.id !== undefined)
  {
    throw new Error('Invalid parameter item ID');
  }

  ctx.body = await items.upsert(ctx.state.user, item);
});

Router.post('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('modify items');
  const item: ItemConfig = ctx.request.body.body;
  Util.verifyParameters(item, ['name']);
  if (item.id === undefined)
  {
    item.id = Number(ctx.params.id);
  }
  else
  {
    if (item.id !== Number(ctx.params.id))
    {
      throw new Error('Item ID does not match the supplied id in the URL');
    }
  }

  ctx.body = await items.upsert(ctx.state.user, item);
});

export default Router;
