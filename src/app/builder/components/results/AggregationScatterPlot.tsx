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

// tslint:disable:no-empty restrict-plus-operands strict-boolean-expressions no-var-requires

import * as _ from 'lodash';
const Dimensions = require('react-dimensions');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import TerrainComponent from '../../../common/components/TerrainComponent';
import ScatterPlot from './../../../charts/components/ScatterPlot';

export interface Props
{
  data: any;
  colors: [string, string];
  containerWidth?: number;
}

const THRESHOLD = 0.000001;

// http://nicolashery.com/integrating-d3js-visualizations-in-a-react-app/

class AggregationScatterPlot extends TerrainComponent<Props>
{
  public state: {
    chartState: any,
  } =
  {
    chartState: {},
  };

  constructor(props: Props)
  {
    super(props);
  }

  public componentDidMount()
  {
    const el = ReactDOM.findDOMNode(this);
    ScatterPlot.create(el, this.getChartState());
  }

  public parseData(data)
  {
    let pointsData = [];
    let maxRange = -Infinity;
    let minRange = Infinity;
    let maxDomain = -Infinity;
    let minDomain = Infinity;

    // Keyed data: [{key: x, value: y}]
    if (Array.isArray(data))
    {
      pointsData = data.map((d, id) =>
      {
        const x = d.key;
        const y = d.value;
        if (y > maxRange)
        {
          maxRange = y;
        }
        if (y < minRange)
        {
          minRange = y;
        }
        if (x > maxDomain)
        {
          maxDomain = x;
        }
        if (x < minDomain)
        {
          minDomain = x;
        }
        return { x, y, id };
      });
    }
    // Unkeyed data: {key: value, key: value}
    else
    {
      pointsData = (_.keys(data)).map((key, id) =>
      {
        const x = parseFloat(key);
        const y = data[key];
        if (y > maxRange)
        {
          maxRange = y;
        }
        if (y < minRange)
        {
          minRange = y;
        }
        if (x > maxDomain)
        {
          maxDomain = x;
        }
        if (x < minDomain)
        {
          minDomain = x;
        }
        return { x, y, id };
      });
    }
    const range = (maxRange - minRange) !== 0 ? (maxRange - minRange) : 1;
    const domain = (maxDomain - minDomain) !== 0 ? (maxDomain - minDomain) : 1;
    return {
      pointsData,
      domain: [minDomain - 0.05 * domain, maxDomain + 0.05 * domain],
      range: [minRange - 0.05 * range, maxRange + 0.05 * range],
    };
  }

  public getChartState(overrideState?: any)
  {
    overrideState = overrideState || {};
    const data = overrideState.data || this.props.data;
    const { pointsData, domain, range } = this.parseData(data);
    const chartState = {
      pointsData,
      domain: {
        x: domain,
        y: range,
      },
      width: overrideState.containerWidth || this.props.containerWidth || 300,
      height: 300,
      colors: this.props.colors,
    };
    this.setState({
      chartState,
    });
    return chartState;
  }

  public componentWillUnmount()
  {
    const el = ReactDOM.findDOMNode(this);
    ScatterPlot.destroy(el);
  }

  // TODO: Support for keyed version
  public isClose(data, newData)
  {
    if (typeof data !== typeof newData)
    {
      return false;
    }
    if (Array.isArray(data))
    {
      data.forEach((d, i) =>
      {
        if (newData[i].key !== d.key)
        {
          return false;
        }
        if (Math.abs(newData[i].value - d.value) > THRESHOLD)
        {
          return false;
        }
      });
      return true;
    }
    const allKeys = (_.keys(data)).concat(_.keys(newData));
    allKeys.forEach((key) =>
    {
      if (newData[key] === undefined || data[key] === undefined)
      {
        return false;
      }
      if (Math.abs(newData[key] - data[key]) > THRESHOLD)
      {
        return false;
      }
    });
    return true;
  }

  public componentWillReceiveProps(nextProps)
  {
    const el = ReactDOM.findDOMNode(this);
    if (!this.isClose(nextProps.data, this.props.data))
    {
      ScatterPlot.update(el, this.getChartState(nextProps));
    }
    if (this.props.containerWidth !== nextProps.containerWidth)
    {
      const chartState = this.state.chartState;
      chartState.width = nextProps.containerWidth;
      ScatterPlot.update(el, chartState);
    }
  }

  public render()
  {
    return (
      <div />
    );
  }
}
export default Dimensions({
  elementResize: true,
  containerStyle: {
    height: 'auto',
  },
})(AggregationScatterPlot);
