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

function a() {
	if(location.hash.indexOf('fast') > 0) return;

	var ele = $('.loading-screen');
	ele.css('background', '#fff');
	ele.css('class', 'loading-screen');
	ele.css('position', 'absolute');
	ele.css('left', '0');
	ele.css('top', '0');
	ele.css('z-index', '99999');
	ele.css('width', '100%');
	ele.css('height', '100%');

	function doTheHex() {
		ele.html("");
		var svg = d3.select(ele[0])
					.append("svg")
					.attr("background", "#57ffa7")
					.attr("width", "100%")
					.attr("height", "100%");

		var xd = 0.5, yd = 0.866;
		
		var opacityRange = 0.75, minOpacity = 0.25;

		var durationR = 0.25, durationLength = 2000, durationSegments = 3, totalDuration = durationSegments * durationLength;

		function hex(cx, cy, r) {

			var points = [
				[cx - r, cy],
				[cx - r * xd, cy - r * yd],
				[cx + r * xd, cy - r * yd],
				[cx + r, cy],
				[cx + r * xd, cy + r * yd],
				[cx - r * xd, cy + r * yd],
				[cx - r, cy]
			]

			var lineFunction = d3.svg.line()
						.x(function(a) { return a[0]; })
						.y(function(a) { return a[1]; });


			var durationSum = 0;
			var durationSlice = function() {
				var v = durationLength * (1 - durationR + Math.random() * durationR * 2);
				durationSum += v;
				return v;
			}

			svg.append("path")
				.attr("d", lineFunction(points))
				.attr("fill", "#37df97")
				.attr("opacity", function() {
					return 0;
				})
				.transition()
				.duration(durationSlice)
				.attr("opacity", function() {
					return Math.random() * opacityRange + minOpacity;
				})
				.transition()
				.duration(durationSlice)
				.attr("opacity", function() {
					return Math.random() * opacityRange + minOpacity;
				})
				.transition()
				.duration(durationSlice)
				.attr("opacity", function() {
					return Math.random() * opacityRange + minOpacity;
				})
				.transition()
				.duration(function() {
					return durationLength * (1 - durationR + Math.random() * durationR * 2);
				})
				.attr("opacity", 0);
		}

		var maxX = ele.width(), maxY = ele.height();

		var r = 25, stroke = 1;

		for(var y = -1 * r * yd - 2; y < maxY + 2 * r; y += 2 * r * yd + 2 * stroke ) {
			for(var x = -1 * r; x < maxX + 2 * r; x += 4 * r - 2 * r * xd + 2 * stroke) {
				hex(x, y, r);
				hex(x + r * (1 + xd) + stroke, y + r * yd + stroke, r);
			}
		}

		var fadeInDuration = durationLength / 2, loadingDuration = totalDuration, fadeOutDuration = durationLength / 2;
		var barWidth = 200, barHeight = 10;
		var imgWidth = barWidth;
		var imgHeight = imgWidth, totalHeight = imgHeight + barHeight;
		var barY = (maxY - totalHeight) / 2 + imgHeight;
		svg.append('rect')
			.attr('x', maxX / 2 - barWidth / 2)
			.attr('y', barY)
			.attr('width', barWidth)
			.attr('height', barHeight)
			.attr('fill', '#fff')
			.attr('stroke-width', '2px')
			.attr('stroke', '#fff')
			.attr('rx', '4px')
			.attr('opacity', 0)
			.transition()
			.duration(fadeInDuration)
			.attr('opacity', 1)
			.transition()
			.delay(loadingDuration)
			.duration(fadeOutDuration)
			.attr('opacity', 0);

		svg.append('rect')
			.attr('x', maxX / 2 - barWidth / 2)
			.attr('y', barY)
			.attr('width', 0)
			.attr('height', barHeight)
			.attr('fill', '#37df97')
			.attr('rx', '4px')
			.attr('opacity', 0)
			.transition()
			.duration(fadeInDuration)
			.attr('opacity', 1)
			.transition()
			.duration(loadingDuration)
			.attr('width', barWidth)
			.transition()
			.duration(fadeOutDuration)
			.attr('opacity', 0);

		svg.append("svg:image")
	        .attr("xlink:href", "assets/img/Terrain_Logo_White_Shadow.png")
			.attr('x', maxX / 2 - imgWidth / 2)
			.attr('y', (maxY - totalHeight) / 2)
			.attr('width', imgWidth)
			.attr('height', imgHeight)
			.attr('opacity', 0)
			.transition()
			.duration(fadeInDuration)
			.attr('opacity', 1)
			.transition()
			.delay(loadingDuration + fadeInDuration)
			.duration(fadeOutDuration)
			.attr('opacity', 0);

		setTimeout(function() {
			ele.css('transition', 'all ' + (fadeOutDuration / 1000) + 's');
			ele.css('background', 'rgba(255,255,255,0)');
			setTimeout(function() {
				ele.remove();
			}, fadeOutDuration * 3);
		}, loadingDuration);
	}

	$(document).ready(function() {
		// $('body').append(ele);
		// console.log('b');
		setTimeout(doTheHex, 500);
		// doTheHex();
	})
};
a();