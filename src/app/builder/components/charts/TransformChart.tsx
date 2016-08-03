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
import * as _ from 'underscore';

var xMargin = 45;
var yMargin = 10;

var scaleMin = (scale) => scale.range()[0];
var scaleMax = (scale) => scale.range()[scale.range().length - 1];

var TransformChart = {
  
  create(el, state)
  {
    var svg = d3
      .select(el)
      .append('svg')
      .attr('class', 'transform-chart')
      .attr('width', state.width)
      .attr('height', state.height)
      .attr('viewBox', '0 0 ' + state.width + ' ' + state.height)
      ;
    
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
      
    // need a transparent filling background so that the touchmove events on inner-svg register as expected
    innerSvg.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('opacity', 0);
        
    innerSvg.append('g')
      .attr('class', 'bars');
    innerSvg.append('g')
      .append('path')
      .attr('class', 'lines-bg');
    innerSvg.append('g')
      .append('path')
      .attr('class', 'lines');
    
    innerSvg.append('g')
      .attr('class', 'points');
    
    innerSvg.append('g')
      .attr('class', 'spotlight-bgs');
    
    innerSvg.append('g')
      .attr('class', 'spotlights');
    
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
    var scales = this._scales(el, state.domain, barsData, state.width, state.height);
    this._draw(el, scales, barsData, state.pointsData, state.onMove,
      state.spotlights, state.inputKey, state.onLineClick, state.onLineMove, state.onSelect,
      state.onCreate, state.onDelete, state.onPointMoveStart, state.width, state.height,
      state.canEdit);
    
    d3.select(el).on('mousedown', () => {
      if(!d3.event['shiftKey'] && !d3.event['altKey'])
      {
        state.onSelect(null);
      }
      d3.select(el).select('.right-menu').remove();
    });
    
    var drawMenu = this._drawMenu;
    if(state.canEdit)
    {
      d3.select(el).select('.inner-svg').on('contextmenu', function() {
        d3.event['preventDefault']();
        drawMenu(el, d3.mouse(this), '+ Point', state.onCreate, scales);
        return false;
      });
    }

    var drawCrossHairs = this._drawCrossHairs;
    d3.select(el).on('mousemove', () => {
      var mouse = d3.mouse(d3.select('g').node());
      drawCrossHairs(el, mouse, scales, state.width, state.height);
    });
  },
  
  destroy(el)
  {
    // cleanup here
  },
  
  
  // "private" stuff
  
  _precomputeBarsData(oBarsData, domain)
  {
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
          count: lastBar.count + (isNaN(bar.count) ? 0 : bar.count),
          percentage: lastBar.percentage + (isNaN(bar.percentage) ? 0 : bar.percentage),
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
      .attr('height', scaleMin(scales.pointY) - scaleMax(scales.pointY));
  },
  
  _drawAxes(el, scales, width, height)
  {
    var yLeftAxis = d3.svg.axis()
      .scale(scales.pointY)
      .ticks(height > 200 ? 10 : 5)
      .tickSize(scaleMin(scales.x) - scaleMax(scales.x), scaleMin(scales.x) - scaleMax(scales.x))
      .orient("left");
    d3.select(el).select('.yLeftAxis')
      .attr('transform', 'translate(' + xMargin + ',0)')
      .call(yLeftAxis);
    
    var yRightAxis = d3.svg.axis()
      .scale(scales.barY)
      .ticks(height > 200 ? 10 : 5)
      .tickSize(0, 0)
      .tickFormat(d3.format(" <-.2p")) // try '%' if more precision is needed
      .orient("right");
    d3.select(el).select('.yRightAxis')
      .attr('transform', 'translate(' + (scaleMax(scales.x)) + ',0)')
      .call(yRightAxis);
      
    // var bottomAxisTickFn: any = (tick, index: number): string => index == 0 || index == 10 ? "" : tick;
    var bottomAxis = d3.svg.axis()
      .scale(scales.x)
      .ticks(width > 500 ? 10 : 5)
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
  
  
  _drawBars(el, scales, barsData)
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
      .attr('x', (d) => scales.realX(d['range']['min']) + xPadding)
      .attr('width', barWidth)
      .attr('y', (d) => scales.realBarY(d['percentage']))
      .attr('height', (d) => scaleMin(scales.realBarY) - scales.realBarY(d['percentage']));
    
    bar.exit().remove();
  },
  
  
  _drawSpotlights(el, scales, spotlights, inputKey, pointsData, barsData)
  {
    var g = d3.select(el).selectAll('.spotlights')
    
    var spotlight = g.selectAll('.spotlight')
      .data(spotlights, (d) => d['id']);
    
    var spotlightEnter = spotlight.enter()
      .append('g')
      .attr('class', 'spotlight')
      .attr('_id', (d) => d['id']);
    spotlightEnter.append('circle');
    spotlightEnter.append('rect');
    spotlightEnter.append('text');
    
    var getBar = (d) => {
      // find the bar that it fits in
      var x = d[inputKey] !== undefined ? d[inputKey] : 0;
      var i = 0;
      // consider using binary search to speed this up
      while(barsData[i] && !(barsData[i].range.max >= x && barsData[i].range.min <= x))
      {
        i++;
      }
      
      return barsData[i];
    }
    
    
    var getBarX = (d) => {
      var bar = getBar(d);
      if(!bar)
      {
        return -12345;
      }  
      
      return (bar.range.max + bar.range.min) / 2;
    };
    
    var ys: _.Dictionary<{y: number, offset: number, x: number}> = {};
    var idToY = {};
    
    var SPOTLIGHT_SIZE = 12;
    var SPOTLIGHT_PADDING = 6;
    var INITIAL_OFFSET = 27;
    var OFFSET = SPOTLIGHT_SIZE + SPOTLIGHT_PADDING;
    var TOOLTIP_BG_PADDING = 6;
    
    var getBarY = (d) => {
      var bar = getBar(d);
      if(!bar)
      {
        return -12345;
      }
      
      if(ys[bar.range.min])
      {
        ys[bar.range.min].offset += OFFSET;
      }
      else
      {
        // Consider using Binary Search to speed this up
        var i = 1;
        var x = (bar.range.max + bar.range.min) / 2;
        while(pointsData[i] && pointsData[i]['x'] < x)
        {
          i ++;
        }
        
        var first = pointsData[i - 1];
        var second = pointsData[i];
        var distanceRatio = (x - first['x']) / (second['x'] - first['x']);
        var yVal = first['y'] * (1 - distanceRatio) + second['y'] * distanceRatio;
        var y = scales.realPointY(yVal);
        ys[bar.range.min] = 
        {
          y: y,
          offset: INITIAL_OFFSET,
          x: (bar.range.min + bar.range.max) / 2
        }
      }
      
      var finalY = ys[bar.range.min].y - ys[bar.range.min].offset;
      idToY[d['id']] = finalY;
      return finalY;
    }
    
    var isvg = d3.select(el).select('.inner-svg');
    
    spotlight
      .select('circle')
      .attr('cx', (d) => {
        return scales.realX(getBarX(d));
      })
      .attr('cy', (d) => {
        if(d[inputKey] === undefined)
        {
          return 0;
        }
        
        return getBarY(d);
      })
      .attr('fill', (d) => d['spotlight'])
      .attr('r',  (d) => d[inputKey] !== undefined ? SPOTLIGHT_SIZE / 2 : 0)
      ;
    
    spotlight
      .select('text')
      .text((d) => d['name'])
      .attr('class', (d) => 'spotlight-tooltip spotlight-tooltip-' + d['id'])
      .attr('y', (d) => idToY[d['id']] + 5)
      .attr('x', (d) => scales.realX(getBarX(d)) + SPOTLIGHT_SIZE / 2 + SPOTLIGHT_PADDING + 3)
      .attr('fill', (d) => d['spotlight'])
      ;
    
    spotlight
      .select('rect')
      .attr('class', (d) => 'spotlight-tooltip-bg spotlight-tooltip-bg-' + d['id'])
      .attr('y', (d) => idToY[d['id']] + 5 - 11 - TOOLTIP_BG_PADDING)
      .attr('height', TOOLTIP_BG_PADDING * 2 + 11)
      .attr('x', (d) => scales.realX(getBarX(d)) + SPOTLIGHT_SIZE / 2 + SPOTLIGHT_PADDING - TOOLTIP_BG_PADDING + 3)
      .attr('width', (d) => TOOLTIP_BG_PADDING * 2 + g.select('.spotlight-tooltip-' + d['id'])['node']()['getBBox']()['width'])
      .attr('fill', 'rgba(255,255,255,0.95)')
      .attr('rx', 6)
      .attr('ry', 6)
      ;
    
    
    
    var g2 = d3.select(el).selectAll('.spotlight-bgs');
    
    var bgData = _.map(ys, (y, k) => {
      y['key'] = k;
      return y;
    });
    
    var spotlightBg = g2.selectAll('.spotlight-bg')
      .data(bgData, (d) => { return d['key'] });
    
    spotlightBg.enter()
      .append('path')
      .attr('class', 'spotlight-bg');
    
    spotlightBg
      .attr('d', (d) => 'M' + scales.realX(d['x']) + ' ' + d['y'])
      .attr('fill', '#fff')
      .attr('stroke', '#ccc')
      .attr('stroke-width', '1px')
      .attr('d', (d) => { 
        var x = scales.realX(d['x']);
        var y = d['y'];
        var offset = d['offset'];
        var radius = SPOTLIGHT_SIZE / 2 + SPOTLIGHT_PADDING;
        var straightHeight = offset - radius * 2 - 2;
        if(straightHeight < 0) straightHeight = 0;
        var pinR = 5;
        
        var str = "Mx y l -p -15 " +
        "a r r 0 0 1 -"+(radius - pinR)+" -r " + 
        "l 0 -h " +
        "a r r 0 0 1 r -r " +
        "a r r 0 0 1 r r " +
        "l 0 h " +
        "a r r 0 0 1 -"+(radius - pinR)+" r " +
        "l -p 15";
        
        str = str.replace(/x/g, x + "");
        str = str.replace(/y/g, y + "");
        str = str.replace(/h/g, straightHeight + "");
        str = str.replace(/r/g, radius + "");
        str = str.replace(/p/g, pinR + "");
        
        return str;
      })
      .attr('transform', (d) => {
        var x = scales.realX(d['x']);
        var y = d['y'];
        var offset = d['offset'];
        if(y - offset < 10) {
          return 'rotate(180,' + x + ',' + y +')';
        }
        return '';
      })
      ;
    
    spotlight //.select('circle')
      .attr('transform', (d) => {
        var bar = getBar(d);
        var bg = ys[bar.range.min];
        var x = scales.realX(bg['x']);
        var y = bg['y'];
        var offset = bg['offset'];
        if(y - offset < 10) {
          return 'rotate(180,' + x + ',' + y +')';
        }
        return '';
      });
    
    spotlight.selectAll('text, rect')
      .attr('transform', (d) => {
        var rotate = '0';
        var translateY = 0;
        var translateX = 0;
        
        var bar = getBar(d);
        var bg = ys[bar.range.min];
        var x = scales.realX(bg['x']);
        var y = bg['y'];
        var offset = bg['offset'];
        
        if(y - offset < 10) {
          translateY = 2 * (y - idToY[d['id']]);
          rotate = '180,' + x + ',' + y;
        }
        
        var width = g.select('.spotlight-tooltip-bg-' + d['id'])['node']()['getBBox']()['width'];
        if(x + width > parseInt(isvg.attr('width'), 10))
        {
          translateX = -1 * width - SPOTLIGHT_SIZE - 2 * SPOTLIGHT_PADDING;
        }
        
        return 'rotate(' + rotate + ')translate(' + translateX + ',' + translateY + ')';
      });
    
    spotlight.exit().remove();
    spotlightBg.exit().remove();
  },
  
  // needs to be "function" for d3.mouse(this)
  _lineMousedownFactory: (el, onClick, scales, onMove) => function(event)
  {
    var m = d3.mouse(this);
    var x = scales.realX.invert(m[0]);
    var y = scales.realPointY.invert(m[1]);
    onClick(x,y);
    
    var line = d3.select(this);
    var initialClasses = line.attr('class');
    line.attr('class', initialClasses + ' line-active');
    
    var del = d3.select(el).select('.inner-svg');
    var move = function(event) {
      onMove(x, scales.realPointY.invert(d3.mouse(this)[1]));
    }
    
    del.on('mousemove', move);
    del.on('touchmove', move);
    
    var offFn = () => {
      del.on('mousemove', null)
      del.on('touchmove', null)
      del.on('mouseup', null);
      del.on('touchend', null);
      del.on('mouseleave', null);
      line.attr('class', initialClasses);
    };
    
    del.on('mouseup', offFn);
    del.on('touchend', offFn);
    del.on('mouseleave', offFn);
  },
  
  _getLinesData(pointsData, scales, isFill)
  {
    var linesPointsData = _.clone(pointsData);
    if(linesPointsData.length)
    {
      var range = (scaleMax(scales.x) - scaleMin(scales.x));
      linesPointsData.unshift({
        x: scaleMin(scales.x) - range,
        y: linesPointsData[0].y,
        id: '*%*-first',
      });
      if(isFill)
      {
        linesPointsData.unshift({
          x: scaleMin(scales.x) - range,
          y: -1,
          id: '*%*-first-anchor',
        });
      }
      
      linesPointsData.push({
        x: scaleMax(scales.x) + range,
        y: linesPointsData[linesPointsData.length - 1].y,
        id: '*%*-last',
      });
      if(isFill)
      {
        linesPointsData.push({
          x: scaleMax(scales.x) + range,
          y: -1,
          id: '*%*-last-anchor',
        });
      }
    }
    return linesPointsData;
  },
  
  _drawLines(el, scales, pointsData, onClick, onMove, canEdit)
  {
    var lineFunction = d3.svg.line()
      .x((d) => scales.realX(d['x']))
      .y((d) => scales.realPointY(d['y']));
    
    var lines = d3.select(el).select('.lines')
      .attr("d", lineFunction(this._getLinesData(pointsData, scales)))
      .attr('class', canEdit ? 'lines' : 'lines lines-disabled');
    
    if(canEdit)
    {
      lines.on("mousedown", this._lineMousedownFactory(el, onClick, scales, onMove));
    }
    
    d3.select(el).select('.lines-bg')
      .attr("d", lineFunction(this._getLinesData(pointsData, scales, true)));
  },
  
  // needs to be "function" for d3.mouse(this)
  _mousedownFactory: (el, onMove, scales, onSelect, onPointMoveStart) => function(d) {
    if(d3.event['shiftKey'] || d3.event['altKey'])
    {
      onSelect(d.id, d3.event['shiftKey']);
    }
    else if(!d.selected)
    {
      onSelect(null);
      onSelect(d.id);
    }
    d3.event['stopPropagation']();
    
    var del = d3.select(el);
    var point = d3.select(this);
    var startY = scales.realPointY.invert(d3.mouse(this)[1]);
    onPointMoveStart(startY);
    var t = this;
    
    point.attr('active', '1');
    
    var move = function(event) {
      var newY = scales.realPointY.invert(d3.mouse(t)[1]);
      onMove(point.attr('_id'), newY);
    }
    
    del.on('mousemove', move);
    del.on('touchmove', move);
    
    var offFn = () => {
      del.on('mousemove', null);
      del.on('touchmove', null);
      del.on('mouseup', null);
      del.on('touchend', null);
      del.on('mouseleave', null);
      point.attr('active', '0');
    };
    del.on('mouseup', offFn);
    del.on('touchend', offFn);
    del.on('mouseleave', offFn);
  },

  _drawCrossHairs(el, mouse, scales, width, height)
  {
    var f = d3.format(".2f")
    var x = f(scales.realX.invert(mouse[0]));
    var y = f(scales.realPointY.invert(mouse[1] -8));
    var text_x = 'X:  ' + x;
    var text_y = 'Y:  ' + y;

    d3.select(el).select('.crosshairs').remove();
    
    var crosshairs = d3.select(el).select('.inner-svg').append('g')
      .attr('class', 'crosshairs');
    
    var w = 70;
    var h = 32;
    crosshairs.append('rect')
      .attr('x', mouse[0]+5)
      .attr('y', mouse[1] + 4)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', 0)
      .attr('height', 0)
      .attr('width', w)
      .attr('height', h);
    
    crosshairs.append('text')
      .attr('x', mouse[0] + w / 2 +5)
      .attr('y', mouse[1] + h-14)
      .attr('text-anchor', 'middle')
      .text(text_x)
      .attr('opacity', 0)
      .attr('opacity', 1);

    crosshairs.append('text')
      .attr('x', mouse[0] + w / 2 +5)
      .attr('y', mouse[1] + h)
      .attr('text-anchor', 'middle')
      .text(text_y)
      .attr('opacity', 0)
      .attr('opacity', 1);

    crosshairs.append('line')
      .attr('class', 'crosshairs-line')
      .attr('x1', mouse[0])
      .attr('y1', 0)
      .attr('x2', mouse[0])
      .attr('y2', height);

    crosshairs.append('line')
      .attr('class', 'crosshairs-line')
      .attr('x1', 0)
      .attr('y1', mouse[1]-8)
      .attr('x2', width)
      .attr('y2', mouse[1]-8);

  },

  _drawMenu(el, mouse, text, fn, scales)
  {
    d3.select(el).select('.right-menu').remove();
    
    var menu = d3.select(el).select('.inner-svg').append('g')
      .attr('class', 'right-menu');
    
    var w = 85;
    var h = 20;
    menu.append('rect')
      .attr('x', mouse[0]-10)
      .attr('y', mouse[1]-8)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', 0)
      .attr('height', 0)
      .transition()
      .duration(50)
      .attr('width', w)
      .attr('height', h);
    
    menu.append('text')
      .attr('x', mouse[0] + w / 2 -10)
      .attr('y', mouse[1] + h - 14)
      .attr('text-anchor', 'middle')
      .text(text)
      .attr('opacity', 0)
      .transition()
      .delay(100)
      .duration(50)
      .attr('opacity', 1);

    
    var isvg = d3.select(el).select('.inner-svg');
    menu.on('mousedown', () => fn(
      scales.x.invert(mouse[0] + parseInt(isvg.attr('x'), 10)),
      scales.realPointY.invert(mouse[1] -8 + parseInt(isvg.attr('y'), 10))
    ));
  },
  
  _rightClickFactory: (el, onDelete, scales, drawMenu) => function(point)
  {
    d3.event['preventDefault']();
    d3.event['stopPropagation']();
    drawMenu(el, d3.mouse(this), 'Delete', () => onDelete(point.id), scales);
    return false;
  },
  
  _drawPoints(el, scales, pointsData, onMove, onSelect, onDelete, onPointMoveStart, canEdit)
  {
    var g = d3.select(el).selectAll('.points');
    
    var point = g.selectAll('circle')
      .data(pointsData, (d) => d['id']);
    
    point.enter()
      .append('circle');
    
    point
      .attr('cx', (d) => scales.realX(d['x']))
      .attr('cy', (d) => scales.realPointY(d['y']))
      .attr('class', (d) => 
        'point' + (d['selected'] ? ' point-selected' : '')
          + (canEdit ? '' : ' point-disabled'))
      .attr('r',  10);
    
    point
      .attr('_id', (d) => d['id']);
      
    if(canEdit)
    {
      point.on('mousedown', this._mousedownFactory(el, onMove, scales, onSelect, onPointMoveStart));
      point.on('touchstart', this._mousedownFactory(el, onMove, scales, onSelect, onPointMoveStart));
      point.on('contextmenu', this._rightClickFactory(el, onDelete, scales, this._drawMenu))
    }
    
    point.exit().remove();
  },
  
  _draw(el, scales, barsData, pointsData, onMove, spotlights, inputKey, onLineClick, onLineMove, onSelect, onCreate, onDelete, onPointMoveStart, width, height, canEdit)
  {
    d3.select(el).select('.inner-svg')
      .attr('width', scaleMax(scales.realX))
      .attr('height', scaleMin(scales.realBarY));
      
    this._drawBg(el, scales);
    this._drawAxes(el, scales, width, height);
    this._drawBars(el, scales, barsData);
    this._drawSpotlights(el, scales, spotlights, inputKey, pointsData, barsData);
    this._drawLines(el, scales, pointsData, onLineClick, onLineMove, canEdit);
    this._drawPoints(el, scales, pointsData, onMove, onSelect, onDelete, onPointMoveStart, canEdit);
  },
  
  _scales(el, domain, barsData, stateWidth, stateHeight)
  {
    if(!domain)
    {
      return null;
    }
    var width = stateWidth - xMargin;
    var height = stateHeight - 2 * yMargin;
    
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
      .range([height - yMargin, 0])
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