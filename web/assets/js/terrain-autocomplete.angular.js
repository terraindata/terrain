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

terrainApp.directive('tdbAutocomplete', ['$window', '$timeout', function($window, $timeout) {
	return {
	    	restrict: 'EA', // (E)lement or (A)trribute
	    	scope: {
		        data: '=?', // bi-directional data-binding
		        model: '=?',
		        onSelect: '&'  // parent execution binding
		    },
		    link: function(scope, ele, attrs) {
		    	ele.addClass('autocomplete');
		    	var placeholderStr = '<div class="autocomplete-placeholder">'+attrs.autoPlaceholder+'</div>';
		    	ele.html('<input type="text" class="new-card-input '+attrs.inputClasses+'" placeholder="'+attrs.placeholder+'" value="'+scope.model+'" /> \
						<div class="autocomplete-results"> ' +
							placeholderStr +
						'</div>');
		    	var input = ele.find('input');
		    	var results = ele.find('.autocomplete-results');
		    	results.css('top', (input.height() + parseInt(input.css('padding-top')) * 2 + 1) + 'px');
		    	var placeholder = ele.find('.autocomplete-placeholder');
		    	var allResultsElems, resultsObjs;
		    	function select(result) {
		    		// if(scope.model) {
	    				scope.model = result.name;
		    		// }
	    			input.val(result.name);
	    			if(scope.onSelect)
	    				scope.onSelect({ obj: result });
	    			input.blur();
		    	}
		    	var doResults = function(data) {
		    		results.find(".autocomplete-result").remove();
		    		resultsObjs = [];
			    	$.each(data, function(index) {
			    		results.append('<div class="autocomplete-result" rel="'+index+'">'+this.name+'</div>');
			    		var obj = { result: this, elem: results.find('[rel='+index+']')};
			    		resultsObjs.push(obj);

			    		obj.elem.click(function() {
			    			select(obj.result);
			    		});
			    	});
			    	allResultsElems = ele.find('.autocomplete-result');
			    	allResultsElems.hide();
			    	results.hide();
			    	var selectedClass = 'autocomplete-result-selected';
			    	input.focus(function() {
			    		results.show();
			    		results.find('.'+selectedClass).removeClass(selectedClass);
			    	});
			    	input.blur(function() {
			    		setTimeout(function() {
			    			results.hide()
			    		}, 150); // if you hide immediately, any click events won't register
			    	});
			    	var showingResults = [], selectedResultIndex;
			    	function updateResults(evt) {
			    		var val = input.val().toLowerCase();
			    		$(selectedClass).removeClass(selectedClass);
			    		if(val.length == 0) {
			    			placeholder.show();
			    			allResultsElems.hide();
			    		} else if(evt.keyCode <= 40 && evt.keyCode >= 37) {
			    			// arrow keys
			    			if(evt.type != 'keydown') {
			    				// we only want to do this on one keyboard event; I chose keyup
			    				return;
			    			}
			    			if(evt.keyCode == 40) {
			    				// down
			    				showingResults[selectedResultIndex].elem.removeClass(selectedClass);
			    				if(selectedResultIndex < showingResults.length - 1)
			    					selectedResultIndex ++;
			    				showingResults[selectedResultIndex].elem.addClass(selectedClass);
			    				evt.preventDefault();
			    			}
			    			if(evt.keyCode == 38) {
			    				// up
			    				showingResults[selectedResultIndex].elem.removeClass(selectedClass);
			    				if(selectedResultIndex > 0)
			    					selectedResultIndex --;
			    				showingResults[selectedResultIndex].elem.addClass(selectedClass);
			    				evt.preventDefault();
			    			}
			    		} else if(evt.keyCode == 13) {
			    			// enter key
			    			if(showingResults[selectedResultIndex])
			    				select(showingResults[selectedResultIndex].result);
			    		} else {
			    			placeholder.hide();
			    			allResultsElems.show();
			    			showingResults = [];
			    			$.each(resultsObjs, function(index) {
			    				if(this.result.name.toLowerCase().indexOf(val) == -1)
			    					this.elem.hide();
			    				else
			    					showingResults.push(this);
			    			});
			    			if(showingResults.length == 0) {
			    				placeholder.show();
			    				selectedResultIndex = 0;
			    			} else {
			    				selectedResultIndex = 0;
			    				showingResults[0].elem.addClass(selectedClass);
			    			}
			    		}
			    	}
			    	input.keypress(updateResults);
			    	input.on('keydown', updateResults);
			    	input.on('keyup', updateResults);
			    }
			    doResults(scope.data);

		    	scope.$watch('model', function(newModel, oldModel) {
					input.val(newModel);
				}, true);

				scope.$watch('data', function(newData, oldData) {
					console.log('new data', newData);
					doResults(newData);
				});
		    }
		}
	}]);