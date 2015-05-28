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

$.fn.slicer = function(slices, options, selectFn) {
	var opts = $.extend( {
		width: 400,
		height: 300,
		minimumValue: 5
	}, options);

	var slicer = $(this).append("<div>").find("div")
						.addClass("slicer")
						.css("width", opts.width)
						.css("height", opts.height);
	var slice_area = slicer.append("<div class='slice-area'>").find('.slice-area');
	var handle_area = slicer.append("<div class='handle-area'>").find('.handle-area');

	slice_area.html("");
	var sum = 0;
	$.each(slices, function(i) {
		var d = slice_area.append("<div class='"+i+"'>").find("."+i);
		d.addClass("slice")
			.css("width", this.value + "%")
			.css("left", sum + "%")
			.css("background", this.color)
			.css("opacity", this.editable ? 1.0 : 0.5)
			.css("padding-top", "calc((" + d.height() + "px - 1.1em)/2)")
			.html("<input type='tel' value='"+Math.floor(this.value)+"' />" + "<span class='post-input'>%</span>");
		sum += this.value;

		var slice = this;
		d.find('input').focus(function(event) {
							if(slice.editable)
								$(this).select();
							else
								$(this).blur();
						})
						.blur(function() {
							if(!slice.editable)
								return;
							var val = +$(this).val() || 0;
							val = val < opts.minimumValue ? opts.minimumValue : val;
							val = val > 100 ? 100 : val;
							$(this).val(val);
							var diff = slices[i].value - val;
							slices[i].value = val;
							if(slices[i+1])
								slices[i+1].value += diff;
							else
								slices[i-1].value += diff;
							update();
						})
						.keypress(function(event) {
							console.log(event);
							if(event.keyCode == 13) {
								// enter key
								$(this).blur();
								console.log("enter");
							} else if(event.charCode < 48 || event.charCode > 57) {
								// not a number key
								event.preventDefault();
								console.log("nonum");
							}
						});

		if(this.editable) {
			var handle = handle_area.append("<div class='handle'>").find('.handle')
				.css('left', "calc(" + sum + '% - ' + $('.handle').width() / 2 + 'px)')
				.attr('rel', i);
			handle.on('mousedown', function(evt) {
				handle.addClass('handle-selected');
				handle.attr('offset-x', (evt.pageX - handle.offset().left));
			});
		}
	});

	function update() {
		var sum = 0;
		$.each(slices, function(i) {
			slice_area.find("."+i)
				.css("width", this.value + "%")
				.css("left", sum + "%")
				.find("input")
				.val(Math.floor(this.value));
			sum += this.value;

			if(this.editable) {
				$(".handle[rel="+i+"]").css('left', "calc(" + sum + '% - ' + $('.handle').width() / 2 + 'px)');
			}
		});
	}

	$(document).on('mouseup', function() {
		$('.handle-selected').removeClass('handle-selected');
	});
	$(document).on('mousemove', function(evt) {
		if($('.handle-selected').length) {
			// This code moves the handle smoothly
			// $('.handle-selected').css('left', (evt.pageX - parseInt($('.handle-selected').attr('offset-x'))) + 'px');

			var x = evt.pageX - slicer.position().left - $('.handle-selected').width() / 2;
			var perc = Math.round(x / slicer.width() * 100);

			var i  = +$('.handle-selected').attr('rel');
			var diff = slices[i].value - perc;
			slices[i].value = perc;
			if(slices[i + 1])
				slices[i + 1].value += diff;
			if(slices[i].value < opts.minimumValue 
				|| (slices[i + 1] && slices[i + 1].value < opts.minimumValue) 
				|| slices.reduce(function(sum,slice) { return sum + Math.abs(slice.value); }, 0) > 100) {
				// reset, block
				slices[i].value += diff;
				if(slices[i + 1])
					slices[i + 1].value -= diff;
			} else {
				// all good
				$('.handle-selected').css('left', "calc(" + perc + '% - ' + $('.handle').width() / 2 + 'px)');
				update();
			}
		}
	});

	// var pointColor = opts.pointColor ? opts.pointColor : "#fff",
	// 	barColor = d3.rgb(opts.color).darker(0.42),
	// 	strokeColor = opts.strokeColor ? opts.strokeColor : opts.color;

	// var pointRadius = opts.pointRadius + opts.strokeWidth;

	// var numPoints = data.bars.length;
	// var bottomMargin = opts.height * 0.1,
	// 	topMargin = pointRadius * 2,
	// 	leftMargin = 30,
	// 	rightMargin = 40;

	// var workingHeight = opts.height - bottomMargin - topMargin,
	// 	workingWidth  = opts.width - leftMargin - rightMargin;

	// var minY = topMargin,
	// 	maxY = topMargin + workingHeight,
	// 	minX = leftMargin,
	// 	maxX = rightMargin + workingWidth;

	// var barWidth = workingWidth / numPoints * opts.barWidth;

	// var yBarScale = d3.scale.linear()
 //    				.domain(data.barRange.reverse())
 //    				.range([0, workingHeight]);

 //    var yPointScale = d3.scale.linear()
 //    				.domain(data.pointRange.reverse())
 //    				.range([0, workingHeight]);

 //    var xScale = d3.scale.linear()
 //    				.domain([0,numPoints])
 //    				.range([0, workingWidth]);

	// var svg = d3.select(this[0])
 //            .append("svg")
 //            .attr("background", "#000")
 //            .attr("width", opts.width)
 //            .attr("height", opts.height);

 //    function barStartingX(i) {
 //    	return i / numPoints * workingWidth + (workingWidth / numPoints - barWidth) / 2 + leftMargin;
 //    }

 //    function pointX(i) {
 //    	var barOffset = 0;
 //    	if(data.barToPointRatio > 1)
 //    		barOffset = barStartingX(0);
 //    	return barStartingX(i) * data.barToPointRatio + (barWidth) / 2 - barOffset;
 //    }

 //    function barStartingY(d) {
 //    	return topMargin + workingHeight * (1 - d);
 //    }

 //    function pointY(d) {
	// 	return barStartingY(d) - pointRadius / 2;
 //    }

	// svg.selectAll("rect")
	// 	.data(data.bars)
	// 	.enter()
	// 	.append("rect")
	// 	.attr("x", function(d, i) {
	// 		return barStartingX(i);
	// 	})
	// 	.attr("y", function(d, i) {
	// 		if(d)
	// 			return barStartingY(d);
	// 		return 0;
	// 	})
	// 	.attr("width", function(d, i) {
	// 		return barWidth;
	// 	})
	// 	.attr("height", function(d, i) {
	// 		if(d)
	// 			return workingHeight * d;
	// 		return 0;
	// 	})
	// 	.attr("fill", function(d, i) {
	// 		return barColor;
	// 	})
	// 	.attr("class", function(d, i) {
	// 		return "bar_" + i;
	// 	});

	// // MARK: Axes

	// var yBarAxis = d3.svg.axis()
 //                  .scale(yBarScale)
 //                  .orient("left")
 //                  .ticks(5);
	// svg.append("g")
	//     .attr("class", "axis y-axis y-bar-axis")
	//     .attr("transform", "translate("+leftMargin+","+topMargin+")")
	//     .call(yBarAxis);

	// var yPointAxis = d3.svg.axis()
 //                  .scale(yPointScale)
 //                  .orient("right")
 //                  .ticks(5)
	//     		  .tickFormat(opts.pointLabelFormat);
	// svg.append("g")
	//     .attr("class", "axis y-axis y-point-axis")
	//     .attr("transform", "translate("+(workingWidth + leftMargin)+","+topMargin+")")
	//     .call(yPointAxis);

	// var xAxis = d3.svg.axis()
 //                  .scale(xScale)
 //                  .orient("bottom")
 //                  .ticks(numPoints)
 //                  .tickFormat(function(d,i) {
 //                  	return data.labels[i];
 //                  });
	// svg.append("g")
	//     .attr("class", "axis xAxis")
	//     .attr("transform", "translate("+leftMargin+","+(workingHeight + topMargin)+")")
	//     .call(xAxis);


	// // MARK: Lines

	// var lineFunction = d3.svg.line()
 //                         .x(function(d,i) { return pointX(i); })
 //                         .y(function(d,i) { return pointY(d); })
 //                         .interpolate("cardinal");

 //    var lineGroup = svg.append('g');

 // 	lineGroup.append("path")
 //        .attr("d", lineFunction(data.points))
 //        .attr("stroke", opts.color)
 //        .attr("stroke-width", opts.strokeWidth)
 //        .attr("class", "path")
 //        .attr("fill", "none");
 //        // .css('z-index', 1);


	// // MARK: Points

	// svg //.append('g')
	// 	//.attr('class', 'point-group')
	// 	.selectAll("circle")
	// 	.data(data.points)
	// 	.enter()
	// 	.append("circle")
	// 	.attr("cx", function(d, i) {
	// 		return pointX(i);
	// 	})
	// 	.attr("cy", function(d, i) {
	// 		if(d)
	// 			return pointY(d);
	// 		return 0;
	// 	})
	// 	.attr("r", function(d, i) {
	// 		return pointRadius;
	// 	})
	// 	.attr("fill", function(d, i) {
	// 		return pointColor;
	// 	})
	// 	.attr("stroke", function(d, i) {
	// 		return strokeColor;
	// 	})
	// 	.attr("stroke-width", function(d, i) {
	// 		return opts.strokeWidth;
	// 	})
	// 	.attr("class", function(d, i) {
	// 		return "point point_" + i;
	// 	})
	// 	.attr('index', function(d, i) {
	// 		return i;
	// 	})
	// 	// .css('z-index', 999)
	// 	.on("mousedown", function(d, i) {
	// 		$(".point_" + i).attr("rel", "active");
	// 		$("[rel=active]").css("stroke", opts.activeColor);
	// 		$("[rel=active]").css("stroke-width", opts.strokeWidth * 1.5);
	// 	})
	// 	.on("mousedown", function(d, i) {
	// 		$(".point_" + i).attr("rel", "active");
	// 		$("[rel=active]").css("stroke", opts.activeColor);
	// 		$("[rel=active]").css("stroke-width", opts.strokeWidth * 1.5);
	// 	});;

	// svg.on("mousemove", function() {
	// 		if($("[rel=active]").length) {
	// 			var pos = d3.mouse(this)[1];
	// 			if(pos < minY)
	// 				pos = minY;
	// 			if(pos > maxY)
	// 				pos = maxY;
	// 			$("[rel=active]").attr("cy", pos);

	// 			$(".path").remove();
	// 			var index = $("[rel=active]").attr('index');
	// 			data.points[index] = (workingHeight + topMargin - pos) / workingHeight; // yScale.invert(pos) / (data.barRange[1] - data.barRange[0]);
	// 			lineGroup.append("path")
	// 		        .attr("d", lineFunction(data.points))
	// 		        .attr("stroke", opts.color)
	// 		        .attr("stroke-width", opts.strokeWidth)
	// 		        .attr("class", "path")
	// 		        .attr("fill", "none");
	// 		}
	// 	})
	// 	.on("mouseup", function() {
	// 		// sense mouseup here in case cursor has moved off of the point
	// 		// console.log()
	// 		$("[rel=active]").css("stroke", strokeColor);
	// 		$("[rel=active]").css("stroke-width", opts.strokeWidth);
	// 		$("[rel=active]").attr('rel', '');
	// 	});

	return;
}