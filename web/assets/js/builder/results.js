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

MAP = 'map';
INPUT = 'input';

var _terrainBuilderExtension = _terrainBuilderExtension || function() {};

_terrainBuilderExtension.results = function(_deps) {
	$scope = _deps.$scope;
	$http = _deps.$http;
	$timeout = _deps.$timeout;


	/* ----------------------------
	 * Section: Result Initialization
	 * ---------------------------- */

	$scope.search = {
		lat: 37.77816542086827, long: -122.48045251661345
	}

	$http.get('assets/ajax/urbansitter.json').success(function(response) {
      	$scope.results = response.data;
      	var fields = {};
      	$.each($scope.results, function(index) {
      		var result = this;

      		$.each(result, function(key,val) {
      			fields[key] = 1;
      		});

      		// var locScore = latLongToDistance(result.lat, result.long, $scope.search.lat, $scope.search.long); //Math.pow(this.lat - $scope.search.lat, 2) + Math.pow(this.long - $scope.search.long, 2);
      		// // TODO make sense of the ridiculous number of different location types
      		// var locationKeys = ['location']; //, 'location_map', 'location_radius', 'location_mapradius', 'location_latlong'];
      		// $.each(locationKeys, function(i,key) {
      		// 	result[key] = locScore;
      		// });

      		/* add any more calculated result values here, as they come up, if they are not pre-calculated in the response */
      		result.overrideIndex = false;

      		$.each(result, function(key, val) {
      			var k = 'sitter.' + key;
      			if(key === 'imgUrl')
      				k = 'sitter.profile';
      			if(key.indexOf('.') !== -1)
      				k = key;
      			if(key.toLowerCase() === 'avgrating')
      				k = 'avgRating';
      			$scope._v_add(k, function(r) {
      				return r[key];
      			});
      		});
      	});
		$scope.resort();

		var i = 0;
		$scope.selectableFields = $.map(fields, function(val, key) {
			return {
				id: i++,
				name: key
			}
		});

		$scope.orderableFields = $scope.selectableFields.concat([{id: -1, name: '*TerrainScore'}]);

		if($scope.ab('start')) {
			$scope.transform_newKey($scope.data.cards[1], 'listing.price');
			$scope.transform_newKey($scope.data.cards[2], 'listing.location');
		}
    });

	$(window).resize(function() {
		$scope.resort();
	});

	$scope.selectableFields = [];
	$scope.orderableFields = [];


	/* ----------------------------
	 * Section: Result Helpers
	 * ---------------------------- */


	$scope.result_unpin = function(result) {
		result.overrideIndex = false;
		$scope.resort();
	}

	$scope.result_pin = function(result) {
		result.overrideIndex = result.index;
		result.$pinning = true;
		$scope.resort();
	}




	/* ----------------------------
	 * Section: Result Filtering & Sorting
	 * ---------------------------- */


	$scope.filterResult = function(result) {
		// return true if result should be displayed
		var filtersCard = $scope.cardFor('filters'), passing = true;;
		if(!filtersCard) return true;
		$.each(filtersCard.filters, function() {
			if(!passing || !this.first || !this.second || this.first.length === 0 || this.second.length === 0) return;

			firstValue = parseFloat($scope._v_result(this.first, result));
			secondValue = parseFloat($scope._v_result(this.second, result));
			if(firstValue === undefined || secondValue === undefined)
				return;

			switch(this.operator) {
				case 'le':
					passing = passing && (firstValue <= secondValue);
					break;
				case 'lt':
					passing = passing && (firstValue < secondValue);
					break;
				case 'ge':
					passing = passing && (firstValue >= secondValue);
					break;
				case 'gt':
					passing = passing && (firstValue > secondValue);
					break;
				case 'eq':
					passing = passing && (firstValue === secondValue);
					break;
				case 'ne':
					passing = passing && (firstValue !== secondValue);
					break;
				case 'in':
					firstValue = $scope._v_result(this.first, result);
					secondValue = $scope._v_result(this.second, result);
					passing = passing && ((secondValue.indexOf(firstValue) > -1) ? true : false); //we need to decide if we want to hack this functionality for the demo or just wait for the backend to do it
					break;
			}
		});
		return passing;
	}

	$scope.scoreForResult = function(result) {
		var orderCard = $scope.cardFor('order');
		if(orderCard) {
			return $scope._v_result(orderCard.order.field, result);
		}
		return "N/A";
	}


	$scope.resort = function() {
		if(!$scope.results) return;

		var showingResults = 0;
		$.each($scope.results, function() {
			this.showing = $scope.filterResult(this);
			if(this.showing)
				showingResults ++;
			else
				this.index = -1;
		});
		
		// since we want to allow manual overrides, we have to make our own sorting function. Fun, I know.
		// assumes: overrideIndexes are unique
		var resultsInOrder = [];
		var overrides = $scope.results.reduce(function(overrides, result) {
			if(result.overrideIndex !== false && result.showing) {
				if(overrides && overrides[result.overrideIndex]) {
					console.log("ERROR! DUPLICATE OVERRIDES!", result.overrideIndex, overrides[result.overrideIndex], result);
					result.overrideIndex = false;
					return overrides;
				}
				overrides[result.overrideIndex] = result;
				result.index = result.overrideIndex;
			}
			return overrides;
		}, {});
		var scores = [];
		var normals = $scope.results.reduce(function(normals, result) {
			if(result.overrideIndex === false && result.showing) {
				var score = $scope.scoreForResult(result);
				if(!normals[score])
					normals[score] = [];
				normals[score].push(result);
				scores.push(score);
			}
			return normals;
		}, {});

		scores.sort(function(a,b) { return a - b; });

		var orderCard = $scope.cardFor('order');
		if(!orderCard || orderCard.order.direction == 'descending')
			scores.reverse();

		var index = 0;
		while(index < showingResults) {
			if(!overrides[index]) {
				if(scores === undefined) {
					break;
				}
				var s = scores.shift();
				var n = normals[s];
				if(n === undefined) {
					break;
				}
				var r = n.shift();
				r.index = index;
				resultsInOrder.push(r);
			} else {
				resultsInOrder.push(overrides[index]);
			}
			index ++;
		}

		var top = 0, left = 0, resultHeight = 220, columns, w = $(window).width();
		if(w > 2501) {
			columns = 4;
		} else if(w > 2001) {
			columns = 3;
		} else if(w > 1081) {
			columns = 2;
		} else if(w > 768) {
			columns = 1;
		} else if(w > 401) {
			columns = 2;
		} else {
			columns = 1;
		}

		for(var i = 0; i < resultsInOrder.length; i ++) {
			var r = resultsInOrder[i];
			r.top = (Math.floor(i / columns) * resultHeight) + "px";
			r.left = (i % columns) * Math.floor(100 / columns) + "%";
			r.endTop = r.top;
			r.endLeft = r.left;
		}
	}

	var movingResultObj;
	$scope.touchDown = function(type, obj, evt) {
		movingResultObj = obj;
		// keep track of the origianl index so that dropping a card into its existing place does
		//  not cause it to be pinned; unless it was already pinned there.
		movingResultObj.$originalIndex = movingResultObj.overrideIndex ? -1 : movingResultObj.index;
		movingResultObj.$isMoving = true;
		movingResultObj.$sx = parseInt($("." + type + "[rel=" + movingResultObj.index + "]").css('left'));
		movingResultObj.$sy = parseInt($("." + type + "[rel=" + movingResultObj.index + "]").css('top'));
		movingResultObj.$x = movingResultObj.$sx;
		movingResultObj.$y = movingResultObj.$sy;

		if(evt.pageX && evt.pageY) {
			movingResultObj.$smx = evt.pageX;
			movingResultObj.$smy = evt.pageY;
		}

		movingResultObj.$smy += $(".results-area").scrollTop();
		movingResultObj.$smx += $(".results-area").scrollLeft();

		movingResultObj.$isMovingTransitioningOff = false;
	}

	$scope.reindex = function(result, index) {
		// reset all results to their original override indices, 
		//  so that if we are moving the result all over the place,
		//  we keep track of where things are / should be / started
		$.each($scope.results, function(i,r) {
			if(r.$originalOverrideIndex !== undefined)
				r.overrideIndex = r.$originalOverrideIndex;
			r.$originalOverrideIndex = undefined;
		});

		result.overrideIndex = index;
		result.$resultReindexMoving = true;

		// if all results below this one are pinned, we will need to shift things backward
		var direction = 1;
		var allResultsAfterArePinned = $scope.results.reduce(function(ans,cur) {
			if(cur.index >= index) {
				return ans && cur.overrideIndex !== false;
			}
			return ans;
		}, true);
		if(allResultsAfterArePinned)
			direction = -1;

		var indexToMove = index, resultToMove = $scope.results.reduce(function(ans,cur) { 
			if(cur.overrideIndex === indexToMove && !cur.$resultReindexMoving) 
				return cur; 
			return ans; 
		}, null);

		while(resultToMove !== null && resultToMove !== result) {
			indexToMove += direction;

			var nextResultToMove = $scope.results.reduce(function(ans,cur) { 
				if(cur.overrideIndex === indexToMove && !cur.$resultReindexMoving) 
					return cur; 
				return ans; 
			}, null);
			resultToMove.$originalOverrideIndex = resultToMove.overrideIndex;
			resultToMove.overrideIndex = indexToMove;
			resultToMove = nextResultToMove;
		}

		result.$resultReindexMoving = false;
		
		$scope.resort();
	}

	$scope.touchMove = function(type, obj, evt) {
		if(!movingResultObj || !movingResultObj.$isMoving) return;

		var ele = function(res) {
			return $(".result[rel=" + res.index + "]");
		}

		var mx, my;
		if(evt.pageX && evt.pageY) {
			mx = evt.pageX;
			my = evt.pageY;
		}

		my += $(".results-area").scrollTop();
		mx += $(".results-area").scrollLeft();

		var dx = mx - movingResultObj.$smx;
		var dy = my - movingResultObj.$smy;

		movingResultObj.$x = movingResultObj.$sx + dx;
		movingResultObj.$y = movingResultObj.$sy + dy;

		var columns = Math.round(ele(movingResultObj).parent().width() / ele(movingResultObj).width());

		var px = mx - ele(movingResultObj).parent().offset().left;
		if(px < 0) px = 0;
		if(px > ele(movingResultObj).parent().offset().left + ele(movingResultObj).parent().width()) px = ele(movingResultObj).parent().offset().left + ele(movingResultObj).parent().width();
		var py = my - ele(movingResultObj).parent().offset().top;
		if(py < 0) py = 0;
		var height = Math.ceil($(".result").length / columns) * ele(movingResultObj).height();
		if(py > ele(movingResultObj).parent().offset().top + height) py = ele(movingResultObj).parent().offset().top + height;

		var index = index = Math.floor(px / ele(movingResultObj).width());
		index += columns * Math.floor(py / ele(movingResultObj).height());

		if(index !== movingResultObj.overrideIndex)
			$scope.reindex(movingResultObj, index);

		movingResultObj.left = movingResultObj.$x + "px";
		movingResultObj.top = movingResultObj.$y + "px";
	}

	$scope.touchUp = function(type, obj, evt) {
		if(!movingResultObj || !movingResultObj.$isMoving)
			return;
		var movedObj = movingResultObj;
		movedObj.$isMovingTransitioningOff = true;

		// reset original override indices
		$.each($scope.results, function() {
			this.$originalOverrideIndex = this.overrideIndex;
		});

		$timeout(function() { 
			movedObj.$isMoving = false;
			movingResultObj = null;
			if(movedObj.$originalIndex == movedObj.overrideIndex && !movedObj.$pinning)
				movedObj.overrideIndex = false;
			// we need to know if we were pinning, because that click to pin will trigger this function too
			movedObj.$pinning = false;
			$timeout(function() {
				movedObj.top = movedObj.endTop;
				movedObj.left = movedObj.endLeft;
			}, 60);
		}, 30);
	}



	/* ----------------------------
	 * Section: Result View Functions
	 * ---------------------------- */

	 $scope.result_valueClass = function(value) {
	 	if(value && value.length > 15)
	 		return 'col-xs-12';
	 	return 'col-xs-6';
	 }

	 $scope.result_keyToDisplay = function(key) {
	 	if(key.indexOf(".") > 0)
	 		return key.substr(key.indexOf("."));
	 	return key;
	 }

	$scope.resultsShouldShowScore = function() {
		return $scope.cardFor('order');
	}

	
	$scope.selectedKey = function(field) {
		var selectCard =  $scope.cardFor('select');
		if(selectCard) {
			if(!field && selectCard.select.fields.length == 0) return true;
			return selectCard.select.fields.indexOf(field) != -1;
		}
		if(field.indexOf("availability.") === 0) {
			var f = $scope.cardFor('from');
			return f && f.from.joins.reduce(function(ans, cur) {
				return ans || cur.table == 'availability';
			}, false);
		}
		if(field === 'FinalScore')
			return false;
		return field;
	}

	$scope.logSelectCard = function() {
		var selectCard =  $scope.cardFor('select');
	}

	$scope.result_weightForKey = function(key) {
		var weight = 0;
		$.each($scope.data.cards, function() {
			if(this.transform && this.key == key) {
				weight = this.weight;
			}
		});
		if(weight === undefined)
			return 'N/A';
		return weight + '%';
	}


	$scope.numberToDisplay = function(val) {
		var score = Math.floor(val * 1000) / 1000;
		if(score > 1) {
			return score;
		}
		if(score == 0) {
			return "0";
		}
		if(score == 1) return "1.00";
		score = ("" + score).substr(1);
		while(score.length < 4) score = score + "0";
		return score;
	}

	$scope.numberOrTextToDisplay = function(val) {
		var v = +val;
		if(isNaN(v)) return val;
		return $scope.numberToDisplay(v);
	}

	$scope.scoreForResultDisplay = function(result) {
		return $scope.numberOrTextToDisplay($scope.scoreForResult(result));
	}

	$scope.scoreForResultSort = function(result) {
		// sorts low to hi and doesn't seem like you can control it from the template
		return result.index;
	}

	$scope.result_shouldShowWeightAndScoreForKey = function(key) {
		if(key && key.indexOf("imgUrl") === -1 && key !== "sitter.profile")
			return true;
		return false;
	}

	$scope.result_shouldShowImage = function(key) {
		if(key && (key.indexOf("imgUrl") !== -1 || key === "sitter.profile"))
			return true;
		return false;	
	}

	$scope.result_imgUrlForKey = function(key, result) {
		return "assets/img/data/urbansitter/" + $scope._v_result(key, result);
	}

	var resultHeight = 220;

	$scope.resultStyle = function(result) {
		var x, y;

		if(result.$isMoving) {
			x = result.$x;
			y = result.$y;
		} else {
			var ele = function(res) {
				return $(".result[rel=" + res.index + "]");
			}
			var parentWidth = ele(result).parent().width();

			// var columns = parentWidth / 

			y = $scope.results.reduce(function(total, current) {
				if(current.index < result.index && (current.index - 1) % columns == 0 && current.showing)
					total += resultHeight;
				return total;
			}, 0);

			x = (result.index % columns) * ele(result).width();
		}

		return { top: y + "px", left: x + "px" };
	}


}