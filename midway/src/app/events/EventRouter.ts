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
import * as winston from 'winston';

import * as Util from '../Util';
import { EventMetadataConfig, Events } from './Events';

export const events: Events = new Events();
const Router = new KoaRouter();

Router.get('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('getting all events');
  ctx.body = await events.getMetadata({});
});

Router.get('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const id = ctx.params.id;
  winston.info('getting event ID ' + String(id));
  ctx.body = await events.getMetadata({ id });
});

Router.post('/', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  winston.info('add event');
  const event: EventMetadataConfig = ctx.request.body.body;
  Util.verifyParameters(event, ['name']);
  if (event.id !== undefined)
  {
    throw new Error('Invalid parameter event ID');
  }

  ctx.body = await events.addEvent(events);
});

Router.post('/:id', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  const event: EventMetadataConfig = ctx.request.body.body;
  Util.verifyParameters(event, ['name']);
  if (event.id === undefined)
  {
    event.id = Number(ctx.params.id);
  }
  else
  {
    if (event.id !== Number(ctx.params.id))
    {
      throw new Error('Event ID does not match the supplied id in the URL');
    }
  }

  winston.info('modify event' + String(event.id));
  ctx.body = await events.addEvent(event);
});

// * eventid: the type of event (1: view / impression, 2: click / add-to-cart,  3: transaction)
// * variantid: list of variantids
// * start: start time of the interval
// * end: end time of the interval
// * agg: supported aggregation operations are:
//     `select` - returns all events between the specified interval
//     `histogram` - returns a histogram of events between the specified interval
//     `rate` - returns a ratio of two events between the specified interval
// * field (optional):
//     list of fields to operate on. if unspecified, it returns or aggregates all fields in the event.
// * interval (optional; required if `agg` is `histogram` or `rate`):
//     the resolution of interval for aggregation operations.
//     valid values are `year`, `quarter`, `month`, `week`, `day`, `hour`, `minute`, `second`;
//     also supported are values such as `1.5h`, `90m` etc.
//
Router.get('/agg', passport.authenticate('access-token-local'), async (ctx, next) =>
{
  Util.verifyParameters(
    JSON.parse(JSON.stringify(ctx.request.query)),
    ['start', 'end', 'eventid', 'variantid', 'agg'],
  );
  winston.info('getting events for variant');
  const response: object[] = await events.AggregationHandler(ctx.request.query);
  ctx.body = response.reduce((acc, x) =>
  {
    for (const key in x)
    {
      if (x.hasOwnProperty(key) !== undefined)
      {
        acc[key] = x[key];
        return acc;
      }
    }
  }, {});
});

export default Router;
