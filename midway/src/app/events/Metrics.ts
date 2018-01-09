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

import * as Tasty from '../../tasty/Tasty';
import * as App from '../App';
import UserConfig from '../users/UserConfig';
import * as Util from '../Util';
import MetricConfig from './MetricConfig';

// CREATE TABLE metrics (id integer PRIMARY KEY, database integer NOT NULL, label text NOT NULL, events text NOT NULL)

export class Metrics
{
  private metricsTable: Tasty.Table;

  constructor()
  {
    this.metricsTable = new Tasty.Table(
      'metrics',
      ['id'],
      [
        'database',
        'label',
        'events',
      ],
    );
  }

  public async initialize(database: number): Promise<any>
  {
    const predefinedMetrics: MetricConfig[] = [
      {
        database,
        label: 'Impressions',
        events: 'impression',
      },
      {
        database,
        label: 'Clicks',
        events: 'click',
      },
      {
        database,
        label: 'Conversions',
        events: 'conversion',
      },
      {
        database,
        label: 'Click-Through Rate',
        events: 'click,impression',
      },
      {
        database,
        label: 'Conversion Rate',
        events: 'conversion,impression',
      },
    ];
    predefinedMetrics.map((m) => this.upsert(m));
  }

  public async upsert(metric: MetricConfig): Promise<MetricConfig>
  {
    if (metric.database === undefined || metric.label === undefined || metric.events === undefined)
    {
      throw new Error('Database, label and events fields are required to create a metric');
    }
    return App.DB.upsert(this.metricsTable, metric) as Promise<MetricConfig>;
  }

  public async select(columns: string[], filter: object): Promise<MetricConfig[]>
  {
    return new Promise<MetricConfig[]>(async (resolve, reject) =>
    {
      const rawResults = await App.DB.select(this.metricsTable, columns, filter);
      const results: MetricConfig[] = rawResults.map((result: object) => new MetricConfig(result));
      resolve(results);
    });
  }
}

export default Metrics;
