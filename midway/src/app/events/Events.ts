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

import bodybuilder = require('bodybuilder');
import * as Elastic from 'elasticsearch';
import * as winston from 'winston';

import ElasticConfig from '../../database/elastic/ElasticConfig';
import ElasticController from '../../database/elastic/ElasticController';
import * as DBUtil from '../../database/Util';
import * as Tasty from '../../tasty/Tasty';
import { items } from '../items/ItemRouter';
import * as Util from '../Util';
import * as Encryption from './Encryption';

export interface AggregationRequest
{
  variantid: string;
  eventid: string;
  start: string;
  end: string;
  agg: string;
  field?: string;
  interval?: string;
}

export interface EventTemplateConfig
{
  id: string;
  ip: string;
  url?: string;
  variantId?: string;
}

export interface EventConfig extends EventTemplateConfig
{
  eventType?: string;
  date?: string;
  message?: string;
  name?: string;
  payload?: any;
  type: string;
}

export interface PayloadConfig
{
  id: string;
  meta: any;
  payload: any;
}

export class Events
{
  private eventTable: Tasty.Table;
  private eventInfoTable: Tasty.Table;
  private payloadTable: Tasty.Table;
  private elasticController: ElasticController;

  constructor()
  {
    const elasticConfig: ElasticConfig = DBUtil.DSNToConfig('elastic', 'http://127.0.0.1:9200') as ElasticConfig;
    this.elasticController = new ElasticController(elasticConfig, 0, 'Analytics');

    this.eventTable = new Tasty.Table(
      'events',
      ['id'],
      [
        'date',
        'ip',
        'payload',
        'type',
      ],
      'terrain-analytics',
    );

    this.payloadTable = new Tasty.Table(
      'payload',
      ['id'],
      [
        'meta',
        'payload',
      ],
      'terrain-analytics',
    );
  }

  /*
   * Get payload from datastore given the id
   *
   */
  public async getPayload(id: string): Promise<PayloadConfig>
  {
    return new Promise<PayloadConfig>(async (resolve, reject) =>
    {
      const payloads: PayloadConfig[] = await this.elasticController.getTasty().select(
        this.payloadTable, [], { id }) as PayloadConfig[];
      if (payloads.length === 0)
      {
        return resolve({} as PayloadConfig);
      }
      resolve(payloads[0] as PayloadConfig);
    });
  }

  /*
   * Parse incoming event request event
   *
   */
  public async JSONHandler(ip: string, reqs: object[]): Promise<string>
  {
    return new Promise<string>(async (resolve, reject) =>
    {
      if (reqs === undefined || (Object.keys(reqs).length === 0 && reqs.constructor === Object) || reqs.length === 0)
      {
        return resolve('');
      }
      const encodedEventArr: EventTemplateConfig[] = [];
      for (const req of reqs)
      {
        const payload: PayloadConfig = await this.getPayload(req['id']);
        const meta: object = payload.meta;
        delete payload.meta;
        const fullPayload: object = Object.assign(payload, meta);
        if (req['id'] === undefined || !(Object.keys(payload).length === 0))
        {
          continue;
        }
        const eventRequest: EventConfig = {
          id: fullPayload['id'],
          eventType: fullPayload['eventType'],
          ip,
          name: fullPayload['name'],
          payload: fullPayload['payload'],
          type: fullPayload['type'],
          url: req['url'] !== undefined ? req['url'] : fullPayload['url'],
          variantId: req['variantId'] !== undefined ? req['variantId'] : fullPayload['variantId'],
        };
        encodedEventArr.push(await Encryption.encodeMessage(eventRequest));
      }
      if (encodedEventArr.length === 0)
      {
        return resolve('');
      }
      resolve(JSON.stringify(encodedEventArr));
    });
  }

  public async getHistogram(variantid: string, request: AggregationRequest): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const client = this.elasticController.getClient();
      const body = bodybuilder()
        .size(0)
        .filter('term', 'variantid', variantid)
        .filter('term', 'eventid', request.eventid)
        .filter('range', '@timestamp', {
          gte: request.start,
          lte: request.end,
        })
        .aggregation(
        'date_histogram',
        '@timestamp',
        request.agg,
        {
          interval: request.interval,
        },
      );

