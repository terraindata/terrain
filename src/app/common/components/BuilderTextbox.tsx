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

require('./BuilderTextbox.less');

import * as _ from 'underscore';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import CardDropArea from "../../builder/components/cards/CardDropArea.tsx";
import Actions from "../../builder/data/BuilderActions.tsx";
import Util from '../../util/Util.tsx';
import PureClasss from '../../common/components/PureClasss.tsx';
import { BuilderTypes } from '../../builder/BuilderTypes.tsx';
import Card from '../../builder/components/cards/Card.tsx';
import { DragSource, DropTarget } from 'react-dnd';
import * as classNames from 'classnames';
import Autocomplete from './Autocomplete.tsx';
var AddCardIcon = require("./../../../images/icon_addCard_22x17.svg?name=AddCardIcon");
var TextIcon = require("./../../../images/icon_text_12x18.svg?name=TextIcon");
var CloseIcon = require("./../../../images/icon_close.svg");
interface Props
{
  value: BuilderTypes.CardString;
  keyPath: KeyPath; // keypath of value
  
  id?: string; // TODO remove

  canEdit?: boolean;
  keys?: List<string>;
  placeholder?: string;
  help?: string;
  ref?: string;
  className?: string;
  type?: string;
  rel?: string;
  textarea?: boolean;

  acceptsCards?: boolean;
  top?: boolean;
  parentId?: string;
  
  isOverCurrent?: boolean;
  connectDropTarget?: (Element) => JSX.Element;

  isNumber?: boolean;
  typeErrorMessage?: string;
}

class BuilderTextbox extends PureClasss<Props>
{
  constructor(props: Props)
  {
    super(props);
    
    // see: http://stackoverflow.com/questions/23123138/perform-debounce-in-react-js
    // TODO?
    // this.executeChange = _.debounce(this.executeChange, 750);

    var value: any = this.props.value;
    this.state = {
      wrongType: this.props.isNumber ? isNaN(value) : false,
    };
  }
  
  backupValue: BuilderTypes.CardString;
  state: {
    wrongType: boolean;
  };
  
  // TODO
  componentWillReceiveProps(newProps)
  {
    var value: any = newProps.value;
    this.setState ({
      wrongType: newProps.isNumber ? isNaN(value) : false,
    });
    if(this.refs['input'])
    {
      if(this.refs['input'] !== document.activeElement)
      {
        // if not focused, then update the value
        this.refs['input']['value'] = newProps.value;
      }
    }
  }
  
  // throttled event handler
  executeChange(value)
  {
    Actions.change(this.props.keyPath, value);
  }
  
  handleTextareaChange(event)
  {
    this.executeChange(event.target.value);
  }
  
  handleAutocompleteChange(value)
  {
    this.executeChange(value);
    if(this.props.isNumber)
    {
      this.setState({
        wrongType: isNaN(value),
      });
    }
  }
  
  isText()
  {
    // TODO better approach?
    return typeof this.props.value === 'string' || typeof this.props.value === 'number';
  }
  
  handleSwitch()
  {
    var value: BuilderTypes.CardString = '';
    if(this.backupValue)
    {
      value = this.backupValue;
    }
    else if(this.isText())
    {
      value = BuilderTypes.make(BuilderTypes.Blocks.parentheses);
    }
    
    this.backupValue = this.props.value;
    // not using executeChange because it is debounced and causes a false delay
    Actions.change(this.props.keyPath, value);
  }
  
  renderSwitch()
  {
    if(!this.props.canEdit)
    {
      return null;
    }
    
    return (
      <a
        className={classNames({
          'builder-tb-switch': this.isText(),
          'close-icon-builder-textbox': !this.isText(),
        })}
        onClick={this.handleSwitch}
        data-tip={this.isText() ? 'Convert to cards' : ''}
      >
        {
          this.isText() ? <AddCardIcon /> : <CloseIcon />
        }
      </a>
    );
  }
  
