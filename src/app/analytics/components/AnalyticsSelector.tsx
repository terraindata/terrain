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
import { AnalyticsState } from 'analytics/data/AnalyticsStore';
import MultiSwitch from 'common/components/MultiSwitch';
import TerrainComponent from 'common/components/TerrainComponent';
import * as Immutable from 'immutable';
import * as React from 'react';
import Ajax from 'util/Ajax';

interface Props
{
  analytics: AnalyticsState;
  onMetricSelect: (value: number | string) => void;
  onIntervalSelect: (value: number | string) => void;
  onDateRangeSelect: (value: number | string) => void;
}

const METRICS = Immutable.List([
  { value: '1', label: 'Impressions' },
  { value: '2', label: 'Clicks' },
  { value: '3', label: 'Conversions' },
  { value: '2,1', label: 'CTR' },
  { value: '3,1', label: 'Conversion Rate' },
]);

const INTERVALS = Immutable.List([
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
]);

const DATE_RANGES = Immutable.List([
  { value: '1', label: 'Today' },
  { value: '2', label: 'Last 7 days' },
  { value: '3', label: 'Last Month' },
]);

class AnalyticsSelector extends TerrainComponent<Props>
{
  public render()
  {
    const { analytics } = this.props;
    const { selectedMetric, selectedInterval, selectedDateRange } = analytics;

    return (
      <div>
        <p>Metric</p>
        <MultiSwitch
          options={METRICS}
          value={selectedMetric.toString()}
          usesValues
          onChange={this.props.onMetricSelect}
        />
        <p>Interval</p>
        <MultiSwitch
          options={INTERVALS}
          value={selectedInterval}
          usesValues
          onChange={this.props.onIntervalSelect}
        />
        <p>Date Range</p>
        <MultiSwitch
          options={DATE_RANGES}
          value={selectedDateRange.toString()}
          usesValues
          onChange={this.props.onDateRangeSelect}
        />
      </div>
    );
  }
}

export default AnalyticsSelector;
