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

// tslint:disable:no-invalid-this no-var-requires no-shadowed-variable restrict-plus-operands only-arrow-functions

import './Periscope.less';

import { Colors } from '../../../colors/Colors';

// consider upgrading d3 to v4, which has available types
// import * as d3 from 'd3';
const d3 = require('d3');
const moment = require('moment');

import ElasticBlockHelpers from '../../../../database/elastic/blocks/ElasticBlockHelpers';
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
      .attr('fill', state.colors[0])
      .attr('opacity', 0.3);
    svg.append('g')
      .attr('class', 'handles');

    d3.select(el)
      .append('div')
      .attr('class', 'inputs');

    this.update(el, state);

    const styleCSS = `
    .periscope .tick {
      stroke: ${Colors().altHighlight}
    }
    .periscope .tick text {
      fill: ${Colors().text2} !important;
    }
    .periscope .handle {
      stroke: ${Colors().active} !important;
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
    this._draw(el, scales, state.domain, state.barsData, state.onDomainChange, state.onDomainChangeStart, state.colors,
      state.onDomainLowChange, state.onDomainHighChange);
  },

  destroy(el)
  {
    // cleanup here
  },

  // "private" stuff

  _drawBg(el, scales)
  {
    d3.select(el).select('.bg')
      .attr('x', scaleMin(scales.x) - 20)
      .attr('width', scaleMax(scales.x) - scaleMin(scales.x) + 40)
      .attr('y', scaleMax(scales.pointY))
      .attr('height', scaleMin(scales.pointY) - scaleMax(scales.pointY))
      .attr('fill', Colors().blockBg)
      .attr('ry', (scaleMin(scales.pointY) - scaleMax(scales.pointY)) / 2);
  },

  _drawBars(el, scales, domain, barsData, colors)
  {
    const g = d3.select(el).selectAll('.bars');

    const bar = g.selectAll('.bar')
      .data(barsData, (d) => d['id']);

    const xPadding = 1;

    const barWidth = (d) =>
    {
      let width = scales.realX(d['range']['max']) - scales.realX(d['range']['min']) - 2 * xPadding;
      if (width < 1)
      {
        width = 1;
      }
      return width;
    };

    const barColor = (d) =>
    {
      if (d['range']['min'] > domain.x[0] && d['range']['max'] < domain.x[1])
      {
        return Colors().active;
      }
      return Colors().blockOutline;
    };

    bar.enter()
      .append('rect')
      .attr('class', 'bar')
      ;

    bar
      .attr('x', (d) => scales.realX(d['range']['min']) + xPadding)
      .attr('width', barWidth)
      .attr('y', (d) => scales.realBarY(d['percentage']))
      .attr('height', (d) => scaleMin(scales.realBarY) - scales.realBarY(d['percentage']))
      .attr('fill', barColor);

    bar.exit().remove();
  },

  _drawLine(el, scales, domain)
  {
    d3.select(el).select('.line')
      .attr('x', scales.x(domain.x[0]))
      .attr('width', scales.x(domain.x[1]) - scales.x(domain.x[0]))
      .attr('y', 0) // - height / 2) // don't center, actually, so that it doesn't cover up the histogram
      .attr('height', scaleMin(scales.pointY) - scaleMax(scales.pointY));
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
      .attr('fill', Colors().transformChartBg)
      ;

    handle
      .attr('cx', (d) => scales.x(d))
      .attr('cy', scaleMin(scales.barY) / 2)
      .attr('fill', Colors().transformChartBg)
      .attr('stroke-width', '2px')
      .attr('r', 20);

    handle
      .attr('_id', (d, i) => i);

    handle.on('mousedown', this._mousedownFactory(el, onDomainChange, scales.x, domain, onMoveStart));
    handle.on('touchstart', this._mousedownFactory(el, onDomainChange, scales.x, domain, onMoveStart));

    handle.exit().remove();
  },

<<<<<<< HEAD
  _drawHandleInputs(el, scales, domain, onDomainLowChange, onDomainHighChange)
  {
    d3.select(el).selectAll('.domain-input').remove();
    const div = d3.select(el).selectAll('.inputs');
    const handles = d3.select(el).selectAll('.handle');
    const cCr = d3.select(el)[0][0]['getBoundingClientRect']();
    // Get the first handle to find the position where the input should go
    if (handles[0][0] !== undefined)
    {
      const cr = handles[0][0]['getBoundingClientRect']();
      const left = (cr.left - cCr.left) - 16;
      div.append('input')
        .attr('class', 'domain-input')
        .attr('id', 'input-0')
        .attr('value', Util.formatNumber(domain.x[0]).replace(/\s/g, ''))
        .style('left', left + 'px')
        .style('color', Colors().active)
        .on('change', function()
        {
          let value = d3.select(el).select('#input-0').node().value;
          value = Util.formattedToNumber(value);
          onDomainLowChange(value);
        }.bind(this))
        ;
    }
    // get the second handle
    if (handles[0][1] !== undefined)
    {
      const cr2 = handles[0][1]['getBoundingClientRect']();
      const left2 = (cr2.left - cCr.left) - 16;
      div.append('input')
        .attr('class', 'domain-input')
        .attr('id', 'input-1')
        .attr('value', Util.formatNumber(domain.x[1]).replace(/\s/g, ''))
        .style('left', left2 + 'px')
        .style('color', Colors().active)
        .on('change', function()
        {
          let value = d3.select(el).select('#input-1').node().value;
          value = Util.formattedToNumber(value);
          onDomainHighChange(value);
        }.bind(this))
        ;
    }
  },

  _draw(el, scales, domain, barsData, onDomainChange, onDomainChangeStart, colors, onDomainLowChange, onDomainHighChange)
  {
    d3.select(el).select('.inner-svg')
      .attr('width', scaleMax(scales.realX))
      .attr('height', scaleMin(scales.realBarY));

    this._drawBg(el, scales);
    this._drawBars(el, scales, domain, barsData, colors);
    this._drawLine(el, scales, domain);
    this._drawHandles(el, scales, domain, onDomainChange, onDomainChangeStart);
    this._drawHandleInputs(el, scales, domain, onDomainLowChange, onDomainHighChange);
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
