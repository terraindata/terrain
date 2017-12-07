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

// tslint:disable:no-invalid-this no-var-requires no-shadowed-variable restrict-plus-operands

import './Periscope.less';

import { Colors } from '../../../colors/Colors';

// consider upgrading d3 to v4, which has available types
// import * as d3 from 'd3';
const d3 = require('d3');
import Util from '../../../util/Util';

const xMargin = 45;
// var yMargin = 15;
const yMargin = 15;

const scaleMin = (scale) => scale.range()[0];
const scaleMax = (scale) => scale.range()[scale.range().length - 1];

const Periscope = {

  create(el, state)
  {
    d3.select(el).attr('class', 'periscope-wrapper');

    const svg = d3
      .select(el)
      .append('svg')
      .attr('class', 'periscope')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height)
      ;

    svg.append('rect')
      .attr('class', 'bg');
    svg.append('g')
      .attr('class', 'bottomAxis');

    const innerSvg = svg.append('svg')
      .attr('class', 'inner-svg')
      .attr('x', xMargin)
      .attr('y', 0);

    innerSvg.append('g')
      .attr('class', 'bars');

    svg.append('rect')
      .attr('class', 'line')
      .attr('fill', state.colors[0]);
    svg.append('g')
      .attr('class', 'handles');

    this.update(el, state);

    const styleCSS = `
    .periscope .tick {
      stroke: ${Colors().altHighlight}
    }
    .periscope .tick text {
      fill: ${Colors().text2} !important;
    }
    .periscope .handle {
      stroke: ${Colors().altHighlight} !important;
    }
    `;
    const style = $(el).append(`<style>${styleCSS}</style>`);
  },

  update(el, state)
  {
    d3.select(el)
      .select('.periscope')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height)
      ;

    state.numBars = 10;
    const scales = this._scales(el, state.maxDomain, state.domain, state.barsData, state.width, state.height);
    this._draw(el, scales, state.domain, state.barsData, state.onDomainChange, state.onDomainChangeStart, state.colors);
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
      .attr('height', scaleMin(scales.pointY) - scaleMax(scales.pointY))
      .attr('fill', Colors().transformChartBg);
  },

  _drawAxes(el, scales)
  {
    const bottomAxis = d3.svg.axis()
      .scale(scales.x)
      .ticks(6)
      .tickSize(10)
      .tickFormat(Util.formatNumber)
      .orient('bottom');
    d3.select(el).select('.bottomAxis')
      .attr('transform', 'translate(0, ' + scaleMin(scales.pointY) + ')')
      .attr('style', 'stroke: ' + Colors().transformChartBg)
      .call(bottomAxis);
  },

  _drawBars(el, scales, barsData, colors)
  {
    const g = d3.select(el).selectAll('.bars');

    const bar = g.selectAll('.bar')
      .data(barsData, (d) => d['id']);

    const xPadding = 0;

    const barWidth = (d) =>
    {
      let width = scales.realX(d['range']['max']) - scales.realX(d['range']['min']) - 2 * xPadding;
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
      .attr('x', (d) => scales.realX(d['range']['min']) + xPadding)
      .attr('width', barWidth)
      .attr('y', (d) => scales.realBarY(d['percentage']))
      .attr('height', (d) => scaleMin(scales.realBarY) - scales.realBarY(d['percentage']));

    bar.exit().remove();
  },

  _drawLine(el, scales, domain)
  {
    const lineFunction = d3.svg.line()
      .x((d) => scales.x(d))
      .y((d) => scaleMin(scales.barY));

    const height = 4;
    d3.select(el).select('.line')
      .attr('x', scales.x(domain.x[0]))
      .attr('width', scales.x(domain.x[1]) - scales.x(domain.x[0]))
      .attr('y', scaleMin(scales.barY)) // - height / 2) // don't center, actually, so that it doesn't cover up the histogram
      .attr('height', height);
  },

  // needs to be "function" for d3.mouse(this)
  _mousedownFactory: (el, onMove, scale, domain, onMoveStart) => function(event)
  {
    const del = d3.select(el);
    const handle = d3.select(this);
    const startX = scale.invert(d3.mouse(this)[0]);
    onMoveStart(startX);
    const t = this;

    const initialClasses = handle.attr('class');
    handle.attr('class', initialClasses + ' handle-active');

    const move = (event) =>
    {
      onMove(handle.attr('_id'), scale.invert(d3.mouse(t)[0]));
    };

    const bd = d3.select('body');
    bd.on('mousemove', move);
    bd.on('touchmove', move);

    const offFn = () =>
    {
      bd.on('mousemove', null);
      bd.on('touchmove', null);
      handle.attr('class', initialClasses);
    };
    bd.on('mouseup', offFn);
    bd.on('touchend', offFn);
    bd.on('mouseleave', offFn);
  },

  _drawHandles(el, scales, domain, onDomainChange, onMoveStart)
  {
    const g = d3.select(el).selectAll('.handles');
    const handle = g.selectAll('.handle')
      .data(domain.x, (d, i) => '' + i);

    handle.enter()
      .append('circle')
      .attr('class', 'handle')
      .attr('style', 'stroke: ' + Colors().altHighlight)
      .attr('fill', Colors().transformChartBg);

    handle
      .attr('cx', (d) => scales.x(d))
      .attr('cy', scaleMin(scales.barY))
      .attr('fill', Colors().transformChartBg)
      .attr('style', 'stroke: ' + Colors().altHighlight)
      .attr('stroke-width', '3px')
      .attr('r', 10);

    handle
      .attr('_id', (d, i) => i);

    handle.on('mousedown', this._mousedownFactory(el, onDomainChange, scales.x, domain, onMoveStart));
    handle.on('touchstart', this._mousedownFactory(el, onDomainChange, scales.x, domain, onMoveStart));

    handle.exit().remove();
  },

  _draw(el, scales, domain, barsData, onDomainChange, onDomainChangeStart, colors)
  {
    d3.select(el).select('.inner-svg')
      .attr('width', scaleMax(scales.realX))
      .attr('height', scaleMin(scales.realBarY));

    this._drawBg(el, scales);
    this._drawAxes(el, scales);
    this._drawBars(el, scales, barsData, colors);
    this._drawLine(el, scales, domain);
    this._drawHandles(el, scales, domain, onDomainChange, onDomainChangeStart);
  },

  _scales(el, maxDomain, domainAndRange, barsData, stateWidth, stateHeight)
  {
    if (!domainAndRange)
    {
      return null;
    }
    const width = stateWidth - xMargin;
    const height = stateHeight - yMargin;

    const x = d3.scale.linear()
      .range([xMargin, width])
      .domain(maxDomain);

    const realX = d3.scale.linear()
      .range([0, width - xMargin])
      .domain(maxDomain);

    const pointY = d3.scale.linear()
      .range([height - yMargin, 0])
      .domain(domainAndRange.y);

    const realPointY = d3.scale.linear()
      .range([height - yMargin, 0])
      .domain(domainAndRange.y);

    const barsMax = barsData.reduce((max, bar) =>
      (max === false || bar.percentage > max ? bar.percentage : max)
      , false);

    const barY = d3.scale.linear()
      .range([height - yMargin, 0])
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

export default Periscope;
