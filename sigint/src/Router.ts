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

import * as fs from 'fs';
import jsurl = require('jsurl');
import * as KoaRouter from 'koa-router';
import * as _ from 'lodash';
import stringHash = require('string-hash');

import { Config } from './Config';
import { EventConfig, Events } from './Events';

export class Router
{
  private router: KoaRouter;
  private appRouter: KoaRouter;
  private events: Events;

  constructor(config: Config)
  {
    this.router = new KoaRouter();
    this.events = new Events(config);

    this.router.post('/', async (ctx, next) =>
    {
      await this.storeEvent(ctx.request);
      ctx.body = '';
    });

    this.router.get('/', async (ctx, next) =>
    {
      await this.storeEvent(ctx.request);
      ctx.body = '';
    });

    this.appRouter = new KoaRouter();
    this.appRouter.get('/bundle.js', async (ctx, next) =>
    {
      ctx.type = 'js';
      if (fs.existsSync('/build/bundle.js'))
      {
        ctx.body = fs.createReadStream('/build/bundle.js');
      }
      else
      {
        ctx.body = fs.createReadStream('../analytics.js/build/bundle.js');
      }
    });
    this.appRouter.get('/bundle.js.map', async (ctx, next) =>
    {
      ctx.type = 'js';
      if (fs.existsSync('/build/bundle.js.map'))
      {
        ctx.body = fs.createReadStream('/build/bundle.js.map');
      }
      else
      {
        ctx.body = fs.createReadStream('../analytics.js/build/bundle.js.map');
      }
    });

    this.appRouter.use('/v1', this.router.routes(), this.router.allowedMethods());
  }

  public routes(): any
  {
    return this.appRouter.routes();
  }

  private logError(error: string)
  {
    if (process.env.NODE_ENV === 'production')
    {
      return;
    }
    else
    {
      throw new Error(error);
    }
  }

  private async storeEvent(request: any)
  {
    if (request.body !== undefined && Object.keys(request.body).length > 0 &&
      request.query !== undefined && Object.keys(request.query).length > 0)
    {
      return this.logError('Both request query and body cannot be set.');
    }

    if ((request.body === undefined ||
      request.body !== undefined && Object.keys(request.body).length === 0) &&
      (request.query === undefined ||
        request.query !== undefined && Object.keys(request.query).length === 0))
    {
      return this.logError('Either request query or body parameters are required.');
    }

    let req: object = request.body;
    if (req === undefined || (req !== undefined && Object.keys(req).length === 0))
    {
      req = request.query;
    }

    let meta = req['meta'];
    try
    {
      meta = jsurl.parse(req['meta']);
    }
    catch (e)
    {
      meta = req['meta'];
    }

    const date = new Date();

    const event: EventConfig = {
      eventid: req['eventid'],
      variantid: req['variantid'],
      visitorid: req['visitorid'],
      source: {
        ip: request.ip,
        host: request.host,
        useragent: request.useragent,
        referer: request.header.referer,
      },
      timestamp: date,
      intervalBucketSeconds: Math.round(date.getTime()/1000),
      intervalBucketMinutes: Math.round(date.getTime()/1000/60),
      intervalBucketHours: Math.round(date.getTime()/1000/60/60),
      intervalBucketDays: Math.round(date.getTime()/1000/60/60/24),
      meta,
      hash: stringHash(JSON.stringify(request.query)),
    };

    if (_.difference(Object.keys(req), Object.keys(event).concat(['id', 'accessToken'])).length > 0)
    {
      return this.logError('storing analytics event: unexpected fields encountered');
    }

    try
    {
      await this.events.store(event);
    }
    catch (e)
    {
      return this.logError('storing analytics event: ' + JSON.stringify(e));
    }
  }

}

export default Router;
