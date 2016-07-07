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

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as classNames from 'classnames';
import * as Immutable from 'immutable';
import ResultsView from './ResultsView.tsx';
import Menu from './../../common/components/Menu.tsx';
import { MenuOption } from '../../common/components/Menu.tsx';

//React Node Modules
var ReactGridLayout = require('react-grid-layout');
var Button = require('react-button');
var LocalStorageMixin = require('react-localstorage');

//Code mirror
var CodeMirror = require('./Codemirror.js');

//Style sheets and addons for code-mirror
import './codemirror.css';
import './monokai.css';
import './cobalt.css';
import './neo.css';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/display/placeholder.js';
import 'codemirror/addon/fold/foldgutter.css';
<<<<<<< HEAD

=======
>>>>>>> 9c32b420d8d0365c8a679e83b8b03fcb04e6e257
//Searching
import 'codemirror/addon/dialog/dialog.js';
import './dialog.css';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/scroll/annotatescrollbar.js';
import 'codemirror/addon/search/matchesonscrollbar.js';
import 'codemirror/addon/search/jump-to-line.js';
import 'codemirror/addon/search/matchesonscrollbar.css';

//mode
require('./tql.js');

//Components
import Classs from './../../common/components/Classs.tsx';
import Ajax from "./../../util/Ajax.tsx";

interface Props
{
  params?: any;
  history?: any;
  algorithm?: any;
}

class TQL extends Classs<Props>
{
 state: 
 {
    tql: string;
    code: string;
    theme: string;
    highlightedLine: number;
<<<<<<< HEAD
    theme_index: number;
=======
>>>>>>> 9c32b420d8d0365c8a679e83b8b03fcb04e6e257
  } = {
    tql: null,
    code: '',
    theme: 'default',
    highlightedLine: null,
    theme_index: 0,
  };

  changeTheme(newTheme) 
  {
    this.setState({
      theme: newTheme,
    });
  }

  updateCode(newCode) 
  {
    this.checkForFolding(newCode);
    this.undoError();
    this.setState({
      code: newCode,
      highlightedLine: null
    });
  }

  checkForFolding(newCode) {
    var x: any = this.refs['cm'];
    if (x) {
    x.findCodeToFold();
    }
  }

	executeCode()
	{
    this.setState({
      tql: this.state.code
    });
	}

<<<<<<< HEAD
  changeThemeDefault()
  {  
    this.setState({
      theme: 'default',
      theme_index: 0
    });
  }

  changeThemeNeo() 
  {
    this.setState({
      theme: 'neo', 
      theme_index: 1
    });
  }

  changeThemeCobalt() 
  {
    this.setState({
      theme: 'cobalt',
      theme_index: 2
    });
  }

  changeThemeMonokai() 
  {
    this.setState({
      theme: 'monokai',
      theme_index: 3
    });
  }

  getMenuOptions(): MenuOption[]
  {
    var options: MenuOption[] =
    [
      {
        text: 'Default',
        onClick: this.changeThemeDefault,
      },
      {
        text: 'Neo',
        onClick: this.changeThemeNeo,
      },
      {
        text: 'Cobalt',
        onClick: this.changeThemeCobalt,
      },
      {
        text: 'Monokai',
        onClick: this.changeThemeMonokai,
      },
    ];
    options[this.state.theme_index].disabled = true;
    return options;
=======
//Work on compressing this
  changeThemeDefault()
  {  
    this.setState({
      theme: 'default'
    });
  }
  changeThemeMonokai() {
    this.setState({
      theme: 'monokai'
    });
  }
  changeThemeNeo() {
    this.setState({
      theme: 'neo'
    });
  }
  changeThemeCobalt() {
    this.setState({
      theme: 'cobalt'
    });
>>>>>>> 9c32b420d8d0365c8a679e83b8b03fcb04e6e257
  }

  highlightError(lineNumber: number) 
  {
    this.state.highlightedLine = lineNumber - 1; //-1 because they should be 0-indexed
    //This is a workaround for the missing property syntax error
    var x: any = this.refs['cm'];
    if(x)
    {
      x.updateHighlightedLine(this.state.highlightedLine);
    }
  }

  undoError() 
  {
    if(this.state.highlightedLine != null) 
    {
      var x: any = this.refs['cm'];
      if(x) 
      {
        x.undoHighlightedLine(this.state.highlightedLine);
      }
    }
  }

  render()
<<<<<<< HEAD
  { 
  	var options = {
  		lineNumbers: true,
  		mode: 'tql',
      extraKeys: { 'Ctrl-F': 'findPersistent'},
      lineWrapping: true,
  	  theme: this.state.theme,
      matchBrackets: true,
      autoCloseBrackets: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    };
 		return (
 			<div>
  			<ReactGridLayout 
    			isDraggable={false} 
    			isResiable={false}
    			layout={[]} 
          cols={2}
    			rowHeight={window.innerHeight/2}
          width={window.innerWidth}
          className='grid-layout'
    		>
      		<div key={1} className="column-1 tql-view">
             <CodeMirror 
              highlightedLine={this.state.highlightedLine}  
              value={this.state.code} 
              onChange={this.updateCode} 
              ref="cm" 
              options={options} 
              className='codemirror-text'
            />
            <Menu id='themes' options={this.getMenuOptions()} small={true}/>              
            <Button onClick={this.executeCode} className='execute-button'>
              Execute code
            </Button>
          </div>
       		<div key={2} className="column-2" id='results' >
      			<ResultsView tql={this.state.tql} onError={this.highlightError} noError={this.undoError}/>
      		</div>
    	  </ReactGridLayout>
=======
  	{ 
  		var options = {
  			lineNumbers: true,
  			mode: 'tql',
        extraKeys: { 'Ctrl-F': 'findPersistent'},
        lineWrapping: true,
  		  theme: this.state.theme,
        matchBrackets: true,
        autoCloseBrackets: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      }
 		return (
 			<div>
  				<ReactGridLayout 
    				isDraggable={false} 
    				isResiable={false}
    				layout={[]} 
    				cols={2} 
    				rowHeight={window.innerHeight}
            width={window.innerWidth}
            className='grid-layout'
    			>
      			<div key={1} className="column-1 tql-view">
              <div className="theme-buttons">
                <div
                  className={this.state.theme == 'default' ? 'selected' : ''}
                  onClick={this.changeThemeDefault}>
                  Default
                </div>
                <div
                  className={this.state.theme == 'monokai' ? 'selected' : ''}
                  onClick={this.changeThemeMonokai }>
                  Monokai
                </div>
                <div
                  className={this.state.theme == 'cobalt' ? 'selected' : ''}
                  onClick={this.changeThemeCobalt}>
                  Cobalt
                </div>
                <div
                  className={this.state.theme == 'neo' ? 'selected' : ''}
                  onClick={this.changeThemeNeo }>
                  Neo
                </div>
              </div>
						  <CodeMirror 
                highlightedLine={this.state.highlightedLine}  
                value={this.state.code} 
                onChange={this.updateCode} 
                ref="cm" 
                options={options} 
              />      			
              <Button onClick={this.executeCode} className='execute-button'>
                Execute code
              </Button>
            </div>
      			<div key={2} className="column-2" id='results' >
      				<ResultsView tql={this.state.tql} onError={this.highlightError} noError={this.undoError}/>
      			</div>
    		</ReactGridLayout>
>>>>>>> 9c32b420d8d0365c8a679e83b8b03fcb04e6e257
    	</div>
    );
  }
}

export default TQL;