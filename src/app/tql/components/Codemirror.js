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

var PropTypes = require('prop-types');
var createReactClass = require('create-react-class');
var React = require('react');
var className = require('classnames');

const CM = require('codemirror');
const diff_match_patch = require('diff-match-patch');
require('./merge.js');
const Dimensions = require('react-dimensions');

var CodeMirror = createReactClass({
  displayName: 'CodeMirror',

  propTypes:
  {
    onFocusChange: PropTypes.func,
    options: PropTypes.object,
    path: PropTypes.string,
    value: PropTypes.string,
    className: PropTypes.any,
    codeMirrorInstance: PropTypes.object,
    toggleSyntaxPopup: PropTypes.func,
    defineTerm: PropTypes.func,
    turnSyntaxPopupOff: PropTypes.func,
    hideTermDefinition: PropTypes.func,
    highlightedLine: PropTypes.number,

    onCodeMirrorMount: PropTypes.func,

    isDiff: PropTypes.bool,
    diff: PropTypes.string,

    containerHeight: PropTypes.number,
    placeholder: PropTypes.string,
  },
  foldClass: {
    open: "CodeMirror-foldgutter-open",
    folded: "CodeMirror-foldgutter-folded",
  },

  getCodeMirrorInstance()
  {
    return this.props.codeMirrorInstance || (
      this.props.isDiff ? CM.MergeView : require('codemirror')
    );
  },

  getInitialState()
  {
    return {
      isFocused: false,
    };
  },

  componentDidMount()
  {
    var textareaNode = this.refs.textarea;
    var codeMirrorInstance = this.getCodeMirrorInstance();

    // different treatement used in CodeMirror for diffs vs. regular editor
    if (this.props.isDiff)
    {
      this.codeMirror = CM.MergeView(this.refs['div'], this.props.options, this.props.containerHeight + 'px');
      // this.codeMirror.wrap.style.height = this.props.containerHeight + 'px';
    }
    else
    {
      this.codeMirror = codeMirrorInstance.fromTextArea(textareaNode, this.props.options);
      this.codeMirror.on('focus', this.focusChanged.bind(this, true));
      this.codeMirror.on('blur', this.focusChanged.bind(this, false));
      this.codeMirror.on('contextmenu', this.handleRightClick);
      this.codeMirror.setValue(this.props.defaultValue || this.props.value || '');
      this.codeMirror.on('scroll', this.turnSyntaxPopupOff);
      this.codeMirror.setSize("100%", this.props.containerHeight);
      this.props.onCodeMirrorMount && this.props.onCodeMirrorMount(this.codeMirror);
    }
  },

  turnSyntaxPopupOff()
  {
    this.props.turnSyntaxPopupOff && this.props.turnSyntaxPopupOff();
  },

  componentWillUnmount()
  {
    if (this.codeMirror && this.codeMirror.toTextArea)
    {
      this.codeMirror.toTextArea();
    }
    this.codeMirror && this.codeMirror.wrap && this.codeMirror.wrap.remove();
  },

  handleRightClick(self, event)
  {
    event.preventDefault();
    if (this.props.defineTerm)
    {
      this.codeMirror.on('mousedown', this.props.hideTermDefinition);
      this.props.defineTerm(this.codeMirror.getSelection(), event);
    }
  },

  updateHighlightedLine: function updateHighlightedLine(lineToHighlight)
  {
    if (lineToHighlight !== null)
    {
      this.codeMirror.addLineClass(lineToHighlight, 'wrap', 'cm-error');
    }
    //Add info gutter widget
    var widget = document.createElement("span");
    var text = document.createElement("div");
    var content = document.createTextNode("?");
    widget.appendChild(text);
    text.appendChild(content);
    widget.className = 'CodeMirror-error-marker';
    text.className = 'CodeMirror-error-text';
    var self = this;
    var codeMirrorInstance = this.getCodeMirrorInstance();
    var line = this.codeMirror.getLine(lineToHighlight);
    codeMirrorInstance.on(widget, "mousedown", function(e)
    {
      self.props.toggleSyntaxPopup(e, line);
    });
    this.codeMirror.setGutterMarker(lineToHighlight, "CodeMirror-lint-markers", widget);
  },
  undoHighlightedLine: function undoHighlightedLine(line)
  {
    if (line !== null)
    {
      this.codeMirror.removeLineClass(line, 'wrap', 'cm-error');
      this.codeMirror.clearGutter('CodeMirror-lint-markers');
    }
  },
  addOpenBrace: function addOpenBrace(i, ch, arr)
  {
    //Increment the counters for all unmatched braces
    for (var entry = 0; entry < arr.length; entry++)
    {
      if (!arr[entry].closingPos)
      {
        arr[entry].counter += 1;
      }
    }
    //Note: ch is + 1 because the opening ( should not be included in the collapsable range
    //Add a new entry for the open brace found at line i, position ch
    var pos = {
      openingPos: this.getCodeMirrorInstance().Pos(i, ch + 1),
      closingPos: null,
      counter: 1
    };
    arr.push(pos);
    return arr;
  },
  addCloseBrace: function addCloseBrace(i, ch, arr)
  {
    //Decrement the counters for all unmatched braces
    //The counter at 0 is the one that the added closing brace belongs with
    for (var entry = 0; entry < arr.length; entry++)
    {
      if (!arr[entry].closingPos)
      {
        arr[entry].counter -= 1;
        if (arr[entry].counter === 0)
        {
          arr[entry].closingPos = this.getCodeMirrorInstance().Pos(i, ch);
        }
      }
    }
    return arr;
  },
  findCodeToFold: function findCodeToFold()
  {
    var paranthesesPositions = [];
    var bracketPositions = [];
    //Find positions of sets of () and {}
    for (var i = 0; i < this.codeMirror.lineCount(); i++)
    {
      var line = this.codeMirror.getLine(i);
      for (var ch = 0; ch < line.length; ch++)
      {
        if (line[ch] === '(')
        {
          paranthesesPositions = this.addOpenBrace(i, ch, paranthesesPositions);
        }
        else if (line[ch] === ')')
        {
          paranthesesPositions = this.addCloseBrace(i, ch, paranthesesPositions);
        }
        else if (line[ch] === '{')
        {
          bracketPositions = this.addOpenBrace(i, ch, bracketPositions);
        }
        else if (line[ch] === '}')
        {
          bracketPositions = this.addCloseBrace(i, ch, bracketPositions);
        }
      }
    }
    var codeFoldingPositions = bracketPositions.concat(paranthesesPositions);
    this.addGutterWidgets(codeFoldingPositions);
  },
  addGutterWidgets: function addGutterWidgets(codeFoldingPositions)
  {
    var self = this;
    var codeMirrorInstance = this.getCodeMirrorInstance();
    this.codeMirror.clearGutter('CodeMirror-foldgutter');

    for (var i = 0; i < codeFoldingPositions.length; i++)
    {
      let openingPos = codeFoldingPositions[i].openingPos;
      let closingPos = codeFoldingPositions[i].closingPos;
      if (openingPos && closingPos)
      {
        let range = this.codeMirror.markText(openingPos, closingPos, {
          __isFold: true
        });
        let gutterWidget = this.makeGutterWidget(openingPos, closingPos);

        codeMirrorInstance.on(gutterWidget, "mousedown", function(e)
        {
          codeMirrorInstance.e_preventDefault(e);
          //if it's folded, unfold (by removing the mark __isFold)
          if (gutterWidget.className === self.foldClass.folded)
          {
            var marks = self.codeMirror.findMarksAt(openingPos);
            for (var i = 0; i < marks.length; i++)
            {
              if (marks[i].__isFold)
              {
                marks[i].clear();
              }
            }
            gutterWidget.className = self.foldClass.open;
          }
          //if the section is open, collapse it
          else
          {
            gutterWidget.className = self.foldClass.folded;
            self.collapseCode(openingPos, closingPos, gutterWidget);
          }
        });

        this.codeMirror.setGutterMarker(openingPos.line, "CodeMirror-foldgutter", gutterWidget);
      }
    }
  },
  //Collapses code and replaces the code with a widget that can re-open the code segment
  collapseCode: function collapseCode(openingPos, closingPos, gutterWidget)
  {
    var codeMirrorInstance = this.getCodeMirrorInstance();
    var widget = this.makeWidget('...');
    var self = this;
    //Onclick functions to unfold the code
    codeMirrorInstance.on(widget, "mousedown", function(e)
    {
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
  //Makes the codemirror widget
  makeWidget: function makeWidget(text)
  {
    var widget = document.createElement("span");
    var content = document.createTextNode(text);
    widget.appendChild(content);
    widget.className = "CodeMirror-foldmarker";
    return widget;
  },
  //Create a gutter widget
  //Check the current gutter widget to decide which widget to make
  makeGutterWidget: function makeGutterWidget(openingPos, closingPos)
  {
    var classname = this.foldClass.open;
    var marks = this.codeMirror.findMarks(openingPos, closingPos);
    if (marks)
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


  componentDidUpdate()
  {
    if (this.state.shouldMount)
    {
      this.setState({
        shouldMount: false,
      });
      this.componentDidMount();
    }
  },

  componentWillReceiveProps: function componentWillReceiveProps(nextProps)
  {
    if (this.props.isDiff !== nextProps.isDiff)
    {
      this.componentWillUnmount();
      this.setState({
        shouldMount: true,
      });
      return;
    }

    if (nextProps.containerHeight !== this.props.containerHeight)
    {
      this.codeMirror && this.codeMirror.wrap && (this.codeMirror.wrap.style.height = nextProps.containerHeight + 'px');
      this.codeMirror.setSize("100%", nextProps.containerHeight);
    }

    if (this.codeMirror && nextProps.value !== undefined && this.codeMirror.getDoc().getValue() != nextProps.value)
    {
      const cursor = this.codeMirror.getCursor();
      this.codeMirror.setValue(nextProps.value);
      this.codeMirror.setCursor(cursor);
    }
    if (typeof nextProps.options === 'object' && this.codeMirror && this.codeMirror.setOption)
    {
      for (var optionName in nextProps.options)
      {
        if (nextProps.options.hasOwnProperty(optionName))
        {
          if (JSON.stringify(this.codeMirror.getOption(optionName)) !== JSON.stringify(nextProps.options[optionName]))
          {
            this.codeMirror.setOption(optionName, nextProps.options[optionName]);
          }
        }
      }
    }

    if (nextProps.highlightedLine !== this.props.highlightedLine)
    {
      if (typeof this.props.highlightedLine === 'number')
      {
        this.undoHighlightedLine(this.props.highlightedLine);
      }
      if (typeof nextProps.highlightedLine === 'number')
      {
        this.updateHighlightedLine(nextProps.highlightedLine);
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
    if (window.location.pathname.indexOf('builder') >= 0)
    {
      this.setState({
        isFocused: focused
      });
      this.props.onFocusChange && this.props.onFocusChange(focused);
    }
  },
  render: function render()
  {
    var editorClassName = className('ReactCodeMirror', this.state.isFocused ? 'ReactCodeMirror--focused' : null, this.props.className);

    if (this.props.isDiff)
    {
      return React.createElement(
        'div',
        {
          className: editorClassName,
          ref: 'div',
        });
    }

    return React.createElement(
      'div',
      {
        className: editorClassName,
      },
      React.createElement('textarea', { ref: 'textarea', name: this.props.path, placeholder: this.props.placeholder, defaultValue: this.props.value, autoComplete: 'off' })
    );
  }
});

module.exports = Dimensions()(CodeMirror);