  render()
  {
    if(this.isText())
    {
      const { isOverCurrent, connectDropTarget } = this.props;
      return connectDropTarget(
        <div 
          className={classNames({
            'builder-tb': true,
            'builder-tb-drag-over': isOverCurrent,
            'builder-tb-accepts-cards': this.props.acceptsCards,
            'card-drop-target': this.props.acceptsCards,
            [this.props.className]: !!this.props.className,
          })}
        >
          {
            this.props.textarea ?
              <textarea
                ref='input'
                disabled={!this.props.canEdit}
                defaultValue={this.props.value as string}
                onChange={this.handleTextareaChange}
                className={this.props.className}
                placeholder={this.props.placeholder}
                rel={this.props.rel}
              />
            :
              <Autocomplete
                ref='input'
                disabled={!this.props.canEdit}
                value={this.props.value as string}
                options={this.props.keys}
                onChange={this.handleAutocompleteChange}
                placeholder={this.props.placeholder}
                help={this.state && this.state.wrongType ? this.props.typeErrorMessage : this.props.help}
                className={this.state && this.state.wrongType ? 'ac-wrong-type' : null}
              />
          }
          { this.props.acceptsCards && this.renderSwitch() }
          { this.props.acceptsCards &&
              <CardDropArea
                keyPath={this.props.keyPath}
                index={null}
              />
          }
        </div>
      );
    }
    
    // We're in card mode
    
    return null;
    
    // var card: BuilderTypes.ICard = this.props.value as BuilderTypes.ICard;
    // // var cards = this.props.value['cards'];
    // // if(cards.size)
    // // {
    //   // var card = cards.get(0);
    //   var color = card.static.colors[0] as string;
    //   var title: string = ''; //card.static.title;
    //   var preview = BuilderTypes.getPreview(card);
    // // }
    // // else
    // // {
    // //   var color = "#aaa";
    // //   var title = "Add a Card";
    // // }
    
    // var chipStyle = 
    // {
    //   background: color,
    // };
    // var arrowLineStyle =
    // {
    //   borderColor: color,
    // };
    // var arrowHeadStyle = 
    // {
    //   borderLeftColor: color,
    // }
    
    // return (
    //   <div className={classNames({
    //     'builder-tb': true,
    //     'builder-tb-cards': true,
    //     'builder-tb-cards-top': this.props.top
    //   })} ref='cards'>
    //     <div className='builder-tb-cards-input'>
    //       { this.renderSwitch() }
    //       <div className='builder-tb-cards-input-value' style={chipStyle}>
    //         <div className='builder-tb-cards-input-value-text'>
    //           { title }
    //         </div>
    //         { !preview ? null :
    //           <div className='card-preview'>
    //             { preview }
    //           </div>
    //         }
    //       </div>
    //       <div className='builder-tb-cards-arrow' style={arrowLineStyle}>
    //         <div className='builder-tb-cards-arrow-inner' style={arrowHeadStyle} />
    //       </div>
    //     </div>
    //   </div>
    // );
  }
};

const btbTarget = 
{
  canDrop(props, monitor)
  {
    return props.acceptsCards;
  },
  
  drop(props, monitor, component)
  {
    const item = monitor.getItem();
    if(monitor.isOver({ shallow: true}))
    {
      const card = monitor.getItem();
      const id = props.id;
      const findId = (c) =>
      {
        for(var i in c)
        {
          if(c.hasOwnProperty(i) && typeof c[i] === 'object')
          {
            if(c[i].id === id || findId(card[i]))
            {
              return true;  
            }
          }
        }
      }
      
      if(findId(card))
      {
        return;  
      }
      
      //   // TODO
      // var newId = 'c-' + Math.random();
      // var newCard:BuilderTypes.IParenthesesCard = BuilderTypes._IParenthesesCard();
      
      // props.dndListener && props.dndListener.trigger('droppedCard', monitor.getItem());
      
      // setTimeout(() =>
      // {
      //   // Actions.cards.change(props.id, props.keyPath, newCard)
      //   // Actions..move(item, 0, newId);
      // }, 250);
    }
  }
}

const dropCollect = (connect, monitor) =>
({
  connectDropTarget: connect.dropTarget(),
});

export default DropTarget<Props>('CARD', btbTarget, dropCollect)(BuilderTextbox);
