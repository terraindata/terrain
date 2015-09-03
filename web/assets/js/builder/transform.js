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

// A module just for the transform cards
_terrainBuilderExtension.transform = function(_deps) {
	$scope = _deps.$scope;
	$http = _deps.$http;
	$timeout = _deps.$timeout;



	/* ----------------------------
	 * Section: Transform Card Initialization
	 * ---------------------------- */

	 $scope.transformSettings = {
		'listing.price': {
			name: 'Price',
			inDataResponse: true,
			data: {
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + "$" + (Math.floor(value));
				},
				domain: [0,400, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				barRange: [0,20],
				points: [0.64, 0.67, 0.90, 1, 0.3599999999999999].reverse(),
				pointRange: [0,1],
				barToPointRatio: 2
			},
		}, 
		'listing.location': {
			name: 'Location',
			data: {
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				barRange: [0,20],
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
		},
		'listing.rating': {
			name: 'Average Rating',
			inDataResponse: true,
			data: {
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (value) + " Stars";
				},
				domain: [0,5, false], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 5,
				barRange: [0,40],
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999].reverse(),
				pointRange: [0,1],
				barToPointRatio: 1
			},
		},
		'listing.bedrooms': {
			name: 'Number of Bedrooms',
			inDataResponse: true,
			data: {
				// labels: ["0", "1", "2", "3", "4+"],
				// bars: [0.27, 0.87, 1, 0.47, 0.17],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value));
				},
				domain: [0,3, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 4,
				barRange: [0,20],
				points: [0.75, 0.75, 0.75, 0.75],
				pointRange: [0,1],
				barToPointRatio: 1
			},
			newCardIsShowing: false,
			suggested: true
		},
		'listing.stays': {
			name: 'Number of Stays',
			inDataResponse: true,
			data: {
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value));
				},
				domain: [0,200, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.64].reverse(),
				pointRange: [0,1],
				barToPointRatio: 2
			},
		},
		'listing.reviews': {
			name: 'Number of Reviews',
			inDataResponse: true,
			data: {
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value));
				},
				domain: [0,100, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [0.4, 0.4, 0.6, 0.8, 1],
				pointRange: [0,1],
				barToPointRatio: 2
			},
		},
		/*
		'listing.location_map': {
			name: 'Location (Map)',
			data: {
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
		},
		'listing.location_mapradius': {
			name: 'Location (MapRadius)',
			data: {
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
		},
		'listing.location_radius': {
			name: 'Location (Radius)',
			data: {
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
		},
		'listing.location_latlong': {
			name: 'Location (LatLong)',
			data: {
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			newCardIsShowing: true,
			suggested: false
		}*/
	};

	var i = 77;
	$scope.transformableFields = $.map($scope.transformSettings, function(val, key) {
		return {
			id: i++,
			name: key
		}
	});


	/* ----------------------------
	 * Section: Transform Card Helpers
	 * ---------------------------- */

	$scope.cardForKey = function(key) {
		return $scope.getAllCards().reduce(function(card, candidate) {
			if(candidate.key === key)
				return candidate;
			return card;
		}, null);
	}

	$scope.hasTransformCards = function() {
		return $scope.cards.reduce(function(val, cur) { return val || cur.transform; }, false);
	}

	$scope.transformCards = function() {
		return $scope.cards.reduce(function(builder, cur) { if(cur.transform) builder.push(cur); return builder; }, []);
	}

	$scope.transform_newKey = function(card, obj, doApply) {
		if(obj) card.key = obj;
		if(!$scope._v_val(card.key)) {
			return;
		}

		// weight handling
		if(card.preTransform) {
			if($scope.hasTransformCards()) {
				card.weight = 10;
				var i = 0;
				while(i < $scope.cards.length && ($scope.cards[i].weight < 2 * card.weight || !$scope.cards[i].transform))
					i ++;
				
				if(i >= $scope.cards.length) {
					alert("There's no more space for a new card right now.");
					return;
				}

				$scope.cards[i].weight -= card.weight;
			} else {
				card.weight = 100;
			}
			card.color = $scope.getColor();
		}

		$.extend(card, $scope.transformSettings[card.key]);

		card.data.raw = [];
		$.each($scope.results, function() {
			// TODO make sure you update the raw values if you're transforming a Let variable, and it changes
			card.data.raw.push($scope._v_result(card.key, this));
		});
		
		card.preTransform = undefined;
		card.transform = true;
		card.transformArr = [1];

		$scope.resort();

		if(doApply) {
			$scope.$apply();
		}
	}



	/* ----------------------------
	 * Section: Transform Card View Functions
	 * ---------------------------- */


	// Spotlights

	$scope.spotlightColors = ['#67b7ff', '#67ffb7', '#ffb767', '#ff67b7', '#b7ff67', '#b767ff'];
	$scope.spotlightLabels = ["1","2","3","4","5","6"];
	$scope.spotlightToggle = function(result) {
		if(result.spotlight) {
			result.spotlight = false;
			$scope.spotlightColors.push(result.spotlightColor);
			$scope.spotlightLabels.splice(0,0,result.spotlightLabel);
		} else {
			if($scope.spotlightColors.length > 0) {
				result.spotlight = true;
				result.spotlightColor = $scope.spotlightColors.splice(0,1)[0];
				result.spotlightLabel = $scope.spotlightLabels.splice(0,1)[0];
			} else {
				alert('Maximum number of spotlights added.')
			}
		}

		$.each($scope.cards, function(cardIndex, card) {
			if(!card.data) return;
			card.data.spotlights = [];
			$.each($scope.results, function(resultIndex, result) {
				if(result.spotlight) {
					card.data.spotlights.push({
						rawValue: result[card.key],
						label: result.spotlightLabel,
						color: result.spotlightColor
					});
				}
			});
		});
	}


}