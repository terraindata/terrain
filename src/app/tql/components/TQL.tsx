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
import * as ReactDOM from "react-dom";
import * as _ from "underscore";
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
var Codemirror = require('react-codemirror');
//Style sheets for code-mirror
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/cobalt.css';
import 'codemirror/theme/neo.css';

//Lint
//import 'codemirror/addon/lint/lint.js'
//import 'codemirror/addon/lint/javascript-lint.js'

//Javascript mode
import 'codemirror/mode/custom/custom';

//Components
import Classs from './../../common/components/Classs.tsx';
import LayoutManager from "./layout/LayoutManager.tsx";
import Ajax from "./../../util/Ajax.tsx";

interface Props
{
  params?: any;
  history?: any;
}


class TQL extends Classs<Props>
{

 classNames = {
   'default': 'selected', 
   'monokai': 'unselected', 
   'cobalt': 'unselected', 
   'neo': 'unselected'
 };

 state: 
 {
    tql: string;
    code: string;
    theme: string;
  } = {
    tql: null,
    code: "TQL GOES HERE",
    theme: 'default',
  };

  updateCode(newCode) 
  {
  		this.setState({
  			code: newCode
  		});  	
  }

	executeCode()
	{
    	this.setState({ tql: this.state.code});//"from 'usprofile_babysitter' as bb\n take 10\n select\n bb.dogs_ok;"});
	}

	getTql(event) 
	{
    this.setState({ code: event.target.value})
   }

  changeTheme(newTheme: string)
  {  
    this.setState({
      theme: newTheme
    });
    classNames['default'] = 'unselected';
    classNames['monokai'] = 'unselected';
    classNames['cobalt'] = 'unselected';
    classNames['neo'] = 'unselected';
    classNames[newTheme] = 'selected';
  }
  	render()
  	{ 
  		var options = {
  			lineNumbers: true,
  			mode: 'custom',
        // gutters: ["CodeMirror-lint-markers"],
        // lint: true,
  		  theme: this.state.theme
      }
 		return (
 			<div>
 				<Button onClick={this.executeCode}>
  					Execute code
      		</Button>
  				<ReactGridLayout 
    				isDraggable={false} 
    				isResiable={false}
    				layout={[]} 
    				cols={2} 
    				rowHeight={window.innerHeight}
    			>
      			<div key={1} className="column-1 tql-view">
						  <Codemirror value={this.state.code} onChange={this.updateCode} options={options} />      			
      			  <div className="theme-buttons">
                <div className={classNames['default']} onClick={()=>this.changeTheme('default')}>Default</div>
                <div className={classNames['monokai']} onClick={()=>this.changeTheme('monokai')}>Monokai</div>
                <div className={classNames['cobalt']} onClick={()=>this.changeTheme('cobalt')}>Cobalt</div>
                <div className={classNames['neo']} onClick={()=>this.changeTheme('neo')}>Neo</div>
              </div>
            </div>
      			<div key={2} className="column-2" id='results'>
      				<ResultsView tql={this.state.tql}/>
      			</div>
    		</ReactGridLayout>
    	</div>
    );
  	}
}

export default DragDropContext(HTML5Backend)(TQL);