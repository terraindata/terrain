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

_terrainBuilderExtension.cards = function(_deps) {
	$scope = _deps.$scope;
	$http = _deps.$http;
	$timeout = _deps.$timeout;


	/* ----------------------------
	 * Section: Card Initialization
	 * ---------------------------- */

	$scope.fromOptions = [
		{ id: 1, name: 'Listings' },
		{ id: 2, name: 'Reviews' },
		{ id: 3, name: 'Renters' },
		{ id: 4, name: 'Leasers' }
		];

	$scope.colorIndex = 0;
	$scope.getColor = function() {
		return CARD_COLORS[$scope.colorIndex ++];
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
		name: 'Price',
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
		name: 'Location',
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
			id: -1,
			name: 'Transform',
			suggested: true,
			syntheticCard: 'transform'
		}];

	$scope.syntheticCards = {
		'transform': [
		{
			id: 2,
			transform: true,
			name: 'Average Rating',
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
			name: 'Number of Bedrooms',
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
			name: 'Number of Stays',
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
			name: 'Number of Reviews',
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
			name: 'Location (Map)',
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
			name: 'Location (MapRadius)',
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
			name: 'Location (Radius)',
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
			name: 'Location (LatLong)',
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
	]};

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




	/* ----------------------------
	 * Section: Card Helpers
	 * ---------------------------- */

	$scope.getAllCards = function() {
		// silly design decision. TODO make the cards as one variable and adjust accordingly
		return $scope.cards.concat($scope.newCards).concat($scope.syntheticCards.transform);
	}


	$scope.cardFor = function(type) {
		return $scope.cards.reduce(function(prev,cur) { if(cur[type]) return cur; return prev; }, null);
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


	$scope.removeCard = function(card) {
		$scope.cards.splice($scope.cards.indexOf(card), 1);
		var newCard = $.extend({}, card);
		newCard.suggested = true;
		delete newCard['$$hashKey'];
		$scope.newCards = $scope.newCards.concat([newCard]);
	}


	// $scope.syntheticCardOverlay

	$scope.addCard = function(cardToAdd, cardToAddInFrontOf, isSynthetic) {
		if(cardToAdd.syntheticCard) {
			alert("Transform cards are still in progress.");
			return;
			var cards = $scope.syntheticCards[cardToAdd.syntheticCard];
			$scope.syntheticCardOverlay(cards, cardToAdd.name, cardToAddInFrontOf);
		}

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



	/* ----------------------------
	 * Section: Card View Functions
	 * ---------------------------- */


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


	$scope.titleForCard = function(card) {
		if(card.from) return 'From';
		if(card.select) return 'Select';
		if(card.filters) return 'Filter';
		if(card.transform) return 'Transform';
		if(card.order) return 'Order';
	}



	$scope.cardDragLock = false;
	$scope.onCardDropComplete = function(index,card,event) {
		if(!card.card) return; // not a card
		// $(".card-container-"+card.id).css('opacity', '0');
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

		$(".card").each(function() {
			var dir = $(this).hasClass('shifted-backward') ? -1 : ($(this).hasClass('shifted') ? 1 : 0);
			if(dir == 0)
				$(this).css('transform', '');
			else
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

	$scope.showBody = function(cardId) {
		$(".card-body[rel="+cardId+"]").css("overflow", "visible");
	}


	/* ---------------------
	 * Section: Connector
	 * --------------------- */


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



}