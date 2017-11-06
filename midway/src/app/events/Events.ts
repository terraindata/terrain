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

import DatabaseController from '../../database/DatabaseController';
import ElasticClient from '../../database/elastic/client/ElasticClient';
import ElasticConfig from '../../database/elastic/ElasticConfig';
import ElasticController from '../../database/elastic/ElasticController';
import * as DBUtil from '../../database/Util';
import * as Tasty from '../../tasty/Tasty';
import { items } from '../items/ItemRouter';
import * as Util from '../Util';

export interface AggregationRequest
{
  variantid: string;
  eventname: string;
  start: string;
  end: string;
  agg: string;
  field?: string;
  interval?: string;
}

export interface EventConfig
{
  eventname: number | string;
  variantid: number | string;
  visitorid: number | string;
  timestamp: Date | string;
  source: {
    ip: string;
    host: string;
    useragent: string;
    referer?: string;
  };
  meta?: any;
}

export class Events
{
  private eventTable: Tasty.Table;

  public async initializeEventMetadata(tasty: Tasty.Tasty, index: string, type: string): Promise<void>
  {
    this.eventTable = new Tasty.Table(
      type,
      [],
      [
        'eventname',
        'variantid',
        'visitorid',
        'source',
        'timestamp',
      ],
      index,
    );
  }

  /*
   * Store an analytics event in ES
   */
  public async storeEvent(controller: DatabaseController, event: EventConfig): Promise<EventConfig>
  {
    return controller.getTasty().upsert(this.eventTable, event) as Promise<EventConfig>;
  }

  public generateHistogramQuery(controller: DatabaseController, variantid: string, request: AggregationRequest): Elastic.SearchParams
  {
    const body = bodybuilder()
      .size(0)
      .filter('term', 'variantid', variantid)
      .filter('term', 'eventname', request.eventname)
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
    return this.buildQuery(controller, body.build());
  }

  public async getHistogram(controller: ElasticController, variantid: string, request: AggregationRequest): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const query = this.generateHistogramQuery(controller, variantid, request);
      this.runQuery(controller, query, (response) =>
      {
        resolve({
          [variantid]: response['aggregations'][request.agg].buckets,
        });
      }, reject);
    });
  }

  public generateRateQuery(controller: DatabaseController, variantid: string, request: AggregationRequest): Elastic.SearchParams
  {
    const eventnames: string[] = request.eventname.split(',');
    const numerator = request.agg + '_' + eventnames[0];
    const denominator = request.agg + '_' + eventnames[1];
    const rate = request.agg + '_' + eventnames[0] + '_' + eventnames[1];

    const body = bodybuilder()
      .size(0)
      // .orFilter('term', 'eventname', eventnames[0])
      // .orFilter('term', 'eventname', eventnames[1])
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
            eventname: eventnames[0],
          },
        },
        (agg1) => agg1.aggregation(
          'value_count',
          'eventname',
          'count',
        ),
      )
        .aggregation(
        'filter',
        undefined,
        denominator,
        {
          term: {
            eventname: eventnames[1],
          },
        },
        (agg1) => agg1.aggregation(
          'value_count',
          'eventname',
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

    return this.buildQuery(controller, body.build());
  }

  public async getRate(controller: ElasticController, variantid: string, request: AggregationRequest): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const eventnames: string[] = request.eventname.split(',');
      const numerator = request.agg + '_' + eventnames[0];
      const denominator = request.agg + '_' + eventnames[1];
      const rate = request.agg + '_' + eventnames[0] + '_' + eventnames[1];

      const query = this.generateRateQuery(controller, variantid, request);
      this.runQuery(controller, query, (response) =>
      {
        resolve({
          [variantid]: response['aggregations'].histogram.buckets.map(
            (obj) =>
            {
              delete obj[numerator];
              delete obj[denominator];
              if (obj[rate] !== undefined)
              {
                obj.doc_count = obj[rate].value;
                delete obj[rate];
              }
              return obj;
            }),
        });
      }, reject);
    });
  }

  public generateSelectQuery(controller: DatabaseController, variantid: string, request: AggregationRequest): Elastic.SearchParams
  {
    let body = bodybuilder()
      .filter('term', 'variantid', variantid)
      .filter('term', 'eventname', request.eventname)
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
    return this.buildQuery(controller, body.build());
  }

  public generateSelectEventsQuery(controller: DatabaseController, variantid?: number): Elastic.SearchParams
  {
    let body = bodybuilder()
      .size(0)
      .aggregation('terms', 'eventid');

    if (variantid !== undefined)
    {
      body = body.filter('term', 'variantid', variantid);
    }

    return this.buildQuery(controller, body.build());
  }

  public async getAllEvents(controller: ElasticController, variantid: string, request: AggregationRequest): Promise<object>
  {
    return new Promise<object>((resolve, reject) =>
    {
      const query = this.generateSelectQuery(controller, variantid, request);
      this.runQuery(controller, query, (response) =>
      {
        resolve({
          [variantid]: response['hits'].hits.map((e) => e['_source']),
        });
      }, reject);
    });
  }

  public async getEventsList(controller: DatabaseController, variantid?: number): Promise<object>
  {
    return new Promise<object>((resolve, reject) =>
    {
      const query = this.generateSelectEventsQuery(controller, variantid);
      this.runQuery(controller as ElasticController, query, (response) =>
      {
        if (variantid !== undefined)
        {
          resolve({
            [variantid]: response['aggregations']['agg_terms_eventid'].buckets,
          });
        }
        else
        {
          resolve(response['aggregations']['agg_terms_eventid'].buckets);
        }
      }, reject);
    });
  }

  public async AggregationHandler(controller: DatabaseController, request: AggregationRequest): Promise<object[]>
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
        promises.push(this.getHistogram(controller as ElasticController, variantid, request));
      }
    }
    else if (request['agg'] === 'rate')
    {
      const eventnames = request['eventname'].split(',');
      if (eventnames.length < 2)
      {
        throw new Error('Two \"eventname\" values are required to compute a rate');
      }

      if (request['interval'] === undefined)
      {
        throw new Error('Required parameter \"interval\" is missing');
      }

      for (const variantid of variantids)
      {
        promises.push(this.getRate(controller as ElasticController, variantid, request));
      }
    }
    else if (request['agg'] === 'select')
    {
      for (const variantid of variantids)
      {
        promises.push(this.getAllEvents(controller as ElasticController, variantid, request));
      }
    }
    return Promise.all(promises);
  }

  private buildQuery(controller: DatabaseController, body: object): Elastic.SearchParams
  {
    const query = controller.getAnalyticsDB();
    if (query['index'] === undefined || query['type'] === undefined)
    {
      throw new Error('Required analytics query parameters \"index\" or \"type\" is missing');
    }

    query['body'] = body;
    return query;
  }

  private runQuery(controller: ElasticController, query: Elastic.SearchParams, resolve: (T) => void, reject: (Error) => void): void
  {
    controller.getClient().search(query, Util.makePromiseCallback(resolve, reject));
  }
}

export default Events;
