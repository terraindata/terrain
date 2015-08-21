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

var terrainApp = angular.module('terrainApp', [
	'ngRoute',
	'terrainControllers',
	'd3',
	'ngDraggable',
	'ng-slide-down',
	'ngTouch',
	'ngTouchmove',
	'ui.bootstrap.datetimepicker'
	]);

terrainApp.config(['$routeProvider',
	function($routeProvider, $ngDraggable) {
		$routeProvider.
		when('/builder/:abConfig', {
			templateUrl: 'partials/builder.html',
			controller: 'BuilderCtrl'
		}).
		when('/builder', {
			templateUrl: 'partials/builder.html',
			controller: 'BuilderCtrl'
		}).
		when('/home', {
			templateUrl: 'partials/placeholder.html',
			controller: 'PlaceholderCtrl'
		}).
		when('/settings', {
			templateUrl: 'partials/placeholder.html',
			controller: 'PlaceholderCtrl'
		}).
		when('/tql', {
			templateUrl: 'partials/placeholder.html',
			controller: 'PlaceholderCtrl'
		}).
		when('/dashboard', {
			templateUrl: 'assets/plugins/angular-bootstrap-datetimepicker-master/demo/index.html',
			controller: 'demo.democontroller'
		}).
		otherwise({
			redirectTo: '/builder'
		});
	}]);

// from: http://stackoverflow.com/questions/15731634/how-do-i-handle-right-click-events-in-angular-js
terrainApp.directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
});

var touchMethod = function(events, directive) {
	return function($parse) {
	    return function(scope, element, attrs) {
	        var fn = $parse(attrs[directive]);
	        element.bind(events, function(event) {
	            scope.$apply(function() {
	                event.preventDefault();
	                fn(scope, {$event:event});
	            });
	        });
	    };
	}
}

terrainApp.directive('ngDown', touchMethod('touchstart mousedown', 'ngDown'));
terrainApp.directive('ngMove', touchMethod('touchmove mousemove', 'ngMove'));
terrainApp.directive('ngUp', touchMethod('touchend touchcancel mouseup', 'ngUp'));

terrainApp.directive('ngRightClickMenu', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                console.log($(element).find('.more-button'));
        		$(element).find('.more-button').addClass('more-button-showing');
        		console.log(event);
        		var prevTop = $(element).find('.more-button').css('top');
        		$(element).find('.more-button').css('top', (event.pageY - $(element).offset().top - 5) + 'px');
        		$(element).find('.more-button').css('left', (event.pageX - $(element).offset().left - 5) + 'px');
	        	$(document).on('click', function(event) {
	        		$(element).find('.more-button').removeClass('more-button-showing');
        			setTimeout(function() {
	        			$(element).find('.more-button').css('top', "");
	        			$(element).find('.more-button').css('left', '');
	        	}, 250);
	        	});
        		// $(element).find('.more-button').css('')
                // fn(scope, {$event:event});
            });
        });
    };
});

terrainApp.directive('ngStepChange', function($parse) {
	return function(scope, element, attrs) {
        var fn = $parse(attrs.ngStepChange);
        var changeElement = $(element);
        if(attrs.ngStepChangeParentClass) {
        	var parentElement = changeElement;
        	while(parentElement.length !== 0) {
        		if(parentElement.hasClass(attrs.ngStepChangeParentClass)) {
        			changeElement = parentElement;
        			break;
        		}
        		parentElement = parentElement.parent();
        	}
        }

        if(attrs.ngStepChangeChildClass) {
        	var childElements = changeElement.find('.' + attrs.ngStepChangeChildClass);
        	if(childElements.length > 0)
        		changeElement = $(childElements[0]);
        }

        element.bind('mousedown touchstart', function(event) {
        	event.preventDefault();
        	var firstDuration = attrs.ngStepChangeFirstDuration || 150;
        	var secondDuration = attrs.ngStepChangeSecondDuration || 150;
			var applyFn = function() {
				scope.$apply(function() {
                	fn(scope, {$event:event});
            	});
			};

			changeElement.addClass('step-changing');
			setTimeout(function() {
				applyFn();
				changeElement.removeClass('step-changing');
				changeElement.addClass('step-changed');

				setTimeout(function() {
					changeElement.removeClass('step-changed');
				}, secondDuration);
			}, firstDuration);
        });
    };
});
