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
import * as _ from 'underscore';
import * as $ from 'jquery';
import * as classNames from 'classnames';
import { DragDropContext } from 'react-dnd';
import * as Immutable from 'immutable';
import ResultsView from './ResultsView.tsx';
//React Node Modules
var HTML5Backend = require('react-dnd-html5-backend');
var ReactGridLayout = require('react-grid-layout');
var Button = require('react-button');

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

//Searching
import 'codemirror/addon/dialog/dialog.js';
import './dialog.css';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/search/search.js';
import 'codemirror/addon/scroll/annotatescrollbar.js';
import 'codemirror/addon/search/matchesonscrollbar.js';
import 'codemirror/addon/search/jump-to-line.js';
//import "codemirror/addon/dialog/dialog.css";
import 'codemirror/addon/search/matchesonscrollbar.css';

//mode
//import 'codemirror/mode/javascript/javascript';
require('./tql.js');

//folding doesn't work currently
// import 'codemirror/addon/fold/foldgutter.css';
// import 'codemirror/addon/fold/foldcode.js';
// import 'codemirror/addon/fold/foldgutter.js';
// import 'codemirror/addon/fold/brace-fold.js';
// import 'codemirror/addon/fold/comment-fold.js';

//Components
import Classs from './../../common/components/Classs.tsx';
import LayoutManager from './layout/LayoutManager.tsx';
import Ajax from "./../../util/Ajax.tsx";

interface Props
{
  params?: any;
  history?: any;
}


class TQL extends Classs<Props>
{

 state: 
 {
    tql: string;
    code: string;
    theme: string;
    highlightedLine: number;

  } = {
    tql: null,
    code: '',
    theme: 'default',
    highlightedLine: null,
  };

  updateCode(newCode) 
  {
    this.undoError();
    this.setState({
      code: newCode,
      highlightedLine: null
    });
  }

	executeCode()
	{
    this.setState({
      //highlightedLine: null,
      tql: this.state.code
    });
	}

  changeTheme(newTheme: string)
  {  
    this.setState({
     theme: newTheme
   });
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
    console.log("Should unhighlight the error");
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
  	{ 
  		var options = {
  			lineNumbers: true,
  			mode: 'tql',
        extraKeys: { "Ctrl-F": "findPersistent" },
        lineWrapping: true,
  		  theme: this.state.theme,
        matchBrackets: true,
        autoCloseBrackets: true,
      }
    //if a line should be highlighted do it
 		return (
 			<div>
          <div className="theme-buttons">
            <div
              className={this.state.theme == 'default' ? 'selected' : ''}
              onClick={() => this.changeTheme('default') }>
              Default
            </div>
            <div
              className={this.state.theme == 'monokai' ? 'selected' : ''}
              onClick={() => this.changeTheme('monokai') }>
              Monokai
            </div>
            <div
              className={this.state.theme == 'cobalt' ? 'selected' : ''}
              onClick={() => this.changeTheme('cobalt') }>
              Cobalt
            </div>
            <div
              className={this.state.theme == 'neo' ? 'selected' : ''}
              onClick={() => this.changeTheme('neo') }>
              Neo
            </div>
          </div>
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
    	</div>
    );
  	}
}

export default DragDropContext(HTML5Backend)(TQL);