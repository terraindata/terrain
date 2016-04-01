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
import { CardTypes } from './../../CommonVars.tsx';
import CreateLine from "../common/CreateLine.tsx";

var AddIcon = require("./../../../images/icon_add_7x7.svg?name=AddIcon");
var CloseIcon = require("./../../../images/icon_close_8x8.svg?name=CloseIcon");

// Coordinate these with .less
var buttonPadding = 12;
var buttonWidth = 110 + buttonPadding;
var buttonHeight = 40 + buttonPadding;
var moreButtonWidth = 80;
var fieldHeight = 35 + buttonPadding;

interface Props {
  index: number;
  alwaysOpen?: boolean;
  parentId: string;
  dy?: number;
  className?: string;
}

class CreateCardTool extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    this.state = {
      open: false,
      showAll: false,
      search: "",
    };
    this.toggleOpen = this.toggleOpen.bind(this);
    this.toggleShowAll = this.toggleShowAll.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleChange = this.handleChange.bind(this);
    
    if(this.props.alwaysOpen)
    {
      this.state.showAll = true;
    }
  }
  
  createCardFactory(type): () => void {
    return () => {
      this.refs['field']['value'] = '';
      this.setState({
        open: false,
        search: "",
      });
      
      Actions.cards.create(this.props.parentId, type, this.props.index);
    }
  }
  
  toggleOpen() {
    this.setState({
      open: !this.state.open,
      showAll: false,
    });
    
    this.refs['field']['focus']();
  }
  
  toggleShowAll() {
    this.setState({
      showAll: !this.state.showAll,
    });
  }
  
  componentWillMount() {
    // On initial render we don't get the dimensions, need to trigger a redo
    setTimeout(() => {
      this.setState(this.state);
    }, 150);
  }
  
  handleKeydown(event) {
    if(event.keyCode === 13)
    {
      // enter
      var type = CardTypes.reduce((answer, type): any => {
        if(!answer && !this.hideButton(type))
        {
          return type;
        }
        return answer;
      }, false);
      
      if(type && typeof type === 'string')
      {
        this.createCardFactory(type)();
      }
    }
  }
  
  handleChange(event) {
    this.setState({
      search: event.target.value,
    });
  }
  
  hideButton(type: string): boolean
  {
    return this.state.search !== "" &&
      this.state.search !== type.substr(0, this.state.search.length);
  }
  
  renderCardSelector() {
    var numToShow = 9999;
    if(this.state.showAll || this.props.alwaysOpen)
    {
      if(this.refs['ccWrapper'] && this.refs['ccWrapper']['offsetWidth'])
      {
        var overrideHeight: any = 2 * buttonPadding + 2 + fieldHeight +
          buttonHeight * Math.ceil(CardTypes.length * buttonWidth / this.refs['ccWrapper']['offsetWidth']);
      }
      else
      {
        overrideHeight = 'auto';
        numToShow = 9999;
      }
    }
    else
    {
      if(this.refs['ccWrapper'] && this.refs['ccWrapper']['offsetWidth'])
      {
        var totalWidth = this.refs['ccWrapper']['offsetWidth'] - moreButtonWidth;
        numToShow = Math.floor(totalWidth / buttonWidth);
      }
    }
    
    
    var classes = Util.objToClassname({
      "create-card-selector": true,
      "create-card-selector-show-all": this.state.showAll,
    });
    
    return (
     <div className={classes} style={{height: overrideHeight}}>
       <div className="create-card-field-wrapper">
         <div className="create-card-plus">
           +
         </div>
         <input type="text" ref="field" className="create-card-field" placeholder="Type card name here, or select from the suggestions below" onKeyDown={this.handleKeydown} onChange={this.handleChange} />
       </div>
       <div className="create-card-buttons-wrapper">
         {
           CardTypes.map((type, index) => this.hideButton(type) ? null : (
             <div className="create-card-button" key={type} onClick={this.createCardFactory(type)}>
               <div className="create-card-button-inner">
                 { type === 'parentheses' ? '( )' : type }
               </div>
             </div>
           ))
         }
         <div className="create-card-more-button" onClick={this.toggleShowAll}>
           <div className="create-card-more-button-inner">
             Show All
           </div>
         </div>
       </div>
     </div>
     );
  }
  
  renderCreateCardRow() {
    if(this.props.alwaysOpen)
    {
      return null;
    }
    
    return <CreateLine open={this.state.open} onClick={this.toggleOpen} />;
  }

  render() {
    return null; // for now
    var classes = Util.objToClassname({
      "create-card-wrapper": true,
      "create-card-open": this.state.open || this.props.alwaysOpen,
      "create-card-closed": !this.state.open && !this.props.alwaysOpen,
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
        { this.renderCreateCardRow() }
        { this.renderCardSelector() }
     </div>
   );
  }
};

export default CreateCardTool;