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

var terrainControllers = angular.module('terrainControllers', []);

function selectPage(page) {
	$(".nav li").removeClass('active');
	page = page || location.hash;
	$(".nav li a[href='"+page+"']").parent().addClass('active');
}

terrainControllers.controller('BuilderCtrl', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {
	selectPage('#/builder');
	$scope.abConfig = $routeParams.abConfig;
	$scope.ab = function(exp) {
		if($scope.abConfig && $scope.abConfig.indexOf(exp) != -1)
			return true;
		return false;
	}

	$scope.colorIndex = 0;
	$scope.getColor = function() {
		return CARD_COLORS[$scope.colorIndex ++];
	}

	// $http.get('phones/phones.json').success(function(data) {
 //      $scope.cards = data;
 //    });

	$scope.cards = [{
		id: 0,
		name: 'Location',
		color: $scope.getColor(),
		data: {
			labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
			bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
			barRange: [0,20],
			points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
			pointRange: [0,1],
			barToPointRatio: 2
		},
		weight: 50,
		newCardIsShowing: true
	}, {
		id: 1,
		name: 'Price',
		color: $scope.getColor(),
		data: {
			labels: ["$0", "$100", "$200", "$300", "$400", "$500", "$600", "$700", "$800", ">$800"],
			bars: [0.44,0.65,1.0,0.58,0.68,0.38,0.24,0.12,0.22],
			barRange: [0,20],
			points: [0.64, 0.67, 0.90, 1, 0.3599999999999999].reverse(),
			pointRange: [0,1],
			barToPointRatio: 2
		},
		weight: 50,
		newCardIsShowing: false
	}];

	$scope.newCards = [
		{
			id: 2,
			name: 'Rating',
			data: {
				labels: ["0 Stars", "1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"],
				bars: [0.44,0.65,1.0,0.58,0.68],
				barRange: [0,40],
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999].reverse(),
				pointRange: [0,1],
				barToPointRatio: 1
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		},
		{
			name: 'Reviews',
			id: 3,
			data: {
				labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
				bars: [0.07, 0.27, 0.24, 0.17, 0.47, 1.0, 0.63, 0.5, 0.35],
				barRange: [0,20],
				points: [0.2,0.4,0.6,0.8,1],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			name: 'Bedrooms',
			id: 4,
			data: {
				labels: ["0", "1", "2", "3", "4+"],
				bars: [0.27, 0.87, 1, 0.47, 0.17],
				barRange: [0,20],
				points: [0.75, 0.75, 0.75, 0.75, 0.75],
				pointRange: [0,1],
				barToPointRatio: 1
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			name: 'Number of Stays',
			id: 5,
			data: {
				labels: ["0", "10", "25", "100", "250", "1000", "2500", ">2500"],
				bars: [0.37, 0.47, 1, 0.87, 0.47, 0.27, 0.17],
				barRange: [0,20],
				points: [1, 0.96, 0.84, 0.64].reverse(),
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			name: 'Number of Reviews',
			id: 6,
			data: {
				labels: ["0", "10", "25", "100", "250", "1000", "2500", ">2500"],
				bars: [0.47, 0.87, 1, 0.97, 0.39, 0.32, 0.12],
				barRange: [0,20],
				points: [0.4, 0.6, 0.8, 1],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			id: 7,
			name: 'Location_Map',
			data: {
				labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				barRange: [0,20],
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}, {
			id: 8,
			name: 'Location_MapRadius',
			data: {
				labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				barRange: [0,20],
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}, {
			id: 9,
			name: 'Location_Radius',
			data: {
				labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				barRange: [0,20],
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}, {
			id: 10,
			name: 'Location_LatLong',
			data: {
				labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				barRange: [0,20],
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}
	];

	$scope.addCard = function(cardToAdd, cardToAddInFrontOf) {
		var cardToSubtractWeightFrom = cardToAddInFrontOf;
		while(cardToSubtractWeightFrom && cardToSubtractWeightFrom.weight < 2 * cardToAdd.weight)
			cardToSubtractWeightFrom = $scope.cards[$scope.cards.indexOf(cardToSubtractWeightFrom) + 1];
		if(!cardToSubtractWeightFrom) {
			cardToSubtractWeightFrom = cardToAddInFrontOf;
			while(cardToSubtractWeightFrom && cardToSubtractWeightFrom.weight < 2 * cardToAdd.weight)
				cardToSubtractWeightFrom = $scope.cards[$scope.cards.indexOf(cardToSubtractWeightFrom) - 1];
			if(!cardToSubtractWeightFrom) {
				alert("There's no more space for a new card right now.");
				return;
			}
		}

		cardToSubtractWeightFrom.weight -= cardToAdd.weight;
		cardToAdd.color = $scope.getColor();
		$scope.cards.splice($scope.cards.indexOf(cardToAddInFrontOf), 0, cardToAdd);
			cardToAddInFrontOf.newCardIsShowing = false;
		if($scope.newCards.indexOf(cardToAdd) != -1)
			$scope.newCards.splice($scope.newCards.indexOf(cardToAdd), 1);
		if($scope.cards.indexOf(cardToAdd) == 0)
			cardToAdd.newCardIsShowing = true;
	}

	$scope.addCardAndApply = function(cardToAdd, cardToAddInFrontOf) {
		$scope.addCard(cardToAdd, cardToAddInFrontOf);
		$scope.$apply();
	}

	$scope.newCardIsShowing = function() {
		if(arguments.length == 2) {
			arguments[0].newCardIsShowing = arguments[1];
		}
		return arguments[0].newCardIsShowing;
	}

	$scope.handleChange = function(cardId) {
		$scope.$apply();
	}
}]);

terrainControllers.controller('PlaceholderCtrl', ['$scope', '$routeParams', function($scope, $routeParams) {
	$scope.page = window.location.hash.substr(2);
	selectPage();
}]);