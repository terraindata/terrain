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

//Adapted from https://github.com/JedWatson/react-codemirror
'use strict';

var React = require('react');
var className = require('classnames');
//var debounce = require('lodash.debounce');

var CodeMirror = React.createClass({
	displayName: 'CodeMirror',

	propTypes: {
		onChange: React.PropTypes.func,
		onFocusChange: React.PropTypes.func,
		options: React.PropTypes.object,
		path: React.PropTypes.string,
		value: React.PropTypes.string,
		className: React.PropTypes.any,
		codeMirrorInstance: React.PropTypes.object,
		highlightedLine: React.PropTypes.number,
	},
	foldClass: {
		open: "CodeMirror-foldgutter-open",
		folded: "CodeMirror-foldgutter-folded",
	},
	getCodeMirrorInstance: function getCodeMirrorInstance() 
	{
		return this.props.codeMirrorInstance || require('codemirror');
	},
	getInitialState: function getInitialState() 
	{
		return {
			isFocused: false,
		};
	},
	componentDidMount: function componentDidMount() 
	{
		var textareaNode = this.refs.textarea;
		var codeMirrorInstance = this.getCodeMirrorInstance();
		this.codeMirror = codeMirrorInstance.fromTextArea(textareaNode, this.props.options);
		this.codeMirror.on('change', this.codemirrorValueChanged);
		this.codeMirror.on('focus', this.focusChanged.bind(this, true));
		this.codeMirror.on('blur', this.focusChanged.bind(this, false));
		this.codeMirror.setValue(this.props.defaultValue || this.props.value || '');
		this.codeMirror.setSize("100%", "85%");
	},
	componentWillUnmount: function componentWillUnmount() 
	{
		// is there a lighter-weight way to remove the cm instance?
		if (this.codeMirror) 
		{
			this.codeMirror.toTextArea();
		}
	},
	updateHighlightedLine: function updateHighlightedLine(lineToHighlight) 
	{
		if(lineToHighlight != null) 
		{
			this.codeMirror.addLineClass(lineToHighlight, 'wrap', 'cm-error');
		}
	},
	undoHighlightedLine: function undoHighlightedLine(line) 
	{
		if(line != null) 
		{
			this.codeMirror.removeLineClass(line, 'wrap', 'cm-error');
		}
	},
	findCodeToFold: function findCodeToFold() 
	{
		var codeFoldingPositions = [];
		//Find positions of sets of ()
		for(var i = 0; i < this.codeMirror.lineCount(); i++) 
		{
			var line = this.codeMirror.getLine(i);
			for(var ch = 0; ch < line.length; ch++) 
			{
				if(line[ch] === '(')
				{
					for(var entry = 0; entry < codeFoldingPositions.length; entry++) 
					{
						if(!codeFoldingPositions[entry].closingPos)
						{
							codeFoldingPositions[entry].counter += 1;
						}
					}
					//Note: ch is + 1 because the opening ( should not be included in the collapsable range
					var pos = {
						openingPos: this.getCodeMirrorInstance().Pos(i, ch+1), 
						closingPos: null,
						counter: 1
					};
					codeFoldingPositions.push(pos);
				} 
				else if(line[ch] === ')')
				{	
					for(var entry = 0; entry < codeFoldingPositions.length; entry++) 
					{
						if(!codeFoldingPositions[entry].closingPos)
						{
							codeFoldingPositions[entry].counter -= 1;
							if(codeFoldingPositions[entry].counter === 0) 
							{
								codeFoldingPositions[entry].closingPos = this.getCodeMirrorInstance().Pos(i, ch);
							}
						}
					}
				}
			}
		}
		this.addGutterWidgets(codeFoldingPositions);
	},
	addGutterWidgets: function addGutterWidgets(codeFoldingPositions)
	{
		console.log("Add gutter widgets");
		var self = this;
		var codeMirrorInstance = this.getCodeMirrorInstance();
		this.codeMirror.clearGutter('CodeMirror-foldgutter');
		//Posible: mark all text with __isFold: false before this loop
		//Also want to check if there are multiple foldable start points on the same line - which one should fold?

		for(var i = 0; i < codeFoldingPositions.length; i++) 
		{
			let openingPos = codeFoldingPositions[i].openingPos;
			let closingPos = codeFoldingPositions[i].closingPos;
			if(openingPos && closingPos)
			{
				let range = this.codeMirror.markText(openingPos, closingPos, {
      				__isFold: true
    			});
				let gutterWidget = this.makeGutterWidget(openingPos, closingPos);

				codeMirrorInstance.on(gutterWidget, "mousedown", function(e) {
					codeMirrorInstance.e_preventDefault(e);
		      		if(gutterWidget.className === self.foldClass.folded)
		      		{
		      			var marks = self.codeMirror.findMarksAt(openingPos);
		      			for(var i = 0; i < marks.length; i++) 
		      			{
		      				if(marks[i].__isFold) 
		      				{
		      					marks[i].clear();
		      				}
		      			}
		      			gutterWidget.className = self.foldClass.open;
		      		} else 
		      		{
		      			gutterWidget.className = self.foldClass.folded;
		      			self.collapseCode(openingPos, closingPos, gutterWidget);
		      		}
		   		});

		   		this.codeMirror.setGutterMarker(openingPos.line, "CodeMirror-foldgutter", gutterWidget);
   			}
   		}
	},
	collapseCode: function collapseCode(openingPos, closingPos, gutterWidget)
	{					
		var codeMirrorInstance = this.getCodeMirrorInstance();
		var widget = this.makeWidget('...');
		var self = this;
		//Onclick functions to unfold the code
		codeMirrorInstance.on(widget, "mousedown", function(e) {
      		myRange.clear();
      		gutterWidget.className = self.foldClass.open;
     		codeMirrorInstance.e_preventDefault(e);
   		});
   		//Actually fold code
    	var myRange = this.codeMirror.markText(openingPos, closingPos, {
      		replacedWith: widget,
      		__isFold: true
    	});
	},
	makeWidget: function makeWidget(text) 
	{
		var widget = document.createElement("span");
		var content = document.createTextNode(text);
		widget.appendChild(content);
		widget.className = "CodeMirror-foldmarker";
		return widget;
  	},
  	//Create a gutter widget - check to see if the current section of code is already folded
  	//to decide what class of widget to make
  	makeGutterWidget: function makeGutterWidget(openingPos, closingPos)
  	{
  		var classname = this.foldClass.open;
  		var marks = this.codeMirror.findMarks(openingPos, closingPos);
  		if(marks) 
  		{
  			for (var i = 0; i < marks.length; i++)
  			{
  				if (marks[i].replacedWith)
  				{
  					classname = this.foldClass.folded;
  				}
  			}
      		
  		}
  		var widget = document.createElement("span");
  		widget.className = classname;
  		return widget;
  	},
	 
	componentWillReceiveProps: function componentWillReceiveProps(nextProps)
	{
		if (this.codeMirror && nextProps.value !== undefined && this.codeMirror.getValue() != nextProps.value) 
		{
			this.codeMirror.setValue(nextProps.value);
		}
		if (typeof nextProps.options === 'object') 
		{
			for (var optionName in nextProps.options) 
			{
				if (nextProps.options.hasOwnProperty(optionName)) 
				{
					this.codeMirror.setOption(optionName, nextProps.options[optionName]);
				}
			}
		}
	},
	getCodeMirror: function getCodeMirror() 
	{
		return this.codeMirror;
	},
	focus: function focus()
	 {
		if (this.codeMirror) 
		{
			this.codeMirror.focus();
		}
	},
	focusChanged: function focusChanged(focused) 
	{
		this.setState({
			isFocused: focused
		});
		this.props.onFocusChange && this.props.onFocusChange(focused);
	},
	codemirrorValueChanged: function codemirrorValueChanged(doc, change) 
	{
		if (this.props.onChange && change.origin != 'setValue') 
		{
			this.props.onChange(doc.getValue());
		}
	},
	render: function render() 
	{
		var editorClassName = className('ReactCodeMirror', this.state.isFocused ? 'ReactCodeMirror--focused' : null, this.props.className);
		return React.createElement(
			'div',
			{ className: editorClassName },
			React.createElement('textarea', { ref: 'textarea', name: this.props.path, placeholder: "Enter TQL here", defaultValue: this.props.value, autoComplete: 'off' })
		);
	}
});

module.exports = CodeMirror;