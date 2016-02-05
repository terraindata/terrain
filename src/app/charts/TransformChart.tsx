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

require('./TransformChart.less');

import * as d3 from 'd3';


var xMargin = 45;
var yMargin = 10;

var scaleMin = (scale) => scale.range()[0];
var scaleMax = (scale) => scale.range()[scale.range().length - 1];

var TransformChart = {
  
  create(el, props, state)
  {
    var svg = d3
      .select(el)
      .append('svg')
      .attr('class', 'transform-chart')
      .attr('width', props.width)
      .attr('height', props.height);
    
    svg.append('rect')
      .attr('class', 'bg');
    
    svg.append('g')
      .attr('class', 'yLeftAxis');
    svg.append('g')
      .attr('class', 'yRightAxis');
    svg.append('g')
      .attr('class', 'bottomAxis');
    
    var innerSvg = svg.append('svg')
      .attr('class', 'inner-svg')
      .attr('x', xMargin)
      .attr('y', yMargin);
        
    innerSvg.append('g')
      .attr('class', 'bars');
    
    innerSvg.append('g')
      .append('path')
      .attr('class', 'lines');
    
    innerSvg.append('g')
      .attr('class', 'points');
    
    this.update(el, state);
  },
  
  update(el, state)
  {
    if(!state._cache)
    {
      state._cache = {};
    }
    
    if(state._cache.domain !== state.domain
      || state._cache.barsData !== state.barsData)
    {
      // compute barsData and cache
      var computedBarsData = this._precomputeBarsData(state.barsData, state.domain);
      state._cache.domain = state.domain;
      state._cache.barsData = state.barsData;
      state._cache.computedBarsData = computedBarsData;
    }
    
    var barsData = state._cache.computedBarsData;
    var scales = this._scales(el, state.domain, barsData);
    this._draw(el, scales, barsData, state.pointsData, state.onMove, state.colors);
  },
  
  destroy(el)
  {
    // cleanup here
  },
  
  
  // "private" stuff
  
  _precomputeBarsData(oBarsData, domain)
  {
    console.log('rp');
    var maxBars = 15;
    var minBars = 8;
    
    if(oBarsData.length < maxBars)
    {
      return oBarsData;
    }
    
    var domainWidth = domain.x[1] - domain.x[0];
    var stepSize = parseFloat(d3.format('.1g')(Math.log(domainWidth / minBars)));
    var stepSize = domainWidth / 12;
    
    var newBars = oBarsData.reduce((newBars, bar) => {
      if(newBars.length === 0)
      {
        return [bar];
      }
      
      var lastBar = newBars[newBars.length - 1];
      if(bar.range.min < lastBar.range.min + stepSize)
      {
        newBars[newBars.length - 1] = 
        {
          count: lastBar.count + bar.count,
          percentage: lastBar.percentage + bar.percentage,
          id: lastBar.id + bar.id,
          range:
          {
            min: lastBar.range.min,
            max: bar.range.max,
          },
        }
        
      }
      else
      {
        newBars.push(bar);
      }
      
      return newBars;
    }, []);
    
    return newBars;
  },
  
  _drawBg(el, scales)
  {
    d3.select(el).select('.bg')
      .attr('x', scaleMin(scales.x))
      .attr('width', scaleMax(scales.x) - scaleMin(scales.x))
      .attr('y', scaleMax(scales.pointY))
      .attr('height', scaleMin(scales.pointY) - scaleMax(scales.pointY))
      .attr('fill', '#f0f8e8');
  },
  
  _drawAxes(el, scales)
  {
    var yLeftAxis = d3.svg.axis()
      .scale(scales.pointY)
      .ticks(10)
      .tickSize(scaleMin(scales.x) - scaleMax(scales.x), scaleMin(scales.x) - scaleMax(scales.x))
      .orient("left");
    d3.select(el).select('.yLeftAxis')
      .attr('transform', 'translate(' + xMargin + ',0)')
      .call(yLeftAxis);
    
    var yRightAxis = d3.svg.axis()
      .scale(scales.barY)
      .ticks(10)
      .tickSize(0, 0)
      .tickFormat(d3.format(" <-.2p")) // try '%' if more precision is needed
      .orient("right");
    d3.select(el).select('.yRightAxis')
      .attr('transform', 'translate(' + (scaleMax(scales.x)) + ',0)')
      .call(yRightAxis);
      
    // var bottomAxisTickFn: any = (tick, index: number): string => index == 0 || index == 10 ? "" : tick;
    var bottomAxis = d3.svg.axis()
      .scale(scales.x)
      .ticks(10)
      .tickSize(-1 * scaleMin(scales.pointY) + scaleMax(scales.pointY), -1 * scaleMin(scales.pointY) + scaleMax(scales.pointY))
      .tickFormat(d3.format(".3g"))
      .orient("bottom");
    d3.select(el).select('.bottomAxis')
      .attr('transform', 'translate(0, ' + scaleMin(scales.pointY) + ')')
      .call(bottomAxis)
    .selectAll('text')
      .style('text-anchor', (d) => {
        if(d === scales.x.domain()[0])
        {
          return 'start';
        }
        if(d === scales.x.domain()[1])
        {
          return 'end';
        }
        return 'middle';
      });
  },
  
  
  _drawBars(el, scales, barsData, color)
  {
    var g = d3.select(el).selectAll('.bars');
    
    var bar = g.selectAll('.bar')
      .data(barsData, (d) => d['id']);
    
    var xPadding = 5;
    
    var barWidth = (d) => {
      var width = scales.realX(d['range']['max']) - scales.realX(d['range']['min']) - 2 * xPadding
      if(width < 1)
      {
        width = 1
      }
      return width;
    }
    
    bar.enter()
      .append('rect')
      .attr('class', 'bar');
    
    bar
      .attr('fill', color)
      .attr('x', (d) => scales.realX(d['range']['min']) + xPadding)
      .attr('width', barWidth)
      .attr('y', (d) => scales.realBarY(d['percentage']))
      .attr('height', (d) => scaleMin(scales.realBarY) - scales.realBarY(d['percentage']));
    
    bar.exit().remove();
  },
  
  _drawLines(el, scales, pointsData, color)
  {
    var lineFunction = d3.svg.line()
      .x((d) => scales.realX(d['x']))
      .y((d) => scales.realPointY(d['y']));
    
    d3.select(el).select('.lines')
      .attr("d", lineFunction(pointsData))
      .attr("stroke", color)
      .attr("stroke-width", "3px")
      .attr("fill", "none");
  },
  
  // needs to be "function" for d3.mouse(this)
  _mousedownFactory: (el, onMove, scale) => function(event) {
    var del = d3.select(el);
    var point = d3.select(this);
    var startMouseY = d3.mouse(this)[1] 
      + parseInt(del.select('.inner-svg').attr('y'), 10);
    var startPointY = parseInt(point.attr('cy'), 10);
    
    var initialClasses = point.attr('class');
    point.attr('class', initialClasses + ' point-active');
    
    var move = function(event) {
      var diffY = d3.mouse(this)[1] - startMouseY;
      var newY = startPointY + diffY;
      
      // Note: in the future, for optimistic / faster rendering,
      //  you could use a line like this one:
      //  point.attr('cy', startPointY + diffY);
      
      var newValue = scale.invert(newY);
      onMove(point.attr('_id'), newValue);
    }
    
    del.on('mousemove', move);
    del.on('touchmove', move);
    
    var offFn = () => {
      del.on('mousemove', null)
      del.on('touchmove', null)
      point.attr('class', initialClasses);
    };
    del.on('mouseup', offFn);
    del.on('touchend', offFn);
    del.on('mouseleave', offFn);
  },
  
  _drawPoints(el, scales, pointsData, onMove, color)
  {
    var g = d3.select(el).selectAll('.points');
    
    var point = g.selectAll('.point')
      .data(pointsData, (d) => d['id']);
    
    point.enter()
      .append('circle')
      .attr('class', 'point');
    
    point
      .attr('cx', (d) => scales.realX(d['x']))
      .attr('cy', (d) => scales.realPointY(d['y']))
      .attr('fill', '#fff')
      .attr('stroke', color)
      .attr('stroke-width', '3px')
      .attr('r',  10);
    
    point
      .attr('_id', (d) => d['id']);
      
    point.on('mousedown', this._mousedownFactory(el, onMove, scales.realPointY));
    point.on('touchstart', this._mousedownFactory(el, onMove, scales.realPointY));
    
    point.exit().remove();
  },
  
  _draw(el, scales, barsData, pointsData, onMove, colors)
  {
    d3.select(el).select('.inner-svg')
      .attr('width', scaleMax(scales.realX))
      .attr('height', scaleMin(scales.realBarY));
      
    this._drawBg(el, scales);
    this._drawAxes(el, scales);
    this._drawBars(el, scales, barsData, colors.bar);
    this._drawLines(el, scales, pointsData, colors.line);
    this._drawPoints(el, scales, pointsData, onMove, colors.line);
  },
  
  _scales(el, domain, barsData)
  {
    if(!domain)
    {
      return null;
    }
    var width = el.offsetWidth - xMargin;
    var height = el.offsetHeight - 2 * yMargin;
    
    var x = d3.scale.linear()
      .range([xMargin, width])
      .domain(domain.x);
    
    var realX = d3.scale.linear()
      .range([0, width - xMargin])
      .domain(domain.x);
    
    var pointY = d3.scale.linear()
      .range([height, yMargin])
      .domain(domain.y);
    
    var realPointY = d3.scale.linear()
      .range([height, 0])
      .domain(domain.y);
    
    var barsMax = barsData.reduce((max, bar) =>
      (max === false || bar.percentage > max ? bar.percentage : max)
      , false);
    barsMax = (Math.floor(barsMax * 100) + 1) / 100;
    
    var barY = d3.scale.linear()
      .range([height, yMargin])
      .domain([0, barsMax]);
   
    var realBarY = d3.scale.linear()
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

export default TransformChart;