      const response = await new Promise((resolveI, rejectI) =>
      {
        const query = this.buildAnalyticsQuery(body.build());
        client.search(query, Util.makePromiseCallback(resolveI, rejectI));
      });
      return resolve({
        [variantid]: response['aggregations'][request.agg].buckets,
      });
    });
  }

  public async getRate(variantid: string, request: AggregationRequest): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const client = this.elasticController.getClient();
      const eventids: string[] = request.eventid.split(',');
      const numerator = request.agg + '_' + eventids[0];
      const denominator = request.agg + '_' + eventids[1];
      const rate = request.agg + '_' + eventids[0] + '_' + eventids[1];

      const body = bodybuilder()
        .size(0)
        // .orFilter('term', 'eventid', eventids[0])
        // .orFilter('term', 'eventid', eventids[1])
        .filter('term', 'variantid', variantid)
        .filter('range', '@timestamp', {
          gte: request.start,
          lte: request.end,
        })

        .aggregation(
        'date_histogram',
        '@timestamp',
        'histogram',
        {
          interval: request.interval,
        },
        (agg) => agg.aggregation(
          'filter',
          undefined,
          numerator,
          {
            term: {
              eventid: eventids[0],
            },
          },
          (agg1) => agg1.aggregation(
            'value_count',
            'eventid',
            'count',
          ),
        )
          .aggregation(
          'filter',
          undefined,
          denominator,
          {
            term: {
              eventid: eventids[1],
            },
          },
          (agg1) => agg1.aggregation(
            'value_count',
            'eventid',
            'count',
          ),
        )
          .aggregation(
          'bucket_script',
          undefined,
          rate,
          {
            buckets_path: {
              [numerator]: numerator + '>count',
              [denominator]: denominator + '>count',
            },
            script: 'params.' + numerator + ' / params.' + denominator,
          }),
      );

      const response = await new Promise((resolveI, rejectI) =>
      {
        const query = this.buildAnalyticsQuery(body.build());
        client.search(query, Util.makePromiseCallback(resolveI, rejectI));
      });
      return resolve({
        [variantid]: response['aggregations'].histogram.buckets.map(
          (obj) =>
          {
            delete obj[numerator];
            delete obj[denominator];
            obj.doc_count = obj[rate].value;
            delete obj[rate];
            return obj;
          }),
      });
    });
  }

  public async getAllEvents(variantid: string, request: AggregationRequest): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const client = this.elasticController.getClient();
      let body = bodybuilder()
        .filter('term', 'variantid', variantid)
        .filter('term', 'eventid', request.eventid)
        .filter('range', '@timestamp', {
          gte: request.start,
          lte: request.end,
        });

      if (request.field !== undefined)
      {
        try
        {
          const fields = request.field.split(',');
          body = body.rawOption('_source', request.field);
        }
        catch (e)
        {
          winston.info('Ignoring malformed field value');
        }
      }

      const response = await new Promise((resolveI, rejectI) =>
      {
        const query = this.buildAnalyticsQuery(body.build());
        client.search(query, Util.makePromiseCallback(resolveI, rejectI));
      });

      return resolve({
        [variantid]: response['hits'].hits.map((e) => e['_source']),
      });
    });
  }

  public async EventHandler(request: AggregationRequest): Promise<object[]>
  {
    const variantids = request['variantid'].split(',');
    const promises: Array<Promise<any>> = [];
    if (request['agg'] === 'histogram')
    {
      if (request['interval'] === undefined)
      {
        throw new Error('Required parameter \"interval\" is missing');
      }

      for (const variantid of variantids)
      {
        promises.push(this.getHistogram(variantid, request));
      }
    }
    else if (request['agg'] === 'rate')
    {
      const eventids = request['eventid'].split(',');
      if (eventids.length < 2)
      {
        throw new Error('Two \"eventid\" values are required to compute a rate');
      }

      if (request['interval'] === undefined)
      {
        throw new Error('Required parameter \"interval\" is missing');
      }

      for (const variantid of variantids)
      {
        promises.push(this.getRate(variantid, request));
      }
    }
    else if (request['agg'] === 'select')
    {
      for (const variantid of variantids)
      {
        promises.push(this.getAllEvents(variantid, request));
      }
    }
    return Promise.all(promises);
  }

  /*
   * Check if id exists in payload table
   *
   */
  public async payloadExists(id: string): Promise<boolean>
  {
    return new Promise<boolean>(async (resolve, reject) =>
    {
      const payloads: object[] = await this.elasticController.getTasty().select(this.payloadTable, [], { id }) as object[];
      return resolve(payloads.length === 0 ? false : true);
    });
  }

  /*
   * Store the validated event in the datastore
   *
   */
  public async storeEvent(event: EventConfig): Promise<EventConfig>
  {
    event.payload = JSON.stringify(event.payload);
    return this.elasticController.getTasty().upsert(this.eventTable, event) as Promise<EventConfig>;
  }

  private buildAnalyticsQuery(body: object): Elastic.SearchParams
  {
    return {
      index: 'terrain-analytics',
      type: 'events',
      body,
    };
  }
}

export default Events;
