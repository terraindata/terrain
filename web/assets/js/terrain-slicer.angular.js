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

terrainApp.directive('d3Slicer', ['$window', '$timeout', 'd3Service', function($window, $timeout, d3Service) {
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
		    		width: $(ele[0]).width(),
		    		height: 34,
		    		minimumWeight: 5,
		    		selectFn: function() { /* no select fn specified */ }
		    	}, attrs);
		    	
		    	if(opts.cardId !== null) {
		    		opts.cardId = parseInt(opts.cardId);
		    	}

		    	var slices;

		    	function editable(slice) {
		    		return slice.id == opts.cardId || opts.cardId === -1;
		    	}
		    	function hasSlider(slice) {
		    		var sliceIndex = slices.indexOf(slice);
		    		return (slice.id == opts.cardId || sliceIndex == cardIndex - 1 || opts.cardId === -1) && sliceIndex != slices.length - 1;	
		    	}

		    	var slice_area, handle_area, slicer, cardIndex;

		    	function init() {
		    		slices = scope.data.reduce(function(builder, card) { if(card.transform) builder.push(card); return builder; }, []);
			    	$(ele[0]).html("");
				   	slicer = $(ele[0]).append("<div>").find("div")
				    	.addClass("slicer")
				    	.css("width", '100%') //opts.width)
				    	.css("height", opts.height);
			    	slice_area = slicer.append("<div class='slice-area'>").find('.slice-area');
			    	handle_area = slicer.append("<div class='handle-area'>").find('.handle-area');
			    	cardIndex = slices.reduce(function(ans, card, index) { if(card.id == opts.cardId) return index; return ans; }, -1);

			    	slice_area.html("");
			    	handle_area.html("");
			    	var sum = 0;
			    	$.each(slices, function(i) {
			    		var d = slice_area.append("<div class='"+i+"'>").find("."+i);
			    		d.addClass("slice")
			    		.css("width", this.weight + "%")
			    		.css("left", sum + "%")
			    		.css("background", this.color)
			    		.css("opacity", editable(this) ? 1.0 : 0.5)
			    		.html("<input type='tel' value='"+Math.floor(this.weight)+"' />" + "<span class='post-input'>%</span>");
			    		sum += this.weight;

			    		var slice = this;
			    		d.find('input').focus(function(event) {
			    			if(editable(slice))
			    				$(this).select();
			    			else
			    				$(this).blur();
			    		})
			    		.blur(function() {
			    			if(!editable(slice))
			    				return;
			    			var val = +$(this).val() || 0;
			    			val = val < opts.minimumWeight ? opts.minimumWeight : val;
			    			val = val > 100 ? 100 : val;
			    			$(this).val(val);
			    			var diff = slices[i].weight - val;
			    			slices[i].weight = val;
			    			if(slices[i+1])
			    				slices[i+1].weight += diff;
			    			else
			    				slices[i-1].weight += diff;
			    			scope.onChange({cardId: opts.cardId});
			    		})
			    		.keypress(function(event) {
			    			if(event.keyCode == 13) {
									// enter key
									$(this).blur();
								} else if(event.charCode < 48 || event.charCode > 57) {
									// not a number key
									event.preventDefault();
								}
							});

			    		if(hasSlider(this)) {
			    			var handle = handle_area.append("<div class='handle' rel='"+i+"'>")
			    									.find('.handle[rel='+i+']')
			    									.css('left', "calc(" + sum + '% - ' + $('.handle').width() / 2 + 'px)');
			    			var touchDown = function(evt) {
			    				handle.addClass('handle-selected');
			    				handle.attr('offset-x', (evt.pageX - handle.offset().left));
			    			}
			    			handle.on('mousedown', function(evt) {
			    				touchDown(evt);
			    			});
			    			handle.on('touchstart', function(evt) {
			    				evt.pageX = evt.originalEvent.touches[0].clientX;
			    				touchDown(evt);
			    			})
			    		}
			    	});
				}
				init();

				function updateSlicer() {
					var sum = 0;
					$.each(slices, function(i) {
						$(ele[0]).find('.slice-area').find("."+i)
						.css("width", this.weight + "%")
						.css("left", sum + "%")
						.find("input")
						.val(Math.floor(this.weight));
						sum += this.weight;

						if(hasSlider(this)) {
							$(ele[0]).find(".handle[rel="+i+"]").css('left', "calc(" + sum + '% - ' + $(ele[0]).find('.handle').width() / 2 + 'px)');
						}
					});
				}

				scope.$watch('data', function(newData, oldData) {
					var numSlices = newData.reduce(function(total, cur) { if(cur.transform) total ++; return total; }, 0);
					if(numSlices != slices.length)
						init();
					else
						updateSlicer();
				}, true);

				var moveEnd = function() {
					$(ele[0]).find('.handle-selected').removeClass('handle-selected');
				}
				$(document).on('mouseup', function() {
					moveEnd();
				});
				$(document).on('touchend', function() {
					moveEnd();
				});

				var touchMove = function(evt) {
					if($(ele[0]).find('.handle-selected').length) {
						evt.preventDefault();
						// This code moves the handle smoothly
						// $('.handle-selected').css('left', (evt.pageX - parseInt($('.handle-selected').attr('offset-x'))) + 'px');

						// This code snaps the handle to the nearest 1%
						var i  = +$(ele[0]).find('.handle-selected').attr('rel');
						var x = evt.pageX - slice_area.find("."+i).offset().left - $(ele[0]).find('.handle-selected').width() / 2;
						var perc = Math.round(x / slicer.width() * 100);

						var diff = slices[i].weight - perc;
						slices[i].weight = perc;

						if(slices[i + 1])
							slices[i + 1].weight += diff;

						if(slices[i].weight < opts.minimumWeight 
							|| (slices[i + 1] && slices[i + 1].weight < opts.minimumWeight) 
							|| slices.reduce(function(sum,slice) { return sum + Math.abs(slice.weight); }, 0) > 100) {
							
							// reset, block
							slices[i].weight += diff;
							if(slices[i + 1])
								slices[i + 1].weight -= diff;
						} else {
							// all good
							// $(ele[0]).find('.handle-selected').css('left', "calc(" + perc + '% - ' + $(ele[0]).find('.handle').width() / 2 + 'px)');
							scope.onChange({cardId: opts.cardId});
						}
					}
				}
				$(document).on('mousemove', function(evt) {
					touchMove(evt);
				});
				$(document).on('touchmove', function(evt) {
					evt.pageX = evt.originalEvent.touches[0].clientX;
					touchMove(evt);
				});
			}
		}
	}])