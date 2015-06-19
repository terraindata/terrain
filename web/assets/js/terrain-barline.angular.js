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

terrainApp.directive('d3Bars', ['$window', '$timeout', 'd3Service', function($window, $timeout, d3Service) {
		return {
    	restrict: 'EA', // (E)lement or (A)trribute
    	scope: {
	        data: '=', // bi-directional data-binding
	        onChange: '&'  // parent execution binding
	    },
	    link: function(scope, ele, attrs) {
	    	if(!scope || !scope.data)
	    		return;
	    	
	    	var opts = $.extend( {
	    		color: "#aaa",
	    		strokeWidth: 3,
	    		width: $(ele[0]).width(),
	    		height: 300,
	    		barWidth: 0.8,
	    		pointRadius: 5,
	    		yAxisTicks: 5,
	    		activeColor: "#ffa747",
	    		pointLabelFormat: function(d, i) {
	    			return Math.floor(d * 100) + "%";
	    		}
	    	}, attrs);

	    	var data = scope.data;

	var pointColor = opts.pointColor ? opts.pointColor : "#fff",
	barColor = d3.rgb(opts.color),
	strokeColor = opts.strokeColor ? opts.strokeColor : d3.rgb(opts.color).darker(1.25);

	var pointRadius = opts.pointRadius + opts.strokeWidth;
	var bottomMargin = opts.height * 0.1,
	topMargin = pointRadius * 2,
	leftMargin = 30,
	rightMargin = 40;

	var workingHeight = opts.height - bottomMargin - topMargin,
	workingWidth  = opts.width - leftMargin - rightMargin;

	var minY = topMargin,
	maxY = topMargin + workingHeight,
	minX = leftMargin,
	maxX = rightMargin + workingWidth;

	var numPoints = data.numberOfBars;
	var barWidth = workingWidth / numPoints * opts.barWidth;

	var yPointScale = d3.scale.linear()
	.domain(data.pointRange.reverse())
	.range([0, workingHeight]);

	var xScale = d3.scale.linear()
	.domain([0,numPoints])
	.range([0, workingWidth]);

	var svg = d3.select(ele[0])
	.append("svg")
	.attr("background", "#000")
	.attr("width", opts.width)
	.attr("height", opts.height);

	var scaleArea = svg.append("g");
	var barArea = svg.append("g");

	function barStartingX(i) {
		return i / numPoints * workingWidth + (workingWidth / numPoints - barWidth) / 2 + leftMargin;
	}

	function pointX(i) {
		var barOffset = 0;
		if(data.barToPointRatio > 1)
			barOffset = barStartingX(0);
		return barStartingX(i) * data.barToPointRatio + (barWidth) / 2 - barOffset;
	}

	function barStartingY(d) {
		return topMargin + workingHeight * (1 - d);
	}

	function pointY(d) {
		return barStartingY(d) - pointRadius / 2;
	}

	scope.$watch('data', function(newData) {
		$(barArea).find('.bar').remove();

		data = newData;
		data.bars = [];
		for(var i = 0; i < data.numberOfBars; i++) data.bars.push(0);
		var bucketExtremes = data.domain.length > 2 && data.domain[2]; 
		// if the third element in domain is 'true', leave the last bar as a 'catch-all-greater'
		var numBuckets = bucketExtremes ? data.numberOfBars - 1 : data.numberOfBars;

		function bucketForVal(val) {
			return Math.floor((val - data.domain[0]) / (data.domain[1] - data.domain[0]) * numBuckets);
		}
		
		$.each(data.raw, function(i, val) {
			// TODO use d3 domain functions
			var bucket = bucketForVal(val);
			if(bucket > numBuckets) {
				if(bucketExtremes)
					data.bars[numBuckets - 1] ++;
				// else drop
			} else if (bucket < 0) {
				// TODO support lower extremes
			} else {
				data.bars[bucket] ++;
			}
		});

		var maxValue = d3.max(data.bars, function(d) {
			return d;
		});

		for(var i = 0; i < data.bars.length; i ++)
			data.bars[i] /= maxValue;
		
	    barArea.selectAll("rect")
			.data(data.bars)
			.enter()
			.append("rect")
			.attr("x", function(d, i) {
				return barStartingX(i);
			})
			.attr("y", function(d, i) {
				if(d)
					return barStartingY(d);
				return 0;
			})
			.attr("width", function(d, i) {
				return barWidth;
			})
			.attr("height", function(d, i) {
				if(d)
					return workingHeight * d;
				return 0;
			})
			.attr("fill", function(d, i) {
				return barColor;
			})
			.attr("class", function(d, i) {
				return "bar bar_" + i;
			});

		// MARK: Axes

		scaleArea.selectAll("*").remove();

		var barXScale = d3.scale.linear()
			.domain([0, data.numberOfBars])
			// .domain([data.domain[0], data.domain[1]])
			// so there's a problem where d3's axis will override the ticks argument and force a "nice" number of buckets
			// so we can't give it the real domain but have to give it a dummy domain to force a certain number of ticks
			// please someone figure out how to fix this please oh please
			.range([0, workingWidth]);

		var xAxis = d3.svg.axis()
						.scale(barXScale) 
						.orient("bottom")
						.ticks(data.numberOfBars)
						.tickFormat(function(d,i) {
							return data.xLabelFormat(i, (i == data.numberOfBars && data.domain[2] ? i - 1 : i) * (data.domain[1] - data.domain[0]) / numBuckets + data.domain[0], i == data.numberOfBars && data.domain[2]);
						});
		scaleArea.append("g")
			.attr("class", "axis xAxis")
			.attr("transform", "translate("+leftMargin+","+(workingHeight + topMargin)+")")
			.call(xAxis);

		var yBarScale = d3.scale.linear()
						.domain([0,maxValue].reverse())
						.range([0, workingHeight]);

		var yBarAxis = d3.svg.axis()
							.scale(yBarScale)
							.orient("left")
							.ticks(5);
		scaleArea.append("g")
			.attr("class", "axis y-axis y-bar-axis")
			.attr("transform", "translate("+leftMargin+","+topMargin+")")
			.call(yBarAxis);


		var yPointAxis = d3.svg.axis()
						.scale(yPointScale)
						.orient("right")
						.ticks(5)
						.tickFormat(opts.pointLabelFormat);
		scaleArea.append("g")
			.attr("class", "axis y-axis y-point-axis")
			.attr("transform", "translate("+(workingWidth + leftMargin)+","+topMargin+")")
			.call(yPointAxis);

		// MARK: spotlights

		spotlightsArea.selectAll('*').remove();
		if(data.spotlights) {
			$.each(data.spotlights, function() {
				var radius = 15;
				var bucket = bucketForVal(this.rawValue);
				var point1 = data.points[Math.floor(bucket / data.barToPointRatio)];
				var point2 = data.points[Math.ceil(bucket / data.barToPointRatio)];
				var cx = pointX(Math.floor(bucket / data.barToPointRatio)) / 2 + pointX(Math.ceil(bucket / data.barToPointRatio)) / 2;
				var cy = pointY(point1) / 2 + pointY(point2) / 2;
				if(opts.spotlightAbove == 'true') {
					cy += (cy > 2 * radius + 5 ? -1.5 : 1.5) * (radius + 3);
				}

				spotlightsArea.append('circle')
							.attr('cx', cx)
							.attr('cy', cy)
							.attr('r', radius)
							.attr('fill', this.color)
							.attr('stroke', d3.rgb(this.color).darker(0.5))
							.attr('stroke-width', 1);
				
				var textSize = 16;
				spotlightsArea.append('text')
							.attr('x', cx)
							.attr('y', cy + ((radius * 2 - textSize) / 2))
							.text(this.label)
							.attr('text-anchor', 'middle')
							.attr('font-family', '"Open Sans", OpenSans')
							.attr('fill', '#fff')
							.attr('font-size', textSize * 1.15 + 'px');
			});
		}
	}, true);


	// MARK: Lines

	var lineFunction = d3.svg.line()
						.x(function(d,i) { return pointX(i); })
						.y(function(d,i) { return pointY(d); });

	if(opts.smoothLine == 'true') {
		lineFunction = lineFunction.interpolate("cardinal");
	}

	var lineGroup = svg.append('g');

	lineGroup.append("path")
	.attr("d", lineFunction(data.points))
	.attr("stroke", strokeColor)
	.attr("stroke-width", opts.strokeWidth)
	.attr("class", "path")
	.attr("fill", "none");
        // .css('z-index', 1);


	// MARK: Points

	svg //.append('g')
		//.attr('class', 'point-group')
		.selectAll("circle")
		.data(data.points)
		.enter()
		.append("circle")
		.attr("cx", function(d, i) {
			return pointX(i);
		})
		.attr("cy", function(d, i) {
			if(d)
				return pointY(d);
			return 0;
		})
		.attr("r", function(d, i) {
			return pointRadius;
		})
		.attr("fill", function(d, i) {
			return pointColor;
		})
		.attr("stroke", function(d, i) {
			return strokeColor;
		})
		.attr("stroke-width", function(d, i) {
			return opts.strokeWidth;
		})
		.attr("class", function(d, i) {
			return "point point_" + i;
		})
		.attr('index', function(d, i) {
			return i;
		})
		// .css('z-index', 999)
		.on("mousedown", function(d, i) {
			$(ele[0]).find(".point_" + i).attr("rel", "active");
			$(ele[0]).find("[rel=active]").css("stroke", opts.activeColor);
			$(ele[0]).find("[rel=active]").css("stroke-width", opts.strokeWidth * 1.5);
		})
		.on("mousedown", function(d, i) {
			$(ele[0]).find(".point_" + i).attr("rel", "active");
			$(ele[0]).find("[rel=active]").css("stroke", opts.activeColor);
			$(ele[0]).find("[rel=active]").css("stroke-width", opts.strokeWidth * 1.5);
		});;

		svg.on("mousemove", function() {
			if($(ele[0]).find("[rel=active]").length) {
				var pos = d3.mouse(this)[1];
				if(pos < minY)
					pos = minY;
				if(pos > maxY)
					pos = maxY;
				$(ele[0]).find("[rel=active]").attr("cy", pos);

				$(ele[0]).find(".path").remove();
				var index = $(ele[0]).find("[rel=active]").attr('index');
				data.points[index] = (workingHeight + topMargin - pos) / workingHeight; // yScale.invert(pos) / (data.barRange[1] - data.barRange[0]);
				lineGroup.append("path")
							.attr("d", lineFunction(data.points))
							.attr("stroke", strokeColor)
							.attr("stroke-width", opts.strokeWidth)
							.attr("class", "path")
							.attr("fill", "none");

				scope.onChange({cardId: opts.cardId});
			}
		})
		.on("mouseup", function() {
			// sense mouseup here in case cursor has moved off of the point
			$(ele[0]).find("[rel=active]").css("stroke", strokeColor);
			$(ele[0]).find("[rel=active]").css("stroke-width", opts.strokeWidth);
			$(ele[0]).find("[rel=active]").attr('rel', '');
		});
	var spotlightsArea = svg.append('g');


		return; 

		var renderTimeout;
		var margin = parseInt(attrs.margin) || 20,
		barHeight = parseInt(attrs.barHeight) || 20,
		barPadding = parseInt(attrs.barPadding) || 5;

		var svg = d3.select(ele[0])
		.append('svg')
		.style('width', '100%');

		$window.onresize = function() {
			scope.$apply();
		};

		scope.$watch(function() {
			return angular.element($window)[0].innerWidth;
		}, function() {
			scope.render(scope.data);
		});

		scope.$watch('data', function(newData) {
			scope.render(newData);
		}, true);

		scope.render = function(data) {
			data = [
			{name: "Greg", score: 98},
			{name: "Ari", score: 96},
			{name: 'Q', score: 75},
			{name: "Loser", score: 48}
			];
			scope.data = [
			{name: "Greg", score: 98},
			{name: "Ari", score: 96},
			{name: 'Q', score: 75},
			{name: "Loser", score: 48}
			];
			svg.selectAll('*').remove();

			if (!data) return;
			if (renderTimeout) clearTimeout(renderTimeout);

			renderTimeout = $timeout(function() {
				var width = d3.select(ele[0])[0][0].offsetWidth - margin,
				height = scope.data.length * (barHeight + barPadding),
				color = d3.scale.category20(),
				xScale = d3.scale.linear()
				.domain([0, d3.max(data, function(d) {
					return d.score;
				})])
				.range([0, width]);

				svg.attr('height', height);

				svg.selectAll('rect')
				.data(data)
				.enter()
				.append('rect')
				.on('click', function(d,i) {
					return scope.onClick({item: d});
				})
				.attr('height', barHeight)
				.attr('width', 140)
				.attr('x', Math.round(margin/2))
				.attr('y', function(d,i) {
					return i * (barHeight + barPadding);
				})
				.attr('fill', function(d) {
					return color(d.score);
				})
				.transition()
				.duration(1000)
				.attr('width', function(d) {
					return xScale(d.score);
				});
				svg.selectAll('text')
				.data(data)
				.enter()
				.append('text')
				.attr('fill', '#fff')
				.attr('y', function(d,i) {
					return i * (barHeight + barPadding) + 15;
				})
				.attr('x', 15)
				.text(function(d) {
					return d.name + " (scored: " + d.score + ")";
				});
			}, 200);
}
}};
}])