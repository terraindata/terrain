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

// tslint:disable:no-empty restrict-plus-operands strict-boolean-expressions no-var-requires

// http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/

import { List } from 'immutable';
import * as _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import TerrainComponent from '../../../common/components/TerrainComponent';
import Histogram from './../../../charts/components/Histogram';

export interface Props
{
  data: any;
  colors: [string, string];
  containerWidth?: number;
  index: number;
}

class AggregationHistogram extends TerrainComponent<Props>
{

  public state: {
    chartState: any,
  } = {
      chartState: {},
    };

  constructor(props: Props)
  {
    super(props);
  }

  public componentDidMount()
  {
    const el = ReactDOM.findDOMNode(this);
    Histogram.create(el, this.getChartState());
  }

  public parseBucketData(buckets)
  {
    let data = [];
    let domainMin: number = Infinity;
    let domainMax: number = -Infinity;
    let rangeMax: number = -Infinity;
    let categories = [];

    // RANGE QUERIES
    if (buckets[0] !== undefined &&
      (buckets[0].to !== undefined || buckets[0].from !== undefined))
    {
      domainMin = 0;
      domainMax = buckets.length;
      categories = buckets.map((bucket) =>
      {
        return bucket.key;
      });
      data = buckets.map((bucket, i) =>
      {
        if (bucket.doc_count > rangeMax)
        {
          rangeMax = bucket.doc_count;
        }
        return { x: i, y: bucket.doc_count, label: categories[i] };
      });

    }
    // TERMS / DATE QUERIES
    else if ((buckets[0] !== undefined
      && buckets[0].key !== undefined
      && typeof buckets[0].key === 'string')
      || (buckets[0] !== undefined && buckets[0].key_as_string))
    {
      domainMin = 0;
      domainMax = buckets.length;
      data = buckets.map((bucket, i) =>
      {
        if (bucket.doc_count > rangeMax)
        {
          rangeMax = bucket.doc_count;
        }
        return { x: i, y: bucket.doc_count, label: bucket.key_as_string || bucket.key };
      });
      categories = buckets.map((bucket) =>
      {
        return bucket.key_as_string || bucket.key;
      });
    }
    // HISTOGRAM QUERIES
    else
    {
      let barDifference = Infinity;
      const tempData = {};
      buckets.forEach((bucket, i) =>
      {
        if (bucket.doc_count > rangeMax)
        {
          rangeMax = bucket.doc_count;
        }
        if (bucket.key > domainMax)
        {
          domainMax = bucket.key;
        }
        if (bucket.key < domainMin)
        {
          domainMin = bucket.key;
        }
        if (i > 0 && bucket.key - buckets[i - 1].key < barDifference)
        {
          barDifference = bucket.key - buckets[i - 1].key;
        }
        tempData[bucket.key] = bucket.doc_count;
      });
      // Missing bars are added as having 0 value
      if (barDifference > (domainMax - domainMin) * 0.001) // Limit the number of bars
      {
        for (let i = domainMin; i <= domainMax; i += barDifference)
        {
          if (tempData[i] !== undefined)
          {
            data.push({ x: i, y: tempData[i] });
          }
          else
          {
            data.push({ x: i, y: 0 });
          }
        }
      }
      else // If there are too many bars, use labels instead
      {
        _.keys(tempData).map((key, i) =>
        {
          data.push({ x: i, y: tempData[key], label: String(key) });
        });
        domainMax = _.keys(tempData).length;
        domainMin = 0;
      }
    }
    return { barsData: data, categories, domain: List([domainMin, domainMax]), range: List([0, rangeMax + 0.05 * rangeMax]) };
  }

  public getChartState(overrideState?: any)
  {
    overrideState = overrideState || {};
    let data = overrideState.data || this.props.data;
    // data might not be array --> convert to one
    if (!Array.isArray(data))
    {
      data = _.keys(data).map((key) => _.extend({}, { key }, data[key]));
    }
    const { barsData, categories, domain, range } = this.parseBucketData(data);
    const chartState = {
      barsData: (barsData),
      domain: {
        x: domain.toJS(),
        y: range.toJS(),
      },
      width: overrideState.containerWidth || this.props.containerWidth || 300,
      height: 300,
      colors: this.props.colors,
      xLabels: categories,
    };
    this.setState({
      chartState,
    });
    return chartState;
  }

  public componentWillUnmount()
  {
    const el = ReactDOM.findDOMNode(this);
    Histogram.destroy(el);
  }

  public componentWillReceiveProps(nextProps)
  {
    const el = ReactDOM.findDOMNode(this);
    if (this.props.index !== nextProps.index)
    {
      Histogram.destroy(el);
      Histogram.create(el, this.getChartState(nextProps));
    }
    if (!_.isEqual(nextProps.data, this.props.data))
    {
      Histogram.update(el, this.getChartState(nextProps));
    }
    if (this.props.containerWidth !== nextProps.containerWidth)
    {
      const chartState = this.state.chartState;
      chartState.width = nextProps.containerWidth;
      Histogram.update(el, chartState);
    }
  }

  public render()
  {
    return (
      <div />
    );
  }
}
export default AggregationHistogram;
