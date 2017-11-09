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

import './TransformChartPreview.less';

import { Colors } from '../../../colors/Colors';

// consider upgrading to v4 which has types
const d3 = require('d3');
// import * as d3 from 'd3';
import * as $ from 'jquery';
import * as _ from 'lodash';
import Util from '../../../util/Util';

const xMargin = 0;
const yMargin = 0;

const scaleMin = (scale) => scale.range()[0];
const scaleMax = (scale) => scale.range()[scale.range().length - 1];
const scaleDomainMin = (scale) => scale.domain()[0];
const scaleDomainMax = (scale) => scale.domain()[scale.domain().length - 1];

const TransformChartPreview = {

  create(el, state)
  {
    d3.select(el).attr('class', 'transform-chart-preview-wrapper');
    const borderColor = localStorage.getItem('theme') === 'DARK' ? Colors().inputFocusBg : Colors().border1);
console.log(borderColor)
    const svg = d3
      .select(el)
      .append('svg')
      .attr('class', 'transform-chart-preview')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height)
      .attr('style', 'border-color: ' + borderColor)
      ;

    svg.append('rect')
      .attr('class', 'bg')
      .attr('fill', Colors().inputBg);

    const innerSvg = svg.append('svg')
      .attr('class', 'inner-svg')
      .attr('x', xMargin)
      .attr('y', yMargin);

    innerSvg.append('g')
      .append('path')
      .attr('class', 'lines')
      .attr('style', 'stroke: ' + state.colors[0]);
  },

  update(el, state)
  {
    d3.select(el)
      .select('.transform-chart')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height);

    const scales = this._scales(el, state.domain, state.width, state.height);

    this._draw(el, scales, state.pointsData);
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

  _drawLines(el, scales, pointsData)
  {
    if (pointsData.length)
    {
      const range = (scaleMax(scales.x) - scaleMin(scales.x));
      pointsData.unshift({
        x: scaleMin(scales.x) - range,
        y: pointsData[0].y,
        id: '*%*-first',
        dontScale: true,
      });
      pointsData.push({
        x: scaleMax(scales.x) + range,
        y: pointsData[pointsData.length - 1].y,
        id: '*%*-last',
        dontScale: true,
      });
    },
    const lineFunction = d3.svg.line()
      .x((d) => d['dontScale'] ? d['x'] : scales.realX(d['x']))
      .y((d) => scales.realPointY(d['y']));

    const lines = d3.select(el).select('.lines')
      .attr('d', lineFunction(pointsData))
      .attr('class', 'lines');

  },

  _draw(el, scales, pointsData)
  {
    d3.select(el).select('.inner-svg')
      .attr('width', scaleMax(scales.realX))
      .attr('height', scaleMin(scales.realPointY));

    this._drawBg(el, scales);
    this._drawLines(el, scales, pointsData);
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

export default TransformChartPreview;
