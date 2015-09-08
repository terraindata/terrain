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

_terrainBuilderExtension.inputs = function(_deps) {
	$scope = _deps.$scope;
	$http = _deps.$http;
	$timeout = _deps.$timeout;


	/* ----------------------------
	 * Section: Input Initialization
	 * ---------------------------- */

	$scope.inputs = [];

	/* ----------------------------
	 * Section: Input Helpers
	 * ---------------------------- */
	
	$scope.safeApply = function(fn) {
		var phase = this.$root.$$phase;
		if(phase == '$apply' || phase == '$digest') {
			if(fn && (typeof(fn) === 'function')) {
	    		fn();
	  		}
	  	} else {
	    	this.$apply(fn);
	  	}
	};	
	
	$scope.inputFor = function(inputName) {
		return $scope.inputs.reduce(function(prev,cur) { return cur.name == inputName ? cur : prev; }, null);
	}

	$scope.newInput = function(index, inputName, inputType) {	
		switch(inputType){
			case 'namevalue':
				$scope.newNameValueInput(index, inputName);
				break;
			case 'datetime':
				$scope.newDateTimeInput(index, inputName);
				break;
		}
	}

	$scope.switchInputAtIndex = function(index, newType) {
		
		switch(newType) {
			case 'namevalue':
				$scope.inputs[index].type = 'namevalue';
				break;
			case 'datetime':
				$scope.inputs[index].type = 'datetime';
				var dateNow = new Date();
				dateNow.setMilliseconds(0);
				dateNow.setSeconds(0);		
				$scope.inputs[index].dateValue = dateNow;		
				break;
		}
		$timeout(function() {
			$scope.apply();
		})
	}

	var random = function(max) {
		max = max || 999999;
		return Math.floor(Math.random() * max);
	}

	$scope.newNameValueInput = function(index, inputName, inputValue) {
		var focusAnything = !inputName && !inputValue;
		var focusValue = inputName ? true : false;
		inputName = inputName || '';
		inputValue = inputValue || '';
		var newInput = { name: inputName, stringValue: inputValue, showing: false, type: 'namevalue', id: random() };
		if(index == -1)
			index = $scope.inputs.length;
		$scope.inputs.splice(index, 0, newInput);
		$timeout(function() {
			newInput.showing = true;
			if(focusAnything) {
				$timeout(function() {
					if(focusValue)
						$(".input-"+index+" .input-value-input").focus();
					else
						$(".input-"+index+" .input-name-input").focus();
				}, 100);
			}
		}, 250);

		if(inputName.length > 0)
			input_addToV(newInput);
	}

	if($scope.ab('start'))
		$scope.newNameValueInput(-1, 'MaxPrice', '200');
	
	$scope.newDateTimeInput = function(index, inputName) {
		var dateNow = new Date();
		dateNow.setMilliseconds(0);
		dateNow.setSeconds(0);
		var focusValue = inputName ? true : false;
		inputName = inputName || '';
		var newInput = { name: inputName, dateValue: dateNow, showing: false, type: 'datetime', id: random() };
		if(index == -1)
			index = $scope.inputs.length;
		$scope.inputs.splice(index, 0, newInput);
		$timeout(function() {
			newInput.showing = true;
			$timeout(function() {
				if(focusValue)
					$(".input-"+index+" .input-calendar-input").focus();
				else
					$(".input-"+index+" .input-name-input").focus();
			}, 100)
		}, 25);		
	}
	
	$scope.removeInputAtIndex = function(index) {
		$scope.inputs.splice(index, 1);
	}

	function input_addToV(input) {
		var key = "input." + input.name;
		$scope._v_move_or_add(input.prevKey, key, function() { 
			switch(input.type) {
				case 'namevalue':
					return input.stringValue;
				case 'datetime':
					if (input.name == "input.startDateTime") return 10000; //Hack for pre-DB version of demo
					if (input.name == "input.endDateTime") return 11000 //Hack for pre-DB version of demo
					return input.dateValue;		
			}
			return false;
		});
		input.prevKey = key;

		$scope.resort();

		/*
		// TODO mabye need to consider atomicity and race conditions, here's a basic start
		var fn = function() {
			// ...
		};

		input.fns = input.fns || [];
		input.fns.push(fn);
		(input.fns.pop())();
		*/
	}

	$scope.input_name_changed = function(input) {
		input_addToV(input);
	}

	

	/* ----------------------------
	 * Section: Input View Functions
	 * ---------------------------- */


	$scope.input_checkForNewInput = function(inputName) {
		if(inputName && inputName.indexOf("input.") === 0)
			var n = inputName.substr(6);
			if(! $scope.inputs.reduce(function(value,cur) { if(cur.name === n) return true; return value; }, false)) {
				$scope.newInput(-1, inputName.substr("input.".length), 'namevalue');
			}
		/*
		if(card.filters) {
			$.each(card.filters, function(index,filter) {
				if(filter.value && filter.value.length > 0 && filter.valueType == 'input') {
					if(! $scope.inputs.reduce(function(value,cur) { if(cur.name == filter.value) return true; return value; }, false)) {
						$scope.newNameValueInput(-1, filter.value);
					}
				}
			});
		}
		*/
	}







}