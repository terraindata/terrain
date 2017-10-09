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

// tslint:disable:no-invalid-this restrict-plus-operands radix strict-boolean-expressions no-var-requires only-arrow-functions no-console variable-name max-line-length no-unused-expression no-shadowed-variable

import './HistogramStyle.less';

import { Colors } from '../../common/Colors';

// consider upgrading to v4 which has types
const d3 = require('d3');
// import * as d3 from 'd3';
import * as $ from 'jquery';
import * as _ from 'lodash';
import Util from '../../util/Util';

const xMargin = 45;
const yMargin = 10;

const scaleMin = (scale) => scale.range()[0];
const scaleMax = (scale) => scale.range()[scale.range().length - 1];
const scaleDomainMin = (scale) => scale.domain()[0];
const scaleDomainMax = (scale) => scale.domain()[scale.domain().length - 1];

const Histogram = {

  create(el, state)
  {
    d3.select(el).attr('class', 'histogram-chart-wrapper');

    const svg = d3
      .select(el)
      .append('svg')
      .attr('class', 'histogram-chart')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height)
      .attr('fill', Colors().altBg1)
      ;

    svg.append('rect')
      .attr('class', 'bg');

    svg.append('g')
      .attr('class', 'yLeftAxis');
    svg.append('g')
      .attr('class', 'bottomAxis');

    const innerSvg = svg.append('svg')
      .attr('class', 'inner-svg')
      .attr('x', xMargin)
      .attr('y', yMargin);

    // need a transparent filling background so that the touchmove events on inner-svg register as expected
    innerSvg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('opacity', 0);

    innerSvg.append('g')
      .attr('class', 'bars');

    this.update(el, state);

    // apply CSS styles

    const styleCSS = `
    .histogram-chart .tick {
      stroke: ${Colors().altHighlight};
    }
    .histogram-chart .tick text {
      fill: ${Colors().altBg2} !important;
    }
    `;
    const style = $(el).append(`<style>${styleCSS}</style>`);
  },

  update(el, state)
  {
    d3.select(el)
      .select('.histogram-chart')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height);

    const scales = this._scales(el, state.domain, state.barsData, state.width, state.height);
    this._draw(el, scales, state.domain, state.barsData, state.width, state.height, state.colors, state.xLabels, state.yLabels);
  },

  destroy(el)
  {
    // cleanup here
  },

  // "private" stuff

  _drawBg(el, scales)
  {
    d3.select(el).select('.bg')
      .attr('x', scaleMin(scales.x))
      .attr('width', scaleMax(scales.x) - scaleMin(scales.x))
      .attr('y', scaleMax(scales.pointY))
      .attr('height', scaleMin(scales.pointY) - scaleMax(scales.pointY));
  },

  _drawAxes(el, scales, width, height, xLabels, yLabels)
  {
    // TODO: add support for ylabels
    const yLeftAxis = d3.svg.axis()
      .scale(scales.pointY)
      .ticks(height > 200 ? 10 : 5)
      .tickSize(scaleMin(scales.x) - scaleMax(scales.x), scaleMin(scales.x) - scaleMax(scales.x))
      .tickFormat(Util.formatNumber)
      .orient('left');
    d3.select(el).select('.yLeftAxis')
      .attr('transform', 'translate(' + xMargin + ',0)')
      .style('color', '#fff')
      .call(yLeftAxis);

    // var bottomAxisTickFn: any = (tick, index: number): string => index == 0 || index == 10 ? "" : tick;
    const bottomAxis = d3.svg.axis();
    if (xLabels !== undefined && xLabels.length > 0)
    {
      bottomAxis.scale(scales.x)
        .ticks(xLabels.length)
        .tickFormat(function(d) { return xLabels[d]; })
        .orient('bottom');
    }
    else
    {
      bottomAxis.scale(scales.x)
        .ticks(width > 500 ? 6 : 4)
        .tickSize(-1 * scaleMin(scales.pointY) + scaleMax(scales.pointY), -1 * scaleMin(scales.pointY) + scaleMax(scales.pointY))
        .tickFormat(Util.formatNumber)
        .orient('bottom');
    }

    d3.select(el).select('.bottomAxis')
      .attr('transform', 'translate(0, ' + scaleMin(scales.pointY) + ')')
      .call(bottomAxis)
      .selectAll('text')
      .style('text-anchor', (d) =>
      {
        if (d === scales.x.domain()[0])
        {
          return 'start';
        }
        if (d === scales.x.domain()[1])
        {
          return 'end';
        }
        return 'middle';
      });

    if (xLabels !== undefined && xLabels.length > 0)
    {
      d3.select(el).select('.bottomAxis').selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-65)');
    }
  },

  _drawBars(el, scales, barsData, colors)
  {
    const g = d3.select(el).selectAll('.bars');

    const bar = g.selectAll('.bar')
      .data(barsData, (d) => d['x']);

    const xPadding = 5;

    const barWidth = (d) =>
    {
      // TODO calculate correct width of bars here
      const chartWidth = d3.select(el).select('.inner-svg').attr('width');
      let width = (chartWidth / barsData.length);
      if (width < 1)
      {
        width = 1;
      }
      return width;
    };

    bar.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('fill', colors[0]);

    bar
      .attr('x', (d) => scales.realX(d['x']) + xPadding)
      .attr('width', barWidth)
      .attr('y', (d) => scales.realBarY(d['y']))
      .attr('height', (d) => scaleMin(scales.realBarY) - scales.realBarY(d['y']));

    bar.exit().remove();
  },

  _draw(el, scales, domain, barsData, width, height, colors, xLabels, yLabels)
  {
    d3.select(el).select('.inner-svg')
      .attr('width', scaleMax(scales.realX))
      .attr('height', scaleMin(scales.realBarY));

    this._drawBg(el, scales);
    this._drawAxes(el, scales, width, height, xLabels, yLabels);
    this._drawBars(el, scales, barsData, colors);
  },

  _scales(el, domain, barsData, stateWidth, stateHeight)
  {
    if (!domain)
    {
      return null;
    }
    const width = stateWidth - xMargin;
    const height = stateHeight - 2 * yMargin;

    const x = d3.scale.linear()
      .range([xMargin, width])
      .domain(domain.x);

    const realX = d3.scale.linear()
      .range([0, width - xMargin])
      .domain(domain.x);

    const pointY = d3.scale.linear()
      .range([height, yMargin])
      .domain(domain.y);

    const realPointY = d3.scale.linear()
      .range([height - yMargin, 0])
      .domain(domain.y);

    // TODO CALCULATE THIS CORRECTLY
    let barsMax = domain['y'][1];
    barsMax = barsMax * 1.1;

    const barY = d3.scale.linear()
      .range([height, yMargin])
      .domain([0, barsMax]);

    const realBarY = d3.scale.linear()
      .range([height - yMargin, 0])
      .domain([0, barsMax]);

    return {
      x,
      pointY,
      barY,
      realX,
      realPointY,
      realBarY,
    };
  },

};

