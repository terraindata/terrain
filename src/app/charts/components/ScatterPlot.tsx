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

// tslint:disable:no-invalid-this restrict-plus-operands radix strict-boolean-expressions no-var-requires only-arrow-functions variable-name max-line-length no-unused-expression no-shadowed-variable

import './ScatterPlotStyle.less';

import { Colors } from '../../colors/colors';

// consider upgrading to v4 which has types
const d3 = require('d3');
import * as $ from 'jquery';
import * as _ from 'lodash';
import Util from '../../util/Util';

const xMargin = 45;
const yMargin = 10;
const labelSpacing = 26;

const scaleMin = (scale) => scale.range()[0];
const scaleMax = (scale) => scale.range()[scale.range().length - 1];
const scaleDomainMin = (scale) => scale.domain()[0];
const scaleDomainMax = (scale) => scale.domain()[scale.domain().length - 1];

const ScatterPlot = {

  create(el, state)
  {
    d3.select(el).attr('class', 'scatter-plot-wrapper');

    const svg = d3
      .select(el)
      .append('svg')
      .attr('class', 'scatter-plot')
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

    innerSvg.append('g')
      .attr('class', 'points');

    this.update(el, state);

    // apply CSS styles

    const styleCSS = `
    .scatter-plot .tick {
      stroke: ${Colors().altHighlight};
    }
    .scatter-plot .tick text {
      fill: ${Colors().altBg2} !important;
    }
    `;
    const style = $(el).append(`<style>${styleCSS}</style>`);
  },

  update(el, state)
  {
    d3.select(el)
      .select('.scatter-plot')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height);

    const scales = this._scales(el, state.domain, state.pointsData, state.width, state.height);
    this._draw(el, scales, state.domain, state.pointsData, state.width, state.height, state.colors);
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

  _drawAxes(el, scales, width, height)
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

    const bottomAxis = d3.svg.axis();
    bottomAxis.scale(scales.x)
      .ticks(width > 500 ? 6 : 4)
      .tickSize(-1 * scaleMin(scales.pointY) + scaleMax(scales.pointY), -1 * scaleMin(scales.pointY) + scaleMax(scales.pointY))
      .tickFormat(Util.formatNumber)
      .orient('bottom');

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
  },

  _mouseoverFactory: (el, scales, colors, drawToolTip) => function(point)
  {
    drawToolTip(el, d3.mouse(this), scales, this, colors);
    return false;
  },

  _mouseoutFactory: (el) => (point) =>
  {
    d3.select(el).select('.scatter-point-tooltip').remove();
  },

  _drawPoints(el, scales, pointsData, colors)
  {
    const g = d3.select(el).selectAll('.points');

    const point = g.selectAll('circle')
      .data(pointsData, (d) => d['x']);

    point.enter()
      .append('circle')
      .attr('cx', (d) => scales.realX(d['x']))
      .attr('cy', (d) => scales.realPointY(d['y']))
      .attr('fill', Colors().altBg1)
      .attr('stroke', colors[0])
      .attr('class', 'point')
      .attr('r', 10);

    point
      .attr('_id', (d) => d['x']);

    point.on('mouseover', this._mouseoverFactory(el, scales, colors, this._drawToolTip));
    point.on('mouseout', this._mouseoutFactory(el));

    point.exit().remove();
  },

  _drawToolTip(el, mouse, scales, point, colors)
  {
    d3.select(el).selectAll('.scatter-point-tooltip').remove();
    const xVal = scales.realX.invert(point.cx.baseVal.value);
    const yVal = scales.realPointY.invert(point.cy.baseVal.value);
    const text_x = 'X: ' + Util.formatNumber(xVal);
    const text_y = 'Y: ' + Util.formatNumber(yVal);
    const h = 35;
    const w = 75;
    const containerWidth = parseInt(d3.select(el).select('.inner-svg').attr('width'));
    const containerHeight = parseInt(d3.select(el).select('.inner-svg').attr('height'));
    const x = (mouse[0] + w) > containerWidth ? mouse[0] - w - 5 : mouse[0] + 5;
    const y = (mouse[1] + h) > containerHeight ? mouse[1] - h - 14 : mouse[1] + 14;

    const tooltip = d3.select(el).select('.inner-svg').append('g')
      .attr('class', 'scatter-point-tooltip');

    tooltip.append('rect')
      .attr('x', x)
      .attr('y', y)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('height', h)
      .attr('width', w)
      .attr('fill', colors[0]);

    tooltip.append('text')
      .attr('x', x + 6)
      .attr('y', y + 14)
      .attr('text-anchor', 'start')
      .attr('fill', Colors().altBg1)
      .attr('clip-path', 'url(#clip)')
      .text(text_x);

    tooltip.append('text')
      .attr('x', x + 6)
      .attr('y', y + 14 * 2)
      .attr('text-anchor', 'start')
      .attr('fill', Colors().altBg1)
      .attr('clip-path', 'url(#clip)')
      .text(text_y);

    const clipPath = tooltip.append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('x', x)
      .attr('y', y)
      .attr('height', h - 3)
      .attr('width', w - 3);
  },

  _draw(el, scales, domain, pointsData, width, height, colors)
  {
    d3.select(el).select('.inner-svg')
      .attr('width', scaleMax(scales.realX))
      .attr('height', scaleMin(scales.realPointY));

    this._drawBg(el, scales);
    this._drawAxes(el, scales, width, height);
    this._drawPoints(el, scales, pointsData, colors);
  },

  _scales(el, domain, pointsData, stateWidth, stateHeight)
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

    return {
      x,
      pointY,
      realX,
      realPointY,
    };
  },

};

export default ScatterPlot;
