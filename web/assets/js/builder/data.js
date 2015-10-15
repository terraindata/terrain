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

	/* ----------------------------
	 * File: Data
	 *  Defines / contains the data
	 * ---------------------------- */

_terrainBuilderExtension.data = function(_deps) {
	$scope = _deps.$scope;
	$timeout = _deps.$timeout;
	$http = _deps.$http;
	$interval = _deps.$interval;

	var data = {};

	/* ----------------------------
	 * Section: Cards Initialization
	 * ---------------------------- */

	data.tables = ['sitter', 'job', 'availability'];

	data.cards = [{
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

	data.newCards = [
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

	$.each(data.cards, function(i,c) { c.card = true; });
	$.each(data.newCards, function(i,c) { c.card = true; });

	if(!$scope.ab('start')) {
		data.newCards = data.cards.concat(data.newCards);
		data.cards = [];
		if($scope.ab('from')) {
			var c = data.newCards.shift();
			c.from.value = 'sitter';
			c.allShowing = true;
			data.cards = [c];
			$timeout(function() {
				$scope.HAS_SITTERS = true;
			}, 250);
			// delete data.newCards[0];
			// data.cards[0].allShowing = true;
			// data.cards[0].from.value = 'sitters';
		}
		if($scope.ab('select')) {
			setTimeout(function() {
				$scope.addCard(data.newCards[0], null);
				data.cards[1].select.fields = ['sitter.name', 'sitter.minPrice', 'sitter.responseTime', 'sitter.attributes'];
			}, 2000);
			// var c = data.newCards.shift();
			// c.select.fields = ['sitter.name', 'sitter.minPrice', 'sitter.responseTime', 'sitter.attributes'];
			// c.allShowing = true;
			// data.cards = data.cards.concat(data.cards, [c]);
		}
	} else {
		$.each(data.cards, function(i,c) {
			c.allShowing = true;
		});
	}

	var ORIGINAL_CARDS = JSON.parse(JSON.stringify(data.cards)); // supposedly the fastest way to get a deep clone
	var ORIGINAL_NEW_CARDS = JSON.parse(JSON.stringify(data.newCards)); 


	/* ----------------------------
	 * Section: Results Initialization
	 * ---------------------------- */

	$http.get('assets/ajax/urbansitter.json').success(function(response) {
      	data.results = response.data;
      	var fields = {};
      	$.each(data.results, function(index) {
      		var result = this;

      		$.each(result, function(key,val) {
      			fields[key] = 1;
      		});

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
      	if($scope.resort)
			$scope.resort();

		if($scope.ab('start')) {
			$scope.transform_newKey($scope.data.cards[1], 'listing.price');
			$scope.transform_newKey($scope.data.cards[2], 'listing.location');
		}
    });

	$scope.data = data;
}