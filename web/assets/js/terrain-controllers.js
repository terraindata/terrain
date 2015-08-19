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
	$(".navbar-tql").hide();
	if(page == '#/builder') $(".navbar-tql").show();
}

terrainControllers.controller('BuilderCtrl', ['$scope', '$routeParams', '$http', '$timeout', 
									function($scope, $routeParams, $http, $timeout) {
	selectPage('#/builder');

	var isShowing = ['builder', 'inputs', 'results'];
	$scope.showing = function(page, value) {
		if($(window).width() > 767)
			return true;
		if(value === undefined)
			return isShowing.indexOf(page) !== -1;
		if(value && isShowing.indexOf(page) === -1)
			isShowing.push(page);
		if(!value && isShowing.indexOf(page) !== -1)
			isShowing.splice(isShowing.indexOf(page), 1);
	}

	$(window).resize(function() {
		$scope.$apply();
	})

	$scope.abConfig = $routeParams.abConfig;
	$scope.ab = function(exp) {
		if($scope.abConfig && $scope.abConfig.indexOf(exp) != -1)
			return true;
		return false;
	}

	if($scope.ab('logo')) {
		$(".navbar-logo").addClass("navbar-logo-green");
	}

	if($scope.ab('rounded')) {
		$("body").addClass("rounded");
	}

	if($scope.ab('slightly-rounded')) {
		$("body").removeClass("rounded");
		$("body").addClass("slightly-rounded");
	}

	$scope.colorIndex = 0;
	$scope.getColor = function() {
		return CARD_COLORS[$scope.colorIndex ++];
	}

	$scope.cardForKey = function(key) {
		return $scope.getAllCards().reduce(function(card, candidate) {
			if(candidate.key === key)
				return candidate;
			return card;
		}, null);
	}

	$scope.addRawScoreToCardWithKey = function(key, score) {
		// there must be a better way to do this
		var card = $scope.cardForKey(key);
		card.data.raw = card.data.raw || [];
      	card.data.raw.push(score);
	}

	$scope.search = {
		lat: 37.782,
		long: -122.438
	};

	$scope.getAllCards = function() {
		// silly design decision. TODO make the cards as one variable and adjust accordingly
		return $scope.cards.concat($scope.newCards);
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
      		var locScore = latLongToDistance(this.lat, this.long, $scope.search.lat, $scope.search.long); //Math.pow(this.lat - $scope.search.lat, 2) + Math.pow(this.long - $scope.search.long, 2);
      		// TODO make sense of the ridiculous number of different location types
      		var locationKeys = ['location', 'location_map', 'location_radius', 'location_mapradius', 'location_latlong'];
      		$.each(locationKeys, function(i,key) {
      			result[key] = locScore;
      			$scope.addRawScoreToCardWithKey(key, locScore);
      		});

      		/* add any more calculated result values here, as they come up, if they are not pre-calculated in the response */
      		result.overrideIndex = false;

      		// sooo inefficient omg omg
      		$.each($scope.getAllCards(), function() {
      			var card = this;
      			if(card.inDataResponse) {
      				$scope.addRawScoreToCardWithKey(card.key, result[card.key]);
      			}
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

	$scope.fromOptions = [
		{ id: 1, name: 'Listings' },
		{ id: 2, name: 'Reviews' },
		{ id: 3, name: 'Renters' },
		{ id: 4, name: 'Leasers' }
		];
	$scope.selectableFields = [
		// { id: 1, name: 'name' },
		// { id: 2, name: 'price' },
		// { id: 3, name: 'rating' },
		// { id: 4, name: 'reviews' },
		// { id: 5, name: 'stays' },
		// { id: 6, name: 'description'}
		];
	$scope.orderableFields = [];

	// $scope.setFieldForCard = function(card, fieldIndex, fieldObj) {

	// }

	$scope.titleForCard = function(card) {
		if(card.from) return 'From';
		if(card.select) return 'Select';
		if(card.filters) return 'Filter';
		if(card.transform) return 'Transform';
		if(card.order) return 'Order';
	}

	$scope.cardFor = function(type) {
		return $scope.cards.reduce(function(prev,cur) { if(cur[type]) return cur; return prev; }, null);
	}

	$scope.resultsShouldShowScore = function() {
		return $scope.cardFor('order');
	}

	$scope.apply = function() {
		var selectCard = $scope.cardFor('select');
		$scope.$apply();
	}

	$scope.newSelectFieldForCard = function(card) {
		card.select.fields = card.select.fields.concat(['$%#@']);
		card.select.fields[card.select.fields.length - 1] = "";
		$timeout(function() {
			$(".card-" + card.id + " .card-select-field-" + (card.select.fields.length - 1) + " input").focus();
		}, 100);
	}

	$scope.removeSelectFieldFromCard = function(card, selectFieldIndex) {
		card.select.fields.splice(selectFieldIndex, 1);
	}

	$scope.checkForNewInput = function(card) {
		if(card.filters) {
			$.each(card.filters, function(index,filter) {
				if(filter.value && filter.value.length > 0 && filter.valueType == 'input') {
					if(! $scope.inputs.reduce(function(value,cur) { if(cur.name == filter.value) return true; return value; }, false)) {
						$scope.newInput(-1, filter.value);
						// console.log('check5');
						// $scope.inputs.push({ name: filter.value, value: '', showing: false });
					}
				}
			});
		}
	}

	$scope.blurOnEnter = function(evt) {
		if(evt.keyCode == 13) {
			$(evt.currentTarget).blur();
		}
	}

	$scope.addFilter = function(card) {
		card.filters.push({
			field: '',
			valueType: 'input',
			value: '',
			operator: 'le'
		});
		setTimeout(function() {
			$(".card-"+card.id).find(".filter-field-input-wrapper:last-child input").focus();
		}, 250);
	}

	$scope.operatorToHtml = function(operator) {
		return "&"+operator+";";
	}

	$scope.inputFor = function(inputName) {
		return $scope.inputs.reduce(function(prev,cur) { return cur.name == inputName ? cur : prev; }, null);
	}

	$scope.filterResult = function(result) {
		// return true if result should be displayed
		var filtersCard = $scope.cardFor('filters'), passing = true;;
		if(!filtersCard) return true;
		console.log(filtersCard.filters);
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
					passing = passing && true; //Note: if we want to take the backend functionality of lists, we will need to implement. Currently always passes.
					break;
			}
		});
		return passing;
	}

	$scope.selectedField = function(field) {
		var selectCard =  $scope.cardFor('select');
		if(selectCard) {
			if(!field && selectCard.select.fields.length == 0) return true;
			return selectCard.select.fields.indexOf(field) != -1;
		}
		if(!field) return true;
		return false;
	}

	$scope.cards = [{
		id:24,
		from: {
			value: 'Listings'
		},
		name: 'From',
		useTitle: true,
		suggested: true
	}, {
		id: 17,
		select: {
			fields: ['name', 'price', 'rating', 'stays', 'description']
		},
		name: 'Select',
		suggested: true
	}, {
		id: 237,
		filters: [{
			field: 'price',
			valueType: 'input',
			value: 'MaxPrice',
			operator: 'le'
		}],
		name: 'Filter',
		suggested: true
	}, { 
		id: 0,
		order: {
			field: "*TerrainScore",
			direction: "descending"
		},
		name: "Order",
		useTitle: true,
		suggested: true,
	}, {
		id: 1,
		transform: true,
		name: '[Transform] Price',
		key: 'price',
		inDataResponse: true,
		color: $scope.getColor(),
		data: {
			// labels: ["$0", "$50", "$100", "$150", "$200", "$250", "$300", "$350", "$400", ">$400"],
			// bars: [0.44,0.65,1.0,0.58,0.68,0.38,0.24,0.12,0.22],
			xLabelFormat: function(i, value, isMaxpoint) {
				return (isMaxpoint ? "> " : "") + "$" + (Math.floor(value));
			},
			domain: [0,400, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
			numberOfBars: 9,
			barRange: [0,20],
			points: [0.64, 0.67, 0.90, 1, 0.3599999999999999].reverse(),
			// points: 5,
			pointRange: [0,1],
			barToPointRatio: 2
		},
		weight: 50,
		newCardIsShowing: false,
		showing: true,
		suggested: true
	}, {
		id: 23,
		transform: true,
		name: '[Transform] Location',
		key: 'location',
		color: $scope.getColor(),
		data: {
			// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
			// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
			xLabelFormat: function(i, value, isMaxpoint) {
				return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
			},
			domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
			numberOfBars: 9,
			barRange: [0,20],
			points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
			// points: 5,
			pointRange: [0,1],
			barToPointRatio: 2
		},
		weight: 50,
		newCardIsShowing: false,
		showing: true,
		suggested: true
	}];

	$scope.newCards = [
		{
			id: 2,
			transform: true,
			name: '[Transform] Average Rating',
			key: 'rating',
			inDataResponse: true,
			data: {
				// labels: ["0 Stars", "1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"],
				// bars: [0.44,0.65,1.0,0.58,0.68],
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
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		},
		{
			transform: true,
			name: '[Transform] Number of Bedrooms',
			key: 'bedrooms',
			inDataResponse: true,
			id: 4,
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
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			transform: true,
			name: '[Transform] Number of Stays',
			key: 'stays',
			inDataResponse: true,
			id: 5,
			data: {
				// labels: ["0", "10", "25", "100", "250", "1000", "2500", ">2500"],
				// bars: [0.37, 0.47, 1, 0.87, 0.47, 0.27, 0.17],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value));
				},
				domain: [0,200, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.64].reverse(),
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			transform: true,
			name: '[Transform] Number of Reviews',
			key: 'reviews',
			inDataResponse: true,
			id: 6,
			data: {
				// labels: ["0", "10", "25", "100", "250", "1000", "2500", ">2500"],
				// bars: [0.47, 0.87, 1, 0.97, 0.39, 0.32, 0.12],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value));
				},
				domain: [0,100, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [0.4, 0.4, 0.6, 0.8, 1],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: false,
			suggested: true
		}, {
			id: 7,
			transform: true,
			name: '[Transform] Location (Map)',
			key: 'location_map',
			data: {
				// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}, {
			id: 8,
			transform: true,
			name: '[Transform] Location (MapRadius)',
			key: 'location_mapradius',
			data: {
				// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}, {
			id: 9,
			transform: true,
			name: '[Transform] Location (Radius)',
			key: 'location_radius',
			data: {
				// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}, {
			id: 10,
			transform: true,
			name: '[Transform] Location (LatLong)',
			key: 'location_latlong',
			data: {
				// labels: ["0 mi", "0.1 mi", "0.25 mi", "0.5 mi", "1 mi", "1.5 mi", "2 mi", "3 mi", "5 mi", ">5 mi"],
				// bars: [0.07, 0.17, 0.24, 0.27, 0.47, 0.57, 0.63, 0.68, 1.0],
				xLabelFormat: function(i, value, isMaxpoint) {
					return (isMaxpoint ? "> " : "") + (Math.floor(value * 100) / 100) + " mi";
				},
				domain: [0,5, true], // applies to both bars and points, third argument 'true' indicates to include a bucket for greater extremes
				numberOfBars: 9,
				points: [1, 0.96, 0.84, 0.64, 0.3599999999999999],
				pointRange: [0,1],
				barToPointRatio: 2
			},
			weight: 10,
			newCardIsShowing: true,
			suggested: false
		}
	];

	$scope.currentCardsToConnectorFormat = function() {
		return $scope.cards.map(function(card) {
			if(card.from) {
				// from card
				return {
					type: 'from',
					table: card.from.value
				}
			}
			if(card.select) {
				return {
					type: 'select', 
					args: card.select.fields.map(function(field) {
						return {
							term: "'" + field + "'"
						}
					})
				}
			}
			if(card.filters) {
				/*
				from:
					filters: [{
						field: 'price',
						valueType: 'input',
						value: 'MaxPrice',
						operator: 'le'
					}]
				to:
					args: array of objects
						combinator: 'none', 'and', 'or'
						term: 'string expression' e.g. '\'rating\' >= \'input.rating\'' or "'city' == 'San Francisco'" or "'price' < 400"
				*/
				return {
					type: 'filter',
					args: card.filters.map(function(filter, index) {
						var operatorMapping = {
							'le': '<=',
							'lt': '<',
							'eq': '==',
							'gt': '>',
							'ge': '>='
						}
						return {
							combinator: index == 0 ? 'none' : 'and',
							term: "'" + filter.field + "' " + operatorMapping[filter.operator] + " " +
									(filter.valueType == 'input' ? 'input.' : '') + filter.value
						};
					})
				}
			}
			if(card.order) {
				/*
					args: [{
						//true is ascending, false is descending
						direction: 'true',
						term: '\'rating\''		
					}]
				*/
				return {
					type: 'order',
					args: [{
						direction: card.order.direction == 'ascending' ? 'true' : 'false',
						term: "'" + card.field + "'"
					}]
				}
			}
			return null;
		}).reduce(function(result, element) {
			if(element !== null)
				return result.concat([element]);
			return result;
		}, []);
	}

	$.each($scope.cards, function(i,c) { c.card = true; });
	$.each($scope.newCards, function(i,c) { c.card = true; });

	if(!$scope.ab('start')) {
		$scope.newCards = $scope.cards.concat($scope.newCards);
		$scope.cards = [];
	} else {
		$.each($scope.cards, function(i,c) {
			c.allShowing = true;
		});
	}

	$scope.collapseAllCards = function(state) {
		$.each($scope.cards, function(index, card) {
			card.hidden = state;
		});
	}

	$scope.cardToggle = function(card) {
		if($scope.cardDragLock)
			return;
		card.hidden = !card.hidden;
	}


	var ORIGINAL_CARDS = JSON.parse(JSON.stringify($scope.cards)); // supposedly the fastest way to get a deep clone
	var ORIGINAL_NEW_CARDS = JSON.parse(JSON.stringify($scope.newCards)); 

	$scope.hardReset = function() {
		ORIGINAL_CARDS = ORIGINAL_CARDS.map(function(card) { card.id += 875; return card; }); // because track by card.id
		ORIGINAL_NEW_CARDS = ORIGINAL_NEW_CARDS.map(function(card) { card.id += 875; return card; }); // because track by card.id
		$scope.cards = JSON.parse(JSON.stringify(ORIGINAL_CARDS));
		$scope.newCards = JSON.parse(JSON.stringify(ORIGINAL_NEW_CARDS));
	}

	$(".hard-reset").click(function() {
		$scope.hardReset();
	});

	$scope.hasTransformCards = function() {
		return $scope.cards.reduce(function(val, cur) { return val || cur.transform; }, false);
	}

	$scope.removeCard = function(card) {
		$scope.cards.splice($scope.cards.indexOf(card), 1);
		var newCard = $.extend({}, card);
		newCard.suggested = true;
		delete newCard['$$hashKey'];
		$scope.newCards = $scope.newCards.concat([newCard]);
	}

	$scope.addCard = function(cardToAdd, cardToAddInFrontOf) {
		if($scope.cards.indexOf(cardToAdd) !== -1) return;
		var addAtEnd = false;
		if(cardToAddInFrontOf == null) {
			var addAtEnd = true;
			cardToAddInFrontOf = $scope.cards[0];
		}

		if(cardToAdd.transform) {
			if($scope.hasTransformCards()) {
				cardToAdd.weight = 10;
				var cardToSubtractWeightFrom = cardToAddInFrontOf;
				while(cardToSubtractWeightFrom && (cardToSubtractWeightFrom.weight < 2 * cardToAdd.weight || !cardToSubtractWeightFrom.transform))
					cardToSubtractWeightFrom = $scope.cards[$scope.cards.indexOf(cardToSubtractWeightFrom) + 1];
				if(!cardToSubtractWeightFrom) {
					cardToSubtractWeightFrom = cardToAddInFrontOf;
					while(cardToSubtractWeightFrom && (cardToSubtractWeightFrom.weight < 2 * cardToAdd.weight || !cardToSubtractWeightFrom.transform))
						cardToSubtractWeightFrom = $scope.cards[$scope.cards.indexOf(cardToSubtractWeightFrom) - 1];
					if(!cardToSubtractWeightFrom) {
						alert("There's no more space for a new card right now.");
						return;
					}
				}

				cardToSubtractWeightFrom.weight -= cardToAdd.weight;
			} else {
				cardToAdd.weight = 100;
			}
			cardToAdd.color = $scope.getColor();
		}

		// if(cardToAdd.repeated) { // doesn't work (yet)
		// 	var first = cardToAdd;
		// 	cardToAdd = $.extend({}, cardToAdd); // clone
		// 	first.name = 'first';
		// 	$.each(cardToAdd, function(key,obj) { // attempt to deep clone, please upgrade
		// 		if(typeof obj == 'object')
		// 			cardToAdd[key] = $.extend({}, obj);
		// 	});
		// }
		$scope.cards.splice(addAtEnd ? $scope.cards.length : $scope.cards.indexOf(cardToAddInFrontOf), 0, cardToAdd);
		if(cardToAddInFrontOf) 
			cardToAddInFrontOf.newCardIsShowing = false;
		if($scope.newCards.indexOf(cardToAdd) != -1 && !cardToAdd.repeated)
			$scope.newCards.splice($scope.newCards.indexOf(cardToAdd), 1);
		$timeout(function() {
			// cardToAdd.allShowing = true;
			$(".card-container-" + cardToAdd.id).hide();
			$(".card-container-" + cardToAdd.id).slideDown(250);
			// $timeout(function() {
			// }, 500);
		}, 25);
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
		$scope.resort();
		$scope.$apply();
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
			if(card.transform)
				total += $scope.cardScoreForResult(card,result) * card.weight / 100;
		});
		return total; 
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

	$scope.locked = false;
	$scope.onDropComplete = function(index,result,event) {
		var indexToMove = index, resultToMove = $scope.results.reduce(function(ans,cur) { if(cur.overrideIndex === indexToMove) return cur; return ans; }, null);
		while(resultToMove !== null) {
			indexToMove ++;
			var nextResultToMove = $scope.results.reduce(function(ans,cur) { if(cur.overrideIndex === indexToMove) return cur; return ans; }, null);
			resultToMove.overrideIndex = indexToMove;
			resultToMove = nextResultToMove;
		}
		result.overrideIndex = index;
		$scope.locked = true;
		// $(".result-inner").addClass("result-inner-locked");
		$timeout(function() {
			// $(".result-inner").removeClass("result-inner-locked")
			$scope.locked = false;
		}, 250);
		$scope.resort();
	}

	$scope.cardDragLock = false;
	$scope.onCardDropComplete = function(index,card,event) {
		if(!card.card) return; // not a card
		$scope.cards.splice($scope.cards.indexOf(card), 1);
		$scope.cards.splice(index, 0, card);
		$(".card").css('transition', 'transform 0s ease-out');
		$timeout(function() {
			$(".card").css('transition', '');
		}, 250);
		$(".card").css('transform', '');
		$scope.dragIndices['card'] = -1;

		$timeout(function() { $scope.cardDragLock = false; }, 250);
	}

	$scope.dragIndices = {card: -1, result: -1};
	$scope.resultMove = function(index, type) {
		var index = +$(".drag-enter").attr('rel');
		if($(".dragging").length > 0) {
			$scope.cardDragLock = true;
			$scope.dragIndices[type] = index;
			$(".card.dragging").css('transition', 'transform 0s ease-out');
		} else {
			$scope.dragIndices[type] = -1;
		}

		$(".card").css('transform', '');
		$(".card.shifted,.card.shifted-backward").each(function() {
			var dir = $(this).hasClass('shifted-backward') ? -1 : 1;
			$(this).css('transform', 'translate(0px,' + (dir * $('.card.dragging').parent().height()) + 'px)');
		});
	}

	$scope.shiftedClass = function(index, type) {
		var dragIndex = $scope.dragIndices[type];
		if(dragIndex == -1) return "";
		if($(".dragging").length == 0) return "";
		var draggingIndex = +$(".dragging").attr('rel');
		if(dragIndex < draggingIndex) {
			return index >= dragIndex && index < draggingIndex ? "shifted" : ""
		} else {
			return index > draggingIndex && index <= dragIndex ? "shifted-backward" : ""; // should shift backward actually.
		}
	}

	$scope.unpin = function(result) {
		result.overrideIndex = false;
		$scope.resort();
	}

	$scope.resort = function() {
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

		scores.sort(function(a,b) { return a > b; });

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

	$scope.inputs = $scope.ab('start') ? [{
		name: 'MaxPrice',
		value: '200',
		showing: true
	}] : [];
	$scope.newInput = function(index, inputName) {
		var focusValue = inputName ? true : false;
		inputName = inputName || '';
		var newInput = { name: inputName, value: '', showing: false };
		if(index == -1)
			index = $scope.inputs.length;
		$scope.inputs.splice(index, 0, newInput);
		$timeout(function() {
			newInput.showing = true;
			$timeout(function() {
				if(focusValue)
					$(".input-"+index+" .input-value-input").focus();
				else
					$(".input-"+index+" .input-name-input").focus();
			}, 100)
		}, 25);
	}
	$scope.removeInputAtIndex = function(index) {
		$scope.inputs.splice(index, 1);
	}

	$(".navbar-tql").click(function() {
		$(".tql-preview").html($scope.builderToTql());
	});

	$scope.builderToTql = function() {
		return terrainConnector.getTQL($scope.currentCardsToConnectorFormat());

		var errors = [];

		// SELECT
		var selectCard = $scope.cardFor('select');
		var selectFields = selectCard ? selectCard.select.fields.join(', ') : '*';

		// FROM
		var fromCard = $scope.cardFor('from'), fromTable;
		if(!fromCard) errors.push('No From card added.');
		else fromTable = fromCard.from.value;

		// FILTERS
		var filtersCard = $scope.cardFor('filters'), filtersText = '';
		if(filtersCard) {
			filtersText = ' WHERE ' + filtersCard.filters.reduce(function(arr, filter) {
				arr.push(filter.field + ' &' + filter.operator + '; ' + filter.value);
				return arr;
			}, []).join(' AND ') + ' ';
		}

		// ORDER
		var orderCard = $scope.cardFor('order'), orderText = '';
		if(orderCard) {
			orderText = ' ORDER BY ' + orderCard.order.field + ' ' + orderCard.order.direction + ' ';
		}

		if(errors.length > 0)
			return '<b>ERRORS<br /></b>' + errors.join('<br />');

		return 'SELECT ' + selectFields + ' FROM ' + fromTable + filtersText + orderText;
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

	$scope.showBody = function(cardId) {
		$(".card-body[rel="+cardId+"]").css("overflow", "visible");
	}
}]);

terrainControllers.controller('PlaceholderCtrl', ['$scope', '$routeParams', function($scope, $routeParams) {
	$scope.page = window.location.hash.substr(2);
	selectPage();
}]);
