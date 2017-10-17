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

const Dimensions = require('react-dimensions');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import TerrainComponent from '../../../common/components/TerrainComponent';
import GaussianGraph from './../../../charts/components/GaussianGraph';
import * as _ from 'lodash';

export interface Props
{
  data: any;
  colors: [string, string];
  containerWidth?: number;
}

const GAUSSIAN_CONSTANT = 1 / Math.sqrt(2 * Math.PI);

class AggregationGaussian extends TerrainComponent<Props>
{
  constructor(props: Props)
  {
    super(props);
  }

  public state: {
    chartState: any,
  } = {
    chartState: {},
  }

  public componentDidMount()
  {
    const el = ReactDOM.findDOMNode(this);
    GaussianGraph.create(el, this.getChartState());
  }

  public gaussian(x, average, stdDev)
  {
    x = (x - average) / stdDev;
    return GAUSSIAN_CONSTANT * Math.exp(-.5 * x * x) / stdDev;
  }

  public getChartState(overrideState?: any)
  {
    overrideState = overrideState || {};
    const data = overrideState.data || this.props.data;
    // If the data is null (when the field is invalid/empty)
    if (data.min === null)
    {
      return undefined;
    }
    const stdDev = data.std_deviation;
    const maxY = this.gaussian(data.avg, data.avg, stdDev);
    // Sometimes lower bounds is less than min, upper bounds is greater than max
    const domainMin = Math.min(data.min, data.std_deviation_bounds.lower);
    const domainMax = Math.max(data.max, data.std_deviation_bounds.upper);
    const chartState = {
      domain: {
        x: [domainMin, domainMax],
        y: [0, maxY + 0.1 * maxY],
      },
      width: overrideState.containerWidth || this.props.containerWidth || 300,
      height: 300,
      colors: this.props.colors,
      stdDev,
      max: data.max,
      min: data.min,
      stdDevUpper: data.std_deviation_bounds.upper,
      stdDevLower: data.std_deviation_bounds.lower,
      average: data.avg,
    };
    this.setState({
      chartState,
    });
    return chartState;
  }

  public componentWillUnmount()
  {
    const el = ReactDOM.findDOMNode(this);
    GaussianGraph.destroy(el);
  }

  public componentWillReceiveProps(nextProps)
  {
    const el = ReactDOM.findDOMNode(this);
    if (!_.isEqual(this.props.data, nextProps.data))
    {
      GaussianGraph.update(el, this.getChartState(nextProps));
    }
    if (this.props.containerWidth !== nextProps.containerWidth)
    {
      const chartState = this.state.chartState;
      chartState.width = nextProps.containerWidth;
      GaussianGraph.update(el, chartState);
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
})(AggregationGaussian);
