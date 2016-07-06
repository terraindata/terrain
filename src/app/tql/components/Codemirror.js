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
	getCodeMirrorInstance: function getCodeMirrorInstance() 
	{
		return this.props.codeMirrorInstance || require('codemirror');
	},
	getInitialState: function getInitialState() 
	{
		return {
			isFocused: false,
			openingPos: null,
			closingPos: null,
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