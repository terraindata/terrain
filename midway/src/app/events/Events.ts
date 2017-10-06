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

export interface EventConfig
{
  eventid: number | string;
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
  private elasticController: ElasticController;

  constructor()
  {
    const elasticConfig: ElasticConfig = DBUtil.DSNToConfig('elastic', 'http://127.0.0.1:9200') as ElasticConfig;
    this.elasticController = new ElasticController(elasticConfig, 0, 'Analytics');

    this.eventTable = new Tasty.Table(
      'events',
      [],
      [
        'eventid',
        'variantid',
        'visitorid',
        'source',
        'timestamp',
      ],
      'terrain-analytics',
    );
  }

  /*
   * Store an analytics event in ES
   */
  public async storeEvent(event: EventConfig): Promise<EventConfig>
  {
    return this.elasticController.getTasty().upsert(this.eventTable, event) as Promise<EventConfig>;
  }

  public generateHistogramQuery(variantid: string, request: AggregationRequest): Elastic.SearchParams
  {
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
    return this.buildQuery(body.build());
  }

  public async getHistogram(variantid: string, request: AggregationRequest): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const query = this.generateHistogramQuery(variantid, request);
      this.runQuery(query, (response) =>
      {
        resolve({
          [variantid]: response['aggregations'][request.agg].buckets,
        });
      }, reject);
    });
  }

  public generateRateQuery(variantid: string, request: AggregationRequest): Elastic.SearchParams
  {
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

    return this.buildQuery(body.build());
  }

  public async getRate(variantid: string, request: AggregationRequest): Promise<object>
  {
    return new Promise<object>(async (resolve, reject) =>
    {
      const eventids: string[] = request.eventid.split(',');
      const numerator = request.agg + '_' + eventids[0];
      const denominator = request.agg + '_' + eventids[1];
      const rate = request.agg + '_' + eventids[0] + '_' + eventids[1];

      const query = this.generateRateQuery(variantid, request);
      this.runQuery(query, (response) =>
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

  public generateSelectQuery(variantid: string, request: AggregationRequest): Elastic.SearchParams
  {
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
    return this.buildQuery(body.build());
  }

  public async getAllEvents(variantid: string, request: AggregationRequest): Promise<object>
  {
    return new Promise<object>((resolve, reject) =>
    {
      const query = this.generateSelectQuery(variantid, request);
      this.runQuery(query, (response) =>
      {
        resolve({
          [variantid]: response['hits'].hits.map((e) => e['_source']),
        });
      }, reject);
    });
  }

  public async AggregationHandler(request: AggregationRequest): Promise<object[]>
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

  private buildQuery(body: object): Elastic.SearchParams
  {
    return {
      index: 'terrain-analytics',
      type: 'events',
      body,
    };
  }

  private runQuery(query: Elastic.SearchParams, resolve: (T) => void, reject: (Error) => void): void
  {
    this.elasticController.getClient().search(
      query,
      Util.makePromiseCallback(resolve, reject),
    );
  }
}

export default Events;
