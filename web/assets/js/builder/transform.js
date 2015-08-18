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

	$scope.addRawScoreToCardWithKey = function(key, score) {
		// there must be a better way to do this
		var card = $scope.cardForKey(key);
		card.data.raw = card.data.raw || [];
      	card.data.raw.push(score);
	}


	$scope.hasTransformCards = function() {
		return $scope.cards.reduce(function(val, cur) { return val || cur.transform; }, false);
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