export default Histogram;

// USING VICTORY CHART:

// // Copyright 2017 Terrain Data, Inc.

// // tslint:disable:no-var-requires switch-default strict-boolean-expressions restrict-plus-operands
// import * as classNames from 'classnames';
// import * as Immutable from 'immutable';
// import * as _ from 'lodash';
// import * as Radium from 'radium';
// import * as React from 'react';
// import
// {
//   createContainer,
//   VictoryArea,
//   VictoryAxis,
//   VictoryBar,
//   VictoryBrushContainer,
//   VictoryChart,
//   VictoryGroup,
//   VictoryLegend,
//   VictoryPortal,
//   VictoryScatter,
//   VictoryTheme,
//   VictoryTooltip,
// } from 'victory';
// import ColorManager from '../../util/ColorManager';
// import { backgroundColor, borderColor, Colors, fontColor } from './../../common/Colors';
// import TerrainComponent from './../../common/components/TerrainComponent';

// export interface Props
// {
//   data: BarData[];
//   height?: number;
//   width?: number;
//   showLabels?: boolean;
//   xCategories?: string[];
//   yCategories?: string[];
//   onBarClick?: () => void;
//   onBarHover?: () => void;
//   horizontal?: boolean;
//   parentStyle?: any;
//   barStyle?: any;
//   barWidth?: number;
// }

// interface BarData
// {
//   x: number;
//   y: number;
// }

// @Radium
// class Histogram extends TerrainComponent<Props> {

//   public state: {
//     xValues: number[],
//     yValues: number[],
//     barWidth: number,
//   } = {
//     xValues: [],
//     yValues: [],
//     barWidth: 0,
//   };

//   public getBarWidth()
//   {
//     if (this.props.barWidth !== undefined && this.props.barWidth > 0)
//     {
//       return this.props.barWidth;
//     }
//     const width = this.props.width !== undefined ? this.props.width : 300;
//     const numBars = this.props.data.length;
//     if (numBars > 0)
//     {
//       return width / numBars;
//     }
//     return 0;
//   }

//   public parseData()
//   {
//     const barWidth = this.getBarWidth();
//     return this.props.data.map((data) => _.extend({}, data, { width: barWidth }));
//   }

//   public render()
//   {

//   }

//   public render()
//   {
//     const data = this.parseData();
//     const { height, width, showLabels, xCategories, yCategories, onBarClick, onBarHover,
//       horizontal, parentStyle, barStyle } = this.props;
//     return (
//       <VictoryChart
//         theme={VictoryTheme.material}
//         height={height !== undefined ? height : 300}
//         width={width !== undefined ? width : 300}
//         domainPadding={10}
//       >
//         <VictoryBar
//           style={{
//             data: {
//               fill: Colors().active,
//             },
//           }}
//           data={this.props.data}
//         />
//       </VictoryChart>
//     );
//   }
// }

// export default Histogram;
