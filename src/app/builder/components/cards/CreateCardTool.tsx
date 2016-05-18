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
var shallowCompare = require('react-addons-shallow-compare');
import * as _ from 'underscore';
import * as React from 'react';
import Actions from "../../data/BuilderActions.tsx";
import Util from '../../../util/Util.tsx';
import { CardTypes, CardColors } from './../../CommonVars.tsx';
import CreateLine from "../../../common/components/CreateLine.tsx";
import { DragSource, DropTarget } from 'react-dnd';

var AddIcon = require("./../../../../images/icon_add_7x7.svg?name=AddIcon");
var CloseIcon = require("./../../../../images/icon_close_8x8.svg?name=CloseIcon");

interface Props {
  index: number;
  open?: boolean;
  parentId: string;
  dy?: number;
  className?: string;
  onMinimize?: () => void;
  isOverCurrent?: boolean;
  connectDropTarget?: (Element) => JSX.Element;
}

var styles: any = {};
CardTypes.map(type => 
  styles[type] =
  {
    background: CardColors[type] ? CardColors[type][0] : CardColors['none'][0],
    borderColor: CardColors[type] ? CardColors[type][1] : CardColors['none'][1],
  }
);

class CreateCardTool extends React.Component<Props, any>
{
  constructor(props:Props)
  {
    super(props);
    Util.bind(this, 'createCard');
  }
  
  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  }
  
  createCard(event) {
    if(this.props.open && this.props.onMinimize)
    {
      this.props.onMinimize();
    }
    
    var type = Util.rel(event.target);
    Actions.cards.create(this.props.parentId, type, this.props.index);
  }
  
  // componentWillReceiveProps(newProps)
  // {
  //   if(newProps.open)
  //   {
  //     setTimeout(() =>
  //       Util.animateToAutoHeight(this.refs['ccWrapper']),
  //     150);
  //   }
  //   else
  //   {
  //     setTimeout(() =>
  //       Util.animateToHeight(this.refs['ccWrapper'], 0),
  //     150);
  //   }
  // }
  
  // componentDidMount()
  // {
  //   if(this.props.open)
  //   {
  //     Util.animateToAutoHeight(this.refs['ccWrapper']);
  //   }
  // }
  
  renderCardSelector() {
    return (
     <div className='create-card-selector' ref='ccWrapper'>
       <div className='create-card-selector-inner'>
         {
           CardTypes.map((type, index) => (
             <a
               className="create-card-button"
               key={type}
               rel={type}
               onClick={this.createCard}
               style={styles[type]}
             >
               <div className="create-card-button-inner" rel={type}>
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
    if(!this.props.open)
    {
      return null;
    }
    
    const { isOverCurrent, connectDropTarget } = this.props;
    var classes = Util.objToClassname({
      "create-card-wrapper": true,
      "create-card-open": this.props.open,
      "create-card-closed": !this.props.open,
      "create-card-wrapper-drag-over": isOverCurrent,
      "card-drop-target": true
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
    
    return connectDropTarget(
      <div className={classes} style={style}>
        { this.renderCardSelector() }
     </div>
   );
  }
};


const cardTarget = 
{
  canDrop(props, monitor)
  {
    return true;
  },
  
  drop(props, monitor, component)
  {
    const item = monitor.getItem();
    if(monitor.isOver({ shallow: true}))
    {
      props.dndListener && props.dndListener.trigger('droppedCard', monitor.getItem());
      
      setTimeout(() =>
      {
        Actions.cards.move(item, props.index || 0, props.parentId);
      }, 250);
    }
  }
}

const dropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
});

export default DropTarget('CARD', cardTarget, dropCollect)(CreateCardTool);
