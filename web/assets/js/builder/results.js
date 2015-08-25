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

	$http.get('assets/ajax/airbnb.json').success(function(response) {
      	$scope.results = response.data;
      	var fields = {};
      	$.each($scope.results, function(index) {
      		var result = this;

      		$.each(result, function(key,val) {
      			fields[key] = 1;
      		});

      		/* Locations */
      		var locScore = latLongToDistance(result.lat, result.long, $scope.search.lat, $scope.search.long); //Math.pow(this.lat - $scope.search.lat, 2) + Math.pow(this.long - $scope.search.long, 2);
      		// TODO make sense of the ridiculous number of different location types
      		var locationKeys = ['location']; //, 'location_map', 'location_radius', 'location_mapradius', 'location_latlong'];
      		$.each(locationKeys, function(i,key) {
      			result[key] = locScore;
      		});

      		/* add any more calculated result values here, as they come up, if they are not pre-calculated in the response */
      		result.overrideIndex = false;

      		$.each(result, function(key, val) {
      			$scope.addRawScoreToCardWithKey(key, val);
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
    });

	$scope.selectableFields = [];
	$scope.orderableFields = [];


	/* ----------------------------
	 * Section: Result Helpers
	 * ---------------------------- */


	$scope.unpin = function(result) {
		result.overrideIndex = false;
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
			if(!this.field || this.field.length == 0 || this.value.length == 0)
				return;
			var fieldValue = result[this.field], filterValue;
			if(this.valueType == 'input') {
				var input = $scope.inputFor(this.value);
				if(!input || input.value.length == 0) return;
				filterValue = input && input.value;
			} else {
				filterValue = this.value;
			}
			filterValue = parseFloat(filterValue);
			fieldValue = parseFloat(fieldValue);
			switch(this.operator) {
				case 'le':
					passing = passing && (fieldValue <= filterValue);
					break;
				case 'lt':
					passing = passing && (fieldValue < filterValue);
					break;
				case 'ge':
					passing = passing && (fieldValue >= filterValue);
					break;
				case 'gt':
					passing = passing && (fieldValue > filterValue);
					break;
				case 'eq':
					passing = passing && (fieldValue === filterValue);
					break;
				case 'ne':
					passing = passing && (fieldValue !== filterValue);
					break;
				case 'in':
					passing = passing && true; //we need to decide if we want to hack this functionality for the demo or just wait for the backend to do it
					break;
			}
		});
		return passing;
	}


	$scope.cardValueForResult = function(card, result) {
		if(!card.transform)
			return false;
		return result[card.key];
	}

	$scope.cardScoreForResult = function(card, result) {
		var data = card.data;
		if(!data || !card.transform)
			return 0;
		if($scope.cardValueForResult(card, result) === undefined)
			return 0;

		// TODO replace by a better bucket getter if you redo buckets
		var bucketStart = data.domain[0];
		var bucketEnd = data.domain[1];
		var bucketSize = (bucketEnd - bucketStart) / data.numberOfBars;
		var bucket = 0;
		while($scope.cardValueForResult(card, result) > bucketStart + bucketSize * bucket && bucket < data.numberOfBars) bucket ++;
		bucket --; // we always overshoot it

		return (data.points[Math.floor(bucket / data.barToPointRatio)] + data.points[Math.ceil(bucket / data.barToPointRatio)]) / 2;
	}

	$scope.scoreForResult = function(result) {
		var orderCard = $scope.cardFor('order');
		if(orderCard && orderCard.order.field != '*TerrainScore') {
			return result[orderCard.order.field];
		}

		// TerrainScore
		var total = 0;
		$.each($scope.cards, function(index, card) {
			if(card.transform) {
				var score = $scope.cardScoreForResult(card,result);
				if(!isNaN(score))
					total += score * card.weight / 100;
			}
		});
		return total; 
	}


	$scope.resort = function() {
		if(!$scope.results) return;
		
		// since we want to allow manual overrides, we have to make our own sorting function. Fun, I know.
		// assumes: overrideIndexes are unique
		var showingResults = 0;
		var overrides = $scope.results.reduce(function(overrides, result) {
			if(result.overrideIndex !== false && $scope.filterResult(result)) {
				overrides[result.overrideIndex] = result;
				result.index = result.overrideIndex;
				showingResults ++;
			}
			return overrides;
		}, {});
		var scores = [];
		var normals = $scope.results.reduce(function(normals, result) {
			if(result.overrideIndex === false && $scope.filterResult(result)) {
				var score = $scope.scoreForResult(result);
				if(!normals[score])
					normals[score] = [];
				normals[score].push(result);
				scores.push(score);
				showingResults ++;
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
				normals[scores.shift()].shift().index = index;
			}
			index ++;
		}

	}

	
	$scope.touchDown = function(type, obj, evt) {

		obj.$isMoving = true;
		obj.$sx = parseInt($("." + type + "[rel=" + obj.index + "]").css('left'));
		obj.$sy = parseInt($("." + type + "[rel=" + obj.index + "]").css('top'));
		obj.$x = obj.$sx;
		obj.$y = obj.$sy;

		if(evt.pageX && evt.pageY) {
			obj.$smx = evt.pageX;
			obj.$smy = evt.pageY;
		}

		obj.$smy += $(".results-area").scrollTop();
		obj.$smx += $(".results-area").scrollLeft();

		obj.$isMovingTransitioningOff = false;
	}

	$scope.reindex = function(result, index) {
		$.each($scope.results, function(i,r) {
			if(r.$originalOverrideIndex !== undefined)
				r.overrideIndex = r.$originalOverrideIndex;
			r.$originalOverrideIndex = undefined;
		});

		var indexToMove = index, resultToMove = $scope.results.reduce(function(ans,cur) { if(cur.overrideIndex === indexToMove) return cur; return ans; }, null);
		while(resultToMove !== null && resultToMove !== result) {
			indexToMove ++;
			var nextResultToMove = $scope.results.reduce(function(ans,cur) { if(cur.overrideIndex === indexToMove) return cur; return ans; }, null);
			resultToMove.$originalOverrideIndex = resultToMove.overrideIndex;
			resultToMove.overrideIndex = indexToMove;
			resultToMove = nextResultToMove;
		}
		result.overrideIndex = index;
		$scope.resort();
	}

	$scope.touchMove = function(type, obj, evt) {
		if(!obj.$isMoving) return;

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

		var dx = mx - obj.$smx;
		var dy = my - obj.$smy;

		obj.$x = obj.$sx + dx;
		obj.$y = obj.$sy + dy;

		var columns = Math.round(ele(obj).parent().width() / ele(obj).width());

		var px = mx - ele(obj).parent().offset().left;
		if(px < 0) px = 0;
		if(px > ele(obj).parent().offset().left + ele(obj).parent().width()) px = ele(obj).parent().offset().left + ele(obj).parent().width();
		var py = my - ele(obj).parent().offset().top;
		if(py < 0) py = 0;
		var height = Math.ceil($(".result").length / columns) * ele(obj).height();
		if(py > ele(obj).parent().offset().top + height) py = ele(obj).parent().offset().top + height;

		var index = index = Math.floor(px / ele(obj).width());
		index += columns * Math.floor(py / ele(obj).height());

		if(index !== obj.overrideIndex)
			$scope.reindex(obj, index);
	}

	$scope.touchUp = function(type, obj, evt) {
		obj.$isMovingTransitioningOff = true;
		$timeout(function() { obj.$isMoving = false; }, 30);
	}



	/* ----------------------------
	 * Section: Result View Functions
	 * ---------------------------- */


	$scope.resultsShouldShowScore = function() {
		return $scope.cardFor('order');
	}

	
	$scope.selectedField = function(field) {
		var selectCard =  $scope.cardFor('select');
		if(selectCard) {
			if(!field && selectCard.select.fields.length == 0) return true;
			return selectCard.select.fields.indexOf(field) != -1;
		}
		return field;
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

	$scope.scoreForResultDisplay = function(result) {
		return $scope.numberToDisplay($scope.scoreForResult(result));
	}

	$scope.cardValueForResultDisplay = function(card, result) {
		return $scope.numberToDisplay($scope.cardValueForResult(card, result));
	}

	$scope.cardScoreForResultDisplay = function(card, result) {
		return $scope.numberToDisplay($scope.cardScoreForResult(card, result));
	}


	$scope.scoreForResultSort = function(result) {
		// sorts low to hi and doesn't seem like you can control it from the template
		return result.index;
	}


	$scope.resultStyle = function(result) {
		var x, y;

		if(result.$isMoving) {
			x = result.$x;
			y = result.$y;
		} else {
			var ele = function(res) {
				return $(".result[rel=" + res.index + "]");
			}

			var columns = Math.round(ele(result).parent().width() / ele(result).width());

			y = $scope.results.reduce(function(total, current) {
				if(current.index < result.index && (current.index - 1) % columns == 0 && $scope.filterResult(current))
					total += ele(current).height();
				return total;
			}, 0);

			x = result.index % columns * ele(result).width();
		}

		return { top: y + "px", left: x + "px" };
	}


}