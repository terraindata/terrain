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
// tslint:disable:max-classes-per-file
import * as Immutable from 'immutable';
import { _AnalyticsState, AnalyticsState } from 'analytics/data/AnalyticsStore';
import { ItemType } from '../items/types/Item';

export default class AnalyticsHelper
{
  public static mockState()
  {
    return new AnalyticsStateMock();
  }

  public static mockServerResponses()
  {
    return new ServerResponseMock();
  }
}

class AnalyticsStateMock
{
  public state: AnalyticsState;

  public constructor()
  {
    this.state = _AnalyticsState();
  }

  public getState()
  {
    return this.state;
  }
}

class ServerResponseMock
{
  public available()
  {
    return [
      {
        database: 1,
        events: 'impression',
        id: 2,
        label: 'Impressions',
      },
      {
        database: 1,
        events: 'click',
        id: 3,
        label: 'Clicks\n',
      },
      {
        database: 1,
        events: 'conversion',
        id: 4,
        label: 'Conversions',
      },
      {
        database: 1,
        events: 'click,impression',
        id: 5,
        label: 'Click Through Rate',
      },
      {
        database: 1,
        events: 'conversion,impression',
        id: 6,
        label: 'Conversion Rate',
      },
    ];
  }

  public success()
  {
    return [
      {
        key_as_string: '2015-06-02T00:00:00.000Z',
        key: 1433203200000,
        doc_count: 10320,
      },
      {
        key_as_string: '2015-06-03T00:00:00.000Z',
        key: 1433289600000,
        doc_count: 12582,
      },
      {
        key_as_string: '2015-06-04T00:00:00.000Z',
        key: 1433376000000,
        doc_count: 12279,
      },
      {
        key_as_string: '2015-06-05T00:00:00.000Z',
        key: 1433462400000,
        doc_count: 6187,
      },
      {
        key_as_string: '2015-06-06T00:00:00.000Z',
        key: 1433548800000,
        doc_count: 937,
      },
    ]
  }

  public error()
  {
    return {
      errors: [
        {
          status: 400,
          title: `Route /midway/v1/events/agg?id=1&
    accessToken=some-token&algorithmid=6&
    start=2017-10-25T00%3A00%3A00.000Z&end=2017-10-25T15%3A39%3A59.335Z&eventid=1&
    interval=day&agg=histogram&field=%40timestamp has an error.`,
          detail: 'Parameter "database" not found in request object.',
          source: {
            ctx: {
              request: {
                method: 'GET',
                url: `/midway/v1/events/agg?id=1&accessToken=some-token&algorithmid=6&
    start=2017-10-25T00%3A00%3A00.000Z&end=2017-10-25T15%3A39%3A59.335Z&eventid=1&interval=day&
    agg=histogram&field=%40timestamp`,
                header: {
                  'host': 'localhost:3000',
                  'connection': 'keep-alive',
                  'pragma': 'no-cache',
                  'cache-control': 'no-cache',
                  'origin': 'http://localhost:8080',
                  'user-agent': 'Mozilla/5.0',
                  'content-type': 'application/json',
                  'accept': '*/*',
                  'referer': 'http://localhost:8080/analytics/1/13',
                  'accept-encoding': 'gzip, deflate, br',
                  'accept-language': 'en-US,en;q=0.8,es-419;q=0.6,es;q=0.4,ms;q=0.2,fr;q=0.2,pt;q=0.2',
                },
              },
              response: {
                status: 400,
                message: 'Bad Request',
                header: {
                  'vary': 'Origin',
                  'access-control-allow-origin': 'http://localhost:8080',
                  'content-type': 'application/json; charset=utf-8',
                  'x-response-time': '45ms',
                  'set-cookie': [],
                },
              },
              app: {
                subdomainOffset: 2,
                proxy: true,
                env: 'development',
              },
              originalUrl: `/midway/v1/events/agg?id=1&accessToken=some-token&algorithmid=6&
    start=2017-10-25T00%3A00%3A00.000Z&end=2017-10-25T15%3A39%3A59.335Z&eventid=1&interval=day&
    agg=histogram&field=%40timestamp`,
              req: '<original node req>',
              res: '<original node res>',
              socket: '<original node socket>',
            },
            err: {

            },
          },
        },
      ],
    };
  }

  public serverTime()
  {
    return { serverTime: '2015-06-06T00:00:00.000Z' };
  }
}
