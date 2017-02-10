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

require('./TQLEditor.less');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
const {List} = Immutable;
import * as _ from 'underscore';
import PureClasss from './../../common/components/PureClasss';
const CodeMirror = require('./Codemirror.js');


// Style sheets and addons for CodeMirror

require('./tql.js');
import './codemirror.less';
import './monokai.less';
import './cobalt.less';
import './neo.less';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/display/placeholder.js';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/lint/lint.js';

import 'codemirror/addon/dialog/dialog.js';
import './dialog.less';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/scroll/annotatescrollbar.js';
import 'codemirror/addon/search/matchesonscrollbar.js';
import 'codemirror/addon/search/jump-to-line.js';
import 'codemirror/addon/search/matchesonscrollbar.css';

interface Props
{
  tql: string;
  canEdit: boolean;
  
  onChange?(tql: string);
  onFocusChange?(focused: boolean);
  
  toggleSyntaxPopup?(event, line);
  defineTerm?(value, event);
  turnSyntaxPopupOff?();
  hideTermDefinition?();
  theme?: string;
  highlightedLine?: number;
  
  isDiff?: boolean;
  diffTql?: string;
}

class TQLEditor extends PureClasss<Props>
{
  render() 
  {
    let options =
    {
      readOnly: !this.props.canEdit,
      lineNumbers: true,
      extraKeys: { 'Ctrl-F': 'findPersistent' },
      lineWrapping: true,
      theme: this.props.theme || localStorage.getItem('theme') || 'default',
      matchBrackets: true,
      autoCloseBrackets: true,
      foldGutter: true,
      lint: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
      
      revertButtons: false,
      connect: 'align',
      
      origLeft: this.props.diffTql,
    };
    
    if(this.props.isDiff)
    {
      options['value'] = this.props.tql || '';
      return (
        <CodeMirror
          ref="cm2"
          className='codemirror-text'
          options={options}
          
          isDiff={true}
          diff={this.props.diffTql}
        />
      );
    }
    
    return (
      <CodeMirror
        ref="cm"
        className='codemirror-text'
        value={this.props.tql || ''}
        options={options}
        
        highlightedLine={this.props.highlightedLine}
        onChange={this.props.onChange}
        toggleSyntaxPopup={this.props.toggleSyntaxPopup}
        defineTerm={this.props.defineTerm}
        turnSyntaxPopupOff={this.props.turnSyntaxPopupOff}
        hideTermDefinition={this.props.hideTermDefinition}
        onFocusChange={this.props.onFocusChange}
      />
    );
  }
}

export default TQLEditor;