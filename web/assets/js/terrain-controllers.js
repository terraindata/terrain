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

	var _deps = {
		$scope: $scope,
		$timeout: $timeout,
		$http: $http,
	};

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
	
	$scope.blurOnEnter = function(evt) {
		if(evt.keyCode == 13) {
			$(evt.currentTarget).blur();
		}
	}

	$scope.handleChange = function(cardId) {
		$scope.resort();
		$scope.$apply();
	}

	$scope.apply = function() {
		$scope.$apply();
	}

	// avoid touching this; use helper functions.
	var _v = {};

	// Use this function to get the value for 'result' for any string 'key'
	$scope._v_result = function(key, result) {
		if(!_v[key]) {
			return false;
		}
		return _v[key](result);
	}

	$scope._v_val = function(key) {
		return _v[key];
	}

	// val can be a single value or a function that takes a 'result' argument
	// returns false and does nothing if key is already set, or for invalid key
	$scope._v_add = function(key, val, overwrite) {
		if(!key || key.length === 0)
			return false;

		if(_v[key] && !overwrite)
			return false;

		if(typeof val !== 'function') {
			var v = val;
			val = function(result) {
				return v;
			}
		}

		_v[key] = val;
		_v_change();
		return true;
	}

	// returns false and does nothing if originalKey is not already set
	$scope._v_move = function(originalKey, newKey) {
		if(originalKey && _v[originalKey]) {
			_v[newKey] = _v[originalKey];
			delete _v[originalKey];
			_v_change();
			return true;
		} 
		return false;
	}

	// val can be a single value or a function that takes a 'result' argument
	$scope._v_move_or_add = function(originalKey, newKey, val) {
		if(!$scope._v_move(originalKey, newKey))
			return $scope._v_add(newKey, val);
	}

	$scope._v_keys = [];
	// to be called whenever _v changes; recompute anything necessary
	function _v_change() {
		$scope._v_keys = $.map(_v, function(val,key) { return key; });
	}

	// Note: Order may matter. Be careful.
	_terrainBuilderExtension.cards(_deps);
	_terrainBuilderExtension.results(_deps);
	_terrainBuilderExtension.inputs(_deps);
	_terrainBuilderExtension.transform(_deps);
}]);

terrainControllers.controller('PlaceholderCtrl', ['$scope', '$routeParams', function($scope, $routeParams) {
	$scope.page = window.location.hash.substr(2);
	selectPage();
}]);
