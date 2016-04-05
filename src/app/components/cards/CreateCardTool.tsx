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

require('./CreateCardTool.less')
import * as React from 'react';
import Actions from "../../data/Actions.tsx";
import Util from '../../util/Util.tsx';
import { CardTypes, CardColors } from './../../CommonVars.tsx';
import CreateLine from "../common/CreateLine.tsx";

var AddIcon = require("./../../../images/icon_add_7x7.svg?name=AddIcon");
var CloseIcon = require("./../../../images/icon_close_8x8.svg?name=CloseIcon");

// Coordinate these with .less
var buttonPadding = 12;
var minButtonWidth = 120;

interface Props {
  index: number;
  open?: boolean;
  parentId: string;
  dy?: number;
  className?: string;
  onMinimize?: () => void;
}

class CreateCardTool extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    this.state = {
      open: false,
    };
  }
  
  createCardFactory(type): () => void {
    return () => {
      this.setState({
        open: false,
      });
      
      if(this.props.open && this.props.onMinimize)
      {
        this.props.onMinimize();
      }
      Actions.cards.create(this.props.parentId, type, this.props.index);
    }
  }
  
  // componentWillReceiveProps(newProps)
  // {
  //   if(newProps.open)
  //   {
  //     Util.animateToAutoHeight(this.refs['ccWrapper']);
  //   }
  //   else
  //   {
  //     Util.animateToHeight(this.refs['ccWrapper'], 0);
  //     this.refs['ccWrapper']['style']['overflow'] = 'hidden';
  //   }
  // }
  
  componentWillMount()
  {
    // On initial render we don't get the dimensions, need to trigger a redo
    setTimeout(() => {
      this.setState(this.state);
    }, 150);
  }
  
  renderCardSelector() {
    var buttonWidth = minButtonWidth;
    if(this.refs['ccWrapper'])
    {
      var totalWidth = this.refs['ccWrapper']['getBoundingClientRect']().width - buttonPadding;
      var numButtons = Math.floor(totalWidth / minButtonWidth);
      var remainder = totalWidth % minButtonWidth;
      buttonWidth = minButtonWidth + remainder / numButtons - buttonPadding;
    }
    
    return (
     <div className='create-card-selector'>
       <div className='create-card-selector-inner'>
         {
           CardTypes.map((type, index) => (
             <a
               className="create-card-button"
               key={type}
               onClick={this.createCardFactory(type)}
               style={{
                 background: CardColors[type][0],
                 borderColor: CardColors[type][1],
                 width: buttonWidth,
               }}
             >
               <div className="create-card-button-inner">
                 { type === 'parentheses' ? '( )' : type }
               </div>
             </a>
           ))
         }
       </div>
     </div>
     );
  }
  
  render() {
    var classes = Util.objToClassname({
      "create-card-wrapper": true,
      "create-card-open": this.state.open || this.props.open,
      "create-card-closed": !this.state.open && !this.props.open,
    });
    classes += ' ' + this.props.className;
    
    if(this.props.dy)
    {
      var style = 
      {
        position: 'relative',
        top: this.props.dy + 'px',
      }
    }
    
    return (
      <div className={classes} ref="ccWrapper" style={style}>
        { this.renderCardSelector() }
     </div>
   );
  }
};

export default CreateCardTool;