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
			templateUrl: 'partials/placeholder.html',
			controller: 'PlaceholderCtrl'
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

terrainApp.directive('moDateInput', function ($window) {
    return {
        require:'^ngModel',
        restrict:'A',
        link:function (scope, elm, attrs, ctrl) {
            var moment = $window.moment;
            var dateFormat = attrs.moMediumDate;
            attrs.$observe('moDateInput', function (newValue) {
                if (dateFormat == newValue || !ctrl.$modelValue) return;
                dateFormat = newValue;
                ctrl.$modelValue = new Date(ctrl.$setViewValue);
            });

            ctrl.$formatters.unshift(function (modelValue) {
                if (!dateFormat || !modelValue) return "";
                var retVal = moment(modelValue).format(dateFormat);
                return retVal;
            });

            ctrl.$parsers.unshift(function (viewValue) {
                var date = moment(viewValue, dateFormat);
                return (date && date.isValid() && date.year() > 1950 ) ? date.toDate() : "";
            });
        }
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

terrainApp.directive('clicked', ['$timeout', function($timeout) {
    return function(scope, element, attr) {

        element.on('touchend mouseup', function(event) {
        // element.on('touchend', function(event) {
            element.addClass("ng-clicked");
            $timeout(function() {
                element.removeClass('ng-clicked');
                if(attr.clickedSecond) {
                    element.addClass("ng-clicked-second");
                    $timeout(function() {
                        element.removeClass('ng-clicked-second');
                    }, parseInt(attr.clickedSecond) || 250);
                }
            }, parseInt(attr.clicked) || 250);
            // scope.$apply(function() { 
                // scope.$eval(attr.touchend); 
            // });
        });
    };
}]);

terrainApp.directive('verticallyDraggable', ['$timeout', function($timeout) {
    return {
        restrict: 'EA', // (E)lement or (A)trribute
        scope: {
            array: '=', // bi-directional data-binding
            index: '=' 
        },
        link: function(scope, element, attr) {

            element.on('touchstart mousedown', function(event) {
                event.preventDefault();
                var target = event.originalEvent.target;
                element.css('z-index', '999999');
                element.css('position', 'relative');
                element.css('cursor', 'pointer');
                var startY = event.pageY;
                var minY = element.parent().offset().top,
                    maxY = element.parent().offset().top + element.parent().height() - element.height();
                minY -= element.offset().top;
                maxY -= element.offset().top;

                var origY = element.offset().top;
                var parent = element.parent();

                var duration = attr.duration || '0.25s';
                element.css('-webkit-transition', 'top 0s');
                element.css('transition', 'top 0s');
                element.addClass('dragging-vertically');

                var children = [];
                $.each(parent.children(), function() {
                    if($(this).hasClass('dragging-vertically')) return;
                    children.push({ top: $(this).offset().top, obj: $(this) });
                    $(this).css('-webkit-transition', 'top ' + duration);
                    $(this).css('transition', 'top ' + duration);
                    $(this).css('position', 'relative');
                    $(this).css('top', '0px');
                });

                var move = function(event) {
                    var dy = event.pageY - startY;
                    if(dy > maxY) dy = maxY;
                    if(dy < minY) dy = minY;

                    element.css('top', dy + 'px');
                    var  curY = element.offset().top;
                    
                    $.each(children, function() {
                        if(this.top < origY) {
                            // current is on top of element
                            if(curY < this.top + this.obj.height() / 2) {
                                // should shift
                                if(!this.obj.hasClass('dragging-vertically-shifted-down')) {
                                    this.obj.css('top', (element.height() + parseInt(element.css('margin-top')) 
                                        + parseInt(element.css('margin-bottom'))) + 'px'); 
                                    this.obj.addClass('dragging-vertically-shifted-down');
                                }
                            } else {
                                if(this.obj.hasClass('dragging-vertically-shifted-down')) {
                                    this.obj.removeClass('dragging-vertically-shifted-down');
                                    this.obj.css('top', '0px');
                                }
                            }
                        } else {
                            // current is below element
                            if(curY + element.height() > this.top + 2) {
                                // should shift
                                if(!this.obj.hasClass('dragging-vertically-shifted-up')) {
                                    this.obj.css('top', -1 * (element.height() /* + parseInt(element.css('margin-top')) */
                                        + parseInt(element.css('margin-bottom')) + parseInt(this.obj.css('margin-top'))) + 'px'); 
                                    this.obj.addClass('dragging-vertically-shifted-up');
                                }
                            } else {
                                if(this.obj.hasClass('dragging-vertically-shifted-up')) {
                                    this.obj.removeClass('dragging-vertically-shifted-up')
                                    this.obj.css('top', '0px');
                                }
                            }
                        }
                    })
                }
                $(document).on('touchmove mousemove', move);

                var endListeners = function(event) {
                    var dy = event.pageY - startY;
                    if(Math.abs(dy) < 2)
                        $(target).focus();
                    var newIndex = -1;
                    if(parent.find('.dragging-vertically-shifted-down').length) {
                        for(newIndex = 0; newIndex < parent.children().length; newIndex ++) {
                            if($(parent.children()[newIndex]).hasClass('dragging-vertically-shifted-down'))
                                break;
                        }
                    } else if(parent.find('.dragging-vertically-shifted-up').length) {
                        for(newIndex = parent.children().length - 1; newIndex >= 0; newIndex --) {
                            if($(parent.children()[newIndex]).hasClass('dragging-vertically-shifted-up'))
                                break;
                        }
                    }
                    if(newIndex != -1) {
                        var a = scope.array.splice(scope.index, 1);
                        scope.array.splice(newIndex, 0, a[0]); // TODO potential bug here when shifting backward?
                        scope.$apply();
                    }

                    parent.children().css('-webkit-transition', 'top 0s');
                    parent.children().css('transition', 'top 0s');
                    parent.children().css('top', '0px');
                    parent.find('.dragging-vertically-shifted-up').removeClass('dragging-vertically-shifted-up');
                    parent.find('.dragging-vertically-shifted-down').removeClass('dragging-vertically-shifted-down');
                    parent.find('.dragging-vertically').removeClass('dragging-vertically');
                    $(document).off('touchmove mousemove', move);
                    $(document).off('touchend mouseup', endListeners);
                }
                $(document).on('touchend mouseup', endListeners);
            });
        }
    };
}]);
