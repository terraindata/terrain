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

// tslint:disable:no-invalid-this restrict-plus-operands radix strict-boolean-expressions no-var-requires only-arrow-functions no-console variable-name max-line-length no-unused-expression no-shadowed-variable

import './GaussianGraph.less';

import { Colors } from '../../colors/Colors';

// consider upgrading to v4 which has types
const d3 = require('d3');
import * as $ from 'jquery';
import * as _ from 'lodash';
import Util from '../../util/Util';

const xMargin = 45;
const yMargin = 10;

const scaleMin = (scale) => scale.range()[0];
const scaleMax = (scale) => scale.range()[scale.range().length - 1];
const scaleDomainMin = (scale) => scale.domain()[0];
const scaleDomainMax = (scale) => scale.domain()[scale.domain().length - 1];
const GAUSSIAN_CONSTANT = 1 / Math.sqrt(2 * Math.PI);

const GaussianGraph = {

  create(el, state)
  {
    d3.select(el).attr('class', 'gaussian-graph-wrapper');

    const svg = d3
      .select(el)
      .append('svg')
      .attr('class', 'gaussian-graph')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height)
      .attr('fill', '#fff')
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
      .attr('class', 'lines');

    innerSvg.append('g')
      .attr('class', 'bgs');

    innerSvg.append('g')
      .attr('class', 'points');

    if (state.addAnnotations)
    {
      innerSvg.append('g')
        .attr('class', 'annotations');
    }

    this.update(el, state);

    // apply CSS styles

    const styleCSS = `
    .gaussian-graph .tick {
      stroke: #e8e8e8;
    }
    .gaussian-graph .tick text {
      fill: ${Colors().text3} !important;
    }
    `;
    const style = $(el).append(`<style>${styleCSS}</style>`);
  },

  update(el, state)
  {
    if (state === undefined)
    {
      return;
    }
    d3.select(el)
      .select('.gaussian-graph')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height);

    const scales = this._scales(el, state.domain, state.width, state.height);
    this._draw(el, scales, state.height, state.width, state.average, state.min, state.max, state.stdDev,
      state.stdDevUpper, state.stdDevLower, state.colors, state.domain, state.addAnnotations);
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

    const bottomAxis = d3.svg.axis()
      .scale(scales.x)
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

  _drawGaussianLine(el, scales, average, stdDev, min, max, stdDevLower, stdDevUpper, colors)
  {
    d3.select(el).select('.line').remove();
    d3.select(el).select('#gaussian').remove();
    const data = this._getData(average, stdDev, Math.min(min, stdDevLower), Math.max(max, stdDevUpper));
    const line = d3.svg.line()
      .x((d) =>
      {
        return scales.realX(d.q);
      })
      .y((d) =>
      {
        return scales.realPointY(d.p);
      });

    d3.select(el).select('.lines').append('path')
      .datum(data)
      .attr('class', 'line')
      .attr('d', line)
      .attr('stroke', colors[0]);

    d3.select(el).select('.lines').append('clipPath')
      .attr('id', 'gaussian')
      .append('path')
      .datum(data)
      .attr('d', line);
  },

  _getData(average, stdDev, min, max)
  {
    const data = [];
    const stepSize = (max - min) * 0.001;
    const padding = (max - min) * 0.1;
    for (let i = (min - padding); i < (max + padding); i += stepSize)
    {
      const p = this._gaussian(i, average, stdDev); // calc prob of rand draw
      data.push({ p, q: i });
    }
    data.sort(function(a, b)
    {
      return a.q - b.q;
    });
    return data;
  },

  _gaussian(x, average, stdDev)
  {
    x = (x - average) / stdDev;
    return GAUSSIAN_CONSTANT * Math.exp(-.5 * x * x) / stdDev;
  },

  _drawPoints(el, scales, pointsData, colors)
  {
    const g = d3.select(el).selectAll('.points');

    const point = g.selectAll('circle')
      .data(pointsData, (d) => d['id']);

    point.enter()
      .append('circle');

    point
      .attr('cx', (d) => scales.realX(d['x']))
      .attr('cy', (d) => scales.realPointY(d['y']))
      .attr('fill', '#fff')
      .attr('stroke', colors[0])
      .attr('class', 'point')
      .attr('r', 10);

    point
      .attr('_id', (d) => d['id'])
      .attr('id', (d) => d['id']);

    point.on('mouseover', this._mouseoverFactory(el, scales, colors, this._drawToolTip));
    point.on('mouseout', this._mouseoutFactory(el));

    point.exit().remove();
  },

  _drawPointAnnotations(el, scales, pointsData, colors, sigma)
  {
    d3.select(el).selectAll('.gaussian-annotation-text').remove();

    const g = d3.select(el).selectAll('.annotations');
    const annotation = g.selectAll('rect')
      .data(pointsData, (d) => d['id'] + '_annotation');

    const annotationX = (d) =>
    {
      switch (d['id'])
      {
        case 'Average':
          return scales.realX(d['x']) - 10;
        case 'Std Dev Upper':
          return scales.realX(d['x']) + 12;
        case 'Std Dev Lower':
          return scales.realX(d['x']) - 40;
        default:
          return scales.realX(d['x']);
      }
    };

    const annotationY = (d) =>
    {
      switch (d['id'])
      {
        case 'Average':
          return scales.realPointY(d['y']) - 25;
        case 'Std Dev Upper':
          return scales.realPointY(d['y']) - 5;
        case 'Std Dev Lower':
          return scales.realPointY(d['y']) - 5;
        default:
          return scales.realPointY(d['y']);
      }
    };
    const annotationYLower = (d) =>
    {
      switch (d['id'])
      {
        case 'Average':
          return scales.realPointY(d['y']) - 15;
        case 'Std Dev Upper':
          return scales.realPointY(d['y']) + 5;
        case 'Std Dev Lower':
          return scales.realPointY(d['y']) + 5;
        default:
          return scales.realPointY(d['y']);
      }
    };

    const text = (d) =>
    {
      switch (d['id'])
      {
        case 'Average':
          return 'Avg:';
        case 'Std Dev Upper':
          return '+' + sigma + ' dev:';
        case 'Std Dev Lower':
          return '-' + sigma + ' dev:';
        default:
          return '';
      }
    };

    annotation.enter().append('text')
      .attr('fill', 'black')
      .attr('class', 'gaussian-annotation-text')
      .attr('x', annotationX)
      .attr('y', annotationY)
      .attr('text-anchor', 'start')
      .text(text);

    annotation.enter().append('text')
      .attr('fill', 'black')
      .attr('class', 'gaussian-annotation-text')
      .attr('x', annotationX)
      .attr('y', annotationYLower)
      .attr('text-anchor', 'start')
      .text((d) => Util.formatNumber(d['x']));

    annotation
      .attr('id', (d) => d['id'] + '_annotation')
      .attr('_id', (d) => d['id'] + '_annotation');

    annotation.exit().remove();
  },

  _drawVerticalLine(el, scales, xValue, maxY, className)
  {
    d3.select(el).select('.' + className).remove();
    const data = [{ y: 0, x: xValue },
    { y: maxY, x: xValue }];
    const line = d3.svg.line()
      .x((d) =>
      {
        return scales.realX(d.x);
      })
      .y((d) =>
      {
        return scales.realPointY(d.y);
      });
    d3.select(el).select('.lines')
      .append('path')
      .datum(data)
      .attr('class', className)
      .attr('d', line)
      .attr('stroke', 'rgb(60, 63, 65)');
  },

  _mouseoverFactory: (el, scales, colors, drawToolTip) => function(point)
  {
    drawToolTip(el, d3.mouse(this), scales, this, colors);
    return false;
  },

  _mouseoutFactory: (el) => (point) =>
  {
    d3.select(el).select('.gaussian-point-tooltip').remove();
  },

  _drawToolTip(el, mouse, scales, point, colors)
  {
    d3.select(el).selectAll('.gaussian-point-tooltip').remove();
    const xVal = scales.realX.invert(point.cx.baseVal.value);
    const yVal = scales.realPointY.invert(point.cy.baseVal.value);
    const text_x = 'X: ' + Util.formatNumber(xVal);
    const text_y = 'Y: ' + Util.formatNumber(yVal);
    const h = 50;
    const w = 80;
    const containerWidth = parseInt(d3.select(el).select('.inner-svg').attr('width'));
    const containerHeight = parseInt(d3.select(el).select('.inner-svg').attr('height'));
    const x = (mouse[0] + w) > containerWidth ? mouse[0] - w - 5 : mouse[0] + 5;
    const y = (mouse[1] + h) > containerHeight ? mouse[1] - h - 14 : mouse[1] + 14;

    const tooltip = d3.select(el).select('.inner-svg').append('g')
      .attr('class', 'gaussian-point-tooltip');

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
      .attr('fill', '#fff')
      .attr('clip-path', 'url(#clip)')
      .text(point.id);

    tooltip.append('text')
      .attr('x', x + 6)
      .attr('y', y + 14 * 2)
      .attr('text-anchor', 'start')
      .attr('fill', '#fff')
      .attr('clip-path', 'url(#clip)')
      .text(text_x);

    tooltip.append('text')
      .attr('x', x + 6)
      .attr('y', y + 14 * 3)
      .attr('text-anchor', 'start')
      .attr('fill', '#fff')
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

  _sectionMouseoverFactory: (el, scales, numDeviations, stdDev, colors, drawSectionTooltip) => function(section)
  {
    drawSectionTooltip(el, d3.mouse(this), scales, numDeviations, stdDev, colors);
    return false;
  },

  _sectionMouseoutFactory: (el) => (section) =>
  {
    d3.select(el).select('.gaussian-section-tooltip').remove();
  },

  _drawSectionTooltip(el, mouse, scales, numDeviations, stdDev, colors)
  {
    d3.select(el).selectAll('.gaussian-section-tooltip').remove();
    const h = 60;
    const w = 80;
    const containerWidth = parseInt(d3.select(el).select('.inner-svg').attr('width'));
    const containerHeight = parseInt(d3.select(el).select('.inner-svg').attr('height'));
    const x = (mouse[0] + w) > containerWidth ? mouse[0] - w - 5 : mouse[0] + 5;
    const y = (mouse[1] + h) > containerHeight ? mouse[1] - h - 14 : mouse[1] + 14;

    const tooltip = d3.select(el).select('.inner-svg').append('g')
      .attr('class', 'gaussian-section-tooltip');

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
      .attr('fill', '#fff')
      .attr('clip-path', 'url(#clip2)')
      .text('Sigma = ' + Util.formatNumber(numDeviations));

    tooltip.append('text')
      .attr('x', x + 6)
      .attr('y', y + 35)
      .attr('text-anchor', 'start')
      .attr('fill', '#fff')
      .attr('clip-path', 'url(#clip2)')
      .text('Std deviation = ');

    tooltip.append('text')
      .attr('x', x + 6)
      .attr('y', y + 50)
      .attr('text-anchor', 'start')
      .attr('fill', '#fff')
      .attr('clip-path', 'url(#clip2)')
      .text(Util.formatNumber(stdDev));

    const clipPath = tooltip.append('clipPath')
      .attr('id', 'clip2')
      .append('rect')
      .attr('x', x)
      .attr('y', y)
      .attr('height', h - 3)
      .attr('width', w - 3);
  },

  _drawStdDeviationBgs(el, scales, height, average, stdDev, stdDevLower, stdDevUpper, rectHeight, colors)
  {
    d3.select(el).select('.lower-section-bg').remove();
    d3.select(el).select('.upper-section-bg').remove();

    const numDeviations = Math.abs(stdDevUpper - average) / stdDev;

    const lowerSection = d3.select(el).select('.bgs')
      .append('g')
      .attr('class', 'lower-section-bg');

    const sectionWidth = Math.abs(scales.realX(average) - scales.realX(stdDevLower));
    const sectionHeight = Math.abs(height - scales.realPointY(rectHeight));
    const avgHeight = this._gaussian(average, average, stdDev);
    const maxHeight = Math.abs(height - scales.realPointY(avgHeight));

    lowerSection.append('rect')
      .attr('height', maxHeight)
      .attr('width', sectionWidth)
      .attr('x', scales.realX(stdDevLower))
      .attr('y', scales.realPointY(avgHeight))
      .attr('fill', colors[0])
      .attr('clip-path', 'url(#gaussian)');

    lowerSection.append('rect')
      .attr('height', sectionHeight)
      .attr('width', sectionWidth)
      .attr('x', scales.realX(stdDevLower))
      .attr('y', scales.realPointY(rectHeight))
      .attr('fill', colors[0]);

    const upperSection = d3.select(el).select('.bgs')
      .append('g')
      .attr('class', 'upper-section-bg');

    upperSection.append('rect')
      .attr('height', maxHeight)
      .attr('width', sectionWidth)
      .attr('x', scales.realX(average))
      .attr('y', scales.realPointY(avgHeight))
      .attr('fill', colors[0])
      .attr('clip-path', 'url(#gaussian)');

    upperSection.append('rect')
      .attr('height', sectionHeight)
      .attr('width', sectionWidth)
      .attr('x', scales.realX(average))
      .attr('y', scales.realPointY(rectHeight))
      .attr('fill', colors[0]);

    lowerSection.on('mouseover', this._sectionMouseoverFactory(el, scales, numDeviations, stdDev,
      colors, this._drawSectionTooltip));
    lowerSection.on('mouseout', this._sectionMouseoutFactory(el));

    upperSection.on('mouseover', this._sectionMouseoverFactory(el, scales, numDeviations, stdDev,
      colors, this._drawSectionTooltip));
    upperSection.on('mouseout', this._sectionMouseoutFactory(el));
  },

  _draw(el, scales, height, width, average, min, max, stdDev, stdDevUpper, stdDevLower, colors, domain, addAnnotations)
  {
    d3.select(el).select('.inner-svg')
      .attr('width', scaleMax(scales.realX))
      .attr('height', scaleMin(scales.realPointY));

    this._drawBg(el, scales);
    this._drawAxes(el, scales, width, height);
    this._drawGaussianLine(el, scales, average, stdDev, min, max, stdDevLower, stdDevUpper, colors);
    this._drawVerticalLine(el, scales, average, this._gaussian(average, average, stdDev), 'average-line');
    this._drawVerticalLine(el, scales, stdDevUpper, this._gaussian(stdDevUpper, average, stdDev), 'upper-line');
    this._drawVerticalLine(el, scales, stdDevLower, this._gaussian(stdDevLower, average, stdDev), 'lower-line');
    const pointValues = {
      'Average': average,
      'Min': min,
      'Max': max,
      'Std Dev Upper': stdDevUpper,
      'Std Dev Lower': stdDevLower,
    };
    const pointsData = _.keys(pointValues).map((key) =>
    {
      const x = pointValues[key];
      return { x, y: this._gaussian(x, average, stdDev), id: key };
    });
    this._drawPoints(el, scales, pointsData, colors);

    if (addAnnotations)
    {
      const annotatedPointsData = pointsData.filter((d) =>
      {
        return d.id === 'Std Dev Upper' || d.id === 'Std Dev Lower' || d.id === 'Average';
      });
      const sigma = Math.round(Math.abs(average - stdDevUpper) / stdDev);
      this._drawPointAnnotations(el, scales, annotatedPointsData, colors, sigma);
    }

    this._drawStdDeviationBgs(
      el,
      scales,
      height,
      average,
      stdDev,
      stdDevLower,
      stdDevUpper,
      this._gaussian(stdDevUpper, average, stdDev),
      colors,
    );
  },

  _scales(el, domain, stateWidth, stateHeight)
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

export default GaussianGraph;
