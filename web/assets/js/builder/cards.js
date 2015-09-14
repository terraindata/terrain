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
			value: '',
			joins: [
				// {
				// 	table: 'availability',
				// 	first: 'sitter.id',
				// 	second: 'availability.sitterID',
				// 	operator: 'eq',
				// 	showing: 'true'
				// },
				// {
				// 	table: 'job',
				// 	first: 'sitter.id',
				// 	second: 'job.sitterID',
				// 	operator: 'eq',
				// 	showing: 'true'
				// }
				]
		},
		name: 'From',
		useTitle: true,
		suggested: true
	}, {
		id: 17,
		select: {
			fields: [
				// 'listing.name', 'listing.price', 'listing.rating', 'listing.stays', 'listing.description'
				]
		},
		name: 'Select',
		suggested: true
	}, {
		id: 237,
		filters: [
		// {
		// 	first: 'listing.price',
		// 	second: 'input.MaxPrice',
		// 	operator: 'le'
		// }
		],
		name: 'Filter',
		suggested: true
	}, {
		id: 982,
		name: "Score",
		suggested: true,
		scores: {
			method: "weighted",
			outputField: "FinalScore"
		}		
	}, { 
		id: 0,
		order: {
			field: "FinalScore",
			direction: "descending"
		},
		name: "Order",
		useTitle: true,
		suggested: true,
	}];

	$scope.newCards = [
		{
			id: -1,
			name: 'Transform',
			suggested: true,
			syntheticCard: 'transform',
			syntheticModel: {
				preTransform: true,
				name: 'Transform Card',
				newCardIsShowing: false,
			}
		},
		{
			id: -2,
			name: 'Let',
			suggested: true,
			syntheticCard: 'let',
			syntheticModel: {
				let: {
					expression: '',
					key: ''
				},
				newCardIsShowing: false,
				name: 'Let'
			}
		}];

	$.each($scope.cards, function(i,c) { c.card = true; });
	$.each($scope.newCards, function(i,c) { c.card = true; });

	if(!$scope.ab('start')) {
		$scope.newCards = $scope.cards.concat($scope.newCards);
		$scope.cards = [];
		if($scope.ab('from')) {
			var c = $scope.newCards.shift();
			c.from.value = 'sitters';
			c.allShowing = true;
			$scope.cards = [c];
			$timeout(function() {
				$scope.HAS_SITTERS = true;
			}, 250);
			// delete $scope.newCards[0];
			// $scope.cards[0].allShowing = true;
			// $scope.cards[0].from.value = 'sitters';
		}
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


	$scope.fromOptions = ['sitter', 'job', 'availability'];


	/* ----------------------------
	 * Section: Card Helpers
	 * ---------------------------- */

	$scope.getAllCards = function() {
		// silly design decision. TODO make the cards as one variable and adjust accordingly
		return $scope.cards.concat($scope.newCards);
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
			$(".card-"+card.id).find(".filter-field-input-wrapper:last input").focus();
		}, 250);
	}
	
	$scope.addBlankJoin = function(card, joinIndex) {
		var joinTable = '';
		var firstValue = '';
		var secondValue = '';
		var newOperator = 'eq';
		var cardIndex = $scope.cards.indexOf(card);
		var newJoin = { table: joinTable, first: firstValue, second: secondValue, showing: true, operator: newOperator};
		if(joinIndex == -1) {
			joinIndex = $scope.cards[cardIndex].from.joins.length;
			$timeout(function() {
				$(".card[rel=" + cardIndex +"] .card-join-area:last input:first").focus();
			}, 100);
		}
		$scope.cards[cardIndex].from.joins.splice(joinIndex, 0, newJoin);
	}	

	$scope.removeCard = function(card) {
		$scope.cards.splice($scope.cards.indexOf(card), 1);
		var newCard = $.extend({}, card);
		newCard.suggested = true;
		delete newCard['$$hashKey'];
		$scope.newCards = $scope.newCards.concat([newCard]);
	}

	function deepClone(v) {
		return JSON.parse(JSON.stringify(v)); // supposedly the fastest way to get a deep clone
	}

	$scope.addCard = function(cardToAdd, cardToAddInFrontOf) {
		var addAtEnd = false;
		if(cardToAddInFrontOf == null) {
			var addAtEnd = true;
			cardToAddInFrontOf = $scope.cards[0];
		}

		if(cardToAdd.syntheticCard) {
			cardToAdd = deepClone(cardToAdd.syntheticModel);
			cardToAdd.wasSynthetic = true;
			do {
				cardToAdd.id = Math.floor(Math.random() * 40000);
			} while($scope.cards.reduce(function(prev,cur) { return cur.id == cardToAdd.id || prev; }, false));
		}
		cardToAdd.newCardIsShowing = false;

		if($scope.cards.indexOf(cardToAdd) !== -1) return;

		$scope.cards.splice(addAtEnd ? $scope.cards.length : $scope.cards.indexOf(cardToAddInFrontOf), 0, cardToAdd);
		if(cardToAddInFrontOf) 
			cardToAddInFrontOf.newCardIsShowing = false;
		if($scope.newCards.indexOf(cardToAdd) != -1 && !cardToAdd.repeated)
			$scope.newCards.splice($scope.newCards.indexOf(cardToAdd), 1);
		$timeout(function() {
			$(".card-container-" + cardToAdd.id).hide();
			$(".card-container-" + cardToAdd.id).slideDown(250);
		}, 25);

		$scope.resort();
	}

	if($scope.ab('start')) {
		$scope.addCard($scope.newCards[0], $scope.cards[1]);
		$scope.addCard($scope.newCards[0], $scope.cards[2]);
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

	$scope.cards_score_updateWeight = function(card) {
		if(card.weight > 100)
			card.weight = 100;

		var sumWeight = $scope.cards.reduce(function(sum,cur) {
			if(cur.weight !== undefined)
				sum += parseInt(cur.weight);
			return sum;
		}, 0);

		var diff = 100 - sumWeight;

		$.each($scope.cards, function(i,c) {
			if(c.weight !== undefined && c.id !== card.id) {
				c.weight += diff;
				if(c.weight < 0) {
					diff = -1 * c.weight;
					c.weight = 0;
				} else {
					diff = 0;
				}
			}
		});
	}

	$scope.card_filter_removeField = function(card, fieldIndex) {
		if(card && card.filters && card.filters.length >= fieldIndex)
			card.filters.splice(fieldIndex, 1);
		$scope.resort();
	}

	$scope.card_filter_setOperator = function(card, fieldIndex, operator) {
		card.filters[fieldIndex].operator = operator;
		$scope.resort();
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
		if(card.scores) return 'Score';
		return card.name;
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


	$scope.card_let_keyUpdate = function(card) {
		// TODO consider a better approach, and also race conditions?
		$scope._v_move(card.let.formerKey, card.let.key);
		card.let.formerKey = card.let.key;
	}

	var let_ignoreChars = " ";
	var let_operatorChars = "/*+-";
	var let_operatorMap = {
		'/': function(a,b) { return a / b; },
		'*': function(a,b) { return a * b; },
		'+': function(a,b) { return a + b; },
		'-': function(a,b) { return a - b; }
	}
	$scope.card_let_expressionUpdate = function(card) {
		var tokens = [""], ex = card.let.expression;
		for(var i = 0; i < ex.length; i ++) {
			var c = ex.charAt(i);
			// ignore certain characters
			if(let_ignoreChars.indexOf(c) !== -1)
				continue;
			// operator character ends previous bucket, starts new bucket
			if(let_operatorChars.indexOf(c) !== -1) {
				tokens.push(c);
				tokens.push("");
				continue;
			}
			// assumed: c is part of a variable's name
			tokens[tokens.length - 1] += c;
		}
		
		// tokenized!

		// make faster by pre-populating a result to value map.
		var resultToValueMap = {};

		// add to the _v for the let's key
		$scope._v_add(card.let.key, function(result) {
			if(resultToValueMap[result.id] !== undefined) return resultToValueMap[result.id];

			// lazily evaluate the tokens
			// ASSUMED: expression is of the form [var] [operator] [var] [operator] etc., e.g. listing.price / listing.bedrooms + listing.rating
			// TODO: Add special functions, like SUM and COUNT
			var val = $scope._v_result(tokens[0], result);
			if(val === false) val = 0;
			for(var i = 1; i < tokens.length - 1; i += 2) {
				// ASSUMED: tokens[i] is an operator; tokens[i + 1] is a variable
				var op = tokens[i], val2 = $scope._v_result(tokens[i+1], result);
				if(let_operatorMap[op] === undefined || val2 === false) { continue; }
				val = let_operatorMap[op](val, val2);
			}

			resultToValueMap[result.id] = val;
			return val;
		}, true);
	}


	$scope.HAS_SITTERS = false;
	$scope.card_fromChanged = function(card, fromIndex) {
		// timeout because autocomplete has delay in updating model value
		// TODO find a way around the timeout
		$timeout(function() { 
			if(card.from.value === 'sitter')
				$scope.HAS_SITTERS = true;
		}, 150);
	}

	$scope.card_joinChanged = function(card, joinIndex) {
		// timeout because autocomplete has delay in updating model value
		// TODO find a way around the timeout
		$timeout(function() { 
			var j = card.from.joins[joinIndex];
			j.first = j.table + '.sitterid';
			j.second = 'sitter.id';
		}, 150);
	}

	// Section: score card

	function score_scoreForResult(result) {
		// TerrainScore
		var total = 0;
		$.each($scope.cards, function(index, card) {
			if(card.transform) {
				var score = $scope._v_result(card.transform.outputKey,result);
				if(!isNaN(score))
					total += score * card.weight / 100;
			}
		});
		return total; 
	}

	$scope._v_add('FinalScore', score_scoreForResult);

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
							'ge': '>=',
							'in': 'in'